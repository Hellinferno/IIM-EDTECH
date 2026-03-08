"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/types";
import { ChatBubble } from "./ChatBubble";
import { StreamingText } from "./StreamingText";
import { TypingIndicator } from "./TypingIndicator";

interface ChatThreadProps {
  messages: Message[];
  streamingText?: string;
  isLoading?: boolean;
  className?: string;
}

export function ChatThread({
  messages,
  streamingText,
  isLoading = false,
  className = ""
}: ChatThreadProps): JSX.Element {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, isLoading]);

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 ${className}`}>
      {messages.map((message) => (
        <ChatBubble key={message.id} message={message} />
      ))}
      {streamingText ? <StreamingText text={streamingText} /> : null}
      {isLoading && !streamingText ? <TypingIndicator /> : null}
      <div ref={bottomRef} />
    </div>
  );
}
