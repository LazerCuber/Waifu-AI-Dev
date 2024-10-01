import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    GROQ_API_KEY: z.string(), // Changed from MISTRAL_API_KEY to GROQ_API_KEY
    ELEVENLABS_API_KEY: z.string(),
    VOICE_ID: z.string(),
  },

  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    GROQ_API_KEY: process.env.GROQ_API_KEY, // Changed from MISTRAL_API_KEY to GROQ_API_KEY
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY, 
    VOICE_ID: process.env.VOICE_ID,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});