import { z } from 'zod';

const envSchema = z.object({
  GROQ_API_KEY: z.string(),
  ELEVENLABS_API_KEY: z.string(),
  VOICE_ID: z.string(),
});

export const env = envSchema.parse(process.env);