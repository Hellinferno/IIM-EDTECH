"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useInterrupt } from "@/hooks/useInterrupt";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { consumeSSE } from "@/lib/sse-client";
import type { ImageInput, Message } from "@/types";
import type { ExamType } from "@/types/exam";

type AgentStatus = "idle" | "listening" | "thinking" | "speaking";

interface ScanMemoryEntry {
  id: string;
  scannedAt: number;
  text: string;
}

interface UseLiveOCRAgentResult {
  error: string | null;
  initialized: boolean;
  isScanning: boolean;
  lastScanAt: number | null;
  messages: Message[];
  microphoneAvailable: boolean;
  pageContext: string;
  quotaExhausted: boolean;
  scanPage: () => Promise<void>;
  scanHistory: ScanMemoryEntry[];
  scanSummary: string | null;
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
const MAX_SCAN_MEMORY_PAGES = 4;

const DEEP_SCAN_PREFIX = String.raw`(?:can you\s+|could you\s+|would you\s+|please\s+)?(?:scan|read|analy[sz]e|look at)\s+(?:this|the)\s+(?:page|sheet|notebook|problem|question)`;
const DEEP_SCAN_EXACT_PATTERN = new RegExp(`^${DEEP_SCAN_PREFIX}(?:\s+for me)?(?:\s+please)?[.!?]*$`, "i");
const DEEP_SCAN_WITH_FOLLOW_UP_PATTERN = new RegExp(
  `^${DEEP_SCAN_PREFIX}(?:\\s+for me)?(?:\\s+please)?(?:\\s*(?:,|and then|then|and)\\s+)(.+)$`,
  "i"
);

function buildMessage(role: Message["role"], content: string): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now()
  };
}

function buildScanMemoryEntry(text: string, scannedAt: number): ScanMemoryEntry {
  return {
    id: `scan-${scannedAt}-${Math.random().toString(36).slice(2, 8)}`,
    scannedAt,
    text
  };
}

function buildPageContext(scanHistory: ScanMemoryEntry[]): string {
  if (scanHistory.length === 0) {
    return "";
  }

  return scanHistory
    .map((entry, index) => `[Scanned page ${index + 1}] ${entry.text}`)
    .join("\n\n");
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

function parseDeepScanCommand(text: string): { followUpText: string | null; shouldScan: boolean } {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return { followUpText: null, shouldScan: false };
  }

  const followUpMatch = normalized.match(DEEP_SCAN_WITH_FOLLOW_UP_PATTERN);
  if (followUpMatch) {
    const followUpText = followUpMatch[1]?.trim() ?? "";
    return {
      followUpText: followUpText.length > 0 ? followUpText : null,
      shouldScan: true
    };
  }

  return {
    followUpText: null,
    shouldScan: DEEP_SCAN_EXACT_PATTERN.test(normalized)
  };
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
  const [scanHistory, setScanHistory] = useState<ScanMemoryEntry[]>([]);
  const [streamingText, setStreamingText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState<boolean>(false);
  const [scanSummary, setScanSummary] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const scanHistoryRef = useRef<ScanMemoryEntry[]>([]);
  const pageContextRef = useRef<string>("");
  const statusRef = useRef<AgentStatus>("idle");

  const pageContext = useMemo(() => buildPageContext(scanHistory), [scanHistory]);

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
    scanHistoryRef.current = scanHistory;
    pageContextRef.current = buildPageContext(scanHistory);
  }, [scanHistory]);

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

  const sendStudentTurn = useCallback(
    async (trimmed: string): Promise<void> => {
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

  const runDeepScan = useCallback(async (): Promise<boolean> => {
    const frame = captureFrame();
    if (!frame || isScanning || quotaExhausted) {
      return false;
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
          setScanSummary("Deep scan paused because OCR quota is exhausted.");
          setError("OCR quota exhausted. Wait for reset or use a fresh API key.");
          return false;
        }

        const errorText = await response.text();
        setError(errorText || `OCR error: ${response.status}`);
        return false;
      }

      const payload = (await response.json()) as { text?: string };
      const nextText = payload.text?.trim() ?? "";
      if (!nextText) {
        setScanSummary("Deep scan finished, but the page text was still too unclear.");
        setError("I could not read enough from the page. Try adjusting the camera.");
        return false;
      }

      const scannedAt = Date.now();
      const lastEntry = scanHistoryRef.current[scanHistoryRef.current.length - 1];
      const nextHistory =
        lastEntry?.text === nextText
          ? [...scanHistoryRef.current.slice(0, -1), { ...lastEntry, scannedAt }]
          : [...scanHistoryRef.current, buildScanMemoryEntry(nextText, scannedAt)].slice(-MAX_SCAN_MEMORY_PAGES);

      scanHistoryRef.current = nextHistory;
      setScanHistory(nextHistory);
      setLastScanAt(scannedAt);
      setScanSummary(
        nextHistory.length === 1
          ? "Deep scan ready. I will use this page text in follow-up questions."
          : `Deep scan saved. I now remember ${nextHistory.length} scanned pages for this session.`
      );
      return true;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause.message : String(cause);
      setError(nextError);
      return false;
    } finally {
      setIsScanning(false);
    }
  }, [captureFrame, isScanning, quotaExhausted]);

  const submitText = useCallback(
    async (rawText: string): Promise<void> => {
      const trimmed = rawText.trim();
      if (!trimmed) {
        return;
      }

      const scanCommand = parseDeepScanCommand(trimmed);
      if (scanCommand.shouldScan) {
        const scanSucceeded = await runDeepScan();
        if (scanSucceeded && scanCommand.followUpText) {
          await sendStudentTurn(scanCommand.followUpText);
        }
        return;
      }

      await sendStudentTurn(trimmed);
    },
    [runDeepScan, sendStudentTurn]
  );

  const scanPage = useCallback(async (): Promise<void> => {
    await runDeepScan();
  }, [runDeepScan]);

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
      lastScanAt,
      messages,
      microphoneAvailable: isSupported,
      pageContext,
      quotaExhausted,
      scanPage,
      scanHistory,
      scanSummary,
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
      lastScanAt,
      messages,
      pageContext,
      quotaExhausted,
      scanPage,
      scanHistory,
      scanSummary,
      startListening,
      status,
      stopListening,
      streamingText,
      submitText,
      transcript
    ]
  );
}