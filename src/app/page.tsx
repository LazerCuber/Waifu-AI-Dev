"use client";

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ChatInput from "~/components/ChatInput";
import React, { memo } from 'react';

const Background = memo(() => (
  <div className="absolute inset-0 z-0 overflow-hidden bg-cover bg-center" 
       style={{ backgroundImage: 'url(/one.avif)' }} />
));

const ChatterBox = dynamic(() => import("~/components/ChatterBox"), { ssr: false, loading: () => null });
const Model = dynamic(() => import("~/components/Model"), { ssr: false, loading: () => null });

export default function Page() {
  const [live2dLoaded, setLive2dLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadLive2D = useCallback(() => {
    const script = document.createElement('script');
    script.src = '/live2dcubismcore.min.js';
    script.defer = true;
    script.onload = () => { setLive2dLoaded(true); setIsLoading(false); };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const cleanup = loadLive2D();
    return cleanup;
  }, [loadLive2D]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <Background />
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full slideUp">
        <ChatInput />
        <div className="h-screen flex justify-center items-center w-full">
          {isLoading ? (
            <div className="flex space-x-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="w-3 h-3 bg-gray-500 rounded-full" />)}
            </div>
          ) : (
            live2dLoaded && <><ChatterBox /><Model /></>
          )}
        </div>
      </div>
    </main>
  );
}