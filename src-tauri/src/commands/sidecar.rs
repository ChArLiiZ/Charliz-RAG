use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use tauri::{command, AppHandle, Manager, State};

pub struct SidecarState {
    process: Mutex<Option<Child>>,
}

impl Default for SidecarState {
    fn default() -> Self {
        Self {
            process: Mutex::new(None),
        }
    }
}

fn backend_entry(app: &AppHandle) -> Result<PathBuf, String> {
    let mut path = app
        .path()
        .resolve("../python-backend/src/main.py", tauri::path::BaseDirectory::Resource)
        .map_err(|error| error.to_string())?;

    if !path.exists() {
        path = app
            .path()
            .resolve("../../python-backend/src/main.py", tauri::path::BaseDirectory::Resource)
            .map_err(|error| error.to_string())?;
    }

    Ok(path)
}

#[command]
pub fn start_sidecar(app: AppHandle, state: State<'_, SidecarState>) -> Result<(), String> {
    let mut guard = state.process.lock().map_err(|error| error.to_string())?;

    if guard.is_some() {
        return Ok(());
    }

    let backend_path = backend_entry(&app)?;
    let child = Command::new("python")
        .arg(backend_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|error| error.to_string())?;

    *guard = Some(child);
    Ok(())
}

#[command]
pub fn stop_sidecar(state: State<'_, SidecarState>) -> Result<(), String> {
    let mut guard = state.process.lock().map_err(|error| error.to_string())?;

    if let Some(mut child) = guard.take() {
        child.kill().map_err(|error| error.to_string())?;
    }

    Ok(())
}
