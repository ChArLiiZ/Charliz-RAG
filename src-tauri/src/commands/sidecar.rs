use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

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

impl SidecarState {
    pub fn stop_active(&self) {
        if let Ok(mut guard) = self.process.lock() {
            if let Some(mut child) = guard.take() {
                let _ = child.kill();
            }
        }
    }
}

fn backend_entry(app: &AppHandle) -> Result<PathBuf, String> {
    let mut candidates = Vec::new();

    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir.join("python-backend").join("src").join("main.py"));
        candidates.push(
            current_dir
                .join("..")
                .join("python-backend")
                .join("src")
                .join("main.py"),
        );
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("python-backend").join("src").join("main.py"));
        candidates.push(
            resource_dir
                .join("..")
                .join("python-backend")
                .join("src")
                .join("main.py"),
        );
    }

    candidates
        .into_iter()
        .find(|path| path.exists())
        .ok_or_else(|| "Unable to locate python-backend/src/main.py".to_string())
}

fn wait_for_startup() {
    thread::sleep(Duration::from_millis(800));
}

#[command]
pub fn start_sidecar(app: AppHandle, state: State<'_, SidecarState>) -> Result<(), String> {
    let mut guard = state.process.lock().map_err(|error| error.to_string())?;

    if let Some(child) = guard.as_mut() {
        match child.try_wait().map_err(|error| error.to_string())? {
            None => return Ok(()),
            Some(_) => {
                *guard = None;
            }
        }
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
    wait_for_startup();
    Ok(())
}

#[command]
pub fn stop_sidecar(state: State<'_, SidecarState>) -> Result<(), String> {
    state.stop_active();
    Ok(())
}
