use crate::dropbox::sync::DropboxSync;
use crate::dropbox::{DropboxAuth, DropboxClient};
use crate::models::event::HsaMetadata;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};
use tokio::sync::Mutex;
use uuid::Uuid;

pub struct DropboxState {
    pub sync: Arc<Mutex<Option<DropboxSync>>>,
    auth: DropboxAuth,
}

impl DropboxState {
    pub fn new() -> Self {
        let auth = DropboxAuth::new();
        Self {
            sync: Arc::new(Mutex::new(None)),
            auth,
        }
    }

    pub fn auth(&self) -> &DropboxAuth {
        &self.auth
    }
}

#[tauri::command]
pub async fn start_oauth_flow(
    app: AppHandle,
    state: State<'_, DropboxState>,
) -> Result<(), String> {
    use std::sync::atomic::{AtomicBool, Ordering};

    const REDIRECT_URI: &str = "http://localhost:1420/oauth/callback";

    let (auth_url, verifier) = state.auth().generate_auth_url_with_verifier(REDIRECT_URI);

    // Track whether auth completed successfully
    let auth_completed = Arc::new(AtomicBool::new(false));
    let auth_completed_nav = auth_completed.clone();

    // Clone what we need for the navigation handler closure
    let app_handle = app.clone();
    let sync_state = state.sync.clone();

    let oauth_window = WebviewWindowBuilder::new(&app, "oauth", WebviewUrl::External(auth_url))
        .title("Connect to Dropbox")
        .inner_size(500.0, 700.0)
        .center()
        .on_navigation(move |url: &url::Url| {
            if url.as_str().starts_with(REDIRECT_URI) {
                // Extract the authorization code from the URL
                if let Some(code) = url
                    .query_pairs()
                    .find(|(k, _)| k == "code")
                    .map(|(_, v)| v.to_string())
                {
                    let app = app_handle.clone();
                    let sync_state = sync_state.clone();
                    let auth_completed = auth_completed_nav.clone();
                    let verifier = verifier.clone();

                    tauri::async_runtime::spawn(async move {
                        let auth = DropboxAuth::new();
                        let result: Result<(), String> = async {
                            auth.exchange_code(&code, REDIRECT_URI, &verifier)
                                .await
                                .map_err(|e| e.to_string())?;

                            // Initialize the sync client
                            let client = DropboxClient::new(DropboxAuth::new());
                            let sync = DropboxSync::new(client);
                            // Migrate from legacy paths if needed
                            sync.migrate_legacy_paths().await;
                            sync.ensure_folders().await.map_err(|e| {
                                format!("Failed to initialize Dropbox folders: {}", e)
                            })?;

                            *sync_state.lock().await = Some(sync);
                            Ok(())
                        }
                        .await;

                        match result {
                            Ok(()) => {
                                auth_completed.store(true, Ordering::SeqCst);
                                let _ = app.emit("auth-state-changed", true);
                            }
                            Err(e) => {
                                let _ = app.emit("oauth-error", e);
                            }
                        }

                        // Close the OAuth window
                        if let Some(window) = app.get_webview_window("oauth") {
                            let _ = window.close();
                        }
                    });

                    return false; // Don't navigate to the callback URL
                }
            }
            true // Allow other navigations
        })
        .build()
        .map_err(|e| e.to_string())?;

    // Listen for window close to detect cancellation
    let app_for_close = app.clone();
    oauth_window.on_window_event(move |event| {
        if let tauri::WindowEvent::Destroyed = event {
            if !auth_completed.load(Ordering::SeqCst) {
                let _ = app_for_close.emit("oauth-cancelled", ());
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn logout(app: AppHandle, state: State<'_, DropboxState>) -> Result<(), String> {
    state.auth().clear_tokens().map_err(|e| e.to_string())?;
    *state.sync.lock().await = None;
    let _ = app.emit("auth-state-changed", false);
    Ok(())
}

#[tauri::command]
pub async fn sync_metadata(state: State<'_, DropboxState>) -> Result<HsaMetadata, String> {
    let guard = state.sync.lock().await;
    let sync = guard.as_ref().ok_or("Not connected to Dropbox")?;

    let (metadata, _rev) = sync.fetch_metadata().await.map_err(|e| e.to_string())?;
    Ok(metadata)
}

#[tauri::command]
pub async fn save_metadata(
    metadata: HsaMetadata,
    state: State<'_, DropboxState>,
) -> Result<HsaMetadata, String> {
    let guard = state.sync.lock().await;
    let sync = guard.as_ref().ok_or("Not connected to Dropbox")?;

    // Fetch current rev before saving to enable conflict detection
    let (_current, rev) = sync.fetch_metadata().await.map_err(|e| e.to_string())?;
    let (updated, _new_rev) = sync
        .save_metadata(&metadata, rev)
        .await
        .map_err(|e| e.to_string())?;
    Ok(updated)
}

#[tauri::command]
pub async fn upload_receipt(
    receipt_id: Uuid,
    data: Vec<u8>,
    state: State<'_, DropboxState>,
) -> Result<(), String> {
    let guard = state.sync.lock().await;
    let sync = guard.as_ref().ok_or("Not connected to Dropbox")?;

    sync.upload_receipt(receipt_id, &data)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn download_receipt(
    receipt_id: Uuid,
    state: State<'_, DropboxState>,
) -> Result<Vec<u8>, String> {
    let guard = state.sync.lock().await;
    let sync = guard.as_ref().ok_or("Not connected to Dropbox")?;

    sync.download_receipt(receipt_id)
        .await
        .map_err(|e| e.to_string())
}
