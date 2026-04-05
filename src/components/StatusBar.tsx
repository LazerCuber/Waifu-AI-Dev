"use client";

import { useEffect, useState, useRef } from "react";

interface StatusBarProps {
  live2dReady: boolean;
}

export default function StatusBar({ live2dReady }: StatusBarProps) {
  const [time, setTime] = useState<string>("");
  const [fps, setFps] = useState<number>(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const hour12 = hours % 12 || 12;
      setTime(`${hour12}:${minutes} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate FPS
  useEffect(() => {
    let animationId: number;

    const measureFps = () => {
      frameCountRef.current++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;

      if (delta >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / delta));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationId = requestAnimationFrame(measureFps);
    };

    animationId = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="absolute top-4 right-4 z-20 flex items-center gap-4">
      {/* Live2D Status */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/10">
        <div 
          className={`w-1.5 h-1.5 rounded-full ${
            live2dReady ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
          }`} 
        />
        <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">
          {live2dReady ? "Live2D" : "Loading"}
        </span>
      </div>

      {/* FPS Counter */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/10">
        <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">
          {fps} FPS
        </span>
      </div>

      {/* Time */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/10">
        <span className="text-[11px] font-medium text-white/60 tracking-wider">
          {time}
        </span>
      </div>
    </div>
  );
}
