export function TypingIndicator(): JSX.Element {
  return (
    <div className="flex w-full justify-start">
      <div className="flex items-center gap-1 border border-border bg-background px-3 py-2">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground" />
      </div>
    </div>
  );
}
