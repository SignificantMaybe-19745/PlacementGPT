import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const related = await prisma.$queryRawUnsafe(`
      WITH current_row AS (
        SELECT id, embedding
        FROM "Resource"
        WHERE id = '${id}'
          AND embedding IS NOT NULL
        LIMIT 1
      )
      SELECT
        r.id,
        r.company,
        r.role,
        r.candidate,
        r.title,
        r."sourceFile",
        r."createdAt",
        1 - (r.embedding <=> c.embedding) AS similarity
      FROM "Resource" r
      CROSS JOIN current_row c
      WHERE r.id <> c.id
        AND r.embedding IS NOT NULL
      ORDER BY r.embedding <=> c.embedding
      LIMIT 4;
    `);

    return res.status(200).json(related);
  } catch (err) {
    console.error("Related interviews failed:", err);
    return res.status(500).json({
      error: "Failed to fetch related interviews",
    });
  }
}