import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MAX_RESULTS = 10;
const FETCH_LIMIT = 100;

export default async function handler(req, res) {
  const q = String(req.query.q || "").trim();

  // Don't spam the DB for tiny queries
  if (q.length < 2) {
    return res.status(200).json([]);
  }

  try {
    const rows = await prisma.resource.findMany({
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

      select: {
        company: true,
        role: true,
        title: true,
      },

      take: FETCH_LIMIT,
    });

    const query = q.toLowerCase();

    const seen = new Set();

    const companies = [];
    const roles = [];
    const titles = [];

    function score(text) {
      const value = text.toLowerCase();

      // Exact match
      if (value === query) return 100;

      // Starts with query
      if (value.startsWith(query)) return 90;

      // Word boundary match
      if (value.includes(" " + query)) return 80;

      // Generic contains
      if (value.includes(query)) return 70;

      return 0;
    }

    function pushUnique(bucket, type, value) {
      if (!value) return;

      const trimmed = value.trim();
      if (!trimmed) return;

      const key = `${type}:${trimmed.toLowerCase()}`;

      if (seen.has(key)) return;
      seen.add(key);

      bucket.push({
        type,
        value: trimmed,
        score: score(trimmed),
      });
    }

    for (const row of rows) {
      pushUnique(companies, "company", row.company);
      pushUnique(roles, "role", row.role);
      pushUnique(titles, "title", row.title);
    }

    companies.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.value.localeCompare(b.value);
    });

    roles.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.value.localeCompare(b.value);
    });

    titles.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.value.localeCompare(b.value);
    });

    // Prioritize companies first, then roles, then titles.
    // This produces much better UX than mixing everything together.
    const suggestions = [
      ...companies.slice(0, 3),
      ...roles.slice(0, 2),
      ...titles.slice(0, 5),
    ]
      .slice(0, MAX_RESULTS)
      .map(({ type, value }) => ({
        type,
        value,
      }));

    return res.status(200).json(suggestions);
  } catch (err) {
    console.error("Autocomplete error:", err);

    return res.status(500).json({
      error: "Autocomplete failed",
    });
  }
}