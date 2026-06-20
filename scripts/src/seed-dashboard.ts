import { db } from "@workspace/db";
import {
  tracksTable,
  learningModulesTable,
  lessonsTable,
  labsTable,
  labModulesTable,
  jobsTable,
  jobSkillsTable,
  employersTable,
  checkpointsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

async function seedDashboard() {
  console.log("🌱 Seeding dashboard data...");

  const tracks = await db.select().from(tracksTable);
  const trackMap = new Map(tracks.map((t) => [t.slug, t]));

  const LEARNING_MODULES: Record<string, Array<{ title: string; description: string; lessons: Array<{ title: string; type: string; durationMinutes: number }> }>> = {
    "soc-analyst": [
      {
        title: "SOC Fundamentals",
        description: "Core concepts of Security Operations Centers — roles, processes, and tools.",
        lessons: [
          { title: "What is a SOC?", type: "video", durationMinutes: 12 },
          { title: "SOC Analyst Roles & Tiers", type: "video", durationMinutes: 18 },
          { title: "Incident Lifecycle", type: "article", durationMinutes: 10 },
          { title: "Quiz: SOC Basics", type: "quiz", durationMinutes: 5 },
        ],
      },
      {
        title: "SIEM & Log Management",
        description: "Master Splunk, QRadar, and Wazuh for log ingestion, correlation, and alerting.",
        lessons: [
          { title: "Introduction to SIEM", type: "video", durationMinutes: 15 },
          { title: "Splunk Basics", type: "video", durationMinutes: 25 },
          { title: "QRadar Overview", type: "video", durationMinutes: 20 },
          { title: "Wazuh Setup & Rules", type: "video", durationMinutes: 22 },
          { title: "Writing Detection Rules", type: "article", durationMinutes: 15 },
          { title: "Lab: Splunk SPL Queries", type: "lab", durationMinutes: 30 },
        ],
      },
      {
        title: "Threat Hunting",
        description: "Proactively search for hidden threats using behavioral analytics and IOCs.",
        lessons: [
          { title: "Threat Hunting Fundamentals", type: "video", durationMinutes: 14 },
          { title: "IOC vs TTP Analysis", type: "article", durationMinutes: 12 },
          { title: "MITRE ATT&CK Framework", type: "video", durationMinutes: 20 },
          { title: "Hunting with Elastic", type: "video", durationMinutes: 18 },
          { title: "Assignment: Threat Hunt Report", type: "assignment", durationMinutes: 45 },
        ],
      },
      {
        title: "Malware Analysis",
        description: "Static and dynamic analysis of malware samples in controlled environments.",
        lessons: [
          { title: "Malware Types & Behavior", type: "video", durationMinutes: 16 },
          { title: "Static Analysis Tools", type: "video", durationMinutes: 20 },
          { title: "Dynamic Analysis with Cuckoo", type: "video", durationMinutes: 25 },
          { title: "Writing Malware Reports", type: "article", durationMinutes: 15 },
          { title: "Lab: Analyze a Sample", type: "lab", durationMinutes: 40 },
        ],
      },
      {
        title: "Incident Response",
        description: "End-to-end IR process — preparation, containment, eradication, and recovery.",
        lessons: [
          { title: "IR Lifecycle Overview", type: "video", durationMinutes: 15 },
          { title: "Playbooks & Runbooks", type: "article", durationMinutes: 12 },
          { title: "Digital Forensics Basics", type: "video", durationMinutes: 20 },
          { title: "Post-Incident Reporting", type: "article", durationMinutes: 10 },
          { title: "Capstone: IR Simulation", type: "lab", durationMinutes: 60 },
        ],
      },
      {
        title: "Detection Engineering",
        description: "Build and deploy custom detection rules using Sigma, Yara, and SIEM platforms.",
        lessons: [
          { title: "Detection Engineering 101", type: "video", durationMinutes: 12 },
          { title: "Sigma Rules", type: "video", durationMinutes: 18 },
          { title: "YARA Rules", type: "video", durationMinutes: 18 },
          { title: "Deploying to Splunk", type: "lab", durationMinutes: 30 },
          { title: "Final Assessment", type: "quiz", durationMinutes: 15 },
        ],
      },
    ],
    "vapt-professional": [
      {
        title: "OWASP Top 10",
        description: "Deep dive into the most critical web application security risks.",
        lessons: [
          { title: "OWASP Overview", type: "video", durationMinutes: 12 },
          { title: "Injection Attacks (SQLi, XSS)", type: "video", durationMinutes: 22 },
          { title: "Broken Authentication", type: "video", durationMinutes: 15 },
          { title: "SSRF & XXE", type: "article", durationMinutes: 12 },
          { title: "Lab: DVWA Exploits", type: "lab", durationMinutes: 45 },
        ],
      },
      {
        title: "Burp Suite Mastery",
        description: "Intercept, modify and replay HTTP requests for web application testing.",
        lessons: [
          { title: "Burp Suite Setup", type: "video", durationMinutes: 10 },
          { title: "Proxy & Interceptor", type: "video", durationMinutes: 15 },
          { title: "Scanner & Intruder", type: "video", durationMinutes: 20 },
          { title: "Lab: Bug Bounty Simulation", type: "lab", durationMinutes: 40 },
        ],
      },
      {
        title: "Network Pentesting",
        description: "Enumerate and exploit network services using Nmap, Metasploit and more.",
        lessons: [
          { title: "Nmap Port Scanning", type: "video", durationMinutes: 18 },
          { title: "Service Enumeration", type: "video", durationMinutes: 15 },
          { title: "Metasploit Framework", type: "video", durationMinutes: 25 },
          { title: "Post-Exploitation Basics", type: "article", durationMinutes: 12 },
          { title: "Lab: HackTheBox Machine", type: "lab", durationMinutes: 60 },
        ],
      },
      {
        title: "API Security Testing",
        description: "Test REST and GraphQL APIs for authentication, injection, and business logic flaws.",
        lessons: [
          { title: "API Security Fundamentals", type: "video", durationMinutes: 14 },
          { title: "OWASP API Top 10", type: "video", durationMinutes: 18 },
          { title: "Postman for Security Testing", type: "video", durationMinutes: 20 },
          { title: "Lab: API Exploitation", type: "lab", durationMinutes: 45 },
        ],
      },
      {
        title: "Active Directory Pentesting",
        description: "Attack and defend Windows Active Directory environments.",
        lessons: [
          { title: "AD Architecture", type: "video", durationMinutes: 16 },
          { title: "Kerberoasting & Pass-the-Hash", type: "video", durationMinutes: 22 },
          { title: "BloodHound & SharpHound", type: "video", durationMinutes: 20 },
          { title: "Lab: AD Attack Chain", type: "lab", durationMinutes: 60 },
        ],
      },
      {
        title: "Mobile & Cloud Pentesting",
        description: "Security testing for Android, iOS and AWS/GCP/Azure environments.",
        lessons: [
          { title: "Android APK Analysis", type: "video", durationMinutes: 18 },
          { title: "iOS App Security", type: "video", durationMinutes: 15 },
          { title: "AWS Cloud Pentesting", type: "video", durationMinutes: 22 },
          { title: "Capstone: Full Pentest Report", type: "assignment", durationMinutes: 90 },
        ],
      },
    ],
    "grc-specialist": [
      {
        title: "ISO 27001 Implementation",
        description: "ISMS design, risk assessment, controls, and certification readiness.",
        lessons: [
          { title: "ISO 27001 Overview", type: "video", durationMinutes: 14 },
          { title: "Clause-by-Clause Deep Dive", type: "video", durationMinutes: 30 },
          { title: "ISMS Scope & Context", type: "article", durationMinutes: 12 },
          { title: "Annex A Controls", type: "article", durationMinutes: 20 },
          { title: "Quiz: ISO Basics", type: "quiz", durationMinutes: 10 },
        ],
      },
      {
        title: "NIST Framework",
        description: "Apply the NIST Cybersecurity Framework across Identify, Protect, Detect, Respond, Recover.",
        lessons: [
          { title: "NIST CSF Introduction", type: "video", durationMinutes: 12 },
          { title: "Framework Core Functions", type: "video", durationMinutes: 18 },
          { title: "Implementation Tiers", type: "article", durationMinutes: 10 },
          { title: "Creating a CSF Profile", type: "lab", durationMinutes: 30 },
        ],
      },
      {
        title: "DPDP Act 2023 Compliance",
        description: "India's Digital Personal Data Protection Act — obligations, consent, and breach reporting.",
        lessons: [
          { title: "DPDP Act Overview", type: "video", durationMinutes: 15 },
          { title: "Data Fiduciary Obligations", type: "video", durationMinutes: 18 },
          { title: "Consent Management", type: "article", durationMinutes: 12 },
          { title: "Breach Notification Requirements", type: "article", durationMinutes: 10 },
          { title: "Lab: Build a Consent Register", type: "lab", durationMinutes: 30 },
        ],
      },
      {
        title: "Risk Assessment & Management",
        description: "Identify, assess, and treat information security risks systematically.",
        lessons: [
          { title: "Risk Management Fundamentals", type: "video", durationMinutes: 14 },
          { title: "Risk Identification Methods", type: "video", durationMinutes: 16 },
          { title: "Risk Matrix & Scoring", type: "article", durationMinutes: 12 },
          { title: "Risk Treatment Plans", type: "article", durationMinutes: 10 },
          { title: "Assignment: Risk Register", type: "assignment", durationMinutes: 45 },
        ],
      },
      {
        title: "Compliance & Audit",
        description: "Design audit programs, conduct evidence collection, and manage non-conformities.",
        lessons: [
          { title: "Audit Lifecycle", type: "video", durationMinutes: 12 },
          { title: "Evidence Collection Techniques", type: "video", durationMinutes: 15 },
          { title: "Non-Conformity Management", type: "article", durationMinutes: 10 },
          { title: "Audit Report Writing", type: "assignment", durationMinutes: 30 },
        ],
      },
      {
        title: "Vendor Risk Management",
        description: "Third-party risk assessments, due diligence, and contractual controls.",
        lessons: [
          { title: "Third-Party Risk Overview", type: "video", durationMinutes: 12 },
          { title: "Vendor Questionnaires", type: "article", durationMinutes: 10 },
          { title: "Contractual Controls", type: "article", durationMinutes: 10 },
          { title: "Capstone: VRM Program", type: "assignment", durationMinutes: 60 },
        ],
      },
    ],
  };

  for (const [slug, moduleDefs] of Object.entries(LEARNING_MODULES)) {
    const track = trackMap.get(slug);
    if (!track) { console.log(`  ⚠️  Track '${slug}' not found, skipping modules`); continue; }

    for (let mi = 0; mi < moduleDefs.length; mi++) {
      const modDef = moduleDefs[mi];
      const existingMod = await db.query.learningModulesTable.findFirst({
        where: eq(learningModulesTable.title, modDef.title),
      });

      let moduleId: number;
      if (existingMod) {
        moduleId = existingMod.id;
        console.log(`  ↩️  Module exists: ${modDef.title}`);
      } else {
        const [mod] = await db.insert(learningModulesTable).values({
          trackId: track.id,
          title: modDef.title,
          description: modDef.description,
          order: mi + 1,
          lessonCount: modDef.lessons.length,
          isPublished: true,
        }).returning();
        moduleId = mod.id;
        console.log(`  ✅ Module: ${modDef.title}`);
      }

      for (let li = 0; li < modDef.lessons.length; li++) {
        const l = modDef.lessons[li];
        const slug = l.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const existing = await db.query.lessonsTable.findFirst({ where: eq(lessonsTable.slug, slug) });
        if (!existing) {
          await db.insert(lessonsTable).values({
            moduleId,
            title: l.title,
            slug,
            order: li + 1,
            type: l.type,
            durationMinutes: l.durationMinutes,
            isPublished: true,
            isFree: li === 0,
          });
        }
      }
    }
  }

  const LAB_DATA: Record<string, Array<{ title: string; slug: string; description: string; difficulty: string; type: string; tags: string[]; totalPoints: number; estimatedMinutes: number; tasks: Array<{ title: string; taskDescription: string; points: number; hint?: string }> }>> = {
    "soc-analyst": [
      {
        title: "SIEM Alert Investigation",
        slug: "siem-alert-investigation",
        description: "Investigate a simulated SIEM alert, triage the event, and determine if it's a true positive.",
        difficulty: "beginner",
        type: "guided",
        tags: ["SIEM", "Triage", "Splunk"],
        totalPoints: 100,
        estimatedMinutes: 45,
        tasks: [
          { title: "Load Alert Data", taskDescription: "Import the provided log bundle into Splunk and identify the triggering event.", points: 20, hint: "Look for EventID 4625 in the Windows Security log." },
          { title: "Triage & Classify", taskDescription: "Determine whether the alert is a true positive, false positive, or benign. Justify your answer.", points: 30 },
          { title: "Pivot Investigation", taskDescription: "Use the source IP to find related events in the last 24 hours.", points: 25 },
          { title: "Write Incident Ticket", taskDescription: "Create a concise incident ticket with summary, impact, and next steps.", points: 25 },
        ],
      },
      {
        title: "Threat Hunting with Wazuh",
        slug: "threat-hunting-wazuh",
        description: "Hunt for lateral movement indicators in a simulated enterprise environment.",
        difficulty: "intermediate",
        type: "ctf",
        tags: ["Wazuh", "Threat Hunting", "MITRE"],
        totalPoints: 150,
        estimatedMinutes: 60,
        tasks: [
          { title: "Find the Initial Access", taskDescription: "Identify the first event indicating unauthorized access. Submit the timestamp and EventID.", points: 30, hint: "Look at authentication logs around 14:00 UTC." },
          { title: "Map to MITRE ATT&CK", taskDescription: "Map the attack techniques observed to MITRE ATT&CK tactics.", points: 40 },
          { title: "Identify Lateral Movement", taskDescription: "Find evidence of lateral movement using Wazuh rules.", points: 50 },
          { title: "Submit Hunt Report", taskDescription: "Write a 1-page threat hunt report with IOCs and recommendations.", points: 30 },
        ],
      },
      {
        title: "Malware Analysis Lab",
        slug: "malware-analysis-basic",
        description: "Perform static and dynamic analysis on a Windows malware sample.",
        difficulty: "intermediate",
        type: "guided",
        tags: ["Malware", "Static Analysis", "Dynamic Analysis"],
        totalPoints: 200,
        estimatedMinutes: 90,
        tasks: [
          { title: "Static Analysis", taskDescription: "Use strings, PE analysis tools to extract IOCs from the sample.", points: 50, hint: "Use pestudio or FLOSS for string extraction." },
          { title: "Sandbox Execution", taskDescription: "Run the sample in a controlled sandbox and capture network and process activity.", points: 60 },
          { title: "C2 Identification", taskDescription: "Identify the command and control infrastructure contacted by the malware.", points: 50 },
          { title: "YARA Rule", taskDescription: "Write a YARA rule to detect this malware family.", points: 40 },
        ],
      },
    ],
    "vapt-professional": [
      {
        title: "DVWA Web Exploitation",
        slug: "dvwa-web-exploitation",
        description: "Exploit OWASP Top 10 vulnerabilities in DVWA (Damn Vulnerable Web Application).",
        difficulty: "beginner",
        type: "ctf",
        tags: ["OWASP", "SQLi", "XSS", "DVWA"],
        totalPoints: 150,
        estimatedMinutes: 60,
        tasks: [
          { title: "SQL Injection", taskDescription: "Extract all usernames and password hashes from the database using SQL injection.", points: 40, hint: "Try ' OR 1=1-- in the user ID field." },
          { title: "Stored XSS", taskDescription: "Execute a stored XSS payload that alerts document.cookie.", points: 30 },
          { title: "File Upload Bypass", taskDescription: "Upload and execute a PHP webshell bypassing the file type restriction.", points: 40 },
          { title: "CSRF Attack", taskDescription: "Craft a CSRF payload that changes the admin password.", points: 40 },
        ],
      },
      {
        title: "Network Enumeration & Exploitation",
        slug: "network-enum-exploit",
        description: "Enumerate a target network, identify vulnerable services, and gain initial access.",
        difficulty: "intermediate",
        type: "ctf",
        tags: ["Nmap", "Metasploit", "Exploitation"],
        totalPoints: 200,
        estimatedMinutes: 90,
        tasks: [
          { title: "Port Scan & Enumeration", taskDescription: "Run a full port scan and enumerate all running services on the target.", points: 40 },
          { title: "Vulnerability Identification", taskDescription: "Identify at least 2 exploitable CVEs on the target using Nmap scripts or Metasploit.", points: 50, hint: "Check for EternalBlue (MS17-010)." },
          { title: "Initial Access", taskDescription: "Exploit a vulnerability to gain a shell on the target system.", points: 60 },
          { title: "Privilege Escalation", taskDescription: "Escalate to SYSTEM/root from your initial shell.", points: 50 },
        ],
      },
      {
        title: "API Security Testing",
        slug: "api-security-testing",
        description: "Test a vulnerable REST API for authentication bypasses, injection, and excessive data exposure.",
        difficulty: "intermediate",
        type: "guided",
        tags: ["API", "JWT", "BOLA", "Mass Assignment"],
        totalPoints: 150,
        estimatedMinutes: 60,
        tasks: [
          { title: "BOLA Exploitation", taskDescription: "Access another user's order data by manipulating the order ID in the API request.", points: 40 },
          { title: "JWT Token Forgery", taskDescription: "Forge a JWT token to elevate your privileges to admin.", points: 50, hint: "Try the 'none' algorithm attack." },
          { title: "Mass Assignment", taskDescription: "Register a user with admin role using mass assignment in the registration endpoint.", points: 30 },
          { title: "Report", taskDescription: "Write an API security assessment report with CVSS scores.", points: 30 },
        ],
      },
    ],
    "grc-specialist": [
      {
        title: "ISO 27001 Risk Assessment",
        slug: "iso27001-risk-assessment",
        description: "Conduct a complete information security risk assessment for a fictional organization.",
        difficulty: "beginner",
        type: "guided",
        tags: ["ISO 27001", "Risk Assessment", "Controls"],
        totalPoints: 100,
        estimatedMinutes: 60,
        tasks: [
          { title: "Asset Inventory", taskDescription: "Create a complete asset inventory including all information assets, their owners, and classification.", points: 25 },
          { title: "Threat & Vulnerability Identification", taskDescription: "Identify at least 10 threats and map them to the relevant assets.", points: 25 },
          { title: "Risk Scoring", taskDescription: "Score each risk using the Likelihood x Impact matrix and create the risk register.", points: 25 },
          { title: "Control Selection", taskDescription: "Select appropriate Annex A controls for the top 5 risks and justify your selection.", points: 25 },
        ],
      },
      {
        title: "DPDP Compliance Audit",
        slug: "dpdp-compliance-audit",
        description: "Audit a fictional data fiduciary for DPDP Act 2023 compliance.",
        difficulty: "intermediate",
        type: "guided",
        tags: ["DPDP", "Privacy", "Compliance", "India"],
        totalPoints: 150,
        estimatedMinutes: 75,
        tasks: [
          { title: "Consent Mechanism Review", taskDescription: "Evaluate the organization's consent collection, management, and withdrawal mechanisms.", points: 40 },
          { title: "Data Mapping", taskDescription: "Map all personal data flows and identify processing activities without valid legal basis.", points: 40 },
          { title: "Breach Response Assessment", taskDescription: "Evaluate the breach detection and notification process against DPDP requirements.", points: 35 },
          { title: "Audit Report", taskDescription: "Write a formal audit report with findings, risk ratings, and recommendations.", points: 35 },
        ],
      },
      {
        title: "Vendor Risk Assessment",
        slug: "vendor-risk-assessment",
        description: "Complete a third-party vendor risk assessment using industry-standard questionnaires.",
        difficulty: "beginner",
        type: "guided",
        tags: ["VRM", "Third Party", "Due Diligence"],
        totalPoints: 100,
        estimatedMinutes: 45,
        tasks: [
          { title: "Inherent Risk Classification", taskDescription: "Classify the vendor as Critical/High/Medium/Low based on data access and business impact.", points: 25 },
          { title: "Security Questionnaire", taskDescription: "Complete the CAIQ-lite (35 questions) for the vendor and identify gaps.", points: 30 },
          { title: "Residual Risk Determination", taskDescription: "Calculate residual risk after applying existing controls.", points: 20 },
          { title: "Risk Treatment Decision", taskDescription: "Recommend Accept / Mitigate / Transfer / Avoid with business justification.", points: 25 },
        ],
      },
    ],
  };

  for (const [slug, labDefs] of Object.entries(LAB_DATA)) {
    const track = trackMap.get(slug);
    if (!track) { console.log(`  ⚠️  Track '${slug}' not found, skipping labs`); continue; }

    for (const labDef of labDefs) {
      const existing = await db.query.labsTable.findFirst({ where: eq(labsTable.slug, labDef.slug) });
      let labId: number;

      if (existing) {
        labId = existing.id;
        console.log(`  ↩️  Lab exists: ${labDef.title}`);
      } else {
        const [lab] = await db.insert(labsTable).values({
          trackId: track.id,
          title: labDef.title,
          slug: labDef.slug,
          description: labDef.description,
          difficulty: labDef.difficulty,
          type: labDef.type,
          tags: labDef.tags,
          totalPoints: labDef.totalPoints,
          estimatedMinutes: labDef.estimatedMinutes,
          isActive: true,
        }).returning();
        labId = lab.id;
        console.log(`  ✅ Lab: ${labDef.title}`);

        for (let i = 0; i < labDef.tasks.length; i++) {
          const t = labDef.tasks[i];
          await db.insert(labModulesTable).values({
            labId,
            title: t.title,
            order: i + 1,
            taskDescription: t.taskDescription,
            hint: t.hint ?? null,
            points: t.points,
          });
        }
      }
    }
  }

  let [employer] = await db.select().from(employersTable).limit(1);
  if (!employer) {
    [employer] = await db.insert(employersTable).values({
      userId: 1,
      companyName: "FUTRSEC Hiring Partner",
      industry: "Cybersecurity",
      website: "https://futrsec.com",
      description: "FUTRSEC partner employers for student placement.",
      isVerified: true,
    } as any).returning();
    console.log("  ✅ Created placeholder employer");
  }

  const JOB_DATA = [
    { title: "SOC Analyst L1", description: "Monitor and triage security alerts in a 24x7 SOC environment. Handle Tier-1 incidents, escalate as needed.", type: "full_time", location: "Bangalore, India", isRemote: false, minSalary: 400000, maxSalary: 700000, experience: "0-2 years", requiredTracks: ["soc-analyst"], skills: ["Splunk", "QRadar", "SIEM", "Incident Response", "Log Analysis"] },
    { title: "SOC Analyst L2", description: "Lead complex incident investigations, mentor L1 analysts, and develop detection use cases.", type: "full_time", location: "Hyderabad, India", isRemote: false, minSalary: 700000, maxSalary: 1200000, experience: "2-4 years", requiredTracks: ["soc-analyst"], skills: ["SIEM", "Threat Hunting", "MITRE ATT&CK", "Python", "Forensics"] },
    { title: "Threat Hunter", description: "Proactively hunt for advanced persistent threats across enterprise environments.", type: "full_time", location: "Remote", isRemote: true, minSalary: 1000000, maxSalary: 1800000, experience: "3-5 years", requiredTracks: ["soc-analyst"], skills: ["Threat Hunting", "Kibana", "Python", "MITRE ATT&CK", "Malware Analysis"] },
    { title: "Incident Response Analyst", description: "Lead IR engagements for enterprise clients. Perform digital forensics, malware analysis, and remediation.", type: "full_time", location: "Mumbai, India", isRemote: false, minSalary: 800000, maxSalary: 1400000, experience: "2-4 years", requiredTracks: ["soc-analyst"], skills: ["Incident Response", "Forensics", "Malware Analysis", "Volatility", "EnCase"] },
    { title: "Penetration Tester", description: "Conduct web, network, and mobile penetration tests for enterprise clients. Deliver detailed reports.", type: "full_time", location: "Bangalore, India", isRemote: false, minSalary: 600000, maxSalary: 1200000, experience: "1-3 years", requiredTracks: ["vapt-professional"], skills: ["Burp Suite", "Nmap", "Metasploit", "OWASP", "Python"] },
    { title: "Bug Bounty Hunter (Contract)", description: "Find and report security vulnerabilities in web/mobile applications. Contract role with bounty-based payments.", type: "contract", location: "Remote", isRemote: true, minSalary: 200000, maxSalary: 800000, experience: "0-2 years", requiredTracks: ["vapt-professional"], skills: ["Web Security", "Burp Suite", "API Testing", "OWASP Top 10"] },
    { title: "Red Team Operator", description: "Plan and execute adversary simulation engagements for Fortune 500 clients.", type: "full_time", location: "Delhi, India", isRemote: false, minSalary: 1200000, maxSalary: 2000000, experience: "4-7 years", requiredTracks: ["vapt-professional"], skills: ["Active Directory", "C2 Frameworks", "Cobalt Strike", "PowerShell", "OPSEC"] },
    { title: "Application Security Engineer", description: "Embed security into SDLC. Conduct code reviews, DAST/SAST, and security architecture reviews.", type: "full_time", location: "Pune, India", isRemote: true, minSalary: 1000000, maxSalary: 1800000, experience: "3-5 years", requiredTracks: ["vapt-professional"], skills: ["SAST", "DAST", "OWASP", "Secure Code Review", "CI/CD Security"] },
    { title: "GRC Analyst", description: "Support ISO 27001, SOC 2, and DPDP compliance programs. Conduct risk assessments and internal audits.", type: "full_time", location: "Chennai, India", isRemote: false, minSalary: 500000, maxSalary: 900000, experience: "0-2 years", requiredTracks: ["grc-specialist"], skills: ["ISO 27001", "Risk Assessment", "DPDP", "Audit", "Compliance"] },
    { title: "Privacy Officer", description: "Oversee DPDP, GDPR, and data privacy compliance. Manage consent, data requests, and breach notifications.", type: "full_time", location: "Remote", isRemote: true, minSalary: 1200000, maxSalary: 2000000, experience: "4-6 years", requiredTracks: ["grc-specialist"], skills: ["DPDP", "GDPR", "Privacy by Design", "Consent Management", "Legal"] },
    { title: "Compliance Manager", description: "Lead multi-framework compliance programs (ISO 27001, NIST, SOC 2) for a fintech company.", type: "full_time", location: "Mumbai, India", isRemote: false, minSalary: 1500000, maxSalary: 2500000, experience: "5-8 years", requiredTracks: ["grc-specialist"], skills: ["ISO 27001", "NIST", "SOC 2", "Risk Management", "Vendor Risk"] },
    { title: "Information Security Analyst (GRC Focus)", description: "Support the information security team with policy development, risk tracking, and audit coordination.", type: "full_time", location: "Bangalore, India", isRemote: false, minSalary: 600000, maxSalary: 1000000, experience: "1-3 years", requiredTracks: ["grc-specialist"], skills: ["GRC Tools", "Policy Writing", "Risk Registers", "ISMS", "ISO 27001"] },
  ];

  for (const job of JOB_DATA) {
    const existing = await db.query.jobsTable.findFirst({ where: eq(jobsTable.title, job.title) });
    if (existing) { console.log(`  ↩️  Job exists: ${job.title}`); continue; }

    const [inserted] = await db.insert(jobsTable).values({
      employerId: employer.id,
      title: job.title,
      description: job.description,
      type: job.type,
      location: job.location,
      isRemote: job.isRemote,
      minSalary: job.minSalary,
      maxSalary: job.maxSalary,
      experience: job.experience,
      requiredTracks: job.requiredTracks,
      status: "active",
    }).returning();

    for (const skill of job.skills) {
      await db.insert(jobSkillsTable).values({ jobId: inserted.id, skill, level: "required" });
    }
    console.log(`  ✅ Job: ${job.title}`);
  }

  for (const [slug] of Object.entries(LEARNING_MODULES)) {
    const track = trackMap.get(slug);
    if (!track) continue;
    const existingCps = await db.select().from(checkpointsTable).where(eq(checkpointsTable.trackId, track.id)).limit(1);
    if (existingCps.length > 0) { console.log(`  ↩️  Checkpoints exist for ${slug}`); continue; }
    const checkpointData = [
      { order: 1, title: "CP1 — Foundation", description: "Complete your first 3 modules and pass the baseline quiz.", requiredScore: 10 },
      { order: 2, title: "CP2 — Core Skills", description: "Complete 2 labs and submit your first assignment.", requiredScore: 25 },
      { order: 3, title: "CP3 — Applied", description: "Pass the mid-track assessment with 70%+ and complete 4 modules.", requiredScore: 45 },
      { order: 4, title: "CP4 — Advanced", description: "Complete the capstone lab and score 80% in mock interview.", requiredScore: 65 },
      { order: 5, title: "CP5 — Job Ready", description: "Full profile, resume uploaded, and applied to 3 jobs.", requiredScore: 80 },
    ];
    for (const cp of checkpointData) {
      await db.insert(checkpointsTable).values({ ...cp, trackId: track.id });
    }
    console.log(`  ✅ Seeded checkpoints for ${slug}`);
  }

  console.log("✅ Dashboard seed complete!");
}

seedDashboard().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
