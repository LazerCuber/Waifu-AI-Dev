import * as PIXI from 'pixi.js';
import { Application } from 'pixi.js';
import { useAtomValue } from 'jotai';
import { lastMessageAtom } from '~/atoms/ChatAtom';
import React, { useEffect, useRef, useCallback, memo } from 'react';
import { Live2DModel } from 'pixi-live2d-display/cubism4';
import { type CoreMessage } from "ai";

if (typeof window !== 'undefined') (window as any).PIXI = PIXI;

const SENSITIVITY = 0.95;
const SMOOTHNESS = 1;
const RECENTER_DELAY = 1000;

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

  const animateModel = useCallback((deltaTime: number) => {
    const model = modelRef.current;
    if (model) {
      const now = Date.now();
      const factor = Math.max(0, Math.min((now - mouseMoveRef.current.last - RECENTER_DELAY) / 1000, 1));
      const easeFactor = Math.sin(Math.PI * factor / 2);
      mouseMoveRef.current.current.x += (mouseMoveRef.current.target.x * (1 - easeFactor) - mouseMoveRef.current.current.x) * SMOOTHNESS * deltaTime;
      mouseMoveRef.current.current.y += (mouseMoveRef.current.target.y * (1 - easeFactor) - mouseMoveRef.current.current.y) * SMOOTHNESS * deltaTime;
      model.internalModel.focusController?.focus(mouseMoveRef.current.current.x, mouseMoveRef.current.current.y);
    }
  }, []);

  const renderLoop = useCallback((deltaTime: number) => {
    animateModel(deltaTime);
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

      try {
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

        console.log('Available expressions:', modelRef.current.internalModel.motionManager.definitions.expressions);

        return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          app.ticker.remove(renderLoop);
          app.destroy(true, { children: true, texture: true, baseTexture: true });
        };
      } catch (error) {
        console.error('Error setting up Pixi.js application:', error);
      }
    })();
  }, [renderLoop, updateModelSize]);

  useEffect(() => {
    if (lastMessage?.role === 'assistant' && modelRef.current) {
      const duration = lastMessage.content.length * 55;
      const startTime = performance.now();
      
      const emotion = (lastMessage as CoreMessage & { emotion?: string }).emotion || 'Neutral';
      console.log('Applying emotion:', emotion);
      
      try {
        if (modelRef.current.expression) {
          modelRef.current.expression(emotion);
        } else if (modelRef.current.internalModel.expressions) {
          const expressionIndex = modelRef.current.internalModel.expressions.indexOf(emotion);
          if (expressionIndex >= 0) {
            modelRef.current.internalModel.expressions.setExpression(expressionIndex);
          }
        } else if (modelRef.current.internalModel.motionManager.expressionManager) {
          const manager = modelRef.current.internalModel.motionManager.expressionManager;
          manager.startMotion(emotion);
        }
      } catch (error) {
        console.error('Error applying expression:', error);
      }

      const animate = (time: number) => {
        const elapsedMS = time - startTime;
        modelRef.current.internalModel.coreModel.setParameterValueById('ParamMouthOpenY',
          elapsedMS < duration ? Math.sin(elapsedMS / 100) * 0.5 + 0.5 : 0);
        if (elapsedMS < duration) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }, [lastMessage]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
});

export default Model;