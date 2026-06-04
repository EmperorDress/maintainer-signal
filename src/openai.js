import { buildOpenAIPrompt } from "./core.js";

export function extractResponseText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const chunks = [];
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === "string") chunks.push(content.text);
    }
  }

  return chunks.join("\n").trim();
}

export async function createOpenAINote({ apiKey, model, kind, context, fetchImpl = fetch }) {
  if (!apiKey) return "";

  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model || process.env.OPENAI_MODEL || "gpt-5.4-mini",
      input: buildOpenAIPrompt(kind, context),
      max_output_tokens: 700
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed with ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  return extractResponseText(data);
}
