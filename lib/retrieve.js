import { PrismaClient } from "@prisma/client";
import { spawnSync } from "child_process";

const prisma = new PrismaClient();

export async function hybridSearch(query, limit = 20) {
  const q = (query || "").trim();
  limit = Math.min(Number(limit || 20), 50);

  if (!q) {
    return [];
  }

  const normalizedQ = q.toLowerCase();
  const isCompanyStyleQuery = q.length <= 12 && !q.includes(" ");

  // ---------- Exact Company Match ----------
  const exactCompanyResults = await prisma.resource.findMany({
    where: {
      company: {
        equals: q,
        mode: "insensitive",
      },
    },
    take: limit,
  });

  // If user typed something like "UBS", "PhonePe", "JPMC",
  // exact company matches should win immediately.
  if (isCompanyStyleQuery && exactCompanyResults.length > 0) {
    return exactCompanyResults.map((item) => ({
      ...item,
      hybridScore: 1000,
    }));
  }

  // ---------- Keyword Search ----------
  const keywordResults = await prisma.resource.findMany({
    where: {
      OR: [
        {
          company: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          role: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          title: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          content: {
            contains: q,
            mode: "insensitive",
          },
        },
      ],
    },
    take: Math.max(limit * 3, 30),
  });

  // ---------- Semantic Search ----------
  const PYTHON_BIN = process.env.PYTHON_BIN || ".venv/bin/python";

  const py = spawnSync(PYTHON_BIN, ["scripts/ingest/embed_query.py"], {
    input: q,
    encoding: "utf8",
  });

  if (py.status !== 0) {
    throw new Error(py.stderr?.toString() || "Embedding generation failed");
  }

  const embedding = JSON.parse(py.stdout.trim());
  const vector = `[${embedding.join(",")}]`;

  const semanticResults = await prisma.$queryRawUnsafe(`
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
    LIMIT ${limit};
  `);

  // ---------- Merge ----------
  const merged = new Map();

  function upsert(item, score) {
    const existing = merged.get(item.id);
    if (!existing || score > existing.hybridScore) {
      merged.set(item.id, {
        ...item,
        hybridScore: score,
      });
    }
  }

  function keywordScore(item) {
    const company = (item.company || "").toLowerCase();
    const role = (item.role || "").toLowerCase();
    const title = (item.title || "").toLowerCase();
    const content = (item.content || "").toLowerCase();

    let score = 0;

    if (company === normalizedQ) score += 1000;
    else if (company.includes(normalizedQ)) score += 300;

    if (title === normalizedQ) score += 250;
    else if (title.includes(normalizedQ)) score += 80;

    if (role === normalizedQ) score += 120;
    else if (role.includes(normalizedQ)) score += 40;

    if (content.includes(normalizedQ)) score += 10;

    return score;
  }

  // Strong keyword boost
  for (const item of keywordResults) {
    upsert(item, keywordScore(item) + 1);
  }

  // Semantic score is helpful, but weaker for company-style queries
  const semanticWeight = isCompanyStyleQuery ? 0.15 : 1;

  for (const item of semanticResults) {
    const similarity = Number(item.similarity || 0);
    upsert(item, similarity * semanticWeight);
  }

  return [...merged.values()]
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .slice(0, limit);
}