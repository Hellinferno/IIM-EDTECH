"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatThread } from "@/components/chat/ChatThread";
import { useCamera } from "@/hooks/useCamera";
import { useChat } from "@/hooks/useChat";
import { useOCR } from "@/hooks/useOCR";

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}...`;
}

export default function LiveOCRPage(): JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [bootstrappedFromOCR, setBootstrappedFromOCR] = useState<boolean>(false);
  const { messages, streamingText, isLoading, error, sendUserMessage, reset } = useChat();

  const { isActive, permissionError, noCameraAvailable, startCamera, stopCamera, captureFrame } =
    useCamera();

  const captureCurrentFrame = useCallback(() => {
    return captureFrame(videoRef.current, canvasRef.current);
  }, [captureFrame]);

  const { detectedText } = useOCR({
    enabled: isActive,
    captureFrame: captureCurrentFrame,
    intervalMs: 3000
  });

  useEffect(() => {
    const currentVideoElement = videoRef.current;
    void startCamera(currentVideoElement);
    return () => {
      stopCamera(currentVideoElement);
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (!detectedText || bootstrappedFromOCR) {
      return;
    }
    setBootstrappedFromOCR(true);
    void sendUserMessage("Please guide me through this question.", {
      mode: "live_ocr",
      ocrText: detectedText
    });
  }, [bootstrappedFromOCR, detectedText, sendUserMessage]);

  if (permissionError) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="max-w-md text-base">
          Camera access is needed. Please allow camera access in your browser settings.
        </p>
      </main>
    );
  }

  if (noCameraAvailable) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="max-w-md text-base">No camera was detected on this device.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <AppHeader title="Live OCR" />
      <div className="flex h-[calc(100vh-57px)] flex-col">
        <section className="relative h-1/2 border-b border-border bg-black">
          <video className="h-full w-full object-cover" muted playsInline ref={videoRef} />
          <canvas className="hidden" ref={canvasRef} />
          <button
            className="absolute right-3 top-3 border border-background bg-foreground/70 px-3 py-1 text-sm text-background backdrop-blur"
            onClick={() => {
              stopCamera(videoRef.current);
              setBootstrappedFromOCR(false);
              reset();
            }}
            type="button"
          >
            End Session
          </button>
          <div className="absolute bottom-3 left-3 right-3 min-h-14 border border-border bg-background/95 p-3 text-sm">
            <AnimatePresence mode="wait">
              <motion.p
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                initial={{ opacity: 0, y: 6 }}
                key={detectedText || "ocr-hint"}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {detectedText ? truncate(detectedText, 200) : "Point camera at text to begin"}
              </motion.p>
            </AnimatePresence>
          </div>
        </section>

        <section className="flex min-h-0 h-1/2 flex-col">
          <ChatThread isLoading={isLoading} messages={messages} streamingText={streamingText} />
          {error ? <p className="px-3 pb-2 text-sm text-red-700">{error}</p> : null}
          <ChatInput
            disabled={isLoading}
            onSubmit={async (text) => {
              await sendUserMessage(text, { mode: "live_ocr", ocrText: detectedText });
            }}
            placeholder="Reply to your tutor..."
          />
        </section>
      </div>
    </main>
  );
}
