mod commands;
mod dropbox;
mod models;

use commands::dropbox::{
    download_receipt, logout, save_metadata, start_oauth_flow, sync_metadata,
    upload_receipt, DropboxState,
};
use commands::events::{add_event, delete_event, get_events};
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(DropboxState::new())
        .invoke_handler(tauri::generate_handler![
            get_events,
            add_event,
            delete_event,
            start_oauth_flow,
            logout,
            sync_metadata,
            save_metadata,
            upload_receipt,
            download_receipt,
        ])
        .setup(|app| {
            let dropbox_state = app.state::<DropboxState>();
            let state_clone = dropbox_state.inner().sync.clone();
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Initialize dropbox connection if already authenticated
                let auth = crate::dropbox::DropboxAuth::new();
                let authenticated = if auth.is_authenticated() {
                    let client = crate::dropbox::DropboxClient::new(auth);
                    let sync = crate::dropbox::sync::DropboxSync::new(client);
                    sync.migrate_legacy_paths().await;
                    if sync.ensure_folders().await.is_ok() {
                        *state_clone.lock().await = Some(sync);
                        true
                    } else {
                        false
                    }
                } else {
                    false
                };
                let _ = handle.emit("auth-state-changed", authenticated);
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
