use crate::commands::dropbox::DropboxState;
use crate::models::event::{HsaEvent, NewEvent};
use tauri::State;

#[tauri::command]
pub async fn get_events(state: State<'_, DropboxState>) -> Result<Vec<HsaEvent>, String> {
    let guard = state.sync.lock().await;
    let sync = guard.as_ref().ok_or("Not connected to Dropbox")?;
    let metadata = sync.fetch_metadata().await.map_err(|e| e.to_string())?;
    Ok(metadata.events)
}

#[tauri::command]
pub async fn add_event(
    event: NewEvent,
    state: State<'_, DropboxState>,
) -> Result<HsaEvent, String> {
    let guard = state.sync.lock().await;
    let sync = guard.as_ref().ok_or("Not connected to Dropbox")?;

    // Fetch current metadata
    let mut metadata = sync.fetch_metadata().await.map_err(|e| e.to_string())?;

    // Add the new event
    let new_event = event.into_event();
    metadata.events.push(new_event.clone());

    // Save back to Dropbox
    sync.save_metadata(&metadata)
        .await
        .map_err(|e| e.to_string())?;

    Ok(new_event)
}

#[tauri::command]
pub async fn delete_event(id: String, state: State<'_, DropboxState>) -> Result<(), String> {
    let guard = state.sync.lock().await;
    let sync = guard.as_ref().ok_or("Not connected to Dropbox")?;

    // Fetch current metadata
    let mut metadata = sync.fetch_metadata().await.map_err(|e| e.to_string())?;

    let initial_len = metadata.events.len();
    metadata.events.retain(|e| e.id() != id);

    if metadata.events.len() == initial_len {
        return Err(format!("Event with id {} not found", id));
    }

    // Save back to Dropbox
    sync.save_metadata(&metadata)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
