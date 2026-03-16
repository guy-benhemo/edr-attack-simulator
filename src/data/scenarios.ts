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
    status: "ready",
  },
  {
    id: "amsi-patch",
    name: "AMSI Reflection Probe",
    shortName: "AMSI Probe",
    question: "Can an attacker bypass Windows anti-malware scanning?",
    description:
      "Resolves AMSI internals via .NET Reflection to inspect the AmsiContext field, triggering behavioral detection.",
    category: "Behavioral",
    status: "ready",
  },
  {
    id: "lsass-minidump",
    name: "LSASS Handle Access",
    shortName: "LSASS Access",
    question: "Can an attacker dump credentials from memory?",
    description:
      "Attempts to open a handle to the LSASS process, triggering credential access detection without memory dumping.",
    category: "Credential Access",
    status: "ready",
  },
  {
    id: "reverse-shell",
    name: "Reverse Shell (TCP)",
    shortName: "Reverse Shell",
    question: "Can an attacker establish a command-and-control connection?",
    description:
      "Opens a TCP socket to localhost with StreamWriter, simulating a C2 callback pattern without full shell execution.",
    category: "Exfiltration",
    status: "ready",
  },
  {
    id: "persistence-task",
    name: "Scheduled Task Persistence",
    shortName: "Sched Task",
    question: "Can an attacker create persistent backdoor access?",
    description:
      "Creates a scheduled task with a benign echo command, then immediately deletes it.",
    category: "Persistence",
    status: "ready",
  },
  {
    id: "base64-exec",
    name: "Base64 Encoded Execution",
    shortName: "Base64 Exec",
    question: "Can an attacker execute hidden encoded commands?",
    description:
      "Runs PowerShell -EncodedCommand with a base64-encoded harmless whoami to bypass text monitoring.",
    category: "Static Detection",
    status: "ready",
  },
  {
    id: "macro-tamper",
    name: "Office Macro Security Tamper",
    shortName: "Macro Tamper",
    question: "Can an attacker disable Office macro protections?",
    description:
      "Modifies Office VBA macro security level in the registry, then immediately reverts the change.",
    category: "Behavioral",
    status: "ready",
  },
  {
    id: "lotl-download",
    name: "LOLBin File Download",
    shortName: "LOLBin DL",
    question: "Can an attacker download files using trusted system tools?",
    description:
      "Uses certutil -urlcache to download from a dummy URL — a classic Living-off-the-Land technique.",
    category: "LOLBin",
    status: "ready",
  },
  {
    id: "bloodhound-recon",
    name: "BloodHound AD Recon",
    shortName: "AD Recon",
    question: "Can an attacker map your Active Directory environment?",
    description:
      "Emulates BloodHound AD enumeration commands and queries the domain controller, triggering reconnaissance detection.",
    category: "Reconnaissance",
    status: "ready",
  },
];
