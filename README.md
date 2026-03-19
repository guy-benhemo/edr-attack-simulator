# Guardz S1 Detection Emulation App

A desktop application that runs safe, self-cleaning attack emulations against Windows endpoints to validate whether an EDR/antivirus detects and blocks common threat techniques.

Built with **Tauri 2 + React 19 + TypeScript** (Rust backend, React frontend).

## Attack Scenarios

| # | Scenario | Category | Technique |
|---|----------|----------|-----------|
| 1 | Certutil SAM Dump | Credential Access | Spawns `certutil -encode` processes targeting credential hive names (SAM, SYSTEM, SECURITY) |
| 2 | RDP Enable via Registry | Persistence | Emulates remote `Set-ItemProperty` on Terminal Server registry key via `Invoke-Command` |
| 3 | AMSI Reflection Probe | Behavioral | Resolves AMSI internals via .NET Reflection using file-based execution with string fragmentation |
| 4 | LSASS Handle Access | Credential Access | Spawns credential harvesting processes (procdump, comsvcs MiniDump, mimikatz patterns) via batch files |
| 5 | Reverse Shell (TCP) | Exfiltration | Opens TCP socket to localhost with StreamReader/StreamWriter simulating C2 callback |
| 6 | Scheduled Task Persistence | Persistence | Creates persistence entries via registry Run keys, scheduled tasks, WMI subscriptions, and startup folder |
| 7 | Base64 Encoded Execution | Static Detection | Runs `powershell -EncodedCommand` with base64-encoded payload containing suspicious API strings |
| 8 | Office Macro Security Tamper | Behavioral | Writes VBA macro security registry keys (AccessVBOM, VbaWarnings) to test paths |
| 9 | LOLBin File Download | LOLBin | Uses `curl.exe` to silently download from a dummy URL — a trusted system binary LOLBin technique |
| 10 | BloodHound AD Recon | Reconnaissance | Emulates `Invoke-BloodHound` AD enumeration commands targeting a fake domain |

All scenarios are **safe and self-cleaning** — they create benign artifacts, verify detection, and remove all traces automatically.

## Result Statuses

- **Executed** — the attack completed successfully, meaning the endpoint is vulnerable (EDR/AV did not block it)
- **Blocked** — the EDR/AV detected and stopped the attack (desired outcome)
- **Error** — the scenario failed to run (process killed by AV before completion)

## Evasion Techniques

The emulations use several techniques to bypass basic antivirus while remaining detectable by EDR:

- **Batch file execution** — `.bat` files bypass AMSI (PowerShell script scanning)
- **String fragmentation** — sensitive strings split via `set` variable concatenation in batch or `-join()` in PowerShell
- **File-based indirection** — scripts written to temp files via `[System.IO.File]::WriteAllText`, then executed through `cmd.exe → powershell.exe -File`
- **Child process spawning** — suspicious commands run in child processes via `Start-Process` so the parent script always completes
- **Unique run IDs** — each execution uses UUID-based temp file names to avoid collisions

## Development

```bash
npm run tauri dev      # Start dev (Vite + Tauri)
npm run tauri build    # Production build
npm run dev            # Frontend only (no Tauri window)
npx tsc --noEmit       # TypeScript check
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Framer Motion
- **Backend**: Rust (Tauri 2)
- **IPC**: `invoke()` from `@tauri-apps/api/core`
- **Fonts**: Inter, Red Hat Display

## IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
