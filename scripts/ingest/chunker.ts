export function chunkText(
  text: string,
  maxChunkSize = 1000,
  overlap = 200
): string[] {
  // Normalize whitespace
  text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  const paragraphs = text.split("\n\n");
  const chunks: string[] = [];

  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length <= maxChunkSize) {
      current += (current ? "\n\n" : "") + para;
    } else {
      if (current) chunks.push(current);

      // overlap from previous chunk
      const tail = current.slice(-overlap);
      current = tail + "\n\n" + para;
    }
  }

  if (current) chunks.push(current);

  return chunks;
}

