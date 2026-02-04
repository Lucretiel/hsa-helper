mod commands;
mod dropbox;
mod models;

use commands::dropbox::{
    download_receipt, is_authenticated, logout, save_metadata, start_oauth_flow, sync_metadata,
    upload_receipt, DropboxState,
};
use commands::events::{add_event, delete_event, get_events};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(DropboxState::new())
        .invoke_handler(tauri::generate_handler![
            get_events,
            add_event,
            delete_event,
            is_authenticated,
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
            tauri::async_runtime::spawn(async move {
                // Initialize dropbox connection if already authenticated
                let auth = crate::dropbox::DropboxAuth::new();
                if auth.is_authenticated() {
                    let client = crate::dropbox::DropboxClient::new(auth);
                    let sync = crate::dropbox::sync::DropboxSync::new(client);
                    // Migrate from legacy paths if needed, then ensure folders exist
                    let _ = sync.migrate_legacy_paths().await;
                    if sync.ensure_folders().await.is_ok() {
                        *state_clone.lock().await = Some(sync);
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
