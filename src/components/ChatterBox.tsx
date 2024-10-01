"use client";

import { useAtom } from "jotai";
import React, { useEffect, useState } from "react";
import { isLoadingAtom, lastMessageAtom } from "~/atoms/ChatAtom";
import Spinner from "./Spinner";

export default function ChatterBox() {
  const [message] = useAtom(lastMessageAtom);
  const [isLoading] = useAtom(isLoadingAtom);
  const [key, setKey] = useState(0);

  useEffect(() => {
    setKey(prevKey => prevKey + 1);
  }, [message]);

  if (!message && !isLoading) {
    return null;
  }

  return (
    <div className="absolute top-7 flex flex-col-reverse items-center">
      {isLoading ? (
        <Spinner />
      ) : (
        <div
          key={key}
          className="flex max-w-3xl justify-center border-[3px] rounded-[14px] bg-white p-4 shadow animate-message-appear"
        >
          <span className="overflow-hidden text-center font-medium">
            {message?.content as string}
          </span>
        </div>
      )}
      <style jsx>{`
        @keyframes messageAppear {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-message-appear {
          animation: messageAppear 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}