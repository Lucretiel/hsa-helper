import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface DropboxAuthProps {
  onAuthenticated: () => void;
}

type AuthStep = "loading" | "authenticate" | "authenticating" | "authenticated";

export function DropboxAuth({ onAuthenticated }: DropboxAuthProps) {
  const [step, setStep] = useState<AuthStep>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();

    // Listen for OAuth events from the backend
    const unlistenSuccess = listen("oauth-success", () => {
      setStep("authenticated");
      onAuthenticated();
    });

    const unlistenError = listen<string>("oauth-error", (event) => {
      setError(event.payload);
      setStep("authenticate");
    });

    const unlistenCancelled = listen("oauth-cancelled", () => {
      setStep("authenticate");
    });

    return () => {
      unlistenSuccess.then((fn) => fn());
      unlistenError.then((fn) => fn());
      unlistenCancelled.then((fn) => fn());
    };
  }, [onAuthenticated]);

  const checkStatus = async () => {
    try {
      const authenticated = await invoke<boolean>("is_authenticated");
      if (authenticated) {
        setStep("authenticated");
        onAuthenticated();
      } else {
        setStep("authenticate");
      }
    } catch (err) {
      console.error("Status check failed:", err);
      setStep("authenticate");
    }
  };

  const startAuth = async () => {
    setError(null);
    setStep("authenticating");
    try {
      await invoke("start_oauth_flow");
    } catch (err) {
      setError(String(err));
      setStep("authenticate");
    }
  };

  const handleLogout = async () => {
    try {
      await invoke("logout");
      setStep("authenticate");
    } catch (err) {
      setError(String(err));
    }
  };

  if (step === "loading") {
    return <div className="loading">Checking configuration...</div>;
  }

  if (step === "authenticated") {
    return (
      <div className="dropbox-auth authenticated">
        <p>Connected to Dropbox</p>
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>
          Disconnect
        </button>
      </div>
    );
  }

  if (step === "authenticating") {
    return (
      <div className="dropbox-auth">
        <h2>Connect to Dropbox</h2>
        <p>Complete the authorization in the popup window...</p>
        <div className="loading">Waiting for authorization...</div>
      </div>
    );
  }

  return (
    <div className="dropbox-auth">
      <h2>Connect to Dropbox</h2>
      <p>
        HSA Helper stores your data in Dropbox. Connect your account to get started.
      </p>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button type="button" className="btn btn-primary" onClick={startAuth}>
          Connect to Dropbox
        </button>
      </div>
    </div>
  );
}
