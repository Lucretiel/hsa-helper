import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface DropboxAuthProps {
  onAuthenticated: () => void;
}

export function DropboxAuth({ onAuthenticated }: DropboxAuthProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const REDIRECT_URI = "http://localhost:1420/oauth/callback";

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await invoke<boolean>("is_authenticated");
      setIsAuthenticated(authenticated);
      if (authenticated) {
        onAuthenticated();
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const startAuth = async () => {
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

    setIsLoading(true);
    setError(null);

    try {
      await invoke("exchange_auth_code", {
        code: authCode.trim(),
        redirectUri: REDIRECT_URI,
      });
      setIsAuthenticated(true);
      onAuthenticated();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await invoke("logout");
      setIsAuthenticated(false);
      setAuthCode("");
    } catch (err) {
      setError(String(err));
    }
  };

  if (isLoading) {
    return <div className="loading">Checking authentication...</div>;
  }

  if (isAuthenticated) {
    return (
      <div className="dropbox-auth authenticated">
        <p>Connected to Dropbox</p>
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>
          Disconnect
        </button>
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
              disabled={isLoading}
            >
              {isLoading ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
