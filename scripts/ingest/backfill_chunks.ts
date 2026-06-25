import { PrismaClient } from "@prisma/client";
import { spawnSync } from "child_process";
import { chunkText } from "./chunker";

const prisma = new PrismaClient();

const PYTHON_BIN =
  process.env.PYTHON_BIN || process.env.PYTHON || "python3";

function generateEmbedding(text: string): number[] {
  const py = spawnSync(PYTHON_BIN, ["scripts/ingest/embed_query.py"], {
    input: text,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  if (py.status !== 0) {
    throw new Error(py.stderr || py.stdout || "Embedding generation failed");
  }

  const parsed = JSON.parse(py.stdout.trim());

  if (!Array.isArray(parsed) || parsed.length !== 384) {
    throw new Error("Invalid embedding returned.");
  }

  return parsed;
}

async function main() {
  const resources = await prisma.resource.findMany({
    select: {
      id: true,
      content: true,
      title: true,
    },
  });

  console.log(`Found ${resources.length} resources.`);

  for (const resource of resources) {
    // Skip if already backfilled
    const existing = await prisma.resourceChunk.count({
      where: { resourceId: resource.id },
    });

    if (existing > 0) {
      console.log(`⏭️  Skipping: ${resource.title} (${existing} chunks exist)`);
      continue;
    }

    const chunks = chunkText(resource.content);

    console.log(
      `📄 ${resource.title} -> creating ${chunks.length} chunks...`
    );

    for (let i = 0; i < chunks.length; i++) {
      console.log(
  `   ↳ Chunk ${i + 1}/${chunks.length} (${resource.title})`
);

const embedding = generateEmbedding(chunks[i]);

console.log("   ✅ Embedding generated");
      const embeddingLiteral = `[${embedding.join(",")}]`;

      const createdChunk = await prisma.resourceChunk.create({
        data: {
          resourceId: resource.id,
          chunkIndex: i,
          content: chunks[i],
        },
      });

      await prisma.$executeRaw`
        UPDATE "ResourceChunk"
        SET embedding = ${embeddingLiteral}::vector
        WHERE id = ${createdChunk.id}
      `;
    }
  }

  console.log("✅ Backfill complete.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });