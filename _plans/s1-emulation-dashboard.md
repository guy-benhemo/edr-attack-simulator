# SentinelOne Emulation Dashboard — Implementation Plan

## Context

This app is a Guardz-branded sales enablement tool that lets a sales engineer demo SentinelOne's detection capabilities live. The current state is a fresh Tauri 2 + React 19 scaffold with a single `greet` command. We need to replace it with a dark-mode dashboard of 10 threat scenario cards, each triggering a silent shell command via the Rust backend.

The Guardz design system (colors + typography) is already configured in `src/styles/globals.css`.

---

## Step 1: Rust Backend — Dependencies & Scenario Commands

**Modify** `src-tauri/Cargo.toml`:
- Add `rand = "0.8"` and `uuid = { version = "1", features = ["v4"] }` for polymorphic execution

**Rewrite** `src-tauri/src/lib.rs`:
- Remove the `greet` command
- Add `use` statements for `std::process::Command`, `std::env`, `std::fs`, `uuid::Uuid`, `serde::{Serialize, Deserialize}`
- Define `ExecutionResult` struct (Serialize): `scenario_id`, `status` ("blocked"/"completed"/"failed"), `message`, `duration_ms`
- Define `#[tauri::command] async fn execute_scenario(scenario_id: String) -> Result<ExecutionResult, String>` — matches on scenario_id, dispatches to per-scenario functions
- Define `#[tauri::command] fn reset_scenarios() -> Result<(), String>` — cleans up temp artifacts
- Implement 10 private scenario functions, each using `std::process::Command` with:
  - `.creation_flags(0x08000000)` on Windows (`CREATE_NO_WINDOW`)
  - Randomized temp file names via `Uuid::new_v4()`
  - Cleanup after execution
- On non-Windows (for dev), return mock results so UI can be developed on macOS
- Register: `tauri::generate_handler![execute_scenario, reset_scenarios]`

**The 10 scenarios** (all use `std::process::Command` directly — no shell plugin needed):
| # | ID | What it does |
|---|-----|-------------|
| 1 | certutil-dump | `certutil -encode` on a dummy file, simulating SAM/SYSTEM data extraction via system tool |
| 2 | rdp-enable | `reg add` to enable RDP (`fDenyTSConnections = 0`), then immediately revert with `reg add` |
| 3 | amsi-patch | PowerShell that attempts to patch AMSI in-memory via Reflection (`AmsiContext` field null-out) |
| 4 | lsass-minidump | PowerShell using `MiniDumpWriteDump` via P/Invoke to dump lsass to a temp file, then delete |
| 5 | reverse-shell | PowerShell opening a TCP `System.Net.Sockets.TcpClient` to a non-routable address (simulated C2 connect, immediately aborted) |
| 6 | persistence-task | `schtasks /create` with a benign echo command, then immediate `schtasks /delete` |
| 7 | base64-exec | `powershell -EncodedCommand <base64 of harmless whoami>` — encoded execution to bypass text monitoring |
| 8 | macro-tamper | `reg add` to set `HKCU\...\Security\Trusted Locations` / VBA macro security level, then revert |
| 9 | lotl-download | `certutil -urlcache -split -f` downloading from a dummy URL (Living-off-the-Land file download) |
| 10 | keylogger-sim | PowerShell calling `GetAsyncKeyState` via P/Invoke in a short loop, simulating keyboard API access |

---

## Step 2: Frontend — Types & Data

**Create** `src/types.ts`:
- `ScenarioStatus`: `"ready" | "executing" | "blocked" | "completed" | "failed"`
- `ThreatCategory`: `"Static Detection" | "Behavioral" | "Reconnaissance" | "Persistence" | "Exfiltration" | "LOLBin" | "Credential Access"`
- `Scenario`: `{ id, name, description, category, status, message?, lastRunAt? }`
- `ExecutionResult`: matches Rust struct

**Create** `src/data/scenarios.ts`:
- Export `INITIAL_SCENARIOS: Scenario[]` — the 10 scenarios with `status: "ready"`

---

## Step 3: Frontend — Components

**Create** `src/components/Dashboard.tsx`:
- State: `scenarios` array via `useState`, initialized from `INITIAL_SCENARIOS`
- `handleSimulate(id)`: set executing → `invoke('execute_scenario', { scenarioId: id })` → update result
- `handleResetAll()`: `invoke('reset_scenarios')` → reset all to ready
- Layout: dark bg, header row (logo + title + Reset All), SummaryBar, 2-column card grid

**Create** `src/components/ScenarioCard.tsx`:
- Props: `scenario`, `onSimulate`
- Card: `bg-guardz-dark-gray`, `rounded-xl`, `border border-white/10`
- Executing state: purple glow border via `shadow-[0_0_15px_rgba(101,79,232,0.4)]`
- Scenario name: `text-headline-07` (not 05 — better fit for cards at this size)
- Description: `text-body-03`
- Category badge, status badge, Simulate button (`bg-guardz-purple`)

**Create** `src/components/SummaryBar.tsx`:
- Counts per status, color-coded pills

**Create** `src/components/StatusBadge.tsx`:
- Maps status → color + label, `animate-pulse` when executing

**Create** `src/components/CategoryBadge.tsx`:
- Category → colored pill (e.g. Behavioral → purple/20, Persistence → dark-purple)

**Modify** `src/App.tsx`:
- Replace entire greet demo with `<Dashboard />`
- Root element: `min-h-screen bg-[#12131a]` (darker than card bg)

---

## Step 4: Tauri Configuration

**Modify** `src-tauri/tauri.conf.json`:
- Window: `1280x900`, `resizable: true`, title: `"Guardz S1 Detection Demo"`

**No changes needed** to `capabilities/default.json` — `std::process::Command` runs server-side in Rust and requires no Tauri permissions.

---

## Step 5: Windows Admin Elevation (deferred)

This only matters for production builds on Windows. For now, add a note in the README. The manifest + `winres` build dependency can be added when targeting Windows builds specifically.

---

## Files Summary

| Action | File |
|--------|------|
| Modify | `src-tauri/Cargo.toml` |
| Rewrite | `src-tauri/src/lib.rs` |
| Modify | `src-tauri/tauri.conf.json` |
| Rewrite | `src/App.tsx` |
| Create | `src/types.ts` |
| Create | `src/data/scenarios.ts` |
| Create | `src/components/Dashboard.tsx` |
| Create | `src/components/ScenarioCard.tsx` |
| Create | `src/components/SummaryBar.tsx` |
| Create | `src/components/StatusBadge.tsx` |
| Create | `src/components/CategoryBadge.tsx` |

---

## Verification

1. `npx tsc --noEmit` — TypeScript compiles without errors
2. `npm run dev` — Frontend renders the dashboard with 10 cards in dark mode
3. Cards show correct brand colors, typography, category badges
4. Clicking "Simulate" shows executing animation (on macOS, returns mock result)
5. "Reset All" returns all cards to Ready state
6. `cargo build` in `src-tauri/` — Rust compiles without errors
7. On Windows: `npm run tauri dev` — clicking Simulate triggers real scenarios, no visible console windows
