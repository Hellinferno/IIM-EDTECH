"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "@/types";

function buildMessage(role: Message["role"], content: string): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now()
  };
}

interface UseConversationResult {
  messages: Message[];
  addUserMessage: (text: string) => Message[];
  addAssistantMessage: (text: string) => void;
  clearHistory: () => void;
}

export function useConversation(): UseConversationResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const addUserMessage = useCallback((text: string): Message[] => {
    const userMsg = buildMessage("user", text);
    const updated = [...messagesRef.current, userMsg];
    setMessages(updated);
    return updated;
  }, []);

  const addAssistantMessage = useCallback((text: string): void => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((current) => [...current, buildMessage("assistant", trimmed)]);
  }, []);

  const clearHistory = useCallback((): void => {
    messagesRef.current = [];
    setMessages([]);
  }, []);

  return {
    messages,
    addUserMessage,
    addAssistantMessage,
    clearHistory
  };
}
