const fs = require("fs");
const { getDocument } = require("pdfjs-dist/legacy/build/pdf.mjs");

async function extractText(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));

  const pdf = await getDocument({ data }).promise;
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item) => item.str)
      .join(" ");

    fullText += pageText + "\n\n";
  }

  return fullText;
}

async function main() {
  const text = await extractText("data/test.pdf");

  console.log("===== FIRST 2000 CHARACTERS =====");
  console.log(text.slice(0, 2000));
  console.log("=================================");
}

main().catch(console.error);