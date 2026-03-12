"use client";

import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";
import { ConversationPanel } from "@/components/ConversationPanel";
import { useCamera } from "@/hooks/useCamera";
import { useConversation } from "@/hooks/useConversation";
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
  const { messages, addUserMessage, addAssistantMessage, clearHistory } = useConversation();

  const { isActive, permissionError, noCameraAvailable, startCamera, stopCamera, captureFrame } =
    useCamera();

  const captureCurrentFrame = useCallback(() => {
    return captureFrame(videoRef.current, canvasRef.current);
  }, [captureFrame]);

  const { detectedText, isScanning, quotaExhausted, scanNow } = useOCR({
    enabled: isActive,
    captureFrame: captureCurrentFrame,
    autoScan: false,
    intervalMs: 10000
  });

  const handleSnapshot = useCallback(async (): Promise<void> => {
    await scanNow();
  }, [scanNow]);

  useEffect(() => {
    const currentVideoElement = videoRef.current;
    void startCamera(currentVideoElement);
    return () => {
      stopCamera(currentVideoElement);
    };
  }, [startCamera, stopCamera]);

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
        {/* Camera feed — top half */}
        <section className="relative h-1/2 border-b border-border bg-black">
          <video className="h-full w-full object-cover" muted playsInline ref={videoRef} />
          <canvas className="hidden" ref={canvasRef} />
          <button
            className="absolute right-3 top-3 border border-background bg-foreground/70 px-3 py-1 text-sm text-background backdrop-blur"
            onClick={() => {
              stopCamera(videoRef.current);
              clearHistory();
            }}
            type="button"
          >
            End Session
          </button>
          <button
            className="absolute left-3 top-3 border border-background bg-foreground/70 px-3 py-1 text-sm text-background backdrop-blur disabled:opacity-60"
            disabled={isScanning || quotaExhausted}
            onClick={() => void handleSnapshot()}
            type="button"
          >
            {isScanning ? "Scanning..." : "Snapshot"}
          </button>
          {/* Snapshot blink animation */}
          <AnimatePresence>
            {detectedText ? (
              <motion.div
                animate={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 bg-white"
                initial={{ opacity: 0.3 }}
                key="snapshot-blink"
                transition={{ duration: 0.3 }}
              />
            ) : null}
          </AnimatePresence>
          <div className="absolute bottom-3 left-3 right-3 min-h-14 border border-border bg-background/95 p-3 text-sm">
            <AnimatePresence mode="wait">
              <motion.p
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                initial={{ opacity: 0, y: 6 }}
                key={detectedText || "ocr-hint"}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {detectedText
                  ? truncate(detectedText, 200)
                  : quotaExhausted
                    ? "API quota exhausted — scanning paused. Please wait or use a new API key."
                    : "Say 'look at this' or tap Snapshot to scan once."}
              </motion.p>
            </AnimatePresence>
          </div>
        </section>

        {/* Conversation panel — bottom half with voice */}
        <section className="flex min-h-0 h-1/2 flex-col">
          <ConversationPanel
            messages={messages}
            onAddUserMessage={addUserMessage}
            onAddAssistantMessage={addAssistantMessage}
            mode="live_ocr"
            ocrText={detectedText}
            onRequestSnapshot={handleSnapshot}
          />
        </section>
      </div>
    </main>
  );
}
