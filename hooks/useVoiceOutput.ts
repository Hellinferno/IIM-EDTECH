"use client";

import { useCallback, useRef, useState } from "react";

interface UseVoiceOutputResult {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
}

/**
 * Splits text into sentences for progressive TTS output.
 * Handles common abbreviations to avoid false splits.
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace
  const raw = text.match(/[^.!?]+[.!?]+[\s]*/g);
  if (!raw) return text.trim() ? [text.trim()] : [];
  return raw.map((s) => s.trim()).filter(Boolean);
}

export function useVoiceOutput(): UseVoiceOutputResult {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const queueRef = useRef<string[]>([]);
  const activeRef = useRef<boolean>(false);

  const speakNext = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (queueRef.current.length === 0) {
      activeRef.current = false;
      setIsSpeaking(false);
      return;
    }

    const sentence = queueRef.current.shift()!;
    // Strip markdown/LaTeX for cleaner TTS
    const clean = sentence
      .replace(/\$\$[^$]*\$\$/g, "equation")
      .replace(/\$[^$]*\$/g, "expression")
      .replace(/[*_~`#>]/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .trim();

    if (!clean) {
      speakNext();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "en-IN";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      speakNext();
    };

    utterance.onerror = (event) => {
      if (event.error === "canceled" || event.error === "interrupted") {
        // Normal cancellation — not an error
        return;
      }
      speakNext();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      const sentences = splitIntoSentences(text);
      if (sentences.length === 0) return;

      queueRef.current.push(...sentences);

      if (!activeRef.current) {
        activeRef.current = true;
        setIsSpeaking(true);
        speakNext();
      }
    },
    [speakNext]
  );

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    queueRef.current = [];
    activeRef.current = false;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
}
