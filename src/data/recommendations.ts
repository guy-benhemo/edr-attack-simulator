import { Recommendation } from "../types";

/** Remediation copy surfaced on the Attack Readiness Report (A6). */
export const RECOMMENDATIONS: Record<string, Recommendation> = {
  "lsass-minidump": {
    scenarioId: "lsass-minidump",
    severity: "High",
    impact: "High",
    action:
      "Enable LSASS protection (RunAsPPL) and Credential Guard, and alert on any process opening a handle to lsass.exe.",
  },
  "rdp-enable": {
    scenarioId: "rdp-enable",
    severity: "High",
    impact: "High",
    action:
      "Lock fDenyTSConnections through Group Policy and alert on writes to Terminal Server registry keys.",
  },
  "base64-exec": {
    scenarioId: "base64-exec",
    severity: "Medium",
    impact: "Medium",
    action:
      "Turn on PowerShell script-block logging and flag -EncodedCommand usage across the fleet.",
  },
  "certutil-dump": {
    scenarioId: "certutil-dump",
    severity: "High",
    impact: "High",
    action:
      "Restrict certutil.exe with WDAC or AppLocker and alert on its use against files in system directories.",
  },
  "amsi-patch": {
    scenarioId: "amsi-patch",
    severity: "High",
    impact: "High",
    action:
      "Enforce PowerShell Constrained Language Mode and alert on reflection against AmsiUtils.",
  },
  "reverse-shell": {
    scenarioId: "reverse-shell",
    severity: "High",
    impact: "High",
    action:
      "Apply egress filtering on non-standard ports and alert on PowerShell opening raw TCP sockets.",
  },
  "persistence-task": {
    scenarioId: "persistence-task",
    severity: "Medium",
    impact: "Medium",
    action:
      "Monitor Run keys, scheduled-task creation, and WMI event subscriptions for unsigned entries.",
  },
  "lotl-download": {
    scenarioId: "lotl-download",
    severity: "Medium",
    impact: "Medium",
    action:
      "Alert on curl.exe and bitsadmin reaching external hosts from user context.",
  },
  "bloodhound-recon": {
    scenarioId: "bloodhound-recon",
    severity: "Medium",
    impact: "Medium",
    action:
      "Enable LDAP query auditing on domain controllers and alert on bulk directory enumeration.",
  },
};

export function getRecommendation(scenarioId: string): Recommendation {
  return (
    RECOMMENDATIONS[scenarioId] ?? {
      scenarioId,
      severity: "Medium",
      impact: "Medium",
      action: "Review endpoint policy coverage for this attack.",
    }
  );
}
