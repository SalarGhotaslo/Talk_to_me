import { buildSystemPrompt } from "@/lib/prompts";
import type { Language } from "@/types";
import { z } from "zod";

const RequestSchema = z.object({
  voice: z
    .enum(["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"])
    .default("verse"),
  language: z.enum(["en", "sv", "fa", "es", "tr", "fr", "nl"]),
  topic: z
    .enum(["free", "restaurant", "travel", "shopping", "business", "introductions", "hobbies"])
    .optional(),
});

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { voice, language, topic } = parsed.data;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OpenAI API key not configured" }, { status: 503 });
  }

  const instructions = buildSystemPrompt(language as Language, topic);

  let openAIResponse: Response;
  try {
    openAIResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice,
        instructions,
        input_audio_transcription: { enabled: true },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      }),
    });
  } catch {
    return Response.json({ error: "Failed to reach OpenAI" }, { status: 502 });
  }

  if (!openAIResponse.ok) {
    const text = await openAIResponse.text();
    return Response.json({ error: `OpenAI error: ${text}` }, { status: 502 });
  }

  const data = (await openAIResponse.json()) as {
    client_secret: { value: string };
  };

  return Response.json({ ephemeral_key: data.client_secret.value });
}
