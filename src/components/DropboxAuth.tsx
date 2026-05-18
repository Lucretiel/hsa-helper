import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

type AuthStep = "ready" | "authenticating";

export function DropboxAuth() {
	const [step, setStep] = useState<AuthStep>("ready");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const unlistenError = listen<string>("oauth-error", (event) => {
			setError(event.payload);
			setStep("ready");
		});

		const unlistenCancelled = listen("oauth-cancelled", () => {
			setStep("ready");
		});

		return () => {
			unlistenError.then((fn) => fn());
			unlistenCancelled.then((fn) => fn());
		};
	}, []);

	const startAuth = async () => {
		setError(null);
		setStep("authenticating");
		try {
			await invoke("start_oauth_flow");
		} catch (err) {
			setError(String(err));
			setStep("ready");
		}
	};

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
				HSA Helper stores your data in Dropbox. Connect your account to get
				started.
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
