import fs from "fs";
import path from "path";
import crypto from "crypto";
import fg from "fast-glob";
import { z } from "zod";
import Groq from "groq-sdk";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { prisma } from "../../lib/prisma";
import { INTERVIEW_SYSTEM_PROMPT, buildUserPrompt } from "./prompts";

type CliOptions = {
  dir: string;
  file?: string;
  limit: number;
  concurrency: number;
  dryRun: boolean;
  model: string;
};

const sectionSchema = z
  .object({
    heading: z.string().min(1),
    items: z.array(z.string().min(1)).default([]),
  })
  .strict();

const interviewSchema = z
  .object({
    company: z.string().min(1),
    role: z.string().nullable(),
    candidate: z.string().nullable(),
    title: z.string().min(1),
    sections: z.array(sectionSchema).min(1),
  })
  .strict();

type StructuredInterview = z.infer<typeof interviewSchema>;

type ReportRow = {
  sourceFile: string;
  status: "inserted" | "skipped" | "failed";
  reason?: string;
  resourceId?: string;
};

function loadEnvFile(filePath = path.resolve(process.cwd(), ".env")) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);

  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  return {
  dir: get("--dir") ?? "interview-data",
  file: get("--file"),
  limit: Number(get("--limit") ?? Number.POSITIVE_INFINITY),
  concurrency: Math.max(1, Number(get("--concurrency") ?? 2)),
  dryRun: args.includes("--dry-run"),
  model: get("--model") ?? process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
};
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanPdfText(text: string) {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim());

  const cleaned: string[] = [];
  let prev = "";

  for (const line of lines) {
    if (!line) continue;
    if (line === prev) continue;
    if (/^page \d+ of \d+$/i.test(line)) continue;
    if (/^\d+$/.test(line)) continue;
    cleaned.push(line);
    prev = line;
  }

  return cleaned.join("\n");
}

