import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/app/lib/auth";
import {
  AiNotConfiguredError,
  AiRequestError,
  complete,
  sanitiseTitle,
} from "@/app/lib/ai";

export const maxDuration = 30;

export async function POST(request: Request) {
  const store = await cookies();
  if (!verifySessionToken(store.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json(
      { error: "Unlock the journal first." },
      { status: 401 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const content =
    body && typeof body === "object" && "content" in body
      ? body.content
      : null;

  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json(
      { error: "Write something first, then generate a title." },
      { status: 400 },
    );
  }

  try {
    const raw = await complete(
      [
        {
          role: "system",
          content:
            "You title personal journal entries. Return only a concise, evocative title of 2-6 words. No quotes, no trailing punctuation, no explanation.",
        },
        {
          role: "user",
          content: `Title this entry:\n\n${content.trim().slice(0, 1500)}`,
        },
      ],
      80,
    );

    return NextResponse.json({ title: sanitiseTitle(raw) });
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof AiRequestError) {
      const message =
        error.status === 401 || error.status === 403
          ? "The DeepSeek API key was rejected. Update DEEPSEEK_API_KEY."
          : error.status === 402
            ? "The DeepSeek account is out of credits."
            : error.status === 404
              ? "The DeepSeek model is unavailable. Check DEEPSEEK_MODEL."
              : error.status === 429
                ? "DeepSeek is rate limiting. Try again shortly."
                : "DeepSeek returned an error. Try again.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
    console.error("Title generation failed:", error);
    return NextResponse.json(
      { error: "The title could not be generated. Try again." },
      { status: 502 },
    );
  }
}
