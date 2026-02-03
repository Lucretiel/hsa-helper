import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface DropboxAuthProps {
  onAuthenticated: () => void;
}

type AuthStep = "loading" | "configure-app" | "authenticate" | "authenticated";

export function DropboxAuth({ onAuthenticated }: DropboxAuthProps) {
  const [step, setStep] = useState<AuthStep>("loading");
  const [appKey, setAppKey] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const REDIRECT_URI = "http://localhost:1420/oauth/callback";

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const hasKey = await invoke<boolean>("has_app_key");
      if (!hasKey) {
        setStep("configure-app");
        return;
      }

      const authenticated = await invoke<boolean>("is_authenticated");
      if (authenticated) {
        setStep("authenticated");
        onAuthenticated();
      } else {
        setStep("authenticate");
      }
    } catch (err) {
      console.error("Status check failed:", err);
      setStep("configure-app");
    }
  };

  const saveAppKey = async () => {
    if (!appKey.trim()) {
      setError("Please enter your Dropbox App Key");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await invoke("set_app_key", { appKey: appKey.trim() });
      setStep("authenticate");
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const startAuth = async () => {
    setError(null);
    try {
      const url = await invoke<string>("get_auth_url", {
        redirectUri: REDIRECT_URI,
      });
      window.open(url, "_blank");
    } catch (err) {
      setError(String(err));
    }
  };

  const submitCode = async () => {
    if (!authCode.trim()) {
      setError("Please enter the authorization code");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await invoke("exchange_auth_code", {
        code: authCode.trim(),
        redirectUri: REDIRECT_URI,
      });
      setStep("authenticated");
      onAuthenticated();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await invoke("logout");
      setStep("authenticate");
      setAuthCode("");
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

  if (step === "configure-app") {
    return (
      <div className="dropbox-auth">
        <h2>Configure Dropbox App</h2>
        <p>
          To use HSA Helper, you need to create a Dropbox app and enter its App Key.
        </p>

        <div className="setup-instructions">
          <h3>Setup Instructions:</h3>
          <ol>
            <li>Go to <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer">Dropbox Developer Console</a></li>
            <li>Click "Create app"</li>
            <li>Choose "Scoped access"</li>
            <li>Choose "App folder" access type</li>
            <li>Name your app (e.g., "HSA Helper")</li>
            <li>In the app settings, add <code>http://localhost:1420/oauth/callback</code> to "OAuth 2 Redirect URIs"</li>
            <li>Copy the "App key" and paste it below</li>
          </ol>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="app-key">Dropbox App Key</label>
          <input
            id="app-key"
            type="text"
            placeholder="Enter your Dropbox App Key"
            value={appKey}
            onChange={(e) => setAppKey(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={saveAppKey}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save App Key"}
          </button>
        </div>
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

      <div className="auth-steps">
        <div className="auth-step">
          <span className="step-number">1</span>
          <button type="button" className="btn btn-primary" onClick={startAuth}>
            Authorize with Dropbox
          </button>
        </div>

        <div className="auth-step">
          <span className="step-number">2</span>
          <div className="code-input">
            <input
              type="text"
              placeholder="Paste authorization code here"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitCode}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>
      </div>

      <div className="auth-footer">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setStep("configure-app")}
        >
          Change App Key
        </button>
      </div>
    </div>
  );
}
