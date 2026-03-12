"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useInterrupt } from "@/hooks/useInterrupt";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { consumeSSE } from "@/lib/sse-client";
import type { ImageInput, Message } from "@/types";
import type { ExamType } from "@/types/exam";

type AgentStatus = "idle" | "listening" | "thinking" | "speaking";

interface UseLiveOCRAgentResult {
  error: string | null;
  initialized: boolean;
  isScanning: boolean;
  messages: Message[];
  microphoneAvailable: boolean;
  pageContext: string;
  quotaExhausted: boolean;
  scanPage: () => Promise<void>;
  startListening: () => void;
  status: AgentStatus;
  stopListening: () => void;
  streamingText: string;
  submitText: (text: string) => Promise<void>;
  transcript: string;
  interrupt: () => void;
}

const CONTEXT_WINDOW = 6;
const MIN_WORDS = 3;
const JPEG_QUALITY = 0.72;
const MAX_CAPTURE_WIDTH = 960;
const MAX_CAPTURE_HEIGHT = 720;

function buildMessage(role: Message["role"], content: string): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now()
  };
}

function trimMessages(messages: Message[]): Message[] {
  if (messages.length <= CONTEXT_WINDOW) {
    return messages;
  }

  const first = messages[0];
  const tail = messages.slice(-CONTEXT_WINDOW);
  if (tail[0]?.id === first.id) {
    return tail;
  }

  return [first, ...tail];
}

function isDeepScanCommand(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return [
    "scan this page",
    "scan this",
    "scan page",
    "read this page",
    "read this",
    "read the page",
    "look at this",
    "analyze this page"
  ].some((command) => normalized.includes(command));
}

