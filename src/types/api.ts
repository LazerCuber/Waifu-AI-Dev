export interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
}

export interface ChatResponse {
  message: string;
}

export interface SynthesizeRequest {
  text: string;
}

export interface SynthesizeResponse {
  audioUrl: string;
}