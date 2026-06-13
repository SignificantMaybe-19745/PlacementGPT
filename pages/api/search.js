import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { q = "" } = req.query;

  try {
    
    
   const results = await prisma.resource.findMany({
  where: {
    company: {
      equals: q,
      mode: "insensitive",
    },
  },
});
    console.log(results.map(r => r.company));
    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
}