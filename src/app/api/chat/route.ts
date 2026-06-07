import { callOpenAI } from "@/lib/openai";
import { parseSSEStream } from "@/lib/openrouter";
import type { OpenRouterError } from "@/types";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema).min(1),
  language: z.enum(["en", "sv", "fa", "es", "tr", "fr", "nl"]),
  topic: z
    .enum(["free", "restaurant", "travel", "shopping", "business", "introductions", "hobbies"])
    .optional(),
});

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { messages, language, topic } = parsed.data;

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OpenAI API key not configured" }, { status: 503 });
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await callOpenAI(messages, language, topic);
  } catch (err) {
    const error = err as OpenRouterError;
    if (error.code === "unauthorized") {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error.code === "rate_limited") {
      return Response.json({ error: error.message }, { status: 429 });
    }
    if (error.code === "network_error") {
      return Response.json({ error: error.message }, { status: 503 });
    }
    return Response.json({ error: error.message }, { status: 502 });
  }

  if (!upstreamResponse.body) {
    return Response.json({ error: "No response body from AI" }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const body2 = upstreamResponse.body;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of parseSSEStream(body2)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "stream_error" })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
