"use client";

import * as PIXI from "pixi.js";
import { Application } from "pixi.js";
import { useAtom, useAtomValue } from "jotai";
import { 
  lastMessageAtom, 
  currentEmotionAtom, 
  isHeadpatActiveAtom,
  isPokedAtom,
  type Emotion 
} from "~/atoms/ChatAtom";
import React, { useEffect, useRef, useCallback } from "react";
import { Live2DModel } from "pixi-live2d-display/cubism4";
import type { CoreMessage } from "ai";
import {
  INTERACTION_ZONES,
  IDLE_CONFIG,
  HEADPAT_CONFIG,
  POKE_CONFIG,
  PARAM_IDS,
  isInZone,
  findExpression,
  randomInRange,
  lerp,
  clamp,
  ease,
} from "~/lib/live2d-interactions";

// Expose PIXI to window for pixi-live2d-display
if (typeof window !== "undefined") {
  (window as any).PIXI = PIXI;
}

const SENSITIVITY = 0.95;
const SMOOTHNESS = 0.08;
const RECENTER_DELAY = 1500;

const preloadModel = () => Live2DModel.from("/model/vanilla/vanilla.model3.json");

interface IdleState {
  breathPhase: number;
  swayPhase: number;
  lastBlink: number;
  nextBlinkTime: number;
  isBlinking: boolean;
  blinkProgress: number;
  microMovementTarget: { x: number; y: number };
  lastMicroMovement: number;
  nextMicroMovementTime: number;
}

interface InteractionState {
  isHeadpatting: boolean;
  headpatStartTime: number;
  pokeCount: number;
  lastPokeTime: number;
  isReacting: boolean;
}

