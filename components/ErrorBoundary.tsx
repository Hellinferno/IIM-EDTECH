"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-base font-medium">Something went wrong</p>
          <p className="max-w-md text-sm text-foreground/70">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            className="border border-foreground bg-foreground px-4 py-2 text-sm text-background"
            onClick={() => this.setState({ hasError: false, error: null })}
            type="button"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
