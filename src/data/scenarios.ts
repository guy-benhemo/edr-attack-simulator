import { Scenario } from "../types";

export const INITIAL_SCENARIOS: Scenario[] = [
  {
    id: "certutil-dump",
    name: "Certutil SAM Dump",
    description:
      "Uses certutil -encode on a dummy file, simulating SAM/SYSTEM data extraction via a built-in system tool.",
    category: "Credential Access",
    status: "ready",
  },
  {
    id: "rdp-enable",
    name: "RDP Enable via Registry",
    description:
      "Modifies the registry to enable Remote Desktop (fDenyTSConnections = 0), then immediately reverts.",
    category: "Persistence",
    status: "ready",
  },
  {
    id: "amsi-patch",
    name: "AMSI Memory Patch",
    description:
      "Attempts to patch AMSI in-memory via .NET Reflection, nullifying the AmsiContext field.",
    category: "Behavioral",
    status: "ready",
  },
  {
    id: "lsass-minidump",
    name: "LSASS Minidump",
    description:
      "Uses MiniDumpWriteDump via P/Invoke to dump LSASS process memory to a temp file, then deletes it.",
    category: "Credential Access",
    status: "ready",
  },
  {
    id: "reverse-shell",
    name: "Reverse Shell (TCP)",
    description:
      "Opens a TCP socket with StreamReader/Writer and Invoke-Expression, simulating a real C2 callback pattern.",
    category: "Exfiltration",
    status: "ready",
  },
  {
    id: "persistence-task",
    name: "Scheduled Task Persistence",
    description:
      "Creates a scheduled task with a benign echo command, then immediately deletes it.",
    category: "Persistence",
    status: "ready",
  },
  {
    id: "base64-exec",
    name: "Base64 Encoded Execution",
    description:
      "Runs PowerShell -EncodedCommand with a base64-encoded harmless whoami to bypass text monitoring.",
    category: "Static Detection",
    status: "ready",
  },
  {
    id: "macro-tamper",
    name: "Office Macro Security Tamper",
    description:
      "Modifies Office VBA macro security level in the registry, then immediately reverts the change.",
    category: "Behavioral",
    status: "ready",
  },
  {
    id: "lotl-download",
    name: "LOLBin File Download",
    description:
      "Uses certutil -urlcache to download from a dummy URL — a classic Living-off-the-Land technique.",
    category: "LOLBin",
    status: "ready",
  },
  {
    id: "bloodhound-recon",
    name: "BloodHound AD Recon",
    description:
      "Emulates BloodHound execution with Invoke-BloodHound -CollectionMethod All, triggering AD reconnaissance detection.",
    category: "Reconnaissance",
    status: "ready",
  },
];
