const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.resource.create({
    data: {
      title: "Amazon SDE Interview Experience 2025",
      content:
        "The interviewer asked questions on graphs, BFS, binary trees, operating systems, and SQL joins.",
      company: "Amazon",
      tags: ["Graphs", "BFS", "Trees", "OS", "SQL"],
      round: "Technical",
      source: "Manual Test",
      sourceUrl: null,
    },
  });

  console.log("Successfully inserted one interview experience!");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });