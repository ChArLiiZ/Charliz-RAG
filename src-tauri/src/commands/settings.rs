use tauri::command;

#[command]
pub async fn load_settings() -> Result<String, String> {
    Ok("{\"status\":\"todo\"}".to_string())
}
