import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export const AI_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3-32b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
] as const;

function shouldFallback(error: any) {
  const status = error?.status ?? error?.response?.status;

  if (status === 429 || status === 500 || status === 502 || status === 503) {
    return true;
  }

  const msg = String(error?.message ?? "").toLowerCase();

  return (
    msg.includes("rate") ||
    msg.includes("quota") ||
    msg.includes("limit") ||
    msg.includes("capacity") ||
    msg.includes("timeout") ||
    msg.includes("overloaded") ||
    msg.includes("unavailable")
  );
}

export async function createCompletion({
  messages,
  temperature = 0.2,
}: {
  messages: any[];
  temperature?: number;
}) {
  let lastError: any = null;

  for (const model of AI_MODELS) {
    try {
      console.log(`Trying ${model}`);

      const completion = await groq.chat.completions.create({
        model,
        messages,
        temperature,
      });

      console.log(`Success with ${model}`);

      return {
        completion,
        modelUsed: model,
      };
    } catch (err: any) {
      lastError = err;

      console.warn(`${model} failed`);

      if (!shouldFallback(err)) {
        throw err;
      }

      console.warn(`Falling back...`);
    }
  }

  throw lastError ?? new Error("All models failed");
}