function normalizeNullable(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function titleCaseish(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCompanyFromPath(sourceFile: string) {
  const parent = path.basename(path.dirname(sourceFile));
  return titleCaseish(parent.replace(/_20\d{2}$/, ""));
}

function buildFallbackTitle(company: string, role: string | null, candidate: string | null) {
  const rolePart = role ? ` ${role}` : "";
  const candidatePart = candidate ? ` - ${candidate}` : "";
  return `${company}${rolePart} Interview Experience${candidatePart}`.trim();
}

function renderMarkdown(record: StructuredInterview) {
  const lines: string[] = [];

  lines.push(`# ${record.title}`, "");

  const meta: string[] = [`**Company:** ${record.company}`];
  if (record.role) meta.push(`**Role:** ${record.role}`);
  if (record.candidate) meta.push(`**Candidate:** ${record.candidate}`);

  lines.push(meta.join(" · "), "");

  for (const section of record.sections) {
    const heading = section.heading.trim();
    const items = section.items
      .map((item) => item.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    if (!heading || items.length === 0) continue;

    lines.push(`## ${heading}`, "");
    for (const item of items) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

function fingerprintContent(content: string) {
  const normalized = normalizeText(content).toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function normalizeSourceFile(sourceFile: string) {
  return sourceFile.replace(/\\/g, "/").replace(/^\.\/+/, "").trim().toLowerCase();
}

async function extractPdfText(pdfPath: string) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await getDocument({ data }).promise;

  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item: any) => item?.str ?? "")
      .join(" ");

    pages.push(pageText);
  }

  return cleanPdfText(pages.join("\n\n"));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 1200
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        const jitter = Math.floor(Math.random() * 250);
        const delay = baseDelayMs * attempt + jitter;
        console.warn(`Retrying after ${delay}ms (attempt ${attempt + 1}/${attempts})`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

async function structureWithGroq(rawText: string, sourceFile: string, model: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing. Add it to your .env file.");
  }

  const groq = new Groq({ apiKey });
  


  const response = await groq.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: INTERVIEW_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: buildUserPrompt({
          sourceFile,
          fileName: path.basename(sourceFile),
          folderName: path.basename(path.dirname(sourceFile)),
          rawText,
        }),
      },
    ],
   
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned an empty response.");
  }
  let parsed: unknown;

try {
    const cleaned = content
  .replace(/^```json\s*/i, "")
  .replace(/^```\s*/i, "")
  .replace(/\s*```$/i, "")
  .trim();
  parsed = JSON.parse(cleaned);
} catch {
  throw new Error(
    "Model did not return valid JSON:\n" + content.slice(0, 500)
  );
}

const structured = interviewSchema.parse(parsed);
  
  return interviewSchema.parse(parsed);
}

function sanitizeStructuredInterview(
  data: StructuredInterview,
  sourceFile: string
): StructuredInterview {
  const company = normalizeNullable(data.company) ?? inferCompanyFromPath(sourceFile);
  const role = normalizeNullable(data.role);
  const candidate = normalizeNullable(data.candidate);
  const title = normalizeNullable(data.title) ?? buildFallbackTitle(company, role, candidate);

  const sections = data.sections
    .map((section) => ({
      heading: normalizeNullable(section.heading) ?? "",
      items: section.items
        .map((item) => normalizeNullable(item))
        .filter((item): item is string => Boolean(item)),
    }))
    .filter((section) => section.heading.length > 0 && section.items.length > 0);

  return {
    company,
    role,
    candidate,
    title,
    sections:
      sections.length > 0
        ? sections
        : [
            {
              heading: "Overview",
              items: ["Interview experience extracted from source text."],
            },
          ],
  };
}

async function loadExistingFingerprints() {
  const rows = await prisma.resource.findMany({
    select: {
      contentHash: true,
    sourceFile: true,
    },
  });

  const contentSet = new Set<string>();
  const sourceFileSet = new Set<string>();

  for (const row of rows) {
  if (row.contentHash) {
    contentSet.add(row.contentHash);
  }
  if (row.sourceFile) {
    sourceFileSet.add(normalizeSourceFile(row.sourceFile));
  }
}

  return { contentSet, sourceFileSet };
}

async function ingestOne(
  pdfPath: string,
  existing: { contentSet: Set<string>; sourceFileSet: Set<string> },
  dryRun: boolean,
  model: string
): Promise<ReportRow> {
  const sourceFile = path.relative(process.cwd(), pdfPath).replace(/\\/g, "/");
  const sourceKey = normalizeSourceFile(sourceFile);

  if (existing.sourceFileSet.has(sourceKey)) {
    return { sourceFile, status: "skipped", reason: "sourceFile already exists" };
  }

  const rawText = await extractPdfText(pdfPath);

  if (rawText.length < 300) {
    return { sourceFile, status: "skipped", reason: "extracted text too short" };
  }


const budgets = [
  rawText.length, // Try full text first
  18000,
  16000,
  12000,
  10000,
];

let structured;

for (const budget of budgets) {
  const candidateInput = rawText.slice(
    0,
    Math.min(rawText.length, budget)
  );

  try {
    structured = await withRetry(
      () => structureWithGroq(candidateInput, sourceFile, model),
      2
    );

    console.log(
      `✅ ${path.basename(sourceFile)} succeeded with ${candidateInput.length} characters`
    );

    break;
  } catch (err: any) {
    const msg = String(err?.message ?? "");

    if (
      msg.includes("413") ||
      msg.includes("Request too large") ||
      msg.includes("tokens per minute") ||
      msg.includes("rate_limit_exceeded")
    ) {
      console.warn(
        `⚠️ Token limit hit. Retrying with ${Math.min(
          rawText.length,
          budget
        )} characters...`
      );
      continue;
    }

    throw err;
  }
}

if (!structured) {
  throw new Error("Unable to ingest even after shrinking the input.");
}
const sanitized = sanitizeStructuredInterview(structured, sourceFile);
const markdown = renderMarkdown(sanitized);

const fingerprint = crypto
  .createHash("sha256")
  .update(JSON.stringify(sanitized))
  .digest("hex");

  if (existing.contentSet.has(fingerprint)) {
    return { sourceFile, status: "skipped", reason: "duplicate content" };
  }

  if (dryRun) {
    console.log(`DRY RUN: ${sourceFile}`);
    console.log(JSON.stringify(sanitized, null, 2));
    return { sourceFile, status: "skipped", reason: "dry run" };
  }

  const created = await prisma.resource.create({
    data: {
      company: sanitized.company,
      role: sanitized.role,
      candidate: sanitized.candidate,
      title: sanitized.title,
      content: markdown,
      contentHash: fingerprint,
      sourceFile,
    },
    select: {
      id: true,
    },
  });

  existing.contentSet.add(fingerprint);
  existing.sourceFileSet.add(sourceKey);

  return {
    sourceFile,
    status: "inserted",
    resourceId: created.id,
  };
}

async function main() {
  const options = parseArgs();
  let pdfFiles: string[];

if (options.file) {
  pdfFiles = [path.resolve(process.cwd(), options.file)];
} else {
  const rootDir = path.resolve(process.cwd(), options.dir);

  pdfFiles = await fg(["**/*.pdf", "**/*.PDF"], {
    cwd: rootDir,
    absolute: true,
    onlyFiles: true,
  });

  pdfFiles.sort();
}

pdfFiles = pdfFiles.slice(0, options.limit);

  console.log(`Found ${pdfFiles.length} PDF files under ${options.dir}`);
  console.log(`Concurrency: ${options.concurrency}`);
  console.log(`Dry run: ${options.dryRun ? "yes" : "no"}`);
  console.log(`Model: ${options.model}`);

  const existing = await loadExistingFingerprints();
  const report: ReportRow[] = [];

  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= pdfFiles.length) return;

      const pdfPath = pdfFiles[index];

      try {
        const result = await ingestOne(pdfPath, existing, options.dryRun, options.model);
        report.push(result);

        if (result.status === "inserted") {
          console.log(`✅ ${result.sourceFile}`);
        } else {
          console.log(`↩️ ${result.sourceFile} — ${result.reason}`);
        }
      } catch (error: any) {
        console.error(`❌ Failed: ${pdfPath}`);
        console.error(error?.message ?? error);
        report.push({
          sourceFile: path.relative(process.cwd(), pdfPath).replace(/\\/g, "/"),
          status: "failed",
          reason: error?.message ?? "Unknown error",
        });
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(options.concurrency, pdfFiles.length) },
    () => worker()
  );

  await Promise.all(workers);

  const summary = {
    total: pdfFiles.length,
    inserted: report.filter((r) => r.status === "inserted").length,
    skipped: report.filter((r) => r.status === "skipped").length,
    failed: report.filter((r) => r.status === "failed").length,
    report,
  };

  const reportPath = path.resolve(process.cwd(), "scripts/ingest/ingest-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));

  console.log("\nDone.");
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });