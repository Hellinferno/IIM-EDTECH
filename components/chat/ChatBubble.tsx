import type { Message } from "@/types";

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps): JSX.Element {
  const isUser = message.role === "user";
  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-foreground text-background"
            : "border border-border bg-background text-foreground"
        ].join(" ")}
      >
        {message.content}
      </div>
    </div>
  );
}
