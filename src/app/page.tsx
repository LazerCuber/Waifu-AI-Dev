"use client";
import { useEffect, useState, memo } from 'react';
import dynamic from 'next/dynamic';
import ChatInput from "~/components/ChatInput";

const Bg = memo(() => (
  <div className="absolute inset-0 z-0 overflow-hidden bg-cover bg-center" style={{backgroundImage:'url(/one.avif)'}}/>
));

const Box = dynamic(() => import("~/components/ChatterBox"), {ssr: false});
const Model = dynamic(() => import("~/components/Model"), {ssr: false});

const Dots = () => (
  <div className="flex space-x-2 animate-pulse">
    {[...Array(3)].map((_, i) => <div key={i} className="w-3 h-3 bg-gray-500 rounded-full"/>)}
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
      document.body.removeChild(s);
    };
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <Bg/>
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full slideUp">
        <ChatInput/>
        <div className="h-screen flex justify-center items-center w-full">
          {!ready ? <Dots/> : (<><Box/><Model/></>)}
        </div>
      </div>
    </main>
  );
}