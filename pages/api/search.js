import { PrismaClient } from "@prisma/client";
import { spawnSync } from "child_process";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const q = (req.query.q || "").trim();

  if (!q) {
    return res.status(200).json([]);
  }

  try {
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
      take: 20,
    });

    // ---------- Semantic Search ----------
    const py = spawnSync(
      "python3",
      ["scripts/ingest/embed_query.py"],
      {
        input: q,
        encoding: "utf8",
      }
    );

    if (py.status !== 0) {
      console.error(py.stderr);
      return res.status(500).json({
        error: "Embedding generation failed",
      });
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
      LIMIT 20;
    `);

    // ---------- Merge ----------
    const merged = new Map();

    // Keyword hits get a boost
    for (const item of keywordResults) {
      merged.set(item.id, {
        ...item,
        hybridScore: 2.0,
      });
    }

    // Semantic hits
    for (const item of semanticResults) {
      const existing = merged.get(item.id);

      if (existing) {
        existing.hybridScore += Number(item.similarity);
      } else {
        merged.set(item.id, {
          ...item,
          hybridScore: Number(item.similarity),
        });
      }
    }

    const results = [...merged.values()]
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, 20);

    return res.status(200).json(results);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Hybrid search failed",
    });
  }
}