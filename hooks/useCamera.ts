"use client";

import { useCallback, useRef, useState } from "react";

interface UseCameraResult {
  isActive: boolean;
  permissionError: boolean;
  noCameraAvailable: boolean;
  startCamera: (videoElement: HTMLVideoElement | null) => Promise<void>;
  stopCamera: (videoElement: HTMLVideoElement | null) => void;
  captureFrame: (
    videoElement: HTMLVideoElement | null,
    canvasElement: HTMLCanvasElement | null
  ) => string | null;
}

export function useCamera(): UseCameraResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<boolean>(false);
  const [noCameraAvailable, setNoCameraAvailable] = useState<boolean>(false);

  const startCamera = useCallback(async (videoElement: HTMLVideoElement | null): Promise<void> => {
    setPermissionError(false);
    setNoCameraAvailable(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setNoCameraAvailable(true);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);

      if (videoElement) {
        videoElement.srcObject = mediaStream;
        await videoElement.play();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setPermissionError(true);
      } else {
        setNoCameraAvailable(true);
      }
    }
  }, []);

  const stopCamera = useCallback((videoElement: HTMLVideoElement | null): void => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    if (videoElement) {
      videoElement.srcObject = null;
    }
  }, []);

  const captureFrame = useCallback(
    (videoElement: HTMLVideoElement | null, canvasElement: HTMLCanvasElement | null): string | null => {
      if (!videoElement || !canvasElement || videoElement.videoWidth === 0 || !streamRef.current) {
        return null;
      }

      const sourceWidth = videoElement.videoWidth;
      const sourceHeight = videoElement.videoHeight;

      const maxWidth = 800;
      const maxHeight = 600;
      const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));

      canvasElement.width = width;
      canvasElement.height = height;

      const context = canvasElement.getContext("2d");
      if (!context) {
        return null;
      }

      context.drawImage(videoElement, 0, 0, width, height);
      return canvasElement.toDataURL("image/jpeg", 0.75);
    },
    []
  );

  return {
    isActive: stream !== null,
    permissionError,
    noCameraAvailable,
    startCamera,
    stopCamera,
    captureFrame
  };
}
