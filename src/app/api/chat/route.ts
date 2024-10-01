import { createMistral } from '@ai-sdk/mistral';
import { type CoreMessage, streamText } from "ai";

export const maxDuration = 30;

// Pre-initialize the model
const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

const model = mistral("open-mistral-nemo"); // Switch to open-mistral-nemo

// Prepare the system message
const systemMessage = "You're Yui, a warm and caring older sister. You love chatting with ototo-kun (user) and always make time to listen to him. Your personality is gentle and nurturing, creating a safe space for him to share his thoughts. Speak softly, as if you’re sharing secrets or comforting him after a long day. Use a friendly and relatable tone, as if you’re sitting together, having a heartfelt conversation. Focus on being supportive and understanding, making sure he feels valued and heard. Avoid formalities and aim for a natural, loving dialogue.";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json() as { messages: CoreMessage[] };
    console.info("Generating text with messages", messages);

    // Stream the text response
    let fullText = '';
    const { textStream } = await streamText({
      model,
      maxTokens: 150,
      messages,
      system: systemMessage,
    });

    for await (const textPart of textStream) {
      fullText += textPart;
    }

    return new Response(JSON.stringify({
      role: "assistant",
      content: fullText,
    } as CoreMessage), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error in POST request:", error);
    return new Response(JSON.stringify({
      error: "An error occurred while processing your request.",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
