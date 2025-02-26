/** @jsxImportSource preact */
import { h, FunctionComponent } from 'preact';
import { useAtom } from "jotai";
import { useEffect, useState } from "preact/hooks";
import { isLoadingAtom, lastMessageAtom } from "../atoms/ChatAtom";
import { Spinner } from "./Spinner";

const messageAppearStyles = `
  @keyframes messageAppear {
    from {
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  .animate-message-appear {
    animation: messageAppear 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
`;

export const ChatterBox: FunctionComponent = () => {
  const [message] = useAtom(lastMessageAtom);
  const [isLoading] = useAtom(isLoadingAtom);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!document.getElementById('message-appear-styles')) {
      const style = document.createElement('style');
      style.id = 'message-appear-styles';
      style.textContent = messageAppearStyles;
      document.head.appendChild(style);
    }
    setKey(prevKey => prevKey + 1);
  }, [message]);

  if (!message && !isLoading) {
    return null;
  }

  const cleanMessage = message?.content 
    ? (message.content as string).replace(/^\[(happy|sad|surprised|angry|neutral)\]/, '').trim()
    : '';

  return (
    <div className="absolute top-7 flex flex-col-reverse items-center">
      {isLoading ? (
        <Spinner />
      ) : (
        <div
          key={key}
          className="flex max-w-3xl justify-center rounded-[14px] bg-white/95 p-5 shadow-lg backdrop-blur-sm animate-message-appear border border-white/20"
        >
          <span className="overflow-hidden text-center font-geist font-medium text-gray-800 tracking-wide">
            {cleanMessage}
          </span>
        </div>
      )}
    </div>
  );
}