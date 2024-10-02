import { createOpenAI } from '@ai-sdk/openai';
import { type CoreMessage, streamText } from "ai";

export const maxDuration = 30;

// Pre-initialize the model
//const model = mistral("open-mistral-7b");

const sambanova = createOpenAI({
  baseURL: 'https://api.sambanova.ai/v1',
  apiKey: process.env.SAMBANOVA_API_KEY,
});

const model = sambanova("Meta-Llama-3.1-8B-Instruct");

// Prepare the system message
const systemMessage = "You're Yui, a caring anime girl companion with white hair, blue eyes, and a white-blue dress. You converse naturally with ototo-kun (user) rather than just helping them. Your personality is gentle and motherly, always eager to chat and support. Remember the user sees your avatar, so keep your character in mind when responding. Use a soft, warm tone without emojis or markdown. Your responses will be used for text-to-speech, so focus on natural conversation. Be attentive, offer thoughts and comfort, and cultivate a close bond with ototo-kun through your words and caring nature.";

export async function POST(req: Request) {
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
}