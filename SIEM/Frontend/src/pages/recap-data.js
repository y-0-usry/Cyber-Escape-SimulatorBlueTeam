// Recap Data for All Levels
const recapData = {
  level1: {
    title: "Level 1 Recap: Ransomware Response",
    levelNumber: 1,
    scenario: {
      title: "🎬 What Happened",
      description: `A ransomware campaign targeted TechNova Corporation's internal network. The attack followed a classic stages:
      1. Initial compromise via malicious attachment
      2. PowerShell-based lateral movement
      3. Privilege escalation using SMB exploitation
      4. Shadow copy deletion to prevent recovery
      5. Mass file encryption (ransomware payload)`,
      attackChain: [
        { time: "08:00", event: "Initial file execution on workstation 192.168.1.10", type: "initial_access" },
        { time: "08:15", event: "PowerShell with encoded commands executed", type: "execution" },
        { time: "08:30", event: "Lateral movement via SMB to internal servers", type: "lateral_movement" },
        { time: "08:45", event: "Privilege escalation attempt detected", type: "privilege_escalation" },
        { time: "09:00", event: "Shadow copy deletion - defense evasion", type: "defense_evasion" },
        { time: "09:15", event: "Mass file encryption started (ransomware impact)", type: "impact" }
      ]
    },
    timeline: {
      title: "📊 Attack Timeline",
      events: [
        { id: 1, time: "08:00", title: "Initial Entry", description: "Malicious file executed on user endpoint", severity: "high" },
        { id: 2, time: "08:15", title: "PowerShell Execution", description: "Suspicious encoded PowerShell command detected", severity: "critical" },
        { id: 3, time: "08:30", title: "Lateral Movement", description: "SMB exploitation to reach internal network shares", severity: "critical" },
        { id: 4, time: "08:45", title: "Privilege Escalation", description: "Attempt to gain domain admin credentials", severity: "critical" },
        { id: 5, time: "09:00", title: "Defense Evasion", description: "Shadow copies deleted to prevent recovery", severity: "critical" },
        { id: 6, time: "09:15", title: "Ransomware Deployment", description: "Mass file encryption detected - customer data compromised", severity: "critical" }
      ]
    },
    keyLearnings: [
      {
        title: "Recognize Attack Stages",
        description: "Ransomware attacks follow predictable phases: Initial Access → Execution → Lateral Movement → Privilege Escalation → Defense Evasion → Impact. Detecting the chain early prevents devastating outcomes.",
        icon: "🔗"
      },
      {
        title: "False Positive Management",
        description: "80% of SOC alerts are noise. Automated backups, routine intranet traffic, and legitimate network activity generate constant alerts. Effective filtering is crucial to focus on real threats.",
        icon: "🔍"
      },
      {
        title: "MITRE ATT&CK Framework",
        description: "Classify each threat activity using standard tactics (Execution, Persistence, Lateral Movement, etc.). This framework helps SOCs communicate findings consistently and guides remediation steps.",
        icon: "🎯"
      },
      {
        title: "Immediate Response Actions",
        description: "Once you identify lateral movement or privilege escalation, don't wait for confirmation—isolate affected hosts IMMEDIATELY. Every minute of delay increases data loss risk.",
        icon: "⚡"
      },
      {
        title: "Chain of Custody",
        description: "Log ALL findings in the incident ticket. Document what you analyzed, when, and why you made each decision. This creates accountability and helps the response team continue from where you left off.",
        icon: "📋"
      }
    ],
    commonMistakes: [
      {
        mistake: "❌ Investigating every low-severity alert",
        solution: "✅ Focus on HIGH and MEDIUM severity alerts only. Low-severity alerts are usually false positives from routine operations.",
        impact: "⏱️ Wastes critical time during active incidents"
      },
      {
        mistake: "❌ Not recognizing the attack chain",
        solution: "✅ Look for patterns across multiple alerts—initial access → execution → lateral movement. The chain is more important than individual events.",
        impact: "🚨 You might miss the full scope and recommend partial mitigations"
      },
      {
        mistake: "❌ Delaying isolation decisions",
        solution: "✅ If lateral movement is detected, isolate immediately. Don't wait for 100% certainty. Speed saves data.",
        impact: "💀 Ransomware spreads exponentially—early isolation minimizes damage"
      },
      {
        mistake: "❌ Incorrectly classifying MITRE tactics",
        solution: "✅ Memorize key keywords: PowerShell→Execution, SMB/445→Lateral Movement, Registry changes→Persistence, Encryption→Impact.",
        impact: "❗ Leads to wrong recommendations and failed incident response"
      },
      {
        mistake: "❌ Creating vague incident tickets",
        solution: "✅ Include specific alert IDs, timelines, affected systems, and recommended actions. Be precise and actionable.",
        impact: "📞 Response team wastes time clarifying instead of remediating"
      }
    ],
    scoreExplanation: {
      title: "📊 Score Breakdown",
      maxScore: 100,
      components: [
        { category: "Phase 1: Alert Triage", points: 30, note: "Correctly identifying false positives and classifying real threats" },
        { category: "Phase 2: Scenario Analysis", points: 40, note: "Understanding the attack chain and recommended responses" },
        { category: "Phase 3: Incident Ticket", points: 20, note: "Creating a complete, actionable incident report" },
        { category: "Bonuses", points: 10, note: "Completed within time limit, no hints used (~5 points each)" }
      ],
      penalties: [
        { action: "Wrong answer on classification question", points: -2 },
        { action: "Using hint", points: -5 },
        { action: "Adding time extension", points: -5 + " to -" + 20 }
      ],
      interpretation: "Score 80+: You're ready for real SOC work. Score 60-80: Review the MITRE framework and practice alert classification. Score <60: Focus on understanding attack chains before moving to Level 2."
    }
  },

  level2: {
    title: "Level 2 Recap: Insider Threat Investigations",
    levelNumber: 2,
    scenario: {
      title: "🎬 What Happened",
      description: `An employee decided to leave the company and stole sensitive intellectual property. The insider threat followed specific patterns:
      1. Large repository clone (4.8GB) outside normal workflow
      2. Bulk file read operations (2,100+ files in rapid succession)
      3. Archival and ZIP creation (1.9GB compressed data)
      4. Exfiltration to personal cloud account (Google Drive)
      5. Off-hours VPN access from residential IP`,
      attackChain: [
        { time: "Thu 14:30", event: "Massive Git repository clone from engineering_repo", type: "data_collection" },
        { time: "Thu 15:00", event: "Access to HR employee database (role violation)", type: "reconnaissance" },
        { time: "Fri 21:45", event: "Off-hours VPN login from residential IP", type: "preparation" },
        { time: "Sat 22:00", event: "Sequential read of 4,823 files in 15 minutes", type: "data_collection" },
        { time: "Sat 22:30", event: "ZIP archive creation (1.9GB)", type: "preparation" },
        { time: "Sun 10:15", event: "Upload to Google Drive (personal account) - DLP blocked", type: "exfiltration" }
      ]
    },
    timeline: {
      title: "📊 Investigation Timeline",
      events: [
        { id: 1, time: "Thursday 14:30", title: "Unusual Git Clone", description: "4.8GB repository cloned (outside dev workflow)", severity: "high" },
        { id: 2, time: "Thursday 15:00", title: "Role Violation", description: "Developer accessed HR-restricted employee database", severity: "critical" },
        { id: 3, time: "Friday 21:45", title: "After-Hours VPN", description: "Off-hours login from residential IP (Saturday morning context)", severity: "high" },
        { id: 4, time: "Saturday 22:00", title: "Bulk File Access", description: "4,823 files read in 15 minutes (4,233% deviation from baseline)", severity: "critical" },
        { id: 5, time: "Saturday 22:30", title: "Archive Creation", description: "1.9GB ZIP file created containing accessed data", severity: "critical" },
        { id: 6, time: "Sunday 10:15", title: "Cloud Exfiltration", description: "Attempted upload to Google Drive - DLP system blocked action", severity: "critical" }
      ]
    },
    keyLearnings: [
      {
        title: "Context is Everything",
        description: "A single large file transfer might be legitimate (automated backup), but the COMBINATION of multiple indicators (off-hours VPN + bulk read + personal cloud upload + role violation) = insider threat. Always look for patterns.",
        icon: "🔗"
      },
      {
        title: "Baseline Anomalies",
        description: "4,823 files accessed in 15 minutes is 4,233% above the user's normal 3 files/day baseline. Anomaly detection based on user behavioral profiles is powerful—not just rule-based alerts.",
        icon: "📈"
      },
      {
        title: "Time + Context Indicators",
        description: "Off-hours activity combined with residential IP + weekend work = suspicious. Legitimate after-hours work has justification (ticket#, approval) but insiders often lack approval documentation.",
        icon: "⏰"
      },
      {
        title: "Data Staging Before Exfiltration",
        description: "Insiders create archives, compress data, and prep uploads before attempting exfiltration. Detecting the staging phase gives you time to block outbound transfers and preserve evidence.",
        icon: "📦"
      },
      {
        title: "DLP is Not Just Prevention",
        description: "DLP blocks often signal attack attempts. When a user tries to upload to personal cloud accounts or USB devices, that's insider threat activity in progress. Blocks = evidence.",
        icon: "🛡️"
      }
    ],
    commonMistakes: [
      {
        mistake: "❌ Treating individual events as isolated",
        solution: "✅ Insider threats require COMBINATIONS: Off-hours + role violation + large transfers + personal cloud upload. One event alone isn't proof.",
        impact: "😞 You'll miss the threat if you don't connect the dots"
      },
      {
        mistake: "❌ Dismissing legitimate-looking service accounts",
        solution: "✅ Check service accounts carefully—they should have scheduled times, approved purposes, and consistent patterns. Random off-hours activity is suspicious even for SVC_ accounts.",
        impact: "🚨 Attackers sometimes compromise service accounts as cover"
      },
      {
        mistake: "❌ Not considering employee lifecycle events",
        solution: "✅ Check if the suspect recently updated resume, viewed job listings, or accessed benefits pages. Motive + means + opportunity = insider threat.",
        impact: "⚠️ You miss the psychological context of the threat"
      },
      {
        mistake: "❌ Ignoring DLP blocks",
        solution: "✅ DLP blocks are evidence of attempted policy violations. Investigate what data was blocked and why the user tried to exfiltrate.",
        impact: "🔓 Your controls are preventing theft, but you don't know it's happening"
      },
      {
        mistake: "❌ Forgetting to document role and permissions",
        solution: "✅ Always verify: should this user have accessed this data? If not, it's a red flag even without other suspicious indicators.",
        impact: "❌ Invalid investigation—evidence gets dismissed in legal review"
      }
    ],
    scoreExplanation: {
      title: "📊 Score Breakdown",
      maxScore: 100,
      components: [
        { category: "Phase 1: Signal Classification", points: 40, note: "Distinguishing TP (insider threat indicators) vs FP (legitimate business)" },
        { category: "Phase 2: Behavioral Analysis", points: 30, note: "Connecting multiple events into coherent threat narrative" },
        { category: "Phase 3: Investigation Report", points: 20, note: "Creating actionable evidence summary for response team" },
        { category: "Bonuses", points: 10, note: "Speed and accuracy bonuses" }
      ],
      penalties: [
        { action: "Misclassifying legitimate activity as threat", points: -3 },
        { action: "Missing obvious insider threat indicators", points: -5 }
      ],
      interpretation: "Score 80+: Excellent insider threat intuition. Score 60-80: Review behavioral analysis patterns and context clues. Score <60: Insider threats require multi-signal thinking—study the alert combinations."
    }
  },

  level3: {
    title: "Level 3 Recap: Third-Party Supply Chain Attack",
    levelNumber: 3,
    scenario: {
      title: "🎬 What Happened",
      description: `A trusted third-party software vendor was compromised. Attackers injected malicious code into the vendor's software update. When TechNova deployed the update, the backdoor was installed silently. The attack involved:
      1. Legitimate software update from trusted vendor
      2. Signed binary with valid certificate (trust abuse)
      3. Persistent backdoor installation via DLL injection
      4. C2 communication to attacker-controlled server
      5. Lateral movement through supply chain customers`,
      attackChain: [
        { time: "Mon 02:00", event: "Vendor releases legitimate-looking software update", type: "supply_chain" },
        { time: "Mon 06:00", event: "TechNova auto-deploys vendor update to all endpoints", type: "distribution" },
        { time: "Mon 07:30", event: "Backdoor execution via DLL injection", type: "execution" },
        { time: "Mon 08:00", event: "Persistence mechanism installed (registry key)", type: "persistence" },
        { time: "Mon 09:00", event: "C2 communication established to attacker infrastructure", type: "c2" },
        { time: "Mon 10:00", event: "Lateral movement to domain controller detected", type: "lateral_movement" }
      ]
    },
    timeline: {
      title: "📊 Attack Timeline",
      events: [
        { id: 1, time: "Monday 02:00", title: "Vendor Update Released", description: "Software update appears legitimate and signed with vendor certificate", severity: "high" },
        { id: 2, time: "Monday 06:00", title: "Mass Deployment", description: "Automated deployment across 500+ company endpoints", severity: "critical" },
        { id: 3, time: "Monday 07:30", title: "Backdoor Activation", description: "Malicious DLL loaded via legitimate vendor process", severity: "critical" },
        { id: 4, time: "Monday 08:00", title: "Persistence Established", description: "Registry modifications ensure backdoor survives reboot", severity: "critical" },
        { id: 5, time: "Monday 09:00", title: "C2 Beacon", description: "Connections to attacker server (malware-cloud.com) detected", severity: "critical" },
        { id: 6, time: "Monday 10:00", title: "Lateral Movement", description: "Attack spreads to domain controllers and network infrastructure", severity: "critical" }
      ]
    },
    keyLearnings: [
      {
        title: "Trust is a Vulnerability",
        description: "Legitimate vendors, signed certificates, and normal update processes can all be weaponized. Supply chain attacks are especially dangerous because they bypass traditional perimeter defenses.",
        icon: "🔗"
      },
      {
        title: "Behavioral Anomalies in Legitimate Processes",
        description: "The vendor.exe process behaving abnormally (unexpected child processes, network connections, registry modifications) indicates abuse. Monitor trusted processes as carefully as untrusted ones.",
        icon: "🔍"
      },
      {
        title: "C2 Communication Patterns",
        description: "Regular connections to unusual external IPs, especially at consistent intervals, indicate command & control. Monitor egress traffic for unexpected destinations (not CDNs, not cloud platforms).",
        icon: "📡"
      },
      {
        title: "Vendor Risk Management",
        description: "Require vendors to provide software bill of materials (SBOM), commit to responsible disclosure, and publish update changelogs. Verify updates in test environment before mass deployment.",
        icon: "✅"
      },
      {
        title: "Whitelisting Isn't Enough",
        description: "Even with process whitelisting, attackers can abuse legitimate processes. Combine whitelisting with behavioral monitoring (DLL injection, unusual APIs, network connections) for defense in depth.",
        icon: "🛡️"
      }
    ],
    commonMistakes: [
      {
        mistake: "❌ Trusting certificates and signatures blindly",
        solution: "✅ Valid signature ≠ safe code. The certificate holder might be compromised. Monitor behavior of any process, even if signed by trusted vendors.",
        impact: "😞 Supply chain attacks defeat signature-based detection"
      },
      {
        mistake: "❌ Not monitoring legitimate software for behavioral anomalies",
        solution: "✅ Watch vendor.exe spawning cmd.exe, creating registry entries, or connecting to unexpected IPs. These anomalies are red flags regardless of process legitimacy.",
        impact: "🚨 Backdoors hide inside legitimate process trees"
      },
      {
        mistake: "❌ Deploying updates to production without testing",
        solution: "✅ Always pilot new software updates to a test group first. If the update contains backdoor code, test environment catches it before mass deployment.",
        impact: "⚠️ You rapidly spread compromise across entire infrastructure"
      },
      {
        mistake: "❌ Ignoring C2 communication to non-standard ports/IPs",
        solution: "✅ Don't just block known malware C2 IPs—look for ANY unusual external connections from processes that shouldn't talk to the internet.",
        impact: "🔓 Attackers maintain persistent access via non-standard ports"
      },
      {
        mistake: "❌ Not investigating sudden registry or system file modifications",
        solution: "✅ Persistence mechanisms (registry RunOnce keys, scheduled tasks, DLL injection) are how backdoors survive reboots. Investigate ALL system modifications.",
        impact: "❌ Backdoors persist across reboots and incident response attempts"
      }
    ],
    scoreExplanation: {
      title: "📊 Score Breakdown",
      maxScore: 100,
      components: [
        { category: "Phase 1: Threat Detection", points: 35, note: "Identifying supply chain attack indicators in legitimate process behavior" },
        { category: "Phase 2: Impact Analysis", points: 35, note: "Understanding lateral movement and persistence mechanisms" },
        { category: "Phase 3: Response Plan", points: 20, note: "Creating containment strategy (isolation, patching, hunting)" },
        { category: "Bonuses", points: 10, note: "Identifying specific attacker infrastructure and IOCs" }
      ],
      penalties: [
        { action: "Dismissing legitimate process behavior as safe", points: -5 },
        { action: "Not connecting behavioral anomalies to attack chain", points: -3 }
      ],
      interpretation: "Score 80+: Advanced threat hunter skills. Score 60-80: Good at detection but need better behavioral analysis. Score <60: Study process anomalies and C2 indicators."
    }
  },

  level4: {
    title: "Level 4 Recap: Advanced APT Campaign",
    levelNumber: 4,
    scenario: {
      title: "🎬 What Happened",
      description: `An Advanced Persistent Threat (APT) group targeted TechNova with a sophisticated multi-stage campaign:
      1. Phishing emails with trojanized documents
      2. Credential theft from compromised accounts
      3. Lateral movement using valid credentials (living off the land)
      4. Data exfiltration to cloud storage
      5. CNC communication and operator activity`,
      attackChain: [
        { time: "Week 1", event: "Phishing campaign targeting executives", type: "initial_access" },
        { time: "Day 3", event: "Infected document opens - trojan executes", type: "execution" },
        { time: "Day 4", event: "Credential harvesting - steals executive credentials", type: "credential_access" },
        { time: "Day 5", event: "Lateral movement using legitimate credentials", type: "lateral_movement" },
        { time: "Day 6", event: "Persistence via scheduled tasks and registry modifications", type: "persistence" },
        { time: "Day 7", event: "Data exfiltration - sensitive projects copied to anonymous cloud", type: "exfiltration" }
      ]
    },
    timeline: {
      title: "📊 Attack Timeline",
      events: [
        { id: 1, time: "Week 1, Day 1", title: "Phishing Emails", description: "Targeted spear-phishing with business context emails", severity: "high" },
        { id: 2, time: "Week 1, Day 3", title: "Document Exploitation", description: "Trojanized Word document opens—macro executes payload", severity: "critical" },
        { id: 3, time: "Week 1, Day 4", title: "Credentials Stolen", description: "Executive credentials harvested by credential stealer", severity: "critical" },
        { id: 4, time: "Week 1, Day 5", title: "Lateral Movement", description: "Using stolen credentials to access sensitive systems", severity: "critical" },
        { id: 5, time: "Week 1, Day 6", title: "Persistence", description: "Backdoor installed for long-term access", severity: "critical" },
        { id: 6, time: "Week 1, Day 7", title: "Data Exfiltration", description: "Sensitive projects copied to cloud storage—massive data theft", severity: "critical" }
      ]
    },
    keyLearnings: [
      {
        title: "Phishing is the #1 Entry Vector",
        description: "80% of breaches start with credential theft via phishing. Attackers use social engineering (false urgency, authority, legitimacy) to trick users. User training is essential.",
        icon: "📧"
      },
      {
        title: "Living Off the Land",
        description: "Modern APTs use legitimate tools (PowerShell, WMI, legitimate admin tools) to avoid detection. They don't drop malware—they use existing system binaries. Monitor legitimate tools for suspicious activity.",
        icon: "🛡️"
      },
      {
        title: "Credential Compromise is a Multiplier",
        description: "Once credentials are stolen, attackers don't need exploits. They just use legitimate VPN, email, and file shares. Multifactor authentication (MFA) and credential monitoring are critical.",
        icon: "🔐"
      },
      {
        title: "Persistence Mechanisms",
        description: "Scheduled tasks, registry modifications, WMI subscriptions, and startup folders allow backdoors to survive reboots. Investigate all system modifications—they're footprints of persistence.",
        icon: "⚙️"
      },
      {
        title: "Exfiltration Requires Time",
        description: "Large data transfers to cloud storage take time and generate network traffic. Monitor for unusual cloud uploads, especially to free/anonymous services. Early detection stops data loss.",
        icon: "☁️"
      }
    ],
    commonMistakes: [
      {
        mistake: "❌ Assuming all phishing attempts are obvious",
        solution: "✅ Sophisticated phishing uses legitimate company graphics, sender spoofing, and real business context. Teach users to verify sender email address and hover over links.",
        impact: "😞 Employees fall for well-crafted social engineering"
      },
      {
        mistake: "❌ Not requiring MFA on sensitive accounts",
        solution: "✅ MFA on email and admin accounts prevents credential-based attacks. Even with stolen passwords, attackers can't log in without the second factor.",
        impact: "🚨 Stolen credentials give attackers full system access"
      },
      {
        mistake: "❌ Trusting legitimate process behavior",
        solution: "✅ PowerShell running from unusual directories, WMI used by non-admin programs, or admin tools scheduled at night = suspicious. Monitor context, not just the process name.",
        impact: "⚠️ Attackers hide inside legitimate tools"
      },
      {
        mistake: "❌ Not logging and monitoring cloud uploads",
        solution: "✅ Configure DLP policies for cloud uploads. Monitor for large transfers to free services (Dropbox, OneDrive personal, Google Drive personal). Alert on anomalies.",
        impact: "💀 Data exfiltration completes undetected"
      },
      {
        mistake: "❌ Waiting for certainty before isolating accounts",
        solution: "✅ If credentials are confirmed stolen or account shows anomalous activity, reset password and require re-authentication immediately. Speed reduces attacker dwell time.",
        impact: "⏱️ Attackers maintain access during investigation"
      }
    ],
    scoreExplanation: {
      title: "📊 Score Breakdown",
      maxScore: 100,
      components: [
        { category: "Phase 1: Initial Compromise Detection", points: 30, note: "Identifying phishing and initial infection indicators" },
        { category: "Phase 2: Lateral Movement Analysis", points: 35, note: "Recognizing credential misuse and unusual access patterns" },
        { category: "Phase 3: Persistence & Exfiltration", points: 20, note: "Detecting persistence mechanisms and data theft" },
        { category: "Bonuses", points: 15, note: "Understanding APT operating procedures and motives" }
      ],
      penalties: [
        { action: "Missing phishing indicators", points: -3 },
        { action: "Not connecting attack phases into coherent timeline", points: -5 }
      ],
      interpretation: "Score 85+: Ready for advanced IR work. Score 65-85: Good threat analyst skills. Score <65: Study phishing techniques and APT behavior patterns."
    }
  },

  level5: {
    title: "Level 5 Recap: MFA Fatigue Attack (Account Takeover)",
    levelNumber: 5,
    scenario: {
      title: "🎬 What Happened",
      description: `Attackers obtained employee credentials through data breach, then used MFA fatigue attack to take over the account:
      1. Stolen credentials used for login attempt (user has MFA)
      2. Repeated MFA push notifications sent to bypass MFA
      3. Victim approves MFA after repeated pushes (fatigue)
      4. Attacker gains account access with legitimate MFA
      5. Lateral movement and privilege escalation follows
      6. Sensitive data accessed from legitimate account`,
      attackChain: [
        { time: "14:30", event: "Stolen credentials used for login", type: "initial_access" },
        { time: "14:31", event: "First MFA push sent to user (legitimate)", type: "mfa_challenge" },
        { time: "14:32", event: "User denies MFA push", type: "mfa_block" },
        { time: "14:35", event: "550+ repeated MFA pushes sent in rapid succession", type: "mfa_fatigue" },
        { time: "15:00", event: "Victim approves MFA after wave of notifications", type: "mfa_bypass" },
        { time: "15:01", event: "Account takeover complete - attacker logged in", type: "account_takeover" }
      ]
    },
    timeline: {
      title: "📊 Attack Timeline",
      events: [
        { id: 1, time: "14:30", title: "Login Attempt", description: "Attacker uses stolen credentials to access employee account", severity: "high" },
        { id: 2, time: "14:31", title: "First MFA Push", description: "User receives legitimate MFA push notification", severity: "high" },
        { id: 3, time: "14:32", title: "User Denies MFA", description: "Employee correctly denies the suspicious login attempt", severity: "high" },
        { id: 4, time: "14:35-15:00", title: "MFA Fatigue Attack", description: "550+ MFA push notifications sent in 25-minute window", severity: "critical" },
        { id: 5, time: "15:00", title: "MFA Approval", description: "Exhausted employee accidentally approves MFA after repeated notifications", severity: "critical" },
        { id: 6, time: "15:01+", title: "Account Takeover", description: "Attacker accesses account, accesses admin panel, changes passwords", severity: "critical" }
      ]
    },
    keyLearnings: [
      {
        title: "MFA is Not Bulletproof",
        description: "MFA fatigue (push notification bombing) is a social engineering attack that defeats MFA through user exhaustion. Attackers leverage user psychology—not technical vulnerabilities.",
        icon: "📱"
      },
      {
        title: "Volume-Based Attacks",
        description: "550+ login attempts in 25 minutes from the same IP = anomalous. Threshold-based alerting on failed/repeated MFA challenges prevents fatigue attacks before approval.",
        icon: "📊"
      },
      {
        title: "Behavioral Indicators",
        description: "Approved login from unusual IP + admin panel access from never-before-seen location = suspicious. Account access patterns change when compromised. Monitor geographic login anomalies.",
        icon: "🌍"
      },
      {
        title: "Privilege Escalation Without New Exploits",
        description: "Compromised employee accounts often have admin or sensitive access. Attackers don't need zero-days—they just leverage existing permissions of the stolen account.",
        icon: "🔑"
      },
      {
        title: "Detection Speed Matters",
        description: "Detecting MFA fatigue within minutes limits attacker window. Real-time alerting on unusual MFA challenge rates stops takeover before approval. Speed = prevention.",
        icon: "⚡"
      }
    ],
    commonMistakes: [
      {
        mistake: "❌ Assuming MFA push denials mean the attack is blocked",
        solution: "✅ Denials are NOT the end. Attackers bomb with more pushes to exhaust users. Track cumulative denials and block after threshold (e.g., 10+ denials in 5 min).",
        impact: "😞 You think attack failed, but it's just entering fatigue phase"
      },
      {
        mistake: "❌ Ignoring low-severity 'unusual activity' alerts",
        solution: "✅ Geographic anomalies, new device logins, and unusual IP access are early signs. Chain multiple low-severity signals = high-severity compromise.",
        impact: "🚨 Takeover completes in your blind spot"
      },
      {
        mistake: "❌ Not monitoring MFA failure/retry patterns",
        solution: "✅ Alert on: 5+ failed MFA in 10 minutes, multiple MFA pushes to same user in short window, approvals after repeated denials.",
        impact: "⚠️ Fatigue attack happens before you notice the pattern"
      },
      {
        mistake: "❌ Assuming admin panel access is legitimate",
        solution: "✅ Admin panel access from new IP + occurring after account compromise = red flag. Link admin actions to preceding MFA anomalies.",
        impact: "💀 Insider threat detection missed because you trusted the credentials"
      },
      {
        mistake: "❌ Not forcing password re-authentication after anomalies",
        solution: "✅ Suspicious login + MFA approval = require user to re-authenticate with password. Forces attacker to provide credentials again (which they might not have updated).",
        impact: "❌ Attacker maintains persistent access via old credentials"
      }
    ],
    scoreExplanation: {
      title: "📊 Score Breakdown",
      maxScore: 100,
      components: [
        { category: "Phase 1: MFA Attack Recognition", points: 35, note: "Identifying MFA fatigue attack indicators and anomalies" },
        { category: "Phase 2: Attack Chain Analysis", points: 35, note: "Understanding how fatigue leads to account takeover" },
        { category: "Phase 3: Response & Prevention", points: 20, note: "Recommended actions to stop takeover and validate legitimate users" },
        { category: "Bonuses", points: 10, note: "Identifying specific threshold violations and attack IOCs" }
      ],
      penalties: [
        { action: "Missing MFA fatigue pattern", points: -5 },
        { action: "Not connecting geographic anomaly to compromise", points: -3 }
      ],
      interpretation: "Score 85+: Expert in modern authentication attacks. Score 65-85: Good detection skills. Score <65: Study MFA fatigue attack vectors and detection methods."
    }
  }
};
