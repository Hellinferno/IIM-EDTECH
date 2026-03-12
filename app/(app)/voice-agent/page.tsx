"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { AGENT_OPENERS, type ExamType } from "@/types/exam";

const VALID_EXAMS: readonly ExamType[] = ["CAT", "GMAT", "NEET", "UPSC", "JEE"];

export default function VoiceAgentPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examParam = searchParams.get("exam") as ExamType | null;
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isValidExam = examParam !== null && VALID_EXAMS.includes(examParam);
  const exam = isValidExam ? examParam : "CAT";

  const { messages, status, transcript, startListening, interrupt, initialized, microphoneAvailable, error } = useVoiceAgent({
    exam
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  if (!isValidExam) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-foreground/70">Invalid exam selection.</p>
          <button
            className="border border-foreground px-4 py-2 text-sm hover:bg-foreground hover:text-background"
            onClick={() => router.push("/exam-select")}
          >
            Choose an exam
          </button>
        </div>
      </main>
    );
  }

  const statusIndicators: Record<typeof status, { color: string; label: string }> = {
    idle: { color: "text-foreground/50", label: "Ready" },
    listening: { color: "text-green-600", label: "Listening..." },
    thinking: { color: "text-amber-600", label: "Thinking..." },
    speaking: { color: "text-blue-600", label: "Speaking..." }
  };

  const current = statusIndicators[status];

  return (
    <main className="min-h-screen bg-background">
      <AppHeader title={`Voice Tutor — ${exam}`} />

      {!microphoneAvailable && (
        <motion.div
          className="mx-auto max-w-2xl border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Your browser does not support voice input. Please use Chrome, Safari, or Edge.
        </motion.div>
      )}

      <div className="mx-auto flex h-[calc(100vh-57px)] w-full max-w-2xl flex-col px-4 py-4">
        {/* Opening greeting */}
        {messages.length === 0 && !initialized ? (
          <div className="flex flex-1 items-center justify-center text-center">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.2 }}
            >
              <p className="mb-4 text-lg font-medium">{AGENT_OPENERS[exam]}</p>
              <p className="text-sm text-foreground/60">
                {microphoneAvailable ? "Tap the mic to begin..." : "Microphone not available"}
              </p>
            </motion.div>
          </div>
        ) : (
          <>
            {/* Chat messages */}
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} />
              ))}
              {status === "thinking" && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

            {/* Transcript preview */}
            {transcript && (
              <motion.div
                className="mb-3 rounded border border-green-300 bg-green-50 p-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-sm text-green-800">
                  <span className="font-medium">You said:</span> {transcript}
                </p>
              </motion.div>
            )}
          </>
        )}

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="mb-3 rounded border-l-4 border-red-500 bg-red-50 p-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status + controls */}
        <div className="border-t border-border pt-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.span
                animate={{ scale: status === "listening" ? [1, 1.2, 1] : 1 }}
                className={`text-xs font-medium ${current.color}`}
                transition={{ repeat: Infinity, duration: 1.2 }}
              >
                {current.label}
              </motion.span>
              {status === "listening" && (
                <motion.span
                  animate={{ scaleX: [1, 1.2, 1] }}
                  className="inline-block h-2 w-2 rounded-full bg-green-500"
                  transition={{ repeat: Infinity, duration: 1.2 }}
                />
              )}
              {status === "thinking" && (
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  className="inline-block h-2 w-2 rounded-full bg-amber-500"
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              )}
            </div>

            <button
              className="border border-foreground/30 px-3 py-1 text-xs hover:border-foreground/60"
              onClick={() => router.push("/exam-select")}
            >
              Change exam
            </button>
          </div>

          {/* Mic button */}
          <div className="flex justify-center gap-4">
            <motion.button
              className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 transition-colors ${
                !microphoneAvailable
                  ? "border-red-300 bg-red-50 text-red-400"
                  : status === "listening"
                    ? "border-green-500 bg-green-50 text-green-600"
                    : status === "thinking" || status === "speaking"
                      ? "border-amber-500 bg-amber-50 text-amber-600"
                      : "border-border bg-background hover:border-foreground"
              }`}
              disabled={!microphoneAvailable || status === "thinking" || status === "speaking"}
              onClick={() => {
                if (status === "listening") {
                  interrupt();
                } else {
                  startListening();
                }
              }}
              whileHover={{ scale: microphoneAvailable ? 1.05 : 1 }}
              whileTap={{ scale: microphoneAvailable ? 0.95 : 1 }}
              title={!microphoneAvailable ? "Microphone not available" : undefined}
            >
              {status === "listening" ? (
                <Square className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </motion.button>

            {(status === "thinking" || status === "speaking") && (
              <motion.button
                className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-400 bg-red-50 text-red-600 transition-colors hover:border-red-600"
                onClick={interrupt}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Square className="h-6 w-6" />
              </motion.button>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-foreground/50">
            {status === "listening"
              ? "Tap square to stop recording"
              : status === "thinking"
                ? "AI is thinking..."
                : status === "speaking"
                  ? "Tap square to interrupt"
                  : "Tap mic to speak"}
          </p>
        </div>
      </div>
    </main>
  );
}
