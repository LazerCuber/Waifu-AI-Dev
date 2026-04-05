"use client";
import { useEffect, useState } from 'react';
import React from 'react';
import dynamic from 'next/dynamic';
import ChatInput from "~/components/ChatInput";
import StatusBar from "~/components/StatusBar";

const Bg = React.memo(() => (
  <div className="absolute inset-0 z-0 overflow-hidden bg-cover bg-center" style={{backgroundImage:'url(/one.avif)'}}/>
));

const Box = dynamic(() => import("~/components/ChatterBox"), {ssr: false});
const Model = dynamic(() => import("~/components/Model"), {ssr: false});

const Dots = () => (
  <div className="flex items-center gap-1.5">
    {[...Array(3)].map((_, i) => (
      <div 
        key={i} 
        className="w-2 h-2 bg-white/40 rounded-full animate-pulse"
        style={{ animationDelay: `${i * 150}ms` }}
      />
    ))}
  </div>
);

export default function Page() {
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    const s = document.createElement('script');
    s.src = '/live2dcubismcore.min.js';
    s.defer = true;
    s.onload = () => setReady(true);
    document.body.appendChild(s);
    
    return () => {
      if (document.body.contains(s)) {
        document.body.removeChild(s);
      }
    };
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <Bg/>
      <StatusBar live2dReady={ready} />
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full slideUp">
        <ChatInput/>
        <div className="h-screen flex justify-center items-center w-full">
          {!ready ? <Dots/> : (<><Box/><Model/></>)}
        </div>
      </div>
    </main>
  );
}
