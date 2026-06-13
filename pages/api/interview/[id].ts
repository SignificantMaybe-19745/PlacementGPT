import type { NextApiRequest, NextApiResponse } from "next";
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid id" });
  }

  const resource = await prisma.resource.findUnique({
    where: {
      id,
    },
  });

  if (!resource) {
    return res.status(404).json({ error: "Resource not found" });
  }

  return res.status(200).json(resource);
}