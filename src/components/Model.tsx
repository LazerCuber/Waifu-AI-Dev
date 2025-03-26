import * as PIXI from 'pixi.js';
import { Application } from 'pixi.js';
import { useAtomValue } from 'jotai';
import { lastMessageAtom } from '~/atoms/ChatAtom';
import React, { useEffect, useRef, useCallback } from 'react';
import { Live2DModel } from 'pixi-live2d-display/cubism4';
import { type CoreMessage } from "ai";

if (typeof window !== 'undefined') (window as any).PIXI = PIXI;

const SENSITIVITY = 0.95, SMOOTHNESS = 1, RECENTER_DELAY = 1000;

const preloadModel = () => Live2DModel.from('/model/vanilla/vanilla.model3.json');

const Model = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastMessage = useAtomValue(lastMessageAtom);
  const modelRef = useRef<any>(null);
  const appRef = useRef<Application | null>(null);
  const mouseMoveRef = useRef({ last: 0, target: { x: 0, y: 0 }, current: { x: 0, y: 0 } });

  const updateModelSize = useCallback(() => {
    if (!modelRef.current || !appRef.current) return;
    const scale = Math.min(
      appRef.current.screen.width / modelRef.current.width,
      appRef.current.screen.height / modelRef.current.height
    );
    modelRef.current.scale.set(scale);
    modelRef.current.position.set(appRef.current.screen.width / 2, appRef.current.screen.height * 0.85);
  }, []);

  const animateModel = useCallback((deltaTime: number) => {
    if (!modelRef.current?.internalModel.focusController) return;
    const now = Date.now();
    const factor = Math.max(0, Math.min((now - mouseMoveRef.current.last - RECENTER_DELAY) / 1000, 1));
    const easeFactor = Math.sin(Math.PI * factor / 2);
    const { current, target } = mouseMoveRef.current;
    current.x += (target.x * (1 - easeFactor) - current.x) * SMOOTHNESS * deltaTime;
    current.y += (target.y * (1 - easeFactor) - current.y) * SMOOTHNESS * deltaTime;
    modelRef.current.internalModel.focusController.focus(current.x, current.y);
  }, []);

  const renderLoop = useCallback((deltaTime: number) => animateModel(deltaTime), [animateModel]);

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
          const rect = app.view.getBoundingClientRect();
          const { clientX, clientY } = event;
          mouseMoveRef.current.target = {
            x: ((clientX - rect.left) / rect.width - 0.5) * 2 * SENSITIVITY,
            y: -(((clientY - rect.top) / rect.height - 0.5) * 2 * SENSITIVITY),
          };
          mouseMoveRef.current.last = Date.now();
        };

        app.ticker.add(renderLoop);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', () => {
          app.renderer.resize(window.innerWidth, window.innerHeight);
          updateModelSize();
        });

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
        const model = modelRef.current;
        if (model.expression) {
          model.expression(emotion);
        } else if (model.internalModel.expressions) {
          const index = model.internalModel.expressions.indexOf(emotion);
          if (index >= 0) model.internalModel.expressions.setExpression(index);
        } else if (model.internalModel.motionManager.expressionManager) {
          model.internalModel.motionManager.expressionManager.startMotion(emotion);
        }
      } catch (error) {
        console.error('Error applying expression:', error);
      }

      const animateMouth = (time: number) => {
        const elapsedMS = time - startTime;
        modelRef.current.internalModel.coreModel.setParameterValueById('ParamMouthOpenY',
          elapsedMS < duration ? Math.sin(elapsedMS / 100) * 0.5 + 0.5 : 0);
        if (elapsedMS < duration) requestAnimationFrame(animateMouth);
      };
      requestAnimationFrame(animateMouth);
    }
  }, [lastMessage]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
});

export default Model;