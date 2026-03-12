"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";
import { EXAM_CONFIG, type ExamType } from "@/types/exam";

const EXAMS: ExamType[] = ["CAT", "GMAT", "NEET", "UPSC", "JEE"];

const EXAM_COLORS: Record<ExamType, { bg: string; border: string; hover: string }> = {
  CAT: { bg: "bg-blue-50", border: "border-blue-300", hover: "hover:border-blue-500" },
  GMAT: { bg: "bg-purple-50", border: "border-purple-300", hover: "hover:border-purple-500" },
  NEET: { bg: "bg-red-50", border: "border-red-300", hover: "hover:border-red-500" },
  UPSC: { bg: "bg-amber-50", border: "border-amber-300", hover: "hover:border-amber-500" },
  JEE: { bg: "bg-green-50", border: "border-green-300", hover: "hover:border-green-500" }
};

export default function ExamSelectPage(): JSX.Element {
  const router = useRouter();
  const selectedRef = useRef<ExamType | null>(null);

  const handleSelectExam = (exam: ExamType) => {
    selectedRef.current = exam;
    const queryParam = new URLSearchParams({ exam });
    router.push(`/live-ocr?${queryParam.toString()}`);
  };

  return (
    <main className="min-h-screen bg-background">
      <AppHeader title="Choose Your Exam" />
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-8">
        <p className="mb-4 text-center text-sm text-foreground/70">
          Select your exam to get tailored tutoring from Clarity, your AI study companion.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {EXAMS.map((exam) => {
            const config = EXAM_CONFIG[exam];
            const colors = EXAM_COLORS[exam];

            return (
              <motion.button
                key={exam}
                className={`flex flex-col gap-3 rounded-lg border-2 p-4 transition-colors ${colors.bg} ${colors.border} ${colors.hover}`}
                onClick={() => handleSelectExam(exam)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <h3 className="text-base font-semibold">{config.label}</h3>
                <div className="text-left text-xs text-foreground/70">
                  {config.subjects.slice(0, 2).map((subject, i) => (
                    <p key={i}>• {subject}</p>
                  ))}
                  {config.subjects.length > 2 && (
                    <p>+ {config.subjects.length - 2} more</p>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
