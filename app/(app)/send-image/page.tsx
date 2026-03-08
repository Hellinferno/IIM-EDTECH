"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatThread } from "@/components/chat/ChatThread";
import { ImageUpload } from "@/components/image-upload/ImageUpload";
import { useChat } from "@/hooks/useChat";
import { consumeSSE } from "@/lib/sse-client";

export default function SendImagePage(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStreamingText, setAnalysisStreamingText] = useState<string>("");
  const [analysisDone, setAnalysisDone] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const { messages, streamingText, isLoading, sendUserMessage, appendAssistantMessage, reset } =
    useChat();

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const runAnalysis = async (): Promise<void> => {
    if (!file || isAnalyzing) {
      return;
    }

    setError("");
    setIsAnalyzing(true);
    setAnalysisStreamingText("");
    setAnalysisDone(false);
    reset();

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/image", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("API Route failed:", response.status, errText);
        throw new Error(`API Error: ${response.status} ${errText}`);
      }

      let fullText = "";
      await consumeSSE(response, (data) => {
        if (data === "[DONE]") {
          return;
        }
        if (data.startsWith("[ERROR]")) {
          throw new Error(data.slice(8) || "Streaming failed");
        }
        const token = JSON.parse(data) as string;
        fullText += token;
        setAnalysisStreamingText(fullText);
      });

      appendAssistantMessage(fullText);
      setAnalysisStreamingText("");
      setAnalysisDone(true);
    } catch (e: any) {
      setAnalysisStreamingText("");
      setError(`Crash: ${e.message || String(e)}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <AppHeader title="Send Image" />

      {!file ? (
        <section className="flex min-h-[calc(100vh-57px)] items-center px-4">
          <ImageUpload onSelect={setFile} />
        </section>
      ) : (
        <section className="mx-auto flex h-[calc(100vh-57px)] w-full max-w-4xl flex-col px-4 py-4">
          <div className="flex flex-col gap-3 border border-border p-3">
            {previewUrl ? (
              <Image
                alt="Question preview"
                className="max-h-64 w-full object-contain"
                height={480}
                src={previewUrl}
                unoptimized
                width={640}
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                className="border border-foreground bg-foreground px-4 py-2 text-sm text-background disabled:opacity-60"
                disabled={isAnalyzing}
                onClick={() => void runAnalysis()}
                type="button"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze"}
              </button>
              <button
                className="border border-border px-4 py-2 text-sm"
                disabled={isAnalyzing}
                onClick={() => {
                  setFile(null);
                  setError("");
                  setAnalysisDone(false);
                  reset();
                }}
                type="button"
              >
                Change image
              </button>
              <button
                className="border border-border px-4 py-2 text-sm"
                disabled={isAnalyzing}
                onClick={() => {
                  setFile(null);
                  setError("");
                  setAnalysisDone(false);
                  reset();
                }}
                type="button"
              >
                New Question
              </button>
            </div>
          </div>

          <div className="mt-3 flex min-h-0 flex-1 flex-col border border-border">
            {isAnalyzing && analysisStreamingText.length === 0 ? (
              <div className="p-3">
                <div className="h-5 w-32 animate-pulse bg-muted" />
              </div>
            ) : null}
            <ChatThread
              isLoading={isAnalyzing || isLoading}
              messages={messages}
              streamingText={analysisStreamingText || streamingText}
            />
            {error ? <p className="px-3 pb-2 text-sm text-red-700">{error}</p> : null}
            {analysisDone ? (
              <ChatInput
                disabled={isLoading}
                onSubmit={async (text) => {
                  await sendUserMessage(text, {
                    mode: "send_image"
                  });
                }}
                placeholder="Ask a follow-up question..."
              />
            ) : null}
          </div>
        </section>
      )}
    </main>
  );
}
