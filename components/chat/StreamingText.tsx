interface StreamingTextProps {
  text: string;
}

export function StreamingText({ text }: StreamingTextProps): JSX.Element {
  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[85%] border border-border bg-background px-3 py-2 text-sm leading-relaxed">
        {text}
        <span className="ml-1 inline-block h-4 w-[1px] animate-pulse bg-foreground align-middle" />
      </div>
    </div>
  );
}