const Model = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastMessage = useAtomValue(lastMessageAtom);
  const [currentEmotion, setCurrentEmotion] = useAtom(currentEmotionAtom);
  const [isHeadpatActive, setIsHeadpatActive] = useAtom(isHeadpatActiveAtom);
  const [, setIsPoked] = useAtom(isPokedAtom);
  
  const modelRef = useRef<any>(null);
  const appRef = useRef<Application | null>(null);
  const availableExpressionsRef = useRef<string[]>([]);
  
  // Mouse tracking state
  const mouseMoveRef = useRef({
    last: 0,
    target: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
    screenPos: { x: 0, y: 0 },
  });
  
  // Idle animation state
  const idleStateRef = useRef<IdleState>({
    breathPhase: 0,
    swayPhase: Math.random() * Math.PI * 2,
    lastBlink: Date.now(),
    nextBlinkTime: randomInRange(...IDLE_CONFIG.blinkInterval),
    isBlinking: false,
    blinkProgress: 0,
    microMovementTarget: { x: 0, y: 0 },
    lastMicroMovement: Date.now(),
    nextMicroMovementTime: randomInRange(...IDLE_CONFIG.microMovementInterval),
  });
  
  // Interaction state
  const interactionStateRef = useRef<InteractionState>({
    isHeadpatting: false,
    headpatStartTime: 0,
    pokeCount: 0,
    lastPokeTime: 0,
    isReacting: false,
  });

  // Update model size on resize
  const updateModelSize = useCallback(() => {
    if (!modelRef.current || !appRef.current) return;
    const scale = Math.min(
      appRef.current.screen.width / modelRef.current.width,
      appRef.current.screen.height / modelRef.current.height
    );
    modelRef.current.scale.set(scale);
    modelRef.current.position.set(
      appRef.current.screen.width / 2,
      appRef.current.screen.height * 0.85
    );
  }, []);

  // Set parameter safely
  const setParameter = useCallback((paramId: string, value: number) => {
    try {
      if (modelRef.current?.internalModel?.coreModel) {
        modelRef.current.internalModel.coreModel.setParameterValueById(paramId, value);
      }
    } catch {
      // Parameter may not exist on this model
    }
  }, []);

  // Apply expression
  const applyExpression = useCallback((emotion: Emotion) => {
    if (!modelRef.current) return;
    
    const expressionName = findExpression(emotion, availableExpressionsRef.current);
    if (!expressionName) return;

    try {
      const model = modelRef.current;
      if (model.expression) {
        model.expression(expressionName);
      } else if (model.internalModel?.motionManager?.expressionManager) {
        model.internalModel.motionManager.expressionManager.startMotion(expressionName);
      }
    } catch (error) {
      console.error("Error applying expression:", error);
    }
  }, []);

  // Idle animation tick
  const updateIdleAnimations = useCallback((deltaTime: number) => {
    if (!modelRef.current?.internalModel?.coreModel) return;
    
    const now = Date.now();
    const idle = idleStateRef.current;
    const interaction = interactionStateRef.current;
    
    // Skip idle animations during reactions
    if (interaction.isReacting) return;

    // Breathing animation
    idle.breathPhase += IDLE_CONFIG.breathingSpeed * deltaTime * 60;
    const breathValue = Math.sin(idle.breathPhase) * IDLE_CONFIG.breathingIntensity;
    setParameter(PARAM_IDS.breath, 0.5 + breathValue);

    // Subtle body sway
    idle.swayPhase += IDLE_CONFIG.swaySpeed * deltaTime * 60;
    const swayX = Math.sin(idle.swayPhase) * IDLE_CONFIG.swayIntensity;
    const swayZ = Math.cos(idle.swayPhase * 0.7) * IDLE_CONFIG.swayIntensity * 0.5;
    
    // Only apply sway if not being controlled by mouse
    const timeSinceMove = now - mouseMoveRef.current.last;
    if (timeSinceMove > RECENTER_DELAY) {
      setParameter(PARAM_IDS.bodyAngleX, swayX * 10);
      setParameter(PARAM_IDS.bodyAngleZ, swayZ * 5);
    }

    // Blinking
    if (!idle.isBlinking && now - idle.lastBlink > idle.nextBlinkTime) {
      idle.isBlinking = true;
      idle.blinkProgress = 0;
    }

    if (idle.isBlinking) {
      idle.blinkProgress += deltaTime * 10;
      
      if (idle.blinkProgress < 0.5) {
        // Closing eyes
        const closeAmount = ease.inOutSine(idle.blinkProgress * 2);
        setParameter(PARAM_IDS.eyeOpenLeft, 1 - closeAmount);
        setParameter(PARAM_IDS.eyeOpenRight, 1 - closeAmount);
      } else if (idle.blinkProgress < 1) {
        // Opening eyes
        const openAmount = ease.inOutSine((idle.blinkProgress - 0.5) * 2);
        setParameter(PARAM_IDS.eyeOpenLeft, openAmount);
        setParameter(PARAM_IDS.eyeOpenRight, openAmount);
      } else {
        // Blink complete
        setParameter(PARAM_IDS.eyeOpenLeft, 1);
        setParameter(PARAM_IDS.eyeOpenRight, 1);
        idle.isBlinking = false;
        idle.lastBlink = now;
        idle.nextBlinkTime = randomInRange(...IDLE_CONFIG.blinkInterval);
      }
    }

    // Micro movements (subtle random head tilts)
    if (now - idle.lastMicroMovement > idle.nextMicroMovementTime) {
      idle.microMovementTarget = {
        x: randomInRange(-0.1, 0.1),
        y: randomInRange(-0.05, 0.05),
      };
      idle.lastMicroMovement = now;
      idle.nextMicroMovementTime = randomInRange(...IDLE_CONFIG.microMovementInterval);
    }
  }, [setParameter]);

  // Handle mouse/focus tracking
  const updateFocusTracking = useCallback((deltaTime: number) => {
    if (!modelRef.current?.internalModel?.focusController) return;

    const now = Date.now();
    const { current, target } = mouseMoveRef.current;
    const timeSinceMove = now - mouseMoveRef.current.last;
    
    // Gradually return to center after inactivity
    const returnFactor = clamp((timeSinceMove - RECENTER_DELAY) / 2000, 0, 1);
    const easedReturn = ease.inOutSine(returnFactor);
    
    const targetX = target.x * (1 - easedReturn);
    const targetY = target.y * (1 - easedReturn);

    // Smooth interpolation
    current.x = lerp(current.x, targetX, SMOOTHNESS * deltaTime * 60);
    current.y = lerp(current.y, targetY, SMOOTHNESS * deltaTime * 60);

    // Add micro movement offset when idle
    const idle = idleStateRef.current;
    const finalX = current.x + idle.microMovementTarget.x * easedReturn;
    const finalY = current.y + idle.microMovementTarget.y * easedReturn;

    modelRef.current.internalModel.focusController.focus(finalX, finalY);
  }, []);

  // Handle headpat animation
  const updateHeadpatAnimation = useCallback((deltaTime: number) => {
    const interaction = interactionStateRef.current;
    
    if (interaction.isHeadpatting) {
      const elapsed = Date.now() - interaction.headpatStartTime;
      const tiltAmount = Math.sin(elapsed * 0.005) * HEADPAT_CONFIG.headTiltMax;
      
      setParameter(PARAM_IDS.angleZ, tiltAmount * 30);
      setParameter(PARAM_IDS.eyeOpenLeft, 1 - HEADPAT_CONFIG.eyeSquintAmount);
      setParameter(PARAM_IDS.eyeOpenRight, 1 - HEADPAT_CONFIG.eyeSquintAmount);
      
      // Show happy expression during headpat
      if (elapsed < 100) {
        applyExpression("happy");
      }
    }
  }, [setParameter, applyExpression]);

  // Main animation loop
  const renderLoop = useCallback((deltaTime: number) => {
    updateIdleAnimations(deltaTime);
    updateFocusTracking(deltaTime);
    updateHeadpatAnimation(deltaTime);
  }, [updateIdleAnimations, updateFocusTracking, updateHeadpatAnimation]);

  // Check interaction zones
  const checkInteractionZone = useCallback((screenX: number, screenY: number) => {
    if (!modelRef.current || !appRef.current) return null;

    const bounds = modelRef.current.getBounds();
    const normalizedX = (screenX - bounds.x) / bounds.width;
    const normalizedY = (screenY - bounds.y) / bounds.height;

    if (isInZone(normalizedX, normalizedY, INTERACTION_ZONES.head)) return "head";
    if (isInZone(normalizedX, normalizedY, INTERACTION_ZONES.face)) return "face";
    if (isInZone(normalizedX, normalizedY, INTERACTION_ZONES.body)) return "body";
    return null;
  }, []);

  // Handle mouse move for tracking and headpat detection
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!appRef.current) return;

    const rect = (appRef.current.view as HTMLCanvasElement).getBoundingClientRect();
    const { clientX, clientY } = event;
    
    mouseMoveRef.current.screenPos = { x: clientX, y: clientY };
    mouseMoveRef.current.target = {
      x: ((clientX - rect.left) / rect.width - 0.5) * 2 * SENSITIVITY,
      y: -(((clientY - rect.top) / rect.height - 0.5) * 2 * SENSITIVITY),
    };
    mouseMoveRef.current.last = Date.now();

    // Check for headpat zone
    const zone = checkInteractionZone(clientX - rect.left, clientY - rect.top);
    const interaction = interactionStateRef.current;
    
    if (zone === "head" && !interaction.isHeadpatting) {
      interaction.isHeadpatting = true;
      interaction.headpatStartTime = Date.now();
      setIsHeadpatActive(true);
    } else if (zone !== "head" && interaction.isHeadpatting) {
      interaction.isHeadpatting = false;
      setIsHeadpatActive(false);
      // Reset head tilt and eyes
      setParameter(PARAM_IDS.angleZ, 0);
      setParameter(PARAM_IDS.eyeOpenLeft, 1);
      setParameter(PARAM_IDS.eyeOpenRight, 1);
      applyExpression(currentEmotion);
    }
  }, [checkInteractionZone, setIsHeadpatActive, setParameter, applyExpression, currentEmotion]);

  // Handle click for poke reactions
  const handleClick = useCallback((event: MouseEvent) => {
    if (!appRef.current) return;

    const rect = (appRef.current.view as HTMLCanvasElement).getBoundingClientRect();
    const zone = checkInteractionZone(
      event.clientX - rect.left,
      event.clientY - rect.top
    );

    if (!zone || zone === "head") return; // Headpat, not poke

    const interaction = interactionStateRef.current;
    const now = Date.now();

    // Check cooldown
    if (now - interaction.lastPokeTime < POKE_CONFIG.cooldown) return;

    interaction.lastPokeTime = now;
    interaction.pokeCount++;
    interaction.isReacting = true;
    setIsPoked(true);

    // Reset poke count after timeout
    if (now - interaction.lastPokeTime > POKE_CONFIG.annoyedResetTime) {
      interaction.pokeCount = 1;
    }

    // Determine reaction based on poke count
    const isAnnoyed = interaction.pokeCount >= POKE_CONFIG.annoyedThreshold;
    
    if (isAnnoyed) {
      applyExpression("angry");
    } else {
      applyExpression("surprised");
    }

    // Reset after reaction
    setTimeout(() => {
      interaction.isReacting = false;
      setIsPoked(false);
      applyExpression(currentEmotion);
    }, isAnnoyed ? 1500 : POKE_CONFIG.surpriseDuration);
  }, [checkInteractionZone, setIsPoked, applyExpression, currentEmotion]);

  // Initialize Pixi application and model
  useEffect(() => {
    const initApp = async () => {
      if (!canvasRef.current) return;

      const app = new Application({
        view: canvasRef.current,
        backgroundAlpha: 0,
        resizeTo: window,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      appRef.current = app;

      try {
        modelRef.current = await preloadModel();
        app.stage.addChild(modelRef.current);
        modelRef.current.anchor.set(0.5, 0.78);
        updateModelSize();

        // Get available expressions
        const expressionManager = modelRef.current.internalModel?.motionManager?.expressionManager;
        if (expressionManager?.definitions) {
          availableExpressionsRef.current = Object.keys(expressionManager.definitions);
        } else if (modelRef.current.internalModel?.motionManager?.definitions?.expressions) {
          availableExpressionsRef.current = modelRef.current.internalModel.motionManager.definitions.expressions.map(
            (e: any) => e.Name || e.name || e
          );
        }

        // Set up event listeners
        app.ticker.add(renderLoop);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("click", handleClick);
        window.addEventListener("resize", () => {
          app.renderer.resize(window.innerWidth, window.innerHeight);
          updateModelSize();
        });

        // Apply initial expression
        applyExpression("neutral");
      } catch (error) {
        console.error("Error setting up Live2D model:", error);
      }
    };

    initApp();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
      if (appRef.current) {
        appRef.current.ticker.remove(renderLoop);
        appRef.current.destroy(true, { children: true, texture: true, baseTexture: true });
      }
    };
  }, [renderLoop, updateModelSize, handleMouseMove, handleClick, applyExpression]);

  // Handle message changes - animate mouth and apply emotion
  useEffect(() => {
    if (lastMessage?.role !== "assistant" || !modelRef.current) return;

    const content = lastMessage.content as string;
    
    // Extract emotion from message
    const emotionMatch = content.match(/^\[(happy|sad|surprised|angry|neutral|thinking)\]/i);
    if (emotionMatch) {
      const emotion = emotionMatch[1].toLowerCase() as Emotion;
      setCurrentEmotion(emotion);
      applyExpression(emotion);
    }

    // Animate mouth for speech
    const cleanContent = content.replace(/^\[(happy|sad|surprised|angry|neutral|thinking)\]/i, "").trim();
    const duration = cleanContent.length * 55;
    const startTime = performance.now();

    const animateMouth = (time: number) => {
      if (!modelRef.current?.internalModel?.coreModel) return;
      
      const elapsedMS = time - startTime;
      const mouthValue = elapsedMS < duration 
        ? Math.sin(elapsedMS / 100) * 0.5 + 0.5 
        : 0;
      
      setParameter(PARAM_IDS.mouthOpenY, mouthValue);
      
      if (elapsedMS < duration) {
        requestAnimationFrame(animateMouth);
      }
    };
    
    requestAnimationFrame(animateMouth);
  }, [lastMessage, setCurrentEmotion, applyExpression, setParameter]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ touchAction: "none" }}
    />
  );
});

Model.displayName = "Model";

export default Model;
