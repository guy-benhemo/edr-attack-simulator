use serde::Serialize;
use std::path::PathBuf;
use std::time::Duration;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionResult {
    scenario_id: String,
    status: String,
    message: String,
    stdout: String,
    stderr: String,
    exit_code: i32,
    duration_ms: u64,
}

fn work_dir() -> PathBuf {
    std::env::temp_dir().join("guardz_emu")
}

fn results_dir() -> PathBuf {
    work_dir().join("results")
}

#[tauri::command]
fn prepare_scenarios(scenario_ids: Vec<String>) -> Result<(), String> {
    use std::fs;

    let work = work_dir();
    let results = results_dir();

    let _ = fs::remove_dir_all(&work);
    fs::create_dir_all(&results).map_err(|e| e.to_string())?;

    let manifest: Vec<serde_json::Value> = scenario_ids
        .iter()
        .map(|id| serde_json::json!({ "id": id }))
        .collect();
    let manifest_json = serde_json::to_string(&manifest).map_err(|e| e.to_string())?;
    fs::write(work.join("manifest.json"), manifest_json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn launch_runner(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use tauri::Manager;

        let launcher = app
            .path()
            .resource_dir()
            .map_err(|e| e.to_string())?
            .join("scripts")
            .join("launcher.vbs");

        if !launcher.exists() {
            return Err(format!("Launcher not found: {}", launcher.display()));
        }

        std::process::Command::new("explorer.exe")
            .arg(launcher)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        spawn_mock_runner()?;
    }

    Ok(())
}

#[tauri::command]
fn poll_result(scenario_id: String) -> Result<Option<ExecutionResult>, String> {
    let result_file = results_dir().join(format!("{}.json", scenario_id));

    if !result_file.exists() {
        return Ok(None);
    }

    let content = std::fs::read_to_string(&result_file).map_err(|e| e.to_string())?;

    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
        Ok(Some(ExecutionResult {
            scenario_id: val["scenarioId"].as_str().unwrap_or("").to_string(),
            status: val["status"].as_str().unwrap_or("completed").to_string(),
            message: val["message"].as_str().unwrap_or("").to_string(),
            stdout: val["stdout"].as_str().unwrap_or("").to_string(),
            stderr: val["stderr"].as_str().unwrap_or("").to_string(),
            exit_code: val["exitCode"].as_i64().unwrap_or(0) as i32,
            duration_ms: val["durationMs"].as_u64().unwrap_or(0),
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn check_runner_done() -> bool {
    results_dir().join("_done").exists()
}

#[tauri::command]
fn reset_scenarios() -> Result<(), String> {
    let _ = std::fs::remove_dir_all(work_dir());
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn spawn_mock_runner() -> Result<(), String> {
    std::thread::spawn(|| {
        let manifest_path = work_dir().join("manifest.json");
        if let Ok(content) = std::fs::read_to_string(&manifest_path) {
            if let Ok(scenarios) = serde_json::from_str::<Vec<serde_json::Value>>(&content) {
                for scenario in &scenarios {
                    let id = scenario["id"].as_str().unwrap_or("");
                    std::thread::sleep(Duration::from_millis(800));
                    let result = serde_json::json!({
                        "scenarioId": id,
                        "status": "completed",
                        "message": format!("Mock: {} (macOS dev mode)", id),
                        "stdout": "mock output (macOS dev mode)",
                        "stderr": "",
                        "exitCode": 0,
                        "durationMs": 800
                    });
                    let result_file = results_dir().join(format!("{}.json", id));
                    let _ = std::fs::write(&result_file, result.to_string());
                }
                let _ = std::fs::write(results_dir().join("_done"), "done");
            }
        }
    });
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            prepare_scenarios,
            launch_runner,
            poll_result,
            check_runner_done,
            reset_scenarios
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
