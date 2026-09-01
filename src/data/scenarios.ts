import { Scenario } from "../types";

export const INITIAL_SCENARIOS: Scenario[] = [
  {
    id: "certutil-dump",
    name: "Certutil SAM Dump",
    shortName: "SAM Dump",
    question: "Can an attacker extract stored credentials using built-in tools?",
    description:
      "Uses certutil -encode on a dummy file, simulating SAM/SYSTEM data extraction via a built-in system tool.",
    category: "Credential Access",
    mitreId: "T1003.002",
    status: "ready",
  },
  {
    id: "rdp-enable",
    name: "RDP Enable via Registry",
    shortName: "RDP Enable",
    question: "Can an attacker silently enable Remote Desktop access?",
    description:
      "Modifies the registry to enable Remote Desktop (fDenyTSConnections = 0), then immediately reverts.",
    category: "Persistence",
    mitreId: "T1112",
    status: "ready",
  },
  {
    id: "amsi-patch",
    name: "AMSI Reflection Probe",
    shortName: "AMSI Probe",
    question: "Can an attacker bypass Windows anti-malware scanning?",
    description:
      "Resolves AMSI internals via .NET Reflection using file-based execution with string fragmentation to bypass script scanning.",
    category: "Defense Evasion",
    mitreId: "T1562.001",
    status: "ready",
  },
  {
    id: "lsass-minidump",
    name: "LSASS Handle Access",
    shortName: "LSASS Access",
    question: "Can an attacker dump credentials from memory?",
    description:
      "Spawns credential harvesting processes (procdump, comsvcs MiniDump, mimikatz patterns) via batch file execution.",
    category: "Credential Access",
    mitreId: "T1003.001",
    status: "ready",
  },
  {
    id: "reverse-shell",
    name: "Reverse Shell (TCP)",
    shortName: "Reverse Shell",
    question: "Can an attacker establish a command-and-control channel?",
    description:
      "Opens a TCP socket to localhost with StreamWriter, simulating a C2 callback pattern without full shell execution.",
    category: "Command & Control",
    mitreId: "T1071",
    status: "ready",
  },
  {
    id: "persistence-task",
    name: "Scheduled Task Persistence",
    shortName: "Sched Task",
    question: "Can an attacker create persistent backdoor access?",
    description:
      "Creates persistence entries via registry Run keys, scheduled tasks, WMI subscriptions, and startup folder — all self-cleaning.",
    category: "Persistence",
    mitreId: "T1053",
    status: "ready",
  },
  {
    id: "base64-exec",
    name: "Base64 Encoded Execution",
    shortName: "Base64 Exec",
    question: "Can an attacker execute hidden encoded commands?",
    description:
      "Runs PowerShell -EncodedCommand with a base64-encoded harmless whoami to bypass text monitoring.",
    category: "Execution",
    mitreId: "T1027",
    status: "ready",
  },
  {
    id: "lotl-download",
    name: "LOLBin File Download",
    shortName: "LOLBin DL",
    question: "Can an attacker download files using trusted system tools?",
    description:
      "Uses curl.exe to silently download from a dummy URL — a Living-off-the-Land technique using a trusted system binary.",
    category: "LOLBin",
    mitreId: "T1105",
    status: "ready",
  },
  {
    id: "bloodhound-recon",
    name: "BloodHound AD Recon",
    shortName: "AD Recon",
    question: "Can an attacker map your Active Directory environment?",
    description:
      "Emulates BloodHound AD enumeration commands and queries the domain controller, triggering reconnaissance detection.",
    category: "Discovery",
    mitreId: "T1087",
    status: "ready",
  },
];

/** Matches the 5-of-9 selection shown on the A2 board. */
export const DEFAULT_SELECTED_IDS = [
  "certutil-dump",
  "amsi-patch",
  "lsass-minidump",
  "reverse-shell",
  "base64-exec",
];

/** The techniques that bypass an unmanaged endpoint in the simulated run. */
export const SIMULATED_UNDETECTED_IDS = [
  "rdp-enable",
  "lsass-minidump",
  "base64-exec",
];

export const TARGET_HOST = "WIN-DC01";
export const TARGET_IP = "10.0.4.12";
