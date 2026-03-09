import type { Metadata } from "next";
import { ClerkProvider, SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClarityAI",
  description: "AI-powered learning companion prototype"
};

export const dynamic = "force-dynamic";

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <ClerkProvider>
          <OfflineBanner />
          <header>
            <SignedOut>
              <SignInButton />
              <SignUpButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ClerkProvider>
      </body>
    </html>
  );
}
