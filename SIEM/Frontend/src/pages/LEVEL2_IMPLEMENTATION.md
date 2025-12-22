# Level 2: Insider Threat & Data Exfiltration - Implementation Guide

## 🎯 Scenario Overview

**Scenario Name:** Insider Threat & Data Exfiltration  
**Inspired by:**
- Tesla Insider Data Leak (2023)
- Yahoo Source Code Theft (2022)

**Environment:**  
Mid-sized technology company with:
- Active Directory
- Git Repository (Source Code)
- File Servers
- VPN Access
- Web Proxy
- DLP (Data Loss Prevention)
- SIEM

**Attacker Profile:**
- **Type:** Internal employee (sarah.mitchell - Developer)
- **Access:** Valid credentials
- **Method:** No malware, No exploits
- **Intent:** Data exfiltration for personal gain
- **Indicators:** Resignation notice filed after incident

---

## 📊 Alert Breakdown (34 Total)

### 🔴 Primary Attack Chain (13 alerts)
Insider threat with persistence and multiple failed/successful attempts:

1. **Git Clone Attempt #1** (Authentication Failed)
2. **Git Clone Attempt #2** (Success - 4.8GB repository)
3. **Repository Access #1** (Access Denied - Finance repo)
4. **Repository Access #2** (Success - HR repo - outside role)
5. **Massive File Read Operations** (4,823 files, 2.1GB)
6. **ZIP Creation Attempt** (Permission Denied - Public folder)
7. **ZIP Creation** (Success - 1.9GB archive in user profile)
8. **Upload Attempt #1** (Blocked by DLP - sensitive patterns)
9. **Upload Attempt #2** (Success - Google Drive personal account)
10. **DLP Sensitive Data Detection** (Critical alert)
11. **Off-Hours VPN Login** (Saturday 22:17)
12. **Late Night File Access** (Weekend access to archive)
13. **USB Device + File Copy** (Blocked by DLP)

**Key Behavioral Indicators:**
- Multiple failed attempts followed by success (persistence)
- Access to repositories outside job role
- Large data collection and archiving
- Cloud upload to personal account
- Off-hours activity (weekend)
- Job search activity (LinkedIn, Indeed) during work hours

### 🟡 False Positives (15 alerts)
Legitimate business activities that could be mistaken for threats:

1. **DevOps CI/CD Backup** (Automated 3.2GB Git mirror)
2. **HR Payroll Export** (482MB legitimate export)
3. **Corporate OneDrive Sync** (1.8GB)
4. **IT Support USB Usage** (Troubleshooting with ticket)
5. **Database Backup Job** (Scheduled 2.4GB backup)
6. **Developer Working Late** (Approved overtime - deployment)
7. **IT Admin VPN Maintenance** (Emergency patch with ticket)
8. **Marketing Team Assets** (1.2GB Creative Cloud download)
9. **Automated Security Scan** (15,428 files scanned)
10. **File Server Replication** (3.7GB DFS replication)
11. **Software Update Download** (842MB Windows updates)
12. **Email Large Attachment** (125MB sales presentation - approved)
13. **Video Conference Recording** (1.1GB Board meeting)
14. **Printer Scan to Network** (45MB document scan)
15. **QA Testing Data Export** (380MB test data refresh)

**Learning Objective:** Not all large data transfers = attack. Context matters:
- Service accounts vs user accounts
- Approved tickets/change requests
- Business hours vs off-hours
- Role-appropriate access

### 🟠 Failed External Attacks (6 alerts)
Distractors - external threats unrelated to the insider scenario:

1. **External SSH Brute-Force** (247 attempts blocked)
2. **Phishing Email** (Quarantined, no click)
3. **IDS Malware False Positive** (jQuery CDN misdetection)
4. **Port Scan** (1,247 packets blocked)
5. **SQL Injection Attempt** (WAF blocked)
6. **XSS Attempt** (Input sanitized)

**Learning Objective:** Distinguish between:
- External threats (irrelevant to this scenario)
- Internal threats (the focus)
- Failed vs successful attacks

---

## 🎮 Game Phases

### Phase 1: Alert Triage (18 Questions)

**Q1-Q12: Individual Alert Classification**
- Present 12 mixed alerts (high/medium severity)
- Player classifies each as: True Positive / False Positive / Needs Context
- Tests understanding of legitimate vs malicious behavior

