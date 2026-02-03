use crate::models::event::{AppState, HsaEvent, NewEvent};
use tauri::State;

#[tauri::command]
pub fn get_events(state: State<AppState>) -> Vec<HsaEvent> {
    let metadata = state.metadata.lock().unwrap();
    metadata.events.clone()
}

#[tauri::command]
pub fn add_event(event: NewEvent, state: State<AppState>) -> HsaEvent {
    let mut metadata = state.metadata.lock().unwrap();
    let new_event = event.into_event();
    metadata.events.push(new_event.clone());
    metadata.last_modified = chrono::Utc::now().to_rfc3339();
    new_event
}

#[tauri::command]
pub fn delete_event(id: String, state: State<AppState>) -> Result<(), String> {
    let mut metadata = state.metadata.lock().unwrap();
    let initial_len = metadata.events.len();
    metadata.events.retain(|e| e.id() != id);

    if metadata.events.len() == initial_len {
        return Err(format!("Event with id {} not found", id));
    }

    metadata.last_modified = chrono::Utc::now().to_rfc3339();
    Ok(())
}
