"use client";

import { useMemo, useState } from "react";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

interface ImageUploadProps {
  onSelect: (file: File) => void;
}

export function ImageUpload({ onSelect }: ImageUploadProps): JSX.Element {
  const [error, setError] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const inputId = useMemo(() => `image-upload-${Math.random().toString(36).slice(2, 8)}`, []);
  const cameraInputId = useMemo(
    () => `image-camera-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  const validateAndSend = (file: File): void => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Use JPG, PNG, or WEBP only.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("File size must be under 10MB.");
      return;
    }
    setError("");
    onSelect(file);
  };

  return (
    <div className="mx-auto w-full max-w-xl border border-border bg-background p-6">
      <div className="space-y-3 text-center">
        <h2 className="text-lg font-semibold">Upload a question image</h2>
        <p className="text-sm text-foreground/80">
          Drag and drop, choose a file, or capture directly from your mobile camera.
        </p>
      </div>

      <div
        className={[
          "mt-6 flex flex-col items-center gap-3 border border-dashed p-5 text-sm transition-colors",
          isDragging ? "border-foreground bg-muted/40" : "border-border"
        ].join(" ")}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) {
            validateAndSend(dropped);
          }
        }}
      >
        <p className="text-foreground/80">Drop image here</p>
        <label
          className="w-full cursor-pointer border border-border p-3 text-center hover:border-foreground"
          htmlFor={inputId}
        >
          Choose File
        </label>
        <label
          className="w-full cursor-pointer border border-foreground bg-foreground p-3 text-center text-background"
          htmlFor={cameraInputId}
        >
          Take Photo
        </label>
        <input
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          id={inputId}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              validateAndSend(file);
            }
          }}
          type="file"
        />
        <input
          accept="image/jpeg,image/jpg,image/png,image/webp"
          capture="environment"
          className="hidden"
          id={cameraInputId}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              validateAndSend(file);
            }
          }}
          type="file"
        />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}