**Q13: False Positive Multi-Select ✨ NEW**
- **Question:** "Which of these alerts are FALSE POSITIVES? (Select all that apply)"
- **Options:** 8-10 alerts (mix of FP and TP)
- **Answer:** DevOps backup, HR export, OneDrive sync, IT USB, DB backup, etc.
- **Purpose:** Test bulk FP identification skill

**Q14: Top 5 Priority Alerts**
- **Question:** "Select the TOP 5 alerts requiring immediate investigation"
- **Expected:** Git clone (large), HR repo access, DLP blocks, Google Drive upload, off-hours VPN
- **Scoring:** Partial credit (1 point per correct alert)

**Q15: Correlation**
- **Question:** "Which alerts are part of the same incident? (Group them)"
- **Expected:** All insider threat alerts grouped together
- **Distractors:** External attacks, false positives

**Q16: Behavior Analysis**
- **Question:** "Which behavior is MOST suspicious?"
- **Options:**
  - Large data access
  - Off-hours activity
  - Non-role resource access
  - **Combination of all** ✅

**Q17: MITRE Mapping**
- **Question:** "Which MITRE ATT&CK technique best matches?"
- **Options:**
  - **T1078 – Valid Accounts** ✅
  - T1486 – Data Encrypted for Impact ❌
  - T1190 – Exploit Public-Facing Application ❌
  - T1046 – Network Service Discovery ❌

**Q18: Hypothesis**
- **Question:** "Which statement best describes the situation?"
- **Options:**
  - A) Isolated alerts ❌
  - B) System misconfiguration ❌
  - C) **Suspicious internal user behavior** ✅
  - D) Active external attack ❌

**Scoring:**
- Q1-Q12: 10 points each = 120 points
- Q13: 20 points (all or nothing for FP identification)
- Q14: 10 points (2 points per correct alert)
- Q15: 20 points
- Q16-Q18: 10 points each = 30 points
- **Phase 1 Total: 200 points**

---

### Phase 2: Scenario Validation (8 Questions)

**Q1: Attack Type**
- **Question:** "What type of attack is this?"
- **Answer:** Insider Threat / Data Exfiltration
- **Scoring:** 15 points

**Q2: Supporting Evidence (Select 2)**
- **Options:**
  - **Valid credentials** ✅
  - **No malware traces** ✅
  - **Unusual user behavior** ✅
  - External IP reputation ❌
- **Scoring:** 15 points (partial credit: 7.5 per correct)

**Q3: MITRE Techniques (Multi-select)**
- **Question:** "Which MITRE techniques apply? (Select all)"
- **Expected:**
  - **T1078 – Valid Accounts** ✅
  - **T1560 – Archive Collected Data** ✅
  - **T1567 – Exfiltration Over Web Service** ✅
  - T1486 – Ransomware ❌
- **Scoring:** 20 points (6.67 per correct technique)

**Q4: Timeline Logic**
- **Question:** "What happened FIRST in the attack chain?"
- **Options:**
  - **Repository access attempt** ✅
  - ZIP creation ❌
  - Cloud upload ❌
  - DLP alert ❌
- **Scoring:** 10 points

**Q5: Why NOT Ransomware?**
- **Question:** "Why is this NOT a ransomware attack?"
- **Expected:** 
  - **No encryption of files** ✅
  - **No ransom note** ✅
  - **Legitimate user access** ✅
- **Scoring:** 10 points

**Q6: Business Impact**
- **Question:** "What is the primary business impact?"
- **Answer:** **Data confidentiality breach** ✅
- **Options:**
  - Data confidentiality breach ✅
  - Service availability ❌
  - Financial fraud ❌
  - Website defacement ❌
- **Scoring:** 10 points

**Q7: Failed Attack Identification ✨ NEW**
- **Question:** "Which alert represents a FAILED external attack NOT related to the main incident?"
- **Options:**
  - **External brute-force (blocked)** ✅
  - Git clone attempt ❌
  - DLP block ❌
  - Port scan ✅
- **Scoring:** 10 points

**Q8: SOC Decision ✨ NEW**
- **Question:** "What should the SOC do FIRST?"
- **Options:**
  - **Disable user access immediately** ✅
  - Scan all endpoints ❌
  - Block external IPs ❌
  - Run malware scan ❌
- **Scoring:** 10 points

**Phase 2 Total: 100 points**

