import type { NextApiRequest, NextApiResponse } from "next";
import { createCompletion } from "../../../../lib/groq";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    

    const { completion, modelUsed } = await createCompletion({
      
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are an interview summary assistant.

Summarize the interview using only the supplied interview content.
Return clean markdown only.
Do not reveal reasoning.
Do not output <think> tags.

Use this structure:

## Overview
## Key Topics
## Rounds / Sections
## Preparation Advice
## Difficulty Signal
`,
        },
        {
          role: "user",
          content: `
Summarize this interview:

Company: ${resource.company}
Role: ${resource.role ?? "Unknown"}
Title: ${resource.title}

Interview Content:
${resource.content.slice(0, 8000)}
`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const summary = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    return res.status(200).json({ summary });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to generate summary" });
  }
}