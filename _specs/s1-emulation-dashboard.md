# SentinelOne Emulation Dashboard

## Overview

A Guardz-branded sales enablement desktop dashboard that lets a sales engineer demonstrate SentinelOne's detection and response capabilities live, with a single click per scenario — no technical setup required.

## Goals

- Allow a sales engineer to trigger 10 distinct, realistic threat simulations from a polished UI
- Each simulation runs silently (no visible terminal windows) and produces a detectable event in SentinelOne
- Show real-time status feedback per scenario (Ready → Executing → Blocked / Detected)
- Match Guardz visual identity: dark mode, brand colors, Red Hat Display / Inter typography

## Non-Goals

- This tool is not for use outside of authorized demo environments
- Does not connect to any live production systems or real targets
- Does not bypass or disable any security controls — it relies on EDR detection, not evasion

## User Stories

- As a sales engineer, I can open the app and see all 10 threat scenario cards at a glance
- As a sales engineer, I can click "Simulate" on any card and watch its status update in real time
- As a sales engineer, I can reset all scenarios back to "Ready" state before the next demo
- As a sales engineer, I can run the app without needing to configure anything beforehand
- As a viewer (prospect), I can see a professional, branded dashboard that mirrors a real security product

## Functional Requirements

### Dashboard Layout

- Single-window app, dark background
- Header: Guardz logo + "SentinelOne Detection Demo" title
- Grid of 10 threat scenario cards (2 columns or responsive)
- Global "Reset All" button to restore all cards to Ready state
- Optional: summary bar showing counts of Ready / Executing / Blocked cards

### Threat Scenario Card

Each card displays:
- Scenario name (e.g. "EICAR Instant Drop")
- Short description of what it simulates (1 sentence)
- Threat category badge (e.g. Static Detection, Behavioral, Persistence, Exfiltration)
- Status indicator: Ready (neutral) / Executing (animated) / Blocked (green/success) / Failed (red)
- "Simulate" button — disabled while Executing or after terminal state

### The 10 Scenarios

| # | Name | Category |
|---|------|----------|
| 1 | EICAR Instant Drop | Static Detection |
| 2 | Encoded PowerShell | Behavioral |
| 3 | Credential Hunting | Reconnaissance |
| 4 | Memory Injection Sim | Behavioral |
| 5 | Scheduled Task Persistence | Persistence |
| 6 | Registry Run Key | Persistence |
| 7 | DNS Exfiltration Sim | Exfiltration |
| 8 | Certutil LOLBin Download | LOLBin |
| 9 | VBA Macro Simulation | Behavioral |
| 10 | LSASS Process Access | Credential Access |

### Simulation Flow (per card)

1. User clicks "Simulate"
2. Card status → Executing (spinner animation)
3. Tauri backend runs the scenario command silently
4. After ~2 seconds, card status → Blocked (if S1 detected) or a neutral "Completed" state
5. Timestamp of last run shown on card

### Rust Backend

- Single Tauri command: `run_scenario(id: u8) -> Result<String, String>`
- Commands run without spawning visible windows (`CREATE_NO_WINDOW` on Windows)
- Each scenario generates a slightly different execution context to avoid threat grouping in S1 (randomized temp file names, varied argument order)

### Admin Elevation

- App manifest requests `requireAdministrator` on Windows so UAC prompt appears once at launch
- All 10 simulations then run with elevated privileges without re-prompting

## Design Requirements

- Dark mode only
- Colors: use `guardz-dark-gray` (#363844) for card backgrounds, `guardz-purple` (#654FE8) for primary actions, `guardz-green` (#4FE882) for Blocked/success state, `guardz-pink` (#FC5281) for Failed state
- Typography: `text-headline-05` for card titles, `text-body-03` for descriptions
- Subtle card border using `guardz-medium-gray`, glowing border on Executing state (purple glow)
- Status badges use pill shape with color-coded backgrounds
- Smooth CSS transitions for status changes

## Out of Scope

- SentinelOne API integration (polling for real alerts) — future enhancement
- macOS / Linux support for all scenarios (some are Windows-only)
- Authentication or multi-user support
- Logging or audit trail
