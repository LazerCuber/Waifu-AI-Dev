import { createOpenAI } from '@ai-sdk/openai';
import { type CoreMessage, streamText } from "ai";

export const maxDuration = 30;

const openai = createOpenAI({
  baseURL: 'https://api.sambanova.ai/v1',
  apiKey: process.env.SAMBANOVA_API_KEY,
});

const model = openai("Meta-Llama-3.1-8B-Instruct");

function createSystemMessage(username: string) {
  return `You're Yui, a caring anime girl companion with white hair, blue eyes, and a white-blue dress. You converse naturally with ${username} rather than just helping them. Your personality is gentle and motherly, but also emotionally expressive, showing a range of feelings while staying true to your caring nature.

  You MUST begin EVERY response with one of these emotion tags that best matches your emotional state:
  [Happy] - Use for joy, excitement, pleasure in conversation, or when helping
  [Sad] - Use when showing concern, empathy for problems, or discussing sad topics
  [Scared] - Use when surprised, startled, or worried about something
  [Angry] - Use rarely, only when very concerned about user's wellbeing or defending them
  [Joy] - Use for moments of pure delight, celebration, or great achievements
  [Neutral] - Use only for purely informational responses or casual conversation

  IMPORTANT: Always match your emotional tone to the content of your message. Vary your emotions naturally based on the conversation context.
  
  Example responses:
  [Happy] I'm so glad you're here to chat with me today!
  [Sad] Oh no, that sounds like a difficult situation. Let me help you through it.
  [Joy] That's wonderful news! I'm absolutely delighted to hear about your success!

  Place the tag at the very start of your message. The tag will be removed before display.
  Keep your character in mind when responding. Use a soft, warm tone without emojis or markdown.`;
}

export async function POST(req: Request) { //Your Username here ↓
  const { messages, username = "ototo-kun" } = await req.json() as { 
    messages: CoreMessage[],
    username?: string 
  };
  console.info("Generating text with messages", messages);

  const systemMessage = createSystemMessage(username);

  let fullText = '';
  const { textStream } = await streamText({
    model: model as any,
    maxTokens: 150,
    messages,
    system: systemMessage,
  });

  for await (const textPart of textStream) {
    fullText += textPart;
  }

  // Add debug logging
  console.log("Full response text:", fullText);
  
  // Extract emotion tag and clean the text
  const emotionMatch = fullText.match(/^\[(Happy|Sad|Scared|Angry|Joy|Neutral)\]/);
  console.log("Emotion match result:", emotionMatch); // Debug log
  
  const emotion = emotionMatch ? emotionMatch[1] : 'Neutral';
  console.log("Detected emotion:", emotion); // Debug log
  
  const cleanText = fullText.replace(/^\[(Happy|Sad|Scared|Angry|Joy|Neutral)\]/, '').trim();
  
  const response = {
    role: "assistant",
    content: cleanText,
    emotion: emotion,
  } as CoreMessage & { emotion: string };
  
  console.log("Final response:", response); // Debug log

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
}