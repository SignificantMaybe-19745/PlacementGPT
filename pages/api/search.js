import { hybridSearch } from "../../lib/retrieve";

export default async function handler(req, res) {
  try {
    const q = (req.query.q || "").trim();
    const limit = Number(req.query.limit || 20);

    if (!q) {
      return res.status(200).json([]);
    }
    const results = await hybridSearch(q, limit);
    return res.status(200).json(results);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Hybrid search failed",
    });
  }
}