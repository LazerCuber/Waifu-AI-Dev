/** @jsxImportSource preact */
import { h, FunctionComponent } from 'preact';
import { ChatterBox } from '../components/ChatterBox';
import { Model } from '../components/Model';
import { ChatInput } from '../components/ChatInput';
import { GeistSans } from "geist/font/sans";

export const App: FunctionComponent = () => {
  return (
    <main className={`flex min-h-screen flex-col items-center justify-between ${GeistSans.className}`}>
      <div className="w-full flex-1">
        <Model />
      </div>
      <ChatterBox />
      <ChatInput />
    </main>
  );
};