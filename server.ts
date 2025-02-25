import express, { Request, Response, Router } from 'express';
import cors from 'cors';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, type CoreMessage, LanguageModelV1 } from "ai";
import { ElevenLabsClient } from "elevenlabs";
import { env } from './src/env';
import { Readable } from 'stream';

const app = express();
const router = express.Router();
app.use(cors());
app.use(express.json());

const openai = createOpenAI({
  baseURL: 'https://gpu-as-c1.ccservers.cc:30004/v1',
  apiKey: env.GROQ_API_KEY,
});

const model = openai("Meta-Llama-3.1-8B-Instruct") as unknown as LanguageModelV1;

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

router.post('/api/chat', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { messages } = req.body;
    
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages must be an array' });
    }

    // Convert messages to the format expected by streamText
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const { textStream } = await streamText({
      model,
      maxTokens: 150,
      messages: formattedMessages,
      system: SYSTEM_MESSAGE_TEMPLATE,
    });

    let fullText = '';
    for await (const textPart of textStream) {
      fullText += textPart;
    }

    const emotionMatch = fullText.match(/^\[(Happy|Sad|Scared|Angry|Joy|Neutral)\]/);
    const emotion = emotionMatch ? emotionMatch[1] : 'Neutral';
    const cleanText = fullText.replace(/^\[(Happy|Sad|Scared|Angry|Joy|Neutral)\]/, '').trim();

    return res.json({
      role: "assistant",
      content: cleanText,
      emotion: emotion,
    });
  } catch (error) {
    console.error("Error during OpenAI stream:", error);
    return res.status(500).json({ error: 'Failed to generate response' });
  }
});

router.post('/api/synthasize', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message.content !== 'string') {
      return res.status(400).json({ error: 'Invalid message format' });
    }
    
    console.log("Synthesizing speech for message:", message.content);
    const elevenlabs = new ElevenLabsClient({
      apiKey: env.ELEVENLABS_API_KEY,
    });

    const audioStream = await elevenlabs.generate({
      voice: env.VOICE_ID,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { similarity_boost: 0.5, stability: 0.55 },
      text: message.content
    });

    // Convert the audio stream to a Buffer
    if (audioStream instanceof ReadableStream) {
      const chunks: Uint8Array[] = [];
      const reader = audioStream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      
      const audioBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'audio/mpeg');
      return res.send(audioBuffer);
    } else if (audioStream instanceof Readable) {
      res.setHeader('Content-Type', 'audio/mpeg');
      return audioStream.pipe(res);
    } else {
      throw new Error('Unexpected audio stream type');
    }
  } catch (error) {
    console.error("Error generating audio:", error);
    return res.status(500).json({ error: 'Failed to synthesize speech' });
  }
});

app.use(router);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`📢 Express server running on port ${PORT}`);
});