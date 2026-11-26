"use client";

import { useState } from "react";
import { usePWAInstall } from "../hooks/usePWAInstall";

export default function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        className="pwaInstallButton"
        onClick={install}
        aria-label="Install MedicalEquipes app"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          <path d="M12 4v11" />
          <path d="m7 11 5 5 5-5" />
        </svg>
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          className="pwaInstallButton"
          onClick={() => setShowIOSGuide(true)}
          aria-label="Install MedicalEquipes on iOS"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            <path d="M12 4v11" />
            <path d="m7 11 5 5 5-5" />
          </svg>
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div
            className="modalBackdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-ios-title"
          >
            <div className="authModal pwaIosModal">
              <button
                type="button"
                className="modalClose"
                aria-label="Close install instructions"
                onClick={() => setShowIOSGuide(false)}
              >
                ×
              </button>
              <span className="eyebrow">INSTALL MEDICALEQUIPES</span>
              <h2 id="pwa-ios-title">Add to Home Screen</h2>
              <p>Install MedicalEquipes on your iPhone or iPad for quick app access:</p>
              <ol className="pwaIosSteps">
                <li>
                  Tap the <strong>Share</strong> icon in the Safari toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> in the top-right corner.
                </li>
              </ol>
              <button
                type="button"
                className="primary authSubmit"
                onClick={() => setShowIOSGuide(false)}
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
