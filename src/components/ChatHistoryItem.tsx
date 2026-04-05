"use client";

import { motion } from "framer-motion";
import { MessageSquare, Trash2 } from "lucide-react";
import type { ChatSession } from "~/lib/db";
import { useState } from "react";

interface ChatHistoryItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

export default function ChatHistoryItem({ 
  session, 
  isActive, 
  onSelect, 
  onDelete 
}: ChatHistoryItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const messageCount = session.messages.length;
  const lastUserMessage = session.messages.filter(m => m.role === 'user').pop();
  const preview = lastUserMessage && typeof lastUserMessage.content === 'string'
    ? lastUserMessage.content.slice(0, 40) + (lastUserMessage.content.length > 40 ? '...' : '')
    : 'No messages';

  return (
    <motion.button
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors focus-ring
        ${isActive 
          ? 'bg-accent text-foreground' 
          : 'text-foreground/80 hover:bg-accent/50'
        }
      `}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary/10">
        <MessageSquare className="h-4 w-4 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">
            {session.title}
          </span>
          <span className="flex-shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(session.updatedAt)}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground mt-0.5">
          {preview}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {messageCount} message{messageCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Delete button */}
      <motion.button
        onClick={handleDelete}
        className={`
          absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center 
          rounded-md bg-destructive/10 text-destructive opacity-0 transition-opacity 
          hover:bg-destructive/20 focus-ring
          ${isHovered ? 'opacity-100' : ''}
        `}
        initial={{ scale: 0.8 }}
        animate={{ scale: isHovered ? 1 : 0.8 }}
        aria-label="Delete chat"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </motion.button>
    </motion.button>
  );
}
