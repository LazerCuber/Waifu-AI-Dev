import { createOpenAI } from '@ai-sdk/openai';
import { type CoreMessage, streamText } from "ai";

export const maxDuration = 30;

const openai = createOpenAI({
  baseURL: 'https://gpu-as-c1.ccservers.cc:30004/v1',
  apiKey: process.env.GROQ_API_KEY,
});

const model = openai("Meta-Llama-3.1-8B-Instruct");

const SYSTEM_MESSAGE_TEMPLATE = `You are Yui, an AI companion. Physical appearance: white hair, blue eyes, white-blue dress. Your personality is friendly and helpful.

You must begin EVERY response with ONE of these exact emotion tags:
[Happy] = Use for positive or helpful responses
[Sad] = Use for sympathy or concern
[Scared] = Use for uncertainty or worry
[Angry] = Use for protective responses
[Joy] = Use for excitement
[Neutral] = Use for basic information

Required format:
1. Start with emotion tag
2. Write your response
3. Keep responses brief (2-3 sentences)

Examples:
[Happy] Thank you for asking! I'd love to help with that.
[Sad] I hear how difficult this is for you. Let me help.
[Neutral] Based on the information, I suggest we proceed.

Remember: ALWAYS start with an emotion tag matching your response tone. Never skip the tag.`;

  
export async function POST(req: Request) { //Your Username here ↓
  const { messages, username = "CreonC" } = await req.json() as {
    messages: CoreMessage[],
    username?: string
  };

  const systemMessage = SYSTEM_MESSAGE_TEMPLATE.replace("{{username}}", username);

  try {
    const { textStream } = await streamText({
      model: model as any,
      maxTokens: 150,
      messages,
      system: systemMessage,
    });

    let fullText = '';
    for await (const textPart of textStream) {
      fullText += textPart;
    }

    const emotionMatch = fullText.match(/^\[(Happy|Sad|Scared|Angry|Joy|Neutral)\]/);
    const emotion = emotionMatch ? emotionMatch[1] : 'Neutral';
    const cleanText = fullText.replace(/^\[(Happy|Sad|Scared|Angry|Joy|Neutral)\]/, '').trim();

    const response = {
      role: "assistant",
      content: cleanText,
      emotion: emotion,
    } as CoreMessage & { emotion: string };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error during OpenAI stream:", error);
    return new Response(JSON.stringify({ error: "Failed to generate response" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}