function cleanSpeechText(text: string): string {
  return text
    .replace(/\$\$[^$]*\$\$/g, "equation")
    .replace(/\$[^$]*\$/g, "expression")
    .replace(/[*_~`#>]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim();
}

function nextSentenceBoundary(text: string, startIndex: number): number {
  for (let index = startIndex; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];
    if ((character === "." || character === "!" || character === "?") && (!nextCharacter || /\s/.test(nextCharacter))) {
      return index + 1;
    }
  }

  return -1;
}

function extractImageInput(videoElement: HTMLVideoElement | null, canvas: HTMLCanvasElement): ImageInput | null {
  if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return null;
  }

  const sourceWidth = videoElement.videoWidth;
  const sourceHeight = videoElement.videoHeight;
  const scale = Math.min(MAX_CAPTURE_WIDTH / sourceWidth, MAX_CAPTURE_HEIGHT / sourceHeight, 1);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.drawImage(videoElement, 0, 0, width, height);

  return {
    base64: canvas.toDataURL("image/jpeg", JPEG_QUALITY),
    mimeType: "image/jpeg"
  };
}

export function useLiveOCRAgent(exam: ExamType, videoRef: RefObject<HTMLVideoElement>): UseLiveOCRAgentResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [streamingText, setStreamingText] = useState<string>("");
  const [pageContext, setPageContext] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [quotaExhausted, setQuotaExhausted] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const pageContextRef = useRef<string>("");
  const statusRef = useRef<AgentStatus>("idle");

  const { speak, stop: stopSpeaking, isSpeaking } = useVoiceOutput();
  const { transcript, isListening, isSupported, startListening, stopListening } = useVoiceInput({
    onTranscript: (text) => {
      void submitText(text);
    }
  });
  const { interrupt: baseInterrupt, createAbortSignal } = useInterrupt({
    stopListening,
    stopSpeaking
  });

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    pageContextRef.current = pageContext;
  }, [pageContext]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (isListening) {
      setStatus("listening");
      return;
    }

    if (statusRef.current === "listening") {
      setStatus("idle");
    }
  }, [isListening]);

  useEffect(() => {
    if (!isSpeaking && statusRef.current === "speaking") {
      setStatus("idle");
    }
  }, [isSpeaking]);

  const captureFrame = useCallback((): ImageInput | null => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }

    return extractImageInput(videoRef.current, canvasRef.current);
  }, [videoRef]);

  const speakProgressively = useCallback(
    (fullText: string, spokenUntil: number): number => {
      let nextIndex = spokenUntil;

      while (true) {
        const boundary = nextSentenceBoundary(fullText, nextIndex);
        if (boundary === -1) {
          return nextIndex;
        }

        const sentence = cleanSpeechText(fullText.slice(nextIndex, boundary));
        if (sentence) {
          speak(sentence);
          if (statusRef.current === "thinking") {
            setStatus("speaking");
          }
        }
        nextIndex = boundary;
      }
    },
    [speak]
  );

  const submitText = useCallback(
    async (rawText: string): Promise<void> => {
      const trimmed = rawText.trim();
      if (!trimmed) {
        return;
      }

      if (isDeepScanCommand(trimmed)) {
        await scanPage();
        return;
      }

      if (trimmed.split(/\s+/).length < MIN_WORDS) {
        setError("Say a little more so I have enough context to help.");
        return;
      }

      baseInterrupt();
      setError(null);
      setStreamingText("");
      setInitialized(true);

      const userMessage = buildMessage("user", trimmed);
      const nextMessages = [...messagesRef.current, userMessage];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      setStatus("thinking");

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: createAbortSignal(),
          body: JSON.stringify({
            exam,
            image: captureFrame() ?? undefined,
            messages: trimMessages(nextMessages),
            mode: "live_ocr_agent",
            ocrText: pageContextRef.current || undefined
          })
        });

        if (!response.ok) {
          if (response.status === 429) {
            setError("Rate limit reached. Wait a moment and try again.");
          } else if (response.status === 401) {
            setError("Please sign in to continue.");
          } else {
            const errorText = await response.text();
            setError(errorText || `API error: ${response.status}`);
          }
          setStatus("idle");
          return;
        }

        let fullText = "";
        let spokenUntil = 0;

        await consumeSSE(response, (data) => {
          if (data === "[DONE]") {
            return;
          }
          if (data.startsWith("[ERROR]")) {
            throw new Error(data.slice(8) || "Streaming failed");
          }

          const token = JSON.parse(data) as string;
          fullText += token;
          setStreamingText(fullText);
          spokenUntil = speakProgressively(fullText, spokenUntil);
        });

        const trailingText = cleanSpeechText(fullText.slice(spokenUntil));
        if (trailingText) {
          speak(trailingText);
          if (statusRef.current === "thinking") {
            setStatus("speaking");
          }
        }

        if (fullText.trim()) {
          const assistantMessage = buildMessage("assistant", fullText.trim());
          messagesRef.current = [...messagesRef.current, assistantMessage];
          setMessages(messagesRef.current);
        }

        setStreamingText("");
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") {
          setStreamingText("");
          setStatus("idle");
          return;
        }

        const nextError = cause instanceof Error ? cause.message : String(cause);
        setError(nextError);
        setStreamingText("");
        setStatus("idle");
      }
    },
    [baseInterrupt, captureFrame, createAbortSignal, exam, speak, speakProgressively]
  );

  const scanPage = useCallback(async (): Promise<void> => {
    const frame = captureFrame();
    if (!frame || isScanning || quotaExhausted) {
      return;
    }

    setIsScanning(true);
    setError(null);
    setInitialized(true);

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: frame.base64 })
      });

      if (!response.ok) {
        if (response.status === 429) {
          setQuotaExhausted(true);
          setError("OCR quota exhausted. Wait for reset or use a fresh API key.");
          return;
        }

        const errorText = await response.text();
        setError(errorText || `OCR error: ${response.status}`);
        return;
      }

      const payload = (await response.json()) as { text?: string };
      const nextText = payload.text?.trim() ?? "";
      if (!nextText) {
        setError("I could not read enough from the page. Try adjusting the camera.");
        return;
      }

      setPageContext(nextText);
    } catch (cause) {
      const nextError = cause instanceof Error ? cause.message : String(cause);
      setError(nextError);
    } finally {
      setIsScanning(false);
    }
  }, [captureFrame, isScanning, quotaExhausted]);

  const interrupt = useCallback(() => {
    baseInterrupt();
    setStreamingText("");
    setStatus("idle");
  }, [baseInterrupt]);

  return useMemo(
    () => ({
      error,
      initialized,
      interrupt,
      isScanning,
      messages,
      microphoneAvailable: isSupported,
      pageContext,
      quotaExhausted,
      scanPage,
      startListening,
      status,
      stopListening,
      streamingText,
      submitText,
      transcript,
    }),
    [
      error,
      initialized,
      interrupt,
      isScanning,
      isSupported,
      messages,
      pageContext,
      quotaExhausted,
      scanPage,
      startListening,
      status,
      stopListening,
      streamingText,
      submitText,
      transcript
    ]
  );
}