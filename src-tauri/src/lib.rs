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

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn work_dir() -> PathBuf {
    std::env::temp_dir().join("guardz_emu")
}

fn results_dir() -> PathBuf {
    work_dir().join("results")
}

fn scripts_dir() -> PathBuf {
    work_dir().join("scripts")
}

#[tauri::command]
fn prepare_scenarios(
    app: tauri::AppHandle,
    scenario_ids: Vec<String>,
) -> Result<(), String> {
    use std::fs;
    use tauri::Manager;

    let work = work_dir();
    let scripts = scripts_dir();
    let results = results_dir();

    let _ = fs::remove_dir_all(&work);
    fs::create_dir_all(&scripts).map_err(|e| e.to_string())?;
    fs::create_dir_all(&results).map_err(|e| e.to_string())?;

    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("scripts");

    for id in &scenario_ids {
        let src = resource_path.join(format!("{}.ps1", id));
        let dst = scripts.join(format!("{}.ps1", id));
        if src.exists() {
            fs::copy(&src, &dst).map_err(|e| e.to_string())?;
        }
    }

    let runner_src = resource_path.join("runner.ps1");
    let runner_dst = work.join("runner.ps1");
    fs::copy(&runner_src, &runner_dst).map_err(|e| e.to_string())?;

    let manifest: Vec<serde_json::Value> = scenario_ids
        .iter()
        .map(|id| serde_json::json!({ "id": id }))
        .collect();
    let manifest_json = serde_json::to_string(&manifest).map_err(|e| e.to_string())?;
    fs::write(work.join("manifest.json"), manifest_json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn launch_runner() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let work = work_dir();
        let runner = work.join("runner.ps1");
        let scripts = scripts_dir();
        let results = results_dir();
        let manifest = work.join("manifest.json");

        let vbs_path = work.join("launcher.vbs");
        let vbs_content = format!(
            "CreateObject(\"WScript.Shell\").Run \"powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"\"{}\"\" -ScriptsDir \"\"{}\"\" -ResultsDir \"\"{}\"\" -ManifestPath \"\"{}\"\"\", 0, False",
            runner.to_string_lossy().replace('\\', "\\\\"),
            scripts.to_string_lossy().replace('\\', "\\\\"),
            results.to_string_lossy().replace('\\', "\\\\"),
            manifest.to_string_lossy().replace('\\', "\\\\"),
        );
        std::fs::write(&vbs_path, &vbs_content).map_err(|e| e.to_string())?;

        std::process::Command::new("explorer.exe")
            .arg(&vbs_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(not(target_os = "windows"))]
    {
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

// ── macOS mock runner for development ──

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
