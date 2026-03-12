"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, ImageIcon, Mic } from "lucide-react";

const MotionLink = motion(Link);

export function ModeCards(): JSX.Element {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:grid sm:grid-cols-3">
      <MotionLink
        className="group flex flex-1 flex-col gap-4 border border-border bg-background p-6 transition-colors hover:border-foreground"
        href="/live-ocr"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.99 }}
      >
        <Camera className="h-6 w-6" />
        <h2 className="text-lg font-semibold">Live OCR + Voice</h2>
        <p className="text-sm text-foreground/80">
          Keep the camera on your notebook and talk naturally while Clarity sees the page.
        </p>
        <span className="text-sm text-foreground/70 group-hover:text-foreground">Start mode</span>
      </MotionLink>

      <MotionLink
        className="group flex flex-1 flex-col gap-4 border border-border bg-background p-6 transition-colors hover:border-foreground"
        href="/send-image"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.99 }}
      >
        <ImageIcon className="h-6 w-6" />
        <h2 className="text-lg font-semibold">Send Image</h2>
        <p className="text-sm text-foreground/80">
          Upload a question photo and receive a complete step-by-step solution.
        </p>
        <span className="text-sm text-foreground/70 group-hover:text-foreground">Start mode</span>
      </MotionLink>

      <MotionLink
        className="group flex flex-1 flex-col gap-4 border border-border bg-background p-6 transition-colors hover:border-foreground"
        href="/exam-select"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.99 }}
      >
        <Mic className="h-6 w-6" />
        <h2 className="text-lg font-semibold">Choose Exam</h2>
        <p className="text-sm text-foreground/80">
          Pick your exam first, then enter the combined camera and voice tutoring flow.
        </p>
        <span className="text-sm text-foreground/70 group-hover:text-foreground">Start mode</span>
      </MotionLink>
    </section>
  );
}
