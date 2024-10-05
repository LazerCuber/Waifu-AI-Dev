"use client";

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import ChatInput from "~/components/ChatInput";
import React from 'react';

const ChatterBox = dynamic(() => import("~/components/ChatterBox"), { ssr: false });
const Model = dynamic(() => import("~/components/Model"), { ssr: false });

const Background = () => (
  <div className="absolute inset-0 z-0 overflow-hidden bg-cover bg-center" 
       style={{ backgroundImage: 'url(/one.avif)' }}>
  </div>
);

export default function Page() {
  const [live2dLoaded, setLive2dLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/live2dcubismcore.min.js';
    script.defer = true;
    script.onload = () => setLive2dLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const renderContents = useMemo(() => {
    return live2dLoaded && (
      <>
        <ChatterBox />
        <Model />
      </>
    );
  }, [live2dLoaded]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <Background />
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
        <ChatInput />
        <div className="h-screen flex justify-center items-center w-full">
          {renderContents}
        </div>
      </div>
    </main>
  );
}