"use client";

import { useEffect, useRef, useState } from "react";

interface UseOCRParams {
  enabled: boolean;
  captureFrame: () => string | null;
  intervalMs?: number;
}

interface UseOCRResult {
  detectedText: string;
  isScanning: boolean;
}

export function useOCR({
  enabled,
  captureFrame,
  intervalMs = 3000
}: UseOCRParams): UseOCRResult {
  const [detectedText, setDetectedText] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const previousTextRef = useRef<string>("");

  useEffect(() => {
    if (!enabled) {
      setIsScanning(false);
      setDetectedText("");
      previousTextRef.current = "";
      return;
    }

    const interval = window.setInterval(async () => {
      const frame = captureFrame();
      if (!frame) {
        return;
      }

      try {
        setIsScanning(true);
        const response = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: frame })
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { text?: string };
        const nextText = (payload.text ?? "").trim();
        if (!nextText || nextText === previousTextRef.current) {
          return;
        }

        previousTextRef.current = nextText;
        setDetectedText(nextText);
      } finally {
        setIsScanning(false);
      }
    }, intervalMs);

    return () => {
      window.clearInterval(interval);
      setIsScanning(false);
    };
  }, [enabled, captureFrame, intervalMs]);

  return { detectedText, isScanning };
}
