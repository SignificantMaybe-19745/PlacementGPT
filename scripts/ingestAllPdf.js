const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");
const { PrismaClient } = require("@prisma/client");
const { getDocument } = require("pdfjs-dist/legacy/build/pdf.mjs");

const prisma = new PrismaClient();

async function extractText(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await getDocument({ data }).promise;

  let text = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    text +=
      content.items
        .map((item) => item.str)
        .join(" ") + "\n\n";
  }

  return text;
}

async function main() {
  const pdfFiles = await fg("interview-data/**/*.pdf");

  console.log(`Found ${pdfFiles.length} PDFs`);

  for (const pdfPath of pdfFiles) {
    try {
      const companyFolder = path.basename(path.dirname(pdfPath));
      const company = companyFolder
  .replace(/_20\d{2}$/, "")
  .replace(/_/g, " ");
      const sourceFile = path.basename(pdfPath);
      const title = sourceFile
  .replace(".pdf", "")
  .replace(/_/g, " ");
      const text = await extractText(pdfPath);

      await prisma.resource.create({
        data: {
          title,
          company,
          role: null,
          candidate: null,
          content: text,
          sourceFile: pdfPath,
        },
      });

      console.log(`✅ ${sourceFile}`);
    } catch (err) {
      console.error(`❌ Failed: ${pdfPath}`);
      console.error(err.message);
    }
  }

  console.log("🎉 Done!");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });