mod commands;

use commands::settings::load_settings;
use commands::sidecar::{start_sidecar, stop_sidecar, SidecarState};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(SidecarState::default())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let state = window.state::<SidecarState>();
                state.stop_active();
            }
        })
        .invoke_handler(tauri::generate_handler![
            start_sidecar,
            stop_sidecar,
            load_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
