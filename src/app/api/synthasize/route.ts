import { type CoreMessage } from "ai";
import { ElevenLabsClient } from "elevenlabs";
import { env } from "~/env";
import { Readable } from "stream";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { message } = (await req.json()) as { message: CoreMessage & { emotion?: string } };

    if (!message || !message.content) {
      return new Response(JSON.stringify({ error: "Message content is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const elevenlabs = new ElevenLabsClient({
      apiKey: env.ELEVENLABS_API_KEY,
    });

    // Try with the specified model, fallback to a standard one if it fails
    // However, the error we saw was 401, which is auth.
    // Let's ensure the response is handled correctly for Next.js
    const audio = await elevenlabs.generate({
      voice: env.VOICE_ID,
      model_id: "eleven_multilingual_v2", // Using multilingual_v2 for better compatibility
      voice_settings: { similarity_boost: 0.5, stability: 0.55 },
      text: message.content as string,
    });

    // Convert Node.js Readable to Web ReadableStream for Response
    // We cast to any because of a known TypeScript type mismatch between 
    // Node.js stream/web and the global Web API ReadableStream
    const webStream = Readable.toWeb(audio as Readable) as any;

    return new Response(webStream, {
      headers: { 
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked"
      },
    });
  } catch (error: any) {
    console.error("Synthesis error:", error);
    
    // Extract a readable error message
    let errorMessage = error.message;
    if (error.body) {
      // Sometimes error.body is a readable stream when using ElevenLabs SDK
      try {
        if (typeof error.body === 'object' && '_readableState' in error.body) {
          // It's likely a stream, we can't easily read it synchronously here
          errorMessage = error.statusCode === 429 
            ? "ElevenLabs Rate Limit (Free plan allows limited concurrent requests)" 
            : "ElevenLabs API Error (Streaming body, check server logs)";
        } else {
          errorMessage = JSON.stringify(error.body);
        }
      } catch (e) {
        errorMessage = "Error parsing ElevenLabs error body";
      }
    }

    const statusCode = error.statusCode || 500;

    return new Response(JSON.stringify({ 
      error: "Failed to synthesize", 
      details: errorMessage,
      code: statusCode
    }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
}