---

### Phase 3: Incident Ticket Creation (Output Only)

Player must submit comprehensive incident ticket with:

1. **Incident Title**
2. **Severity** (Expected: Critical)
3. **Attack Type** (Insider Threat / Data Exfiltration)
4. **Timeline** (First event → Last event)
5. **Evidence Summary** (Key alerts and indicators)
6. **MITRE Mapping** (T1078, T1560, T1567)
7. **Recommendations** (Disable account, investigate scope, legal action, etc.)

**Evaluation Criteria:**
- Evidence-based assessment (not guessing)
- Correct severity and priority
- Accurate MITRE mapping
- Actionable recommendations

**Phase 3 Scoring: 50 points**

---

## ✅ Success Criteria

### Stage 1 (Alert Analysis):
- **Minimum:** ≥ 65% (130/200 points)
- **Required:** Correct hypothesis (Q18)
- **Penalty:** Hints (-5 points each)
- **Bonus:** Speed (+5 per minute remaining)

### Stage 2 (Scenario Validation):
- **Minimum:** ≥ 70% (70/100 points)
- **Critical Questions:** Q1, Q3, Q7, Q8 must be correct
- **Partial Credit:** Q2, Q3 allow partial scoring

### Stage 3 (Incident Ticket):
- **Minimum:** Evidence-based ticket
- **Required:** Correct attack type, severity, MITRE mapping
- **Bonus:** Comprehensive recommendations

**Overall Passing Score: ≥ 200/350 points (57%)**

**Performance Tiers:**
- **Expert (300+):** 3 free hints for Level 3
- **Proficient (250-299):** 2 free hints for Level 3
- **Competent (200-249):** 1 free hint for Level 3
- **Below 200:** Must retry

---

## 🔑 Key Learning Objectives

1. **Insider Threat Detection:**
   - Valid credentials don't mean legitimate activity
   - Behavioral anomalies matter more than technical indicators
   - Context is critical (role, time, volume, destination)

2. **False Positive Filtering:**
   - Service accounts vs user accounts
   - Approved/ticketed activities
   - Business-hour operations vs off-hours

3. **Attack Persistence:**
   - Attackers retry after failures
   - Multiple failed attempts → eventual success
   - Persistence is a strong indicator

4. **Data Exfiltration Patterns:**
   - Collect → Archive → Exfiltrate
   - DLP as a critical control
   - Cloud services as exfiltration channels

5. **MITRE ATT&CK Mapping:**
   - T1078 (Valid Accounts) - Primary technique
   - T1560 (Archive Collected Data)
   - T1567 (Exfiltration Over Web Service)

6. **SOC Decision Making:**
   - Immediate containment (disable access)
   - Distinguish internal vs external threats
   - Evidence-based incident response

---

## 📁 File Structure

```
SIEM/Data/levels/level2/logs/
├── windows.log (13 primary + FP + failed attacks)
├── proxy.log (Cloud uploads + legitimate traffic)
├── vpn.log (Off-hours + legitimate VPN)
├── firewall.log (External attacks + allowed traffic)
├── dns.log (Phishing + normal queries)
├── ids.log (False positive + informational)
├── database.log (Legitimate DB operations)
├── ssh.log (Brute-force attempts)
├── webserver.log (SQL injection + XSS attempts)
└── dlp.log (DLP blocks + allowed transfers)
```

**Processing Pipeline:**
```bash
node fileReader.js level2
node parser.js level2
node normalizer.js level2
node alertGenerator.js level2
```

**Output:**
- `SIEM/Backend/src/core/Alert Generator/storage/level2/alerts.json`
- `Frontend/src/pages/data/level2/alerts.json`

---

## 🎨 Design Consistency with Level 1

- Same UI/UX (Tailwind CSS + Font Awesome)
- Same game mechanics (timer, hints, scoring)
- Same phase progression (Triage → Investigation → Ticket)
- Same performance rewards system
- Same Answer Key layout

---

## 🚀 Next Steps

1. ✅ Raw logs created (10 files)
2. ⏳ Run processing pipeline
3. ⏳ Create Level2.html + level2.js
4. ⏳ Create LEVEL2_ANSWERS.md + LEVEL2_ANSWERS_AR.md
5. ⏳ Create AnswerKey_Level2.html
6. ⏳ Update server.js + levels.js

**Status:** Implementation in progress ✨
