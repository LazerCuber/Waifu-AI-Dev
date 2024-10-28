import * as PIXI from "pixi.js";
import React, { useEffect, useRef, useCallback, memo } from "react";
import { useAtomValue } from "jotai";
import { lastMessageAtom } from "~/atoms/ChatAtom";

if (typeof window !== "undefined") (window as any).PIXI = PIXI;

const SENSITIVITY = 0.95, SMOOTHNESS = 1, RECENTER_DELAY = 1000, BREATH_FACTOR = 0.02;
let Live2DModel: any;

const live2DModelImport = import("pixi-live2d-display/cubism4");

const preloadModules = async () => {
  const module = await live2DModelImport;
  Live2DModel = module.Live2DModel;
};

const preloadModel = async () => {
  await preloadModules();
  return await Live2DModel.from("/model/vanilla/vanilla.model3.json");
};

const Model: React.FC = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastMessage = useAtomValue(lastMessageAtom);
  const modelRef = useRef<any>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const mouseMoveRef = useRef({ last: 0, target: { x: 0, y: 0 }, current: { x: 0, y: 0 } });

  const updateModelSize = useCallback(() => {
    const model = modelRef.current;
    const app = appRef.current;
    if (model && app) {
      const scale = Math.min(app.screen.width / model.width, app.screen.height / model.height);
      model.scale.set(scale);
      model.position.set(app.screen.width / 2, app.screen.height * 0.85);
    }
  }, []);

  const onMouseMove = useCallback((event: MouseEvent) => {
    const rect = appRef.current?.view.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = event;
      mouseMoveRef.current.target = {
        x: ((clientX - rect.left) / rect.width - 0.5) * 2 * SENSITIVITY,
        y: -(((clientY - rect.top) / rect.height - 0.5) * 2 * SENSITIVITY),
      };
      mouseMoveRef.current.last = Date.now();
    }
  }, []);

  const updateHeadPosition = useCallback(() => {
    const model = modelRef.current;
    if (model) {
      const now = Date.now();
      const factor = Math.max(0, Math.min((now - mouseMoveRef.current.last - RECENTER_DELAY) / 1000, 1));
      const easeFactor = (1 - Math.cos(factor * Math.PI)) / 2;  // Improved interpolation
      mouseMoveRef.current.current.x += (mouseMoveRef.current.target.x * (1 - easeFactor) - mouseMoveRef.current.current.x) * SMOOTHNESS;
      mouseMoveRef.current.current.y += (mouseMoveRef.current.target.y * (1 - easeFactor) - mouseMoveRef.current.current.y) * SMOOTHNESS;
      model.internalModel.focusController?.focus(mouseMoveRef.current.current.x, mouseMoveRef.current.current.y);
    }
  }, []);

  const updateBodyPosition = useCallback(() => {
    const model = modelRef.current;
    if (model) {
      const breathingFactor = Math.sin(performance.now() * 0.001) * BREATH_FACTOR;
      model.internalModel.coreModel.setParameterValueById('ParamBreath', breathingFactor);
    }
  }, []);

  const animationLoop = useCallback(() => {
    const app = appRef.current;
    if (!app) return;

    updateHeadPosition();
    updateBodyPosition();
    app.render();

    requestAnimationFrame(animationLoop);
  }, [updateHeadPosition, updateBodyPosition]);

  useEffect(() => {
    (async () => {
      const app = new PIXI.Application({
        view: canvasRef.current!,
        backgroundAlpha: 0,
        resizeTo: window,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      appRef.current = app;

      modelRef.current = await preloadModel();
      app.stage.addChild(modelRef.current);
      modelRef.current.anchor.set(0.5, 0.78);
      updateModelSize();

      window.addEventListener('mousemove', onMouseMove, { passive: true });
      window.addEventListener('resize', updateModelSize);

      animationLoop();

      return () => {
        window.removeEventListener('resize', updateModelSize);
        window.removeEventListener('mousemove', onMouseMove);
        app.destroy(true, { children: true, texture: true, baseTexture: true });
        modelRef.current = null;
        appRef.current = null;
      };
    })();
  }, [onMouseMove, updateModelSize, animationLoop]);

  // Handle assistant message animations
  useEffect(() => {
    if (lastMessage?.role === 'assistant' && modelRef.current) {
      const duration = lastMessage.content.length * 55;
      const startTime = performance.now();

      const animate = (time: number) => {
        const elapsed = time - startTime;
        modelRef.current.internalModel.coreModel.setParameterValueById(
          'ParamMouthOpenY',
          elapsed < duration ? Math.sin(elapsed / 100) * 0.5 + 0.5 : 0
        );
        if (elapsed < duration) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }, [lastMessage]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
});

export default Model;