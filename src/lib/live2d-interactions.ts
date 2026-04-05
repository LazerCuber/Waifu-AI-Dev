import type { Emotion } from "~/atoms/ChatAtom";

// Interaction zones relative to model bounds (0-1 range)
export interface InteractionZone {
  x: [number, number];
  y: [number, number];
}

export const INTERACTION_ZONES = {
  head: { x: [0.35, 0.65], y: [0.0, 0.25] },
  face: { x: [0.4, 0.6], y: [0.15, 0.35] },
  body: { x: [0.3, 0.7], y: [0.35, 0.7] },
} as const;

// Expression mapping for emotions
export const EMOTION_EXPRESSIONS: Record<Emotion, string[]> = {
  neutral: ["Neutral", "normal", "default"],
  happy: ["Happy", "happy", "joy", "smile"],
  sad: ["Sad", "sad", "cry"],
  surprised: ["Surprised", "surprised", "shock"],
  angry: ["Angry", "angry", "mad"],
  thinking: ["Thinking", "think", "hmm"],
};

// Idle animation parameters
export const IDLE_CONFIG = {
  breathingSpeed: 0.003,
  breathingIntensity: 0.02,
  swaySpeed: 0.001,
  swayIntensity: 0.015,
  blinkInterval: [2000, 6000] as [number, number], // Random range in ms
  blinkDuration: 150,
  microMovementInterval: [3000, 8000] as [number, number],
};

// Headpat reaction config
export const HEADPAT_CONFIG = {
  reactionDelay: 100,
  happyDuration: 2000,
  headTiltMax: 0.15,
  eyeSquintAmount: 0.3,
};

// Poke reaction config
export const POKE_CONFIG = {
  cooldown: 1000,
  surpriseDuration: 500,
  annoyedThreshold: 3, // Number of pokes before annoyed
  annoyedResetTime: 5000,
};

// Check if a point is within an interaction zone
export function isInZone(
  normalizedX: number,
  normalizedY: number,
  zone: InteractionZone
): boolean {
  return (
    normalizedX >= zone.x[0] &&
    normalizedX <= zone.x[1] &&
    normalizedY >= zone.y[0] &&
    normalizedY <= zone.y[1]
  );
}

// Get the best matching expression from available expressions
export function findExpression(
  emotion: Emotion,
  availableExpressions: string[]
): string | null {
  const candidates = EMOTION_EXPRESSIONS[emotion];
  for (const candidate of candidates) {
    const found = availableExpressions.find(
      (exp) => exp.toLowerCase() === candidate.toLowerCase()
    );
    if (found) return found;
  }
  // Fallback: try partial match
  for (const candidate of candidates) {
    const found = availableExpressions.find((exp) =>
      exp.toLowerCase().includes(candidate.toLowerCase())
    );
    if (found) return found;
  }
  return null;
}

// Generate random value within range
export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Ease functions for smooth animations
export const ease = {
  // Smooth start and end
  inOutSine: (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2,
  
  // Quick start, slow end
  outCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  
  // Slow start, quick end
  inCubic: (t: number): number => t * t * t,
  
  // Bouncy effect
  outBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

// Parameter IDs commonly used in Live2D models
export const PARAM_IDS = {
  // Eye parameters
  eyeOpenLeft: "ParamEyeLOpen",
  eyeOpenRight: "ParamEyeROpen",
  eyeBallX: "ParamEyeBallX",
  eyeBallY: "ParamEyeBallY",
  
  // Mouth parameters
  mouthOpenY: "ParamMouthOpenY",
  mouthForm: "ParamMouthForm",
  
  // Head/body parameters
  angleX: "ParamAngleX",
  angleY: "ParamAngleY",
  angleZ: "ParamAngleZ",
  bodyAngleX: "ParamBodyAngleX",
  bodyAngleY: "ParamBodyAngleY",
  bodyAngleZ: "ParamBodyAngleZ",
  
  // Breath
  breath: "ParamBreath",
};

// Smoothly interpolate a value
export function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

// Clamp value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
