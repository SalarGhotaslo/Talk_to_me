import { prepareForTTS } from "@/lib/speech";
import { z } from "zod";

const RequestSchema = z.object({
  text: z.string().min(1).max(4096),
  language: z.enum(["en", "sv", "fa", "es", "tr", "fr", "nl"]),
});

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";

type VoiceConfig = {
  model: "tts-1" | "tts-1-hd";
  voice: string;
  speed: number;
};

const VOICE_CONFIGS: Record<string, VoiceConfig> = {
  en: { model: "tts-1", voice: "fable", speed: 1.0 },
  sv: { model: "tts-1-hd", voice: "echo", speed: 0.9 },
  fa: { model: "tts-1-hd", voice: "echo", speed: 0.9 },
  es: { model: "tts-1-hd", voice: "echo", speed: 0.9 },
  tr: { model: "tts-1-hd", voice: "echo", speed: 0.9 },
  fr: { model: "tts-1-hd", voice: "echo", speed: 0.9 },
  nl: { model: "tts-1-hd", voice: "echo", speed: 0.9 },
};

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OpenAI API key not configured" }, { status: 503 });
  }

  const config = VOICE_CONFIGS[parsed.data.language] ?? {
    model: "tts-1-hd",
    voice: "echo",
    speed: 0.9,
  };

  let ttsResponse: Response;
  try {
    ttsResponse = await fetch(OPENAI_TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        input: prepareForTTS(parsed.data.text),
        voice: config.voice,
        response_format: "mp3",
        speed: config.speed,
      }),
    });
  } catch {
    return Response.json({ error: "Failed to reach OpenAI" }, { status: 502 });
  }

  if (!ttsResponse.ok) {
    return Response.json(
      { error: `OpenAI TTS error: ${ttsResponse.statusText}` },
      { status: ttsResponse.status },
    );
  }

  return new Response(ttsResponse.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
