const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const DEFAULT_MODEL = "deepseek-flash";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("DeepSeek is not configured on the server.");
    this.name = "AiNotConfiguredError";
  }
}

export class AiRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`DeepSeek returned ${status}`);
    this.name = "AiRequestError";
    this.status = status;
  }
}

type ChatMessage = { role: "system" | "user"; content: string };

export async function complete(
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError();

  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.4,
      thinking: { type: "disabled" },
      stream: false,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new AiRequestError(response.status);
  }

  const data: unknown = await response.json();
  const content = firstMessageContent(data);

  if (!content) {
    throw new Error("DeepSeek returned an empty response.");
  }

  return content;
}

function firstMessageContent(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  if (!("choices" in data) || !Array.isArray(data.choices)) return null;
  const choice = data.choices[0];
  if (!choice || typeof choice !== "object" || !("message" in choice)) {
    return null;
  }
  const message = choice.message;
  if (!message || typeof message !== "object" || !("content" in message)) {
    return null;
  }
  return typeof message.content === "string" ? message.content.trim() : null;
}

export function sanitiseTitle(value: string): string {
  const title = value
    .replace(/^["'“”\s]+|["'“”\s]+$/g, "")
    .split("\n")[0]
    .trim()
    .slice(0, 90);
  return title || "Untitled entry";
}

export function sanitiseTags(value: string): string {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const raw of value.split(/[,;\n]/u)) {
    const tag = raw.replace(/^#+/u, "").trim().slice(0, 32);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length === 5) break;
  }

  return tags.join(", ");
}
