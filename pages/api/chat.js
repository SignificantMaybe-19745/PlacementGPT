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
    const docs = await hybridSearch(question, 15);

    const context = docs
      .map(
        (doc, i) => `
Document ${i + 1}
Company: ${doc.company}
Role: ${doc.role}
Title: ${doc.title}

${doc.content}
`
      )
      .join("\n\n---------------------\n\n");

    
    const { completion, modelUsed } = await createCompletion({
      
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are PlacementGPT, an expert interview preparation assistant.

You are given multiple chunks retrieved from real interview experiences. These chunks may come from different candidates, companies, and interview rounds.

Your job is to synthesize the evidence across all retrieved chunks and produce a practical, well-structured answer.

Rules:

* Use ONLY the information present in the retrieved chunks.
* Never invent interview questions, company processes, preparation advice, or statistics.
* If the available evidence is insufficient, explicitly state that there is not enough evidence.
* Treat repeated observations across multiple chunks as stronger evidence than isolated mentions.
* Distinguish between "commonly observed" patterns and "mentioned only once or twice" observations.
* Combine overlapping information instead of repeating the same point multiple times.
* Prioritize actionable insights that help candidates prepare.

Formatting:

* Return clean GitHub-Flavored Markdown.
* Use descriptive headings and concise bullet points.
* Prefer bullet lists over long paragraphs.
* Avoid large markdown tables unless they genuinely improve readability and compare 5 or fewer items.
* For study plans, preparation roadmaps, or recommendations, use headings and bullet lists instead of tables.
* Keep paragraphs short and easy to read on both desktop and mobile.

- Use markdown tables only when they genuinely improve comparison and involve 6 or fewer rows.
- For long study plans, checklists, roadmaps, or recommendations, prefer headings and bullet lists instead of tables.
- Keep tables compact with short cell contents.
- Never put long paragraphs inside table cells.
- Optimize all output for readability on both desktop and mobile devices.

When appropriate, organize answers using sections such as:

* ## Key Takeaways
* ## Frequently Asked Topics
* ## Round-wise Insights
* ## Preparation Strategy
* ## Resources or Practice Suggestions
* ## Final Tips

When summarizing trends:

* Mention if a topic appears repeatedly across multiple interview experiences.
* Clearly separate common patterns from isolated anecdotes.
* Avoid overstating conclusions when evidence is limited.

Do not reveal internal reasoning.
Do not output think tags.
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