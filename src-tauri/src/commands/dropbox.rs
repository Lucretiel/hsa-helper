use crate::dropbox::{DropboxAuth, DropboxClient};
use crate::dropbox::sync::DropboxSync;
use crate::models::event::HsaMetadata;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

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

    pub async fn initialize(&self) -> Result<(), String> {
        if self.auth.is_authenticated() {
            let client = DropboxClient::new(DropboxAuth::new());
            let sync = DropboxSync::new(client);
            sync.ensure_folders().await.map_err(|e| e.to_string())?;
            *self.sync.lock().await = Some(sync);
        }
        Ok(())
    }
}

#[tauri::command]
pub fn has_app_key() -> bool {
    DropboxAuth::has_app_key()
}

#[tauri::command]
pub fn set_app_key(app_key: String) -> Result<(), String> {
    DropboxAuth::set_app_key(&app_key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_auth_url(redirect_uri: String, state: State<DropboxState>) -> Result<String, String> {
    state.auth().generate_auth_url(&redirect_uri).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn is_authenticated(state: State<DropboxState>) -> bool {
    state.auth().is_authenticated()
}

#[tauri::command]
pub async fn exchange_auth_code(
    code: String,
    redirect_uri: String,
    state: State<'_, DropboxState>,
) -> Result<(), String> {
    state
        .auth()
        .exchange_code(&code, &redirect_uri)
        .await
        .map_err(|e| e.to_string())?;

    // Initialize the sync client
    state.initialize().await?;

    Ok(())
}

#[tauri::command]
pub async fn logout(state: State<'_, DropboxState>) -> Result<(), String> {
    state.auth().clear_tokens().map_err(|e| e.to_string())?;
    *state.sync.lock().await = None;
    Ok(())
}

#[tauri::command]
pub async fn sync_metadata(state: State<'_, DropboxState>) -> Result<HsaMetadata, String> {
    let guard = state.sync.lock().await;
    let sync = guard
        .as_ref()
        .ok_or("Not connected to Dropbox")?;

    sync.fetch_metadata().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_metadata(
    metadata: HsaMetadata,
    state: State<'_, DropboxState>,
) -> Result<HsaMetadata, String> {
    let guard = state.sync.lock().await;
    let sync = guard
        .as_ref()
        .ok_or("Not connected to Dropbox")?;

    sync.save_metadata(&metadata).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn upload_receipt(
    receipt_id: String,
    data: Vec<u8>,
    state: State<'_, DropboxState>,
) -> Result<(), String> {
    let guard = state.sync.lock().await;
    let sync = guard
        .as_ref()
        .ok_or("Not connected to Dropbox")?;

    sync.upload_receipt(&receipt_id, &data)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn download_receipt(
    receipt_id: String,
    state: State<'_, DropboxState>,
) -> Result<Vec<u8>, String> {
    let guard = state.sync.lock().await;
    let sync = guard
        .as_ref()
        .ok_or("Not connected to Dropbox")?;

    sync.download_receipt(&receipt_id)
        .await
        .map_err(|e| e.to_string())
}
