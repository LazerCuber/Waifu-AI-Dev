"use client";

import type { CoreMessage } from "ai";
import { useAtom } from "jotai";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { IoSend } from "react-icons/io5";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { isLoadingAtom, lastMessageAtom, messageHistoryAtom } from "~/atoms/ChatAtom";

type SpeechRecognition = any;

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default function ChatInput() {
  const [messages, setMessages] = useAtom(messageHistoryAtom);
  const [lastMessage, setLastMessage] = useAtom(lastMessageAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [input, setInput] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isAudioContextReady, setIsAudioContextReady] = useState(false);

  const refs = {
    audioContext: useRef<AudioContext | null>(null),
    sourceNode: useRef<AudioBufferSourceNode | null>(null),
    audioQueue: useRef<AudioBuffer[]>([]),
    isPlaying: useRef(false),
    recognition: useRef<SpeechRecognition | null>(null),
    input: useRef<HTMLInputElement | null>(null),
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    refs.recognition.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        const res = e.results[i];
        res.isFinal ? (final += res[0].transcript) : (interim += res[0].transcript);
      }
      setTranscript(interim || final);
      if (final) setInput((prev) => prev + final);
    };

    recognition.onerror = (e: any) => {
      console.error('Speech error:', e.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    return () => recognition.stop();
  }, []);

  useEffect(() => {
    const handleGesture = async () => {
      if (!refs.audioContext.current) refs.audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (refs.audioContext.current.state === 'suspended') await refs.audioContext.current.resume();
      setIsAudioContextReady(true);
    };

    const events = ['click', 'touchstart'];
    events.forEach((e) => document.addEventListener(e, handleGesture));

    return () => {
      events.forEach((e) => document.removeEventListener(e, handleGesture));
      refs.audioContext.current?.close();
      refs.sourceNode.current?.disconnect();
      refs.isPlaying.current = false;
      refs.audioQueue.current = [];
    };
  }, []);

  const toggleListening = useCallback(() => {
    const recognition = refs.recognition.current;
    if (!recognition) {
      alert('No speech support.');
      return;
    }

    isListening ? recognition.stop() : (recognition.start(), setTranscript(""), refs.input.current?.focus());
    setIsListening((prev) => !prev);
  }, [isListening]);

  const synthesizeSentence = useCallback(async (sentence: string): Promise<AudioBuffer | null> => {
    try {
      const resp = await fetch("/api/synthasize", {
        method: "POST",
        body: JSON.stringify({ message: { content: sentence, role: "assistant" } }),
        headers: { "Content-Type": "application/json" },
      });
      if (!resp.ok) throw new Error(`Synth fail: ${resp.statusText}`);
      return await refs.audioContext.current!.decodeAudioData(await resp.arrayBuffer());
    } catch (error) {
      console.error("Synth error:", error);
      return null;
    }
  }, []);

  const playSentence = useCallback((buffer: AudioBuffer): Promise<void> => {
    return new Promise((resolve) => {
      const context = refs.audioContext.current;
      if (!context) return resolve();

      if (context.state === 'suspended') context.resume().catch(console.error);

      const source = context.createBufferSource();
      refs.sourceNode.current?.disconnect();
      refs.sourceNode.current = source;
      source.buffer = buffer;
      source.connect(context.destination);
      source.onended = () => resolve();
      source.start();
    });
  }, []);

  const playNext = useCallback(async (): Promise<void> => {
    if (!refs.audioQueue.current.length) {
      refs.isPlaying.current = false;
      return;
    }
    const audio = refs.audioQueue.current.shift();
    if (audio) await playSentence(audio);
    playNext();
  }, [playSentence]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      setIsLoading(true);
      const newMessages: CoreMessage[] = [...messages, { content: input, role: "user" }];
      setMessages(newMessages);
      setInput("");
      setTranscript("");

      try {
        const resp = await fetch("/api/chat", {
          method: "POST",
          body: JSON.stringify({ messages: newMessages }),
          headers: { "Content-Type": "application/json" },
        });
        const textResult = (await resp.json()) as CoreMessage;
        setLastMessage(textResult);
        setMessages([...newMessages, textResult]);
        setIsLoading(false);

        if (typeof textResult.content === "string") {
          const sentences = textResult.content.match(/[^.!?]+[.!?]+|\S+/g) || [];
          const batchSize = 5;

          for (let i = 0; i < sentences.length; i += batchSize) {
            const batch = sentences.slice(i, i + batchSize);
            const audioBuffers = await Promise.all(batch.map((s) => synthesizeSentence(s.trim())));

            audioBuffers.forEach((buffer) => {
              if (buffer) {
                refs.audioQueue.current.push(buffer);
                if (!refs.isPlaying.current && isAudioContextReady) {
                  refs.isPlaying.current = true;
                  playNext();
                }
              }
            });
          }
        }
      } catch (error) {
        console.error("Submit error:", error);
        alert("Message error.");
        setIsLoading(false);
      }
    },
    [messages, input, setMessages, setLastMessage, setIsLoading, synthesizeSentence, playNext, isAudioContextReady]
  );

  return (
    <div className="absolute bottom-10 h-10 w-full max-w-lg px-5" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <form onSubmit={handleSubmit}>
        <div className={`flex w-full items-center overflow-hidden rounded-[12px] bg-white shadow transition-all duration-300 ${isHovered || input ? 'border-[rgb(196,191,228)] shadow-lg scale-105' : 'border-transparent'} border-2`}>
          <button
            type="button"
            onClick={toggleListening}
            disabled={isLoading}
            aria-label={isListening ? "Stop listening" : "Start listening"}
            className={`p-1 rounded-full ${isListening ? 'bg-red-100' : 'hover:bg-gray-100'} mx-4`}
          >
            {isListening ? <FaMicrophoneSlash className="text-red-500" /> : <FaMicrophone className="text-gray-500 hover:text-gray-700" />}
          </button>
          <input
            ref={refs.input}
            className="h-full w-full px-2 py-2 text-neutral-800 outline-none"
            type="text"
            placeholder={isListening ? transcript || "Listening..." : "Enter your message..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSubmit(e as any)}
            disabled={isLoading}
            aria-label="Chat input"
          />
          <button type="submit" disabled={isLoading} aria-label="Send message" className="mx-4">
            <IoSend className="text-blue-400 transition-colors hover:text-blue-500" />
          </button>
        </div>
      </form>
    </div>
  );
}