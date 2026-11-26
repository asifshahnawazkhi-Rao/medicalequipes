"use client";

import { useOnlineStatus } from "../hooks/useOnlineStatus";

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="offlineBanner" role="status" aria-live="polite">
      <span className="offlineDot" aria-hidden="true" />
      <span>Offline Mode — Reconnect to load live listings and updates.</span>
    </div>
  );
}
