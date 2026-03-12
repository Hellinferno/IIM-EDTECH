"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

export default function VoiceAgentPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const exam = searchParams.get("exam");
    const queryParam = exam ? `?${new URLSearchParams({ exam }).toString()}` : "";
    router.replace(`/live-ocr${queryParam}`);
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader title="Voice Tutor" />
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center px-6 text-center">
        <p className="max-w-md text-sm text-foreground/70">
          Redirecting to the combined live OCR and voice tutor.
        </p>
      </div>
    </main>
  );
}
