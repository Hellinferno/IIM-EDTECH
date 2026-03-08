"use client";

import { useState } from "react";

interface ChatInputProps {
  disabled?: boolean;
  placeholder?: string;
  onSubmit: (text: string) => Promise<void> | void;
}

export function ChatInput({
  disabled = false,
  placeholder = "Type a message...",
  onSubmit
}: ChatInputProps): JSX.Element {
  const [value, setValue] = useState<string>("");

  const submit = async (): Promise<void> => {
    const trimmed = value.trim();
    if (!trimmed || disabled) {
      return;
    }
    setValue("");
    await onSubmit(trimmed);
  };

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-end gap-2">
        <textarea
          className="h-11 flex-1 resize-none border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          disabled={disabled}
          maxLength={2000}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder={placeholder}
          rows={2}
          value={value}
        />
        <button
          className="h-11 min-w-20 border border-foreground bg-foreground px-4 text-sm text-background disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || value.trim().length === 0}
          onClick={() => void submit()}
          type="button"
        >
          Send
        </button>
      </div>
    </div>
  );
}
