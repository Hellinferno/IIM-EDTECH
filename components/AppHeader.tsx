"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title = "ClarityAI" }: AppHeaderProps): JSX.Element {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <Link className="text-base font-semibold" href="/">
        {title}
      </Link>
      <UserButton afterSignOutUrl="/sign-in" />
    </header>
  );
}
