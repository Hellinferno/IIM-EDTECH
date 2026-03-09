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
  quotaExhausted: boolean;
}

export function useOCR({
  enabled,
  captureFrame,
  intervalMs = 6000
}: UseOCRParams): UseOCRResult {
  const [detectedText, setDetectedText] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [quotaExhausted, setQuotaExhausted] = useState<boolean>(false);
  const previousTextRef = useRef<string>("");
  const consecutiveFailsRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || quotaExhausted) {
      setIsScanning(false);
      if (!enabled) {
        setDetectedText("");
        previousTextRef.current = "";
        setQuotaExhausted(false);
        consecutiveFailsRef.current = 0;
      }
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
            const data = await response.json().catch(() => ({}));
            if (data.error === "quota_exhausted") {
              console.warn("API quota exhausted — pausing OCR scanning");
              setQuotaExhausted(true);
              return;
            }
            consecutiveFailsRef.current++;
            if (consecutiveFailsRef.current >= 3) {
              console.warn("Multiple rate limit hits — pausing OCR scanning");
              setQuotaExhausted(true);
            }
          }
          return;
        }

        consecutiveFailsRef.current = 0;
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
  }, [enabled, captureFrame, intervalMs, quotaExhausted]);

  return { detectedText, isScanning, quotaExhausted };
}
