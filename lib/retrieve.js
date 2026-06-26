import { PrismaClient } from "@prisma/client";
import { spawnSync } from "child_process";

const prisma = new PrismaClient();

const PYTHON_BIN = process.env.PYTHON_BIN ?? "python3";

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
      `Embedding script returned invalid vector (${
        Array.isArray(parsed) ? parsed.length : "non-array"
      })`
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
    if (company === normalizedQ) score += 500;
    if (company.startsWith(normalizedQ)) score += 100;
  }

  return score;
}

export async function hybridSearch(query, limit = 15) {
  const q = String(query || "").trim();

  if (!q) return [];

  limit = Math.min(Number(limit || 15), 30);

  const normalizedQ = q.toLowerCase();

  // Heuristic: short queries are often company names
  const isCompanyStyleQuery = q.length <= 30;

  // --------------------------------------------------
  // FAST PATH: Exact / partial company match
  // --------------------------------------------------
  if (isCompanyStyleQuery) {
    // DISTINCT ON (r.id) collapses every resource down to a single row
    // *before* the outer LIMIT is applied, so we never get more than
    // one chunk per interview experience back. The inner ORDER BY
    // (r.id, chunkIndex ASC) picks that resource's first chunk as the
    // representative one; the outer ORDER BY then sorts the already-
    // deduped resources by recency.
    const companyChunks = await prisma.$queryRaw`
      SELECT * FROM (
        SELECT DISTINCT ON (r.id)
          rc.id,
          rc."resourceId",
          rc."chunkIndex",
          rc.content,

          r.company,
          r.role,
          r.candidate,
          r.title,
          r."sourceFile",
          r."createdAt"

        FROM "ResourceChunk" rc
        JOIN "Resource" r
          ON rc."resourceId" = r.id

        WHERE LOWER(r.company) LIKE LOWER(${'%' + q + '%'})

        ORDER BY r.id, rc."chunkIndex" ASC
      ) sub
      ORDER BY sub."createdAt" DESC
      LIMIT ${limit};
    `;

    if (companyChunks.length > 0) {
      return companyChunks.map((item) => ({
        id: item.resourceId,
        chunkId: item.id,
        chunkIndex: item.chunkIndex,

        company: item.company,
        role: item.role,
        candidate: item.candidate,
        title: item.title,
        sourceFile: item.sourceFile,
        createdAt: item.createdAt,

        content: item.content,
        similarity: 1,
      }));
    }
  }

  // --------------------------------------------------
  // Semantic fallback
  // --------------------------------------------------
  const embedding = getEmbedding(q);
  const vector = `[${embedding.join(",")}]`;

  // Now that DISTINCT ON collapses to one row per resource, this is the
  // number of *resources* we pull as rerank candidates, not chunks —
  // so it can be much smaller than the old chunk-based 300.
  const candidateLimit = Math.max(limit * 5, 100);

  // DISTINCT ON (r.id) again picks exactly one chunk per resource — the
  // single chunk with the smallest vector distance (best semantic match)
  // for that resource, since the secondary ORDER BY key is the distance
  // itself. The outer query then ranks those one-per-resource rows by
  // similarity before handing candidateLimit of them off to scoreRerank.
  const chunks = await prisma.$queryRawUnsafe(`
    SELECT * FROM (
      SELECT DISTINCT ON (r.id)
        rc.id,
        rc."resourceId",
        rc."chunkIndex",
        rc.content,

        r.company,
        r.role,
        r.candidate,
        r.title,
        r."sourceFile",
        r."createdAt",

        1 - (rc.embedding <=> '${vector}'::vector) AS similarity

      FROM "ResourceChunk" rc
      JOIN "Resource" r
        ON rc."resourceId" = r.id

      WHERE rc.embedding IS NOT NULL

      ORDER BY r.id, rc.embedding <=> '${vector}'::vector
    ) sub
    ORDER BY sub.similarity DESC
    LIMIT ${candidateLimit};
  `);

  return chunks
    .map((item) => ({
      id: item.resourceId,
      chunkId: item.id,
      chunkIndex: item.chunkIndex,

      company: item.company,
      role: item.role,
      candidate: item.candidate,
      title: item.title,
      sourceFile: item.sourceFile,
      createdAt: item.createdAt,

      content: item.content,
      similarity: Number(item.similarity || 0),
      hybridScore: scoreRerank(
        item,
        normalizedQ,
        Number(item.similarity || 0),
        isCompanyStyleQuery
      ),
    }))
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .slice(0, limit);
}