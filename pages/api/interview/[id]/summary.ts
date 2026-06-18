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

  if (typeof id !== "string" || id.trim() === "") {
  return res.status(400).json({
    error: "Invalid interview id",
  });
}

  try {
    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }
    if (resource.summary) {
  return res.status(200).json({
    summary: resource.summary,
    cached: true,
  });
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
    await prisma.resource.update({
  where: {
    id: resource.id,
  },
  data: {
    summary,
  },
});
    return res.status(200).json({ summary,modelUsed, cached: false, });
  } catch (error: any) {
  console.error("[SUMMARY API]", error);

  const message = String(error?.message || "").toLowerCase();

  const retryable =
    message.includes("rate") ||
    message.includes("quota") ||
    message.includes("limit") ||
    message.includes("timeout") ||
    message.includes("overloaded") ||
    message.includes("unavailable");

  return res.status(retryable ? 503 : 500).json({
    error: retryable
      ? "AI summary is temporarily unavailable. Please try again in a minute."
      : "Failed to generate interview summary.",
    retryable,
  });
}
}