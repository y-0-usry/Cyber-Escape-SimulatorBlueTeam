# Level 2: Insider Threat - Answer Key 🎯

## Phase 1: Alert Triage (18 Questions)

### Q1-Q12: Individual Alert Classification

**Instructions:** For each alert, classify as True Positive (TP), False Positive (FP), or Needs Context (NC).

**Classification Logic:**

#### True Positives (Insider Threat Indicators):
1. **Git Clone (Large - 4.8GB)** from sarah.mitchell → **TP**
   - Outside normal developer workflow
   - Extremely large repository size
   - Severity: HIGH

2. **HR Repository Access** (Outside Role) → **TP**
   - Developer accessing HR employee database
   - Clear role violation
   - Severity: HIGH

3. **Massive File Read** (4,823 files, 2.1GB) → **TP**
   - Bulk data collection pattern
   - Sequential read operation
   - Severity: HIGH

4. **ZIP Archive Creation** (1.9GB) → **TP**
   - Archiving collected data
   - Preparation for exfiltration
   - Severity: CRITICAL

5. **Google Drive Upload** (Success - 1.9GB) → **TP**
   - Personal cloud account (not corporate)
   - Large data exfiltration
   - Severity: CRITICAL

6. **DLP Block - Cloud Upload** → **TP**
   - Sensitive data patterns detected
   - Attempted exfiltration
   - Severity: HIGH

7. **DLP Block - USB Copy** → **TP**
   - Weekend off-hours activity
   - Attempted alternative exfiltration method
   - Severity: HIGH

8. **Off-Hours VPN Login** (Saturday 22:17) → **TP**
   - Weekend access
   - Residential IP
   - Severity: HIGH

9. **File Access Anomaly** (127 files in 15min vs 3/day baseline) → **TP**
   - 4,233% deviation from baseline
   - Clear anomaly
   - Severity: HIGH

10. **Job Search Activity** (LinkedIn + Indeed + Resume Upload) → **NC/TP**
    - Contextual indicator (not attack itself)
    - Suggests motive (resignation)
    - Combined with other indicators = TP

#### False Positives (Legitimate Business):
1. **DevOps CI/CD Backup** (Automated 3.2GB Git mirror) → **FP**
   - Service account (SVC_DevOps)
   - Scheduled backup
   - Approved automation

2. **HR Payroll Export** (482MB) → **FP**
   - HR team member (jennifer.adams)
   - Legitimate job function
   - Approved export

3. **OneDrive Corporate Sync** (1.8GB) → **FP**
   - Corporate OneDrive account
   - Standard sync operation
   - Business hours

4. **IT Support USB** → **FP**
   - IT support role
   - Ticket number (INC-2024-0145)
   - Documented purpose

5. **Database Backup Job** (2.4GB) → **FP**
   - Service account (SVC_SQLBackup)
   - Scheduled (02:00)
   - Standard backup

6. **Developer Overtime** (VPN 20:45) → **FP**
   - Approved ticket (CHG-2024-0089)
   - Production deployment
   - Documented purpose

7. **IT Admin VPN** (23:12) → **FP**
   - IT admin role
   - Emergency patch ticket
   - Legitimate maintenance

8. **Marketing Assets** (1.2GB Adobe) → **FP**
   - Marketing team
   - Creative Cloud business account
   - Normal workflow

9. **Security Scan** (15,428 files) → **FP**
   - Service account (SVC_SecurityScanner)
   - Scheduled weekly scan
   - Automated security tool

10. **File Server Replication** (3.7GB) → **FP**
    - System account
    - DFS nightly replication
    - Infrastructure operation

11. **Windows Updates** (842MB) → **FP**
    - System process
    - Microsoft update servers
    - Normal maintenance

12. **Email Attachment** (125MB) → **FP**
    - Sales team
    - Approved ticket (REQ-2024-0045)
    - Business communication

#### Distractors (Failed External Attacks):
1. **SSH Brute-Force** (247 attempts from Russia) → **TP (but irrelevant to scenario)**
   - External threat
   - Successfully blocked
   - Not related to insider threat

2. **Phishing Email** (Quarantined) → **FP**
   - No user interaction
   - Successfully blocked
   - Not relevant

3. **IDS False Positive** (jQuery CDN) → **FP**
   - Outdated detection rule
   - Legitimate traffic
   - Acknowledged FP

4. **Port Scan** (External IP) → **TP (but irrelevant)**
   - Successfully blocked
   - External threat
   - Not related to scenario

5. **SQL Injection** (WAF Blocked) → **TP (but irrelevant)**
   - External attack
   - Successfully blocked
   - Not related to scenario

6. **XSS Attempt** (Sanitized) → **TP (but irrelevant)**
   - External attack
   - Successfully mitigated
   - Not related to scenario

---

### Q13: False Positive Multi-Select ✨

**Question:** "Which of these alerts are FALSE POSITIVES? (Select all that apply)"

**Correct Answers (Select ALL):**
- ✅ DevOps CI/CD backup (SVC_DevOps - automated)
- ✅ HR payroll export (HR team member - approved)
- ✅ Corporate OneDrive sync (business account)
- ✅ IT support USB usage (ticket INC-2024-0145)
- ✅ Database backup job (SVC_SQLBackup - scheduled)
- ✅ Developer working late (approved CHG-2024-0089)
- ✅ IT admin VPN maintenance (emergency ticket)
- ✅ Marketing assets download (Creative Cloud)
- ✅ Automated security scan (SVC_SecurityScanner)
- ✅ File server replication (DFS - system process)
- ✅ Windows updates (legitimate system process)
- ✅ Email large attachment (approved REQ-2024-0045)
- ✅ Video conference recording (Board meeting)
- ✅ Printer scan to network (office scanner)
- ✅ QA testing data export (ticket TASK-2024-0234)

**How to Identify:**
- **Service Accounts:** SVC_*, SYSTEM → Usually legitimate
- **Tickets:** INC-*, CHG-*, REQ-*, TASK-* → Approved activities
- **Scheduled:** 02:00, 03:00 (overnight) → Automated jobs
- **Business Context:** HR doing payroll, Marketing using Adobe, IT using USB for support

**Common Mistakes:**
- ❌ Flagging large transfers as malicious (check context!)
- ❌ Ignoring ticket numbers (approved activities)
- ❌ Not recognizing service account patterns

---

### Q14: Top 5 Priority Alerts

**Question:** "Select the TOP 5 alerts requiring immediate investigation"

**Correct Answer:**
1. ✅ **Google Drive Upload** (1.9GB to personal account) - CRITICAL
2. ✅ **DLP Block - Sensitive Data** (Exfiltration attempt) - HIGH
3. ✅ **HR Repo Access** (Outside role) - HIGH
4. ✅ **Git Clone** (4.8GB repository) - HIGH
5. ✅ **ZIP Archive Creation** (1.9GB data collection) - CRITICAL

**Alternative Acceptable:**
- **Off-Hours VPN** (Saturday 22:17)
- **DLP Block - USB Copy** (Weekend exfiltration attempt)
- **File Access Anomaly** (4,233% deviation)

**Reasoning:**
- Focus on **data exfiltration** indicators
- Prioritize **successful** over failed attempts
- **Role violations** are high priority
- **DLP blocks** indicate active threat

**Scoring:** 2 points per correct alert (10 points total)

---

### Q15: Correlation

**Question:** "Which alerts are part of the same incident? (Group them)"

**Correct Grouping:**

**Incident Group: Insider Threat (sarah.mitchell)**
- Git clone attempt #1 (failed)
- Git clone attempt #2 (success - 4.8GB)
- HR repository access (outside role)
- Massive file read (4,823 files)
- ZIP creation (1.9GB)
- DLP block - cloud upload #1
- Google Drive upload #2 (success)
- DLP sensitive data alert
- Off-hours VPN (Saturday)
- Late night file access
- USB device connection
- DLP block - USB copy
- Job search activity (LinkedIn, Indeed)

**Separate Groups (Not Related):**
- External attacks (SSH brute-force, port scan, SQL injection, XSS)
- False positives (DevOps, HR, IT, etc.)

**Timeline Logic:**
```
14:23 - Git clone attempt (failed)
14:28 - Git clone (success)
15:05 - HR repo access
15:12 - Massive file reads
15:31 - ZIP creation
15:48 - Upload attempt (DLP blocked)
15:52 - Upload success (Google Drive)
22:17 - Off-hours VPN
22:43 - USB copy attempt (DLP blocked)
```

**Scoring:** 20 points for correct grouping

---

### Q16: Behavior Analysis

**Question:** "Which behavior is MOST suspicious?"

**Options:**
- A) Large data access
- B) Off-hours activity  
- C) Non-role resource access
- D) **Combination of all** ✅

**Correct Answer: D) Combination of all**

**Reasoning:**
- **Individually:** Each could be legitimate
  - Large data: Could be backup/sync
  - Off-hours: Could be approved overtime
  - Non-role access: Could be cross-training
  
- **Combined:** Strong insider threat indicator
  - Developer + HR repo access + Git clone + Weekend activity + Cloud upload = **Clear pattern**

**Key Learning:** Behavioral analysis requires **context** and **pattern recognition**, not single indicators.

---

### Q17: MITRE ATT&CK Mapping

**Question:** "Which MITRE ATT&CK technique best matches the observed behavior?"

**Options:**
- A) **T1078 – Valid Accounts** ✅
- B) T1486 – Data Encrypted for Impact ❌
- C) T1190 – Exploit Public-Facing Application ❌
- D) T1046 – Network Service Discovery ❌

**Correct Answer: A) T1078 – Valid Accounts**

**Why T1078:**
- Attacker using **legitimate credentials** (sarah.mitchell)
- No malware or exploits
- Valid VPN access
- Authorized (but misused) permissions

**Why NOT the others:**
- **T1486 (Ransomware):** No encryption, no ransom note
- **T1190 (Exploit):** No exploitation, legitimate access
- **T1046 (Discovery):** Not reconnaissance, direct data theft

**Additional Relevant Techniques:**
- **T1560** – Archive Collected Data (ZIP creation)
- **T1567** – Exfiltration Over Web Service (Google Drive)

---

### Q18: Hypothesis

**Question:** "Which statement best describes the situation?"

**Options:**
- A) Isolated alerts requiring individual investigation ❌
- B) System misconfiguration causing false alerts ❌
- C) **Suspicious internal user behavior indicating data theft** ✅
- D) Active external attack campaign ❌

**Correct Answer: C) Suspicious internal user behavior**

**Reasoning:**
- **Valid credentials** (not compromised account)
- **Purposeful actions** (collect → archive → exfiltrate)
- **Role violations** (accessing HR repo)
- **Off-hours activity** (avoiding detection)
- **Multiple exfiltration attempts** (persistence)

**Why NOT:**
- **A (Isolated):** Clear attack chain correlation
- **B (Misconfiguration):** Intentional actions, not errors
- **D (External):** Internal user, not external threat

---

## Phase 2: Scenario Validation (8 Questions)

### Q1: Attack Type

**Question:** "Based on all collected evidence, what type of attack occurred?"

**Correct Answers:**
- "Insider Threat"
- "Data Exfiltration"
- "Insider Data Theft"
- "Internal Data Breach"

**Scoring:** 15 points (case-insensitive, partial match allowed)

---

### Q2: Supporting Evidence (Select 2)

**Question:** "Which TWO pieces of evidence best support your conclusion?"

**Options:**
- ✅ **Valid credentials used** (No account compromise)
- ✅ **No malware traces** (Legitimate tools only)
- ✅ **Unusual user behavior** (Role violations, off-hours)
- ❌ External IP reputation (Not relevant - internal threat)

**Correct:** Select any 2 of the first 3 options

**Scoring:** 15 points (7.5 per correct selection)

---

### Q3: MITRE Techniques (Multi-select)

**Question:** "Which MITRE ATT&CK techniques apply to this scenario? (Select ALL that apply)"

**Correct Answers:**
- ✅ **T1078 – Valid Accounts** (Using legitimate credentials)
- ✅ **T1560 – Archive Collected Data** (ZIP creation)
- ✅ **T1567 – Exfiltration Over Web Service** (Google Drive)
- ❌ T1486 – Data Encrypted for Impact (Not ransomware)

**Scoring:** 20 points (6.67 points per correct technique)

**Technique Breakdown:**
- **T1078:** Primary - Used sarah.mitchell's valid account
- **T1560:** Collected files into 1.9GB ZIP archive
- **T1567:** Uploaded to Google Drive (cloud exfiltration)

---

### Q4: Timeline Logic

**Question:** "What happened FIRST in the attack chain?"

**Options:**
- A) **Repository access attempt** ✅
- B) ZIP file creation ❌
- C) Cloud upload ❌
- D) DLP alert ❌

**Correct Answer: A) Repository access attempt**

**Timeline:**
```
14:23 - Git clone attempt #1 (failed) ← FIRST
14:28 - Git clone #2 (success)
15:05 - HR repo access
15:12 - File reads
15:31 - ZIP creation
15:48 - Upload attempt (blocked)
15:52 - Upload success
22:17 - Off-hours VPN
22:43 - USB attempt (blocked)
```

**Scoring:** 10 points

---

### Q5: Why NOT Ransomware?

**Question:** "Why is this NOT a ransomware attack?"

**Correct Reasons (Select ALL):**
- ✅ **No file encryption** (Files copied, not encrypted)
- ✅ **No ransom note** (No payment demand)
- ✅ **Legitimate user access** (Not compromised account)
- ✅ **Data theft, not destruction** (Exfiltration, not impact)

**Scoring:** 10 points (all or partial credit)

---

### Q6: Business Impact

**Question:** "What is the primary business impact?"

**Options:**
- A) **Data confidentiality breach** ✅
- B) Service availability impact ❌
- C) Financial fraud ❌
- D) Website defacement ❌

**Correct Answer: A) Data confidentiality breach**

**Impact Details:**
- **Proprietary algorithms** stolen (intellectual property)
- **HR employee database** accessed (PII)
- **Source code** exfiltrated (competitive advantage)
- **Potential disclosure** to competitors

**Scoring:** 10 points

---

### Q7: Failed Attack Identification ✨

**Question:** "Which alert represents a FAILED external attack NOT related to the main incident?"

**Options:**
- A) **External SSH brute-force (blocked)** ✅
- B) Git clone attempt (failed) ❌ (Part of insider attack)
- C) DLP block - cloud upload ❌ (Part of insider attack)
- D) **Port scan (blocked)** ✅

**Correct Answers:** A or D (both are failed external attacks)

**Reasoning:**
- **SSH brute-force:** External IP (Russia), 247 attempts, blocked
- **Port scan:** External IP (China), 1,247 packets, blocked
- **NOT Git clone:** Internal user, part of insider attack
- **NOT DLP block:** Internal user, part of insider attack

**Scoring:** 10 points

---

### Q8: SOC Decision ✨

**Question:** "What should the SOC do FIRST?"

**Options:**
- A) **Disable user access immediately** ✅
- B) Scan all endpoints for malware ❌
- C) Block external IP addresses ❌
- D) Run full antivirus scan ❌

**Correct Answer: A) Disable user access immediately**

**Reasoning:**
- **Immediate containment** is priority
- User still has active VPN/network access
- Prevent further data exfiltration
- Evidence preservation

**Wrong Answers:**
- **B/D (Malware scan):** No malware involved
- **C (Block IPs):** Internal threat, not external

**Scoring:** 10 points

---

## Phase 3: Incident Ticket Creation

**Expected Ticket Content:**

### Incident Title:
"Insider Threat - Data Exfiltration by Developer sarah.mitchell"

### Severity:
**CRITICAL**

### Attack Type:
Insider Threat / Data Exfiltration

### Timeline:
```
2024-01-15 14:23 - First Git clone attempt (failed authentication)
2024-01-15 14:28 - Successful Git clone (4.8GB proprietary algorithms)
2024-01-15 15:05 - Unauthorized HR repository access
2024-01-15 15:12 - Massive file read operations (4,823 files, 2.1GB)
2024-01-15 15:31 - ZIP archive creation (1.9GB)
2024-01-15 15:48 - Cloud upload attempt (blocked by DLP)
2024-01-15 15:52 - Successful Google Drive upload (1.9GB)
2024-01-15 22:17 - Off-hours VPN login (Saturday evening)
2024-01-15 22:43 - USB copy attempt (blocked by DLP)
```

### Evidence Summary:
- **User:** sarah.mitchell (Developer)
- **Indicators:** Repository access outside role, large data collection, archiving, cloud exfiltration
- **DLP Blocks:** 2 exfiltration attempts blocked (cloud, USB)
- **Success:** 1.9GB uploaded to personal Google Drive
- **Behavioral:** Job search activity, off-hours access, resignation notice

### MITRE ATT&CK Mapping:
- **T1078** - Valid Accounts
- **T1560** - Archive Collected Data
- **T1567** - Exfiltration Over Web Service

### Recommendations:
1. **Immediate:** Disable sarah.mitchell's account (VPN, AD, Git, email)
2. **Containment:** Revoke all active sessions and access tokens
3. **Investigation:** 
   - Contact Google for data retrieval/deletion
   - Review all file access logs for additional exfiltration
   - Interview HR regarding resignation notice
4. **Legal:** Engage legal team for potential prosecution
5. **Prevention:**
   - Review DLP policies (already effective in blocking 2 attempts)
   - Implement user behavior analytics (UBA)
   - Enhanced monitoring for departing employees

### Scoring Criteria (50 points):
- **Title & Severity:** 10 points
- **Timeline Accuracy:** 10 points
- **Evidence Quality:** 10 points
- **MITRE Mapping:** 10 points
- **Recommendations:** 10 points

---

## Summary Scoring

**Phase 1:** 200 points  
**Phase 2:** 100 points  
**Phase 3:** 50 points  
**Total:** 350 points

**Passing:** ≥ 200 points (57%)

**Performance Tiers:**
- **Expert (300+):** 3 free hints for Level 3
- **Proficient (250-299):** 2 free hints for Level 3
- **Competent (200-249):** 1 free hint for Level 3

---

## Common Mistakes to Avoid

1. ❌ **Ignoring Context:** Large transfers ≠ always malicious
2. ❌ **Missing Service Accounts:** SVC_* = usually legitimate
3. ❌ **Forgetting Tickets:** Approved activities have documentation
4. ❌ **Focusing on External Threats:** This is an **insider** scenario
5. ❌ **Single Indicator Bias:** Look for **patterns**, not isolated events
6. ❌ **Ignoring Failed Attempts:** Persistence = strong indicator
7. ❌ **Wrong MITRE Mapping:** No malware = Not T1486 (ransomware)

---

**Good luck! 🚀**