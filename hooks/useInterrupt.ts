"use client";

import { useCallback, useRef } from "react";

interface UseInterruptResult {
  /** Fire to immediately cancel TTS + abort streaming fetch. */
  interrupt: () => void;
  /** Get a new AbortSignal to use for the next fetch. */
  createAbortSignal: () => AbortSignal;
}

interface InterruptDeps {
  stopSpeaking: () => void;
  stopListening: () => void;
}

export function useInterrupt(deps: InterruptDeps): UseInterruptResult {
  const abortRef = useRef<AbortController | null>(null);

  const createAbortSignal = useCallback((): AbortSignal => {
    // Abort any previous controller
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    return controller.signal;
  }, []);

  const interrupt = useCallback((): void => {
    // Both must fire synchronously — zero delay (Rule 3)
    deps.stopSpeaking();
    deps.stopListening();
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [deps]);

  return { interrupt, createAbortSignal };
}
