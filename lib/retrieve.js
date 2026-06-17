import { PrismaClient } from "@prisma/client";
import { spawnSync } from "child_process";

const prisma = new PrismaClient();

const PYTHON_BIN = process.env.PYTHON_BIN || ".venv/bin/python";

function getEmbedding(query) {
  const py = spawnSync(PYTHON_BIN, ["scripts/ingest/embed_query.py"], {
    input: query,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  if (py.status !== 0) {
    throw new Error(py.stderr?.toString() || "Embedding generation failed");
  }

  const parsed = JSON.parse(py.stdout.trim());

  if (!Array.isArray(parsed) || parsed.length !== 384) {
    throw new Error(
      `Embedding script returned invalid vector (${Array.isArray(parsed) ? parsed.length : "non-array"})`
    );
  }

  return parsed;
}

function scoreRerank(item, normalizedQ, similarity, isCompanyStyleQuery) {
  const company = (item.company || "").toLowerCase();
  const role = (item.role || "").toLowerCase();
  const title = (item.title || "").toLowerCase();

  let score = similarity * 1000;

  if (company === normalizedQ) score += 250;
  else if (company.startsWith(normalizedQ)) score += 120;
  else if (company.includes(normalizedQ)) score += 40;

  if (role === normalizedQ) score += 20;
  else if (role.includes(normalizedQ)) score += 8;

  if (title === normalizedQ) score += 18;
  else if (title.includes(normalizedQ)) score += 6;

  if (isCompanyStyleQuery) {
    // For company-like queries, nudge exact company matches harder.
    if (company === normalizedQ) score += 500;
    if (company.startsWith(normalizedQ)) score += 100;
  }

  return score;
}

export async function hybridSearch(query, limit = 20) {
  const q = String(query || "").trim();
  limit = Math.min(Number(limit || 20), 50);

  if (!q) return [];

  const normalizedQ = q.toLowerCase();
  const isCompanyStyleQuery = q.length <= 12 && !q.includes(" ");

  // Exact company queries should short-circuit if we already have exact matches.
  if (isCompanyStyleQuery) {
    const exactCompanyResults = await prisma.resource.findMany({
      where: {
        company: {
          equals: q,
          mode: "insensitive",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    if (exactCompanyResults.length > 0) {
      return exactCompanyResults.map((item) => ({
        ...item,
        hybridScore: 1000,
      }));
    }
  }

  const embedding = getEmbedding(q);
  const vector = `[${embedding.join(",")}]`;

  // Pull a wider candidate set semantically, then rerank in JS.
  const candidateLimit = Math.max(limit * 10, 100);

  const semanticCandidates = await prisma.$queryRawUnsafe(`
    SELECT
      id,
      company,
      role,
      candidate,
      title,
      content,
      "sourceFile",
      "createdAt",
      1 - (embedding <=> '${vector}'::vector) AS similarity
    FROM "Resource"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> '${vector}'::vector
    LIMIT ${candidateLimit};
  `);

  const merged = new Map();

  for (const item of semanticCandidates) {
    const similarity = Number(item.similarity || 0);
    const score = scoreRerank(item, normalizedQ, similarity, isCompanyStyleQuery);

    const existing = merged.get(item.id);
    if (!existing || score > existing.hybridScore) {
      merged.set(item.id, {
        ...item,
        hybridScore: score,
      });
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .slice(0, limit);
}