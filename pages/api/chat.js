import { createCompletion } from "@/lib/groq";
import { hybridSearch } from "../../lib/retrieve";
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question } = req.body;

  if (
  typeof question !== "string" ||
  question.trim().length === 0 ||
  question.length > 2000
) {
  return res.status(400).json({
    error: "Please provide a valid question.",
  });
}

  try {
    const docs = await hybridSearch(question, 5);

    const context = docs
      .map(
        (doc, i) => `
Document ${i + 1}
Company: ${doc.company}
Role: ${doc.role}
Title: ${doc.title}

${doc.content.slice(0, 3000)}
`
      )
      .join("\n\n---------------------\n\n");

    
    const { completion, modelUsed } = await createCompletion({
      
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are an AI interview preparation assistant.

Answer ONLY using the provided interview documents.
Be precise, concise, and specific. Avoid vague statements.
If the documents do not contain enough information, explicitly say:
"I could not find enough evidence in the indexed interview experiences."

Do NOT make up companies, interview questions, or preparation advice.

Do NOT reveal your internal reasoning.
Do NOT output <think> tags.
Return only the final answer in clean markdown.
`,
        },
        {
          role: "user",
          content: `
Question:
${question}

Interview Data:
${context}
`,
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";

const answer = raw
  .replace(/<think>[\s\S]*?<\/think>/gi, "")
  .trim();

    return res.status(200).json({
      answer,
      sources: docs,
      modelUsed
    });
  } catch (err) {
  console.error("[CHAT API]", err);

  const message = String(err?.message || "").toLowerCase();

  const retryable =
    message.includes("rate") ||
    message.includes("quota") ||
    message.includes("limit") ||
    message.includes("timeout") ||
    message.includes("overloaded") ||
    message.includes("unavailable");

  return res.status(retryable ? 503 : 500).json({
    error: retryable
      ? "AI is temporarily unavailable. Search and interview browsing continue to work normally. Please try again in a minute."
      : "Something went wrong while generating the response.",
    retryable,
  });
}
}