import * as PIXI from 'pixi.js';
import { Application } from 'pixi.js';
import { useAtomValue} from 'jotai';
import { lastMessageAtom } from '~/atoms/ChatAtom';
import React, { useEffect, useRef, useCallback, memo } from 'react';
import { Live2DModel } from 'pixi-live2d-display/cubism4';

if (typeof window !== 'undefined') (window as any).PIXI = PIXI;

const SENSITIVITY = 0.95, SMOOTHNESS = 1, RECENTER_DELAY = 1000;

const preloadModel = () => Live2DModel.from('/model/vanilla/vanilla.model3.json');

const Model: React.FC = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastMessage = useAtomValue(lastMessageAtom);
  const modelRef = useRef<any>(null);
  const appRef = useRef<Application | null>(null);
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

  const animateModel = useCallback(() => {
    const model = modelRef.current;
    if (model) {
      const now = Date.now();
      const factor = Math.max(0, Math.min((now - mouseMoveRef.current.last - RECENTER_DELAY) / 1000, 1));
      const easeFactor = Math.sin(Math.PI * factor / 2);
      mouseMoveRef.current.current.x += (mouseMoveRef.current.target.x * (1 - easeFactor) - mouseMoveRef.current.current.x) * SMOOTHNESS;
      mouseMoveRef.current.current.y += (mouseMoveRef.current.target.y * (1 - easeFactor) - mouseMoveRef.current.current.y) * SMOOTHNESS;
      model.internalModel.focusController?.focus(mouseMoveRef.current.current.x, mouseMoveRef.current.current.y);

      const breathingFactor = Math.sin(now * 0.001) * 0.02;
      model.internalModel.coreModel.setParameterValueById('ParamBreath', breathingFactor);
    }
  }, []);

  const renderLoop = useCallback(() => {
    animateModel();
    appRef.current?.render();
  }, [animateModel]);

  useEffect(() => {
    (async () => {
      const app = new Application({
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

      const handleMouseMove = (event: MouseEvent) => {
        const rect = appRef.current?.view.getBoundingClientRect();
        if (rect) {
          const { clientX, clientY } = event;
          mouseMoveRef.current.target = {
            x: ((clientX - rect.left) / rect.width - 0.5) * 2 * SENSITIVITY,
            y: -(((clientY - rect.top) / rect.height - 0.5) * 2 * SENSITIVITY),
          };
          mouseMoveRef.current.last = Date.now();
        }
      };
      window.addEventListener('mousemove', handleMouseMove, { passive: true });

      app.ticker.add(renderLoop);

      const handleResize = () => {
        app.renderer.resize(window.innerWidth, window.innerHeight);
        updateModelSize();
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
        app.destroy(true, { children: true, texture: true, baseTexture: true });
      };
    })();
  }, [renderLoop, updateModelSize]);

  useEffect(() => {
    if (lastMessage?.role === 'assistant' && modelRef.current) {
      const duration = lastMessage.content.length * 55;
      const startTime = performance.now();
      const animate = (time: number) => {
        const elapsed = time - startTime;
        modelRef.current.internalModel.coreModel.setParameterValueById('ParamMouthOpenY',
          elapsed < duration ? Math.sin(elapsed / 100) * 0.5 + 0.5 : 0);
        if (elapsed < duration) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }, [lastMessage]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
});

export default Model;