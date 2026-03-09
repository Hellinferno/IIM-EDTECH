"use client";

import { useEffect, useState } from "react";

export function OfflineBanner(): JSX.Element | null {
  const [isOffline, setIsOffline] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = (): void => setIsOffline(false);
    const handleOffline = (): void => setIsOffline(true);

    // Check initial state
    if (!navigator.onLine) {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="offline-banner">
      You are offline. Some features may not work.
    </div>
  );
}
