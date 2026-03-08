"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, ImageIcon } from "lucide-react";

const MotionLink = motion(Link);

export function ModeCards(): JSX.Element {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-8 sm:flex-row">
      <MotionLink
        className="group flex flex-1 flex-col gap-4 border border-border bg-background p-6 transition-colors hover:border-foreground"
        href="/live-ocr"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.99 }}
      >
        <Camera className="h-6 w-6" />
        <h2 className="text-lg font-semibold">Live OCR</h2>
        <p className="text-sm text-foreground/80">
          Point your camera at a question and get guided tutoring in real time.
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
    </section>
  );
}
