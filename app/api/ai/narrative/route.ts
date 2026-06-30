import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT =
  "You are a professional timesheet assistant for DecisionFoundry, a data analytics consulting firm. " +
  "Turn rough notes into ONE concise, professional timesheet sentence. " +
  "Be specific and factual. No preamble. Maximum one sentence.";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { error: { code: "unauthorized", message: "Not authenticated." } },
        { status: 401 }
      );
    }

    const { rawNotes, projectName } = await req.json();
    if (!rawNotes?.trim()) {
      return Response.json(
        { error: { code: "bad_request", message: "rawNotes is required." } },
        { status: 400 }
      );
    }

    const client = new Anthropic();
    const userContent = projectName?.trim()
      ? `Project: ${projectName}\nNotes: ${rawNotes}`
      : rawNotes;

    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 100,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(new TextEncoder().encode(event.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "ai_unavailable",
          message: "AI is temporarily unavailable. Please try again.",
        },
      },
      { status: 503 }
    );
  }
}
