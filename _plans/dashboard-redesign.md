# S1 Detection Dashboard — Full Redesign

## Context
The current UI is a flat grid of cards with individual "Simulate" buttons — it looks like a developer debug panel. The app is used by Guardz salespeople to demo S1 detection to MSPs, and by MSPs to validate their S1 policies. It needs to feel like a professional, guided demo tool: one click, watch it work, get a clear verdict.

## User Decisions
- **Primary flow**: "Run Full Scan" — all 10 scenarios run sequentially, automatically
- **Secondary flow**: Select individual scenarios to run
- **Layout**: Split view (sidebar progress + main panel)
- **Style**: Guardz brand standard (#363844, #654FE8 purple, #00E48A green, subtle transitions)
- **Animations**: CSS-only (no new dependencies)

---

## Screens

### 1. Welcome Screen
Centered layout. Guardz logo, title "S1 Detection Validation", one-liner description. Big green "Run Full Scan" CTA. Smaller "Or select individual tests" link below.

### 2. Execution View (Split)
- **Left sidebar (280px)**: Numbered progress list. Active item highlighted with purple accent. Completed items show "Detected" (green check) or "Not Detected" (red X).
- **Right panel**: Current scenario number, name (Red Hat Display), plain-English question ("Can an attacker dump credentials from memory?"), scanning animation while running, then big "DETECTED" / "NOT DETECTED" verdict. Auto-advances after 1.5s.
- No raw stdout/stderr shown during execution.

### 3. Results Screen
Score display: "{n}/10 Threats Detected" with SVG score ring. List of all scenarios with verdict badges. Each row expandable to show technical details (stdout/stderr/exit code). "Run Again" + "Back to Home" buttons.

### 4. Selection Screen
List of all 10 scenarios with checkboxes. "Run Selected" button. Back arrow to return to welcome.

---

## Data Model Changes

**`src/types.ts`** — Add:
```ts
type AppPhase = "welcome" | "selecting" | "executing" | "results"
type DetectionVerdict = "detected" | "not_detected" | "pending"
```
Add `shortName: string` and `question: string` to `Scenario` interface. Add `durationMs?: number`.

**`src/data/scenarios.ts`** — Add `shortName` and `question` to each scenario:
- certutil-dump: "SAM Dump" / "Can an attacker extract stored credentials using built-in tools?"
- rdp-enable: "RDP Enable" / "Can an attacker silently enable Remote Desktop access?"
- amsi-patch: "AMSI Probe" / "Can an attacker bypass Windows anti-malware scanning?"
- lsass-minidump: "LSASS Access" / "Can an attacker dump credentials from memory?"
- reverse-shell: "Reverse Shell" / "Can an attacker establish a command-and-control connection?"
- persistence-task: "Sched Task" / "Can an attacker create persistent backdoor access?"
- base64-exec: "Base64 Exec" / "Can an attacker execute hidden encoded commands?"
- macro-tamper: "Macro Tamper" / "Can an attacker disable Office macro protections?"
- lotl-download: "LOLBin DL" / "Can an attacker download files using trusted system tools?"
- bloodhound-recon: "AD Recon" / "Can an attacker map your Active Directory environment?"

---

## Component Architecture

```
App.tsx → AppShell
  ├── WelcomeScreen
  ├── SelectionScreen
  ├── ExecutionView
  │   ├── Sidebar
  │   │   └── SidebarItem (×10)
  │   └── ActiveScenarioPanel
  └── ResultsScreen
      ├── ScoreRing (SVG)
      └── ResultRow (×10, expandable)
```

## State Management — `useReducer` in AppShell

```ts
interface AppState {
  phase: AppPhase;
  scenarios: Scenario[];
  selectedIds: string[];
  currentIndex: number;
  runQueue: string[];
}
```

Actions: `START_FULL_SCAN`, `GO_TO_SELECT`, `TOGGLE_SELECTION`, `START_SELECTED`, `SCENARIO_COMPLETE`, `ADVANCE_NEXT`, `SHOW_RESULTS`, `RESET`

Sequential execution via `useEffect`: when `phase === "executing"` and `currentIndex` changes, invoke the next scenario, wait for result, show verdict 1.5s, then advance. Minimum 800ms display time per scenario (to ensure animation shows even if invoke returns fast).

## Verdict Mapping

Create `src/utils/verdict.ts`:
- `blocked` or `mitigated` → `"detected"` (S1 caught it)
- `completed` or `failed` → `"not_detected"` (attack wasn't stopped)
- `ready` or `executing` → `"pending"`

---

## CSS Animations (`src/styles/globals.css`)

4 new keyframes + utilities:
1. **`animate-scan-pulse`** — horizontal line pulse during scenario execution
2. **`animate-dot-pulse`** — active sidebar item dot
3. **`animate-verdict`** — fade+scale for DETECTED/NOT DETECTED text
4. **`animate-ring`** — SVG stroke fill for score ring on results screen

---

## File Changes

| File | Action |
|---|---|
| `src/types.ts` | Modify — add AppPhase, DetectionVerdict, shortName/question/durationMs |
| `src/data/scenarios.ts` | Modify — add shortName + question to all 10 |
| `src/styles/globals.css` | Modify — add 4 animation keyframes + utilities |
| `src/utils/verdict.ts` | Create — verdict mapping helper |
| `src/App.tsx` | Modify — render AppShell instead of Dashboard |
| `src/components/AppShell.tsx` | Create — phase router + useReducer + execution loop |
| `src/components/WelcomeScreen.tsx` | Create |
| `src/components/ExecutionView.tsx` | Create — split view container |
| `src/components/Sidebar.tsx` | Create — left progress panel |
| `src/components/SidebarItem.tsx` | Create — individual sidebar row |
| `src/components/ActiveScenarioPanel.tsx` | Create — right panel with animation + verdict |
| `src/components/ResultsScreen.tsx` | Create — score + result list |
| `src/components/ScoreRing.tsx` | Create — SVG ring component |
| `src/components/ResultRow.tsx` | Create — expandable result row |
| `src/components/SelectionScreen.tsx` | Create — checkbox scenario list |
| `src/components/Dashboard.tsx` | Delete |
| `src/components/ScenarioCard.tsx` | Delete |
| `src/components/SummaryBar.tsx` | Delete |
| `src/components/StatusBadge.tsx` | Delete |
| `src/components/CategoryBadge.tsx` | Keep — reused in execution + selection views |

## Implementation Order

1. Data & types (`types.ts`, `scenarios.ts`, `verdict.ts`)
2. CSS animations (`globals.css`)
3. AppShell with useReducer + phase routing
4. WelcomeScreen
5. ExecutionView (Sidebar + SidebarItem + ActiveScenarioPanel)
6. ResultsScreen (ScoreRing + ResultRow)
7. SelectionScreen
8. Wire App.tsx, delete old components
9. Polish — timing, transitions, edge cases

## Verification
1. `npx tsc --noEmit` — type check passes
2. `npm run dev` — launches at localhost:1420
3. Welcome screen renders with both CTAs
4. "Run Full Scan" → execution view, scenarios advance automatically
5. Each scenario shows scanning animation → verdict → auto-advance
6. Results screen shows correct score and expandable details
7. "Select individual tests" → selection screen → run subset → results
8. "Run Again" and "Back to Home" work correctly
