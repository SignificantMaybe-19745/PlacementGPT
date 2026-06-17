import { createCompletion } from "@/lib/groq";
import { hybridSearch } from "../../lib/retrieve";
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question } = req.body;

  if (!question?.trim()) {
    return res.status(400).json({ error: "Question is required" });
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
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are an AI interview preparation assistant.

Answer ONLY using the provided interview documents.
Do not answer is vague terms be precise
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
    console.error(err);
    return res.status(500).json({
      error: "Chat failed",
    });
  }
}