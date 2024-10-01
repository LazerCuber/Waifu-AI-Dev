import { type CoreMessage } from "ai";
import { ElevenLabsClient } from "elevenlabs";
import { env } from "~/env";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { message } = (await req.json()) as { message: CoreMessage };

  const elevenlabs = new ElevenLabsClient({
    apiKey: env.ELEVENLABS_API_KEY,
  });

  const audio = await elevenlabs.generate({
    voice: env.VOICE_ID,
    model_id: "eleven_turbo_v2_5",
    voice_settings: { similarity_boost: 0.5, stability: 0.55 },
    text: message.content as string,
  });

  return new Response(audio as never, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}