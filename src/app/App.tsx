import { ChatterBox } from '~/components/ChatterBox';
import { Model } from '~/components/Model';
import { ChatInput } from '~/components/ChatInput';

export function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <div className="w-full flex-1">
        <Model />
      </div>
      <ChatterBox />
      <ChatInput />
    </main>
  );
}