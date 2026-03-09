"use client";

import { useEffect, useRef, useState } from "react";

interface UseOCRParams {
  enabled: boolean;
  captureFrame: () => string | null;
  intervalMs?: number; // Recommended: 5000-8000ms to stay within API limits
}

interface UseOCRResult {
  detectedText: string;
  isScanning: boolean;
}

export function useOCR({
  enabled,
  captureFrame,
  intervalMs = 6000  // Changed from 3000ms to 6000ms (10 calls/min instead of 20)
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
          if (response.status === 429) {
            console.warn("⚠️ OCR rate limit hit - consider reducing scan frequency");
          } else if (response.status === 500) {
            const errorData = await response.json().catch(() => ({}));
            console.error("OCR API error:", errorData);
          }
          return;
        }

        const payload = (await response.json()) as { text?: string };
        const nextText = (payload.text ?? "").trim();
        if (!nextText || nextText === previousTextRef.current) {
          return;
        }

        previousTextRef.current = nextText;
        setDetectedText(nextText);
      } catch (error) {
        console.error("OCR request failed:", error);
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
