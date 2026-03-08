"use client";

import { useEffect, useRef, useState } from "react";
import { consumeSSE } from "@/lib/sse-client";
import type { AppMode, ImageInput, Message } from "@/types";

interface SendUserMessageOptions {
  mode: AppMode;
  ocrText?: string;
  image?: ImageInput;
}

interface UseChatResult {
  messages: Message[];
  streamingText: string;
  isLoading: boolean;
  error: string;
  sendUserMessage: (text: string, options: SendUserMessageOptions) => Promise<void>;
  reset: () => void;
  appendAssistantMessage: (text: string) => void;
}

function buildMessage(role: Message["role"], content: string): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now()
  };
}

export function useChat(initialMessages: Message[] = []): UseChatResult {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const messagesRef = useRef<Message[]>(initialMessages);
  const [streamingText, setStreamingText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const appendAssistantMessage = (text: string): void => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    setMessages((current) => [...current, buildMessage("assistant", trimmed)]);
  };

  const sendUserMessage = async (
    text: string,
    options: SendUserMessageOptions
  ): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) {
      return;
    }

    setError("");
    setIsLoading(true);
    setStreamingText("");

    const nextMessages = [...messagesRef.current, buildMessage("user", trimmed)];
    setMessages(nextMessages);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          mode: options.mode,
          ocrText: options.ocrText,
          image: options.image
        })
      });

      let fullText = "";
      await consumeSSE(response, (data) => {
        if (data === "[DONE]") {
          return;
        }
        if (data === "[ERROR]") {
          throw new Error("Streaming error");
        }
        const token = JSON.parse(data) as string;
        fullText += token;
        setStreamingText(fullText);
      });

      if (fullText.trim()) {
        setMessages((current) => [...current, buildMessage("assistant", fullText.trim())]);
      }
      setStreamingText("");
    } catch {
      setError("Something went wrong, please try again.");
      setStreamingText("");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = (): void => {
    messagesRef.current = [];
    setMessages([]);
    setStreamingText("");
    setError("");
    setIsLoading(false);
  };

  return {
    messages,
    streamingText,
    isLoading,
    error,
    sendUserMessage,
    reset,
    appendAssistantMessage
  };
}
