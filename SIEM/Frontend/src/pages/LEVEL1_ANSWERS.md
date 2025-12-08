# Level 1 Game - Answer Key 🎯

## Phase 1: General Triage Questions (14 Questions)

### Q1: False Positive Alert IDs
**Question:** Enter ALL False Positive alert IDs (comma-separated)

**Answer Logic:**
- Low severity network traffic
- Backup systems (192.168.1.50)
- Intranet access (192.168.1.60)
- Office365 legitimate traffic (172.16.0.15)
- Priority 4 IDS alerts

**Expected False Positives:**
```
68ba198d2dc4, b553a7fabc3f, a2a4458c66de, 6a2a0725a1d0, 533e1037f626, f3796c9420db
```
*(Note: Th  e exact IDs depend on the generated alerts. Look for low severity + routine traffic)*

---

### Q2-Q10: MITRE ATT&CK Tactic Classification (9 Questions)

For each high/medium alert, classify by tactic:

**Alert Classifications:**

1. **PowerShell Execution Alerts**
   - Answer: `malicious_script`
   - Raw log contains: "PowerShell", "Invoke", "Encoded"

2. **SMB/Port 445 Alerts**
   - Answer: `lateral_movement`
   - Raw log contains: "SMB", "445", "Lateral"

3. **C2 Communication Alerts**
   - Answer: `c2_communication`
   - Raw log contains: "Ransomware", "Beacon", "C2", "malware-cloud"

4. **Registry Modification Alerts**
   - Answer: `persistence`
   - Raw log contains: "Registry", "Persistence", "RunOnce"

5. **Shadow Copy Deletion Alerts**
   - Answer: `defense_evasion`
   - Raw log contains: "Shadow", "Deletion", "Delete"

6. **File Encryption Alerts**
   - Answer: `impact`
   - Raw log contains: "Encryption", "Rename", "File Extension", "bulk file"

7. **Failed Login Alerts**
   - Answer: `credential_access`
   - Raw log contains: "Failed login", "brute force", "authentication failed"

---

### Q11: Compromised Host IP
**Question:** What is the primary compromised host IP address?

**Answer:** `192.168.1.10`

**Reasoning:** This IP appears most frequently in high-severity alerts (PowerShell, C2, lateral movement, encryption)

---

### Q12: PowerShell Action
**Question:** Recommended action for suspicious PowerShell execution alert?

**Answer:** `isolate`

**Reasoning:** PowerShell with encoded commands is often malicious and requires immediate isolation.

---

### Q13: SMB Lateral Movement Action
**Question:** Recommended action for SMB lateral movement alert?

**Answer:** `isolate_all`

**Reasoning:** Lateral movement indicates active intrusion requiring isolation of all affected hosts.

---

### Q14: File Encryption Action
**Question:** Recommended action for mass file encryption activity?

**Answer:** `isolate`

**Reasoning:** File encryption is the final impact stage of ransomware requiring immediate network isolation.

---

## Phase 2: Scenario Investigation (4 Questions)

### Q1: Attack Type
**Question:** Based on all collected evidence, what type of attack occurred? (One or two words)

**Answer:** `ransomware` (or `crypto` or `encrypt`)

**Pattern:** /(ransomware|crypto|encrypt)/i

**Evidence:**
- File encryption activity
- Shadow copy deletion
- Bulk file renames
- Ransom-key-server.net DNS query
- Payment-gateway-ransom.com DNS query

---

### Q2: Initial Attack Vector
**Question:** What was the most likely initial attack vector? (One or two words)

**Answer:** `phishing` (or `email` or `malicious attachment` or `spear phishing`)

**Pattern:** /(phishing|email|malicious.*attachment|spear.*phishing)/i

**Reasoning:** Ransomware typically begins with phishing emails containing malicious attachments.

---

### Q3: Attack Chain Alert IDs
**Question:** Enter ALL alert IDs that are part of the main attack chain (comma-separated)

**Answer:** All TRUE POSITIVE alert IDs (exclude false positives from Q1)

**Logic:** Include all alerts with:
- High/Medium severity
- Source IP: 192.168.1.10
- Related to: PowerShell, C2, lateral movement, encryption, shadow copy, registry, DNS queries to malicious domains

**Approximate count:** 30-40 alert IDs (all non-false-positive alerts)

---

### Q4: Attack Detection Stage
**Question:** At what stage of the attack was the incident detected?

**Answer:** `impact`

**Reasoning:** The notification mentioned "files are being encrypted" - this is the Impact phase (final stage).

---

## Complete Attack Timeline 📅

**08:00** - Normal shift start (Administrator login)
**08:30** - Normal user activity (Mohamed login)
**09:00** - Normal activity (jsmith login)
**09:10** - Brute force attempts detected (guest, admin, root from 10.0.0.5)
**09:15** - ⚠️ C2 Beacon detected (203.0.113.99:443)
**09:15** - ⚠️ PowerShell execution (jsmith)
**09:15** - ⚠️ Malicious DNS (c2.malware-cloud.com, powershell.update-check.com)
**09:15** - ⚠️ Registry modification
**09:30** - ⚠️ Encoded command execution
**09:30** - ⚠️ Suspicious process spawning
**09:45** - ⚠️ SMB lateral movement begins (192.168.1.200)
**10:00** - ⚠️ SMB to second host (192.168.1.201)
**10:15** - ⚠️ SMB to third host (192.168.1.202)
**11:00** - ⚠️ File system changes detected
**11:00** - ⚠️ DNS query: ransom-key-server.net
**11:30** - ⚠️ Bulk file renames
**12:00** - 🔴 Shadow copy deletion
**12:00** - 🔴 DNS query: payment-gateway-ransom.com
**12:30** - 🔴 Mass file encryption (IMPACT!)

---

## Scoring Guide 💯

### Base Points:
- Phase 1 Questions: 10 points each × 14 = 140 points
- Phase 2 Questions: 20 points each × 4 = 80 points
- Ticket Creation: 50 points
- **Maximum Base Score:** 270 points

### Bonuses & Penalties:
- **Speed Bonus:** (Remaining minutes) × 5 points
  - Example: Finish with 5 minutes left = +25 points
- **Hint Penalty:** -5 points per hint used
  - Use 3 hints = -15 points

### Final Score Calculation:
```
Final Score = Base Points + Speed Bonus - (Hints × 5)
```

### Performance Ratings:
- 🏆 **Expert (250+):** Outstanding SOC analyst skills
- ⭐ **Proficient (200-249):** Strong analytical abilities
- ✅ **Competent (150-199):** Good understanding
- 📚 **Developing (100-149):** Needs improvement
- ❌ **Novice (<100):** Requires additional training

---

## Tips for Players 💡

1. **Read Raw Logs Carefully:** The log.original field contains critical clues
2. **Look for Patterns:** IPs, timestamps, and event sequences tell a story
3. **Use Hints Wisely:** Each hint costs 5 points
4. **False Positives:** Look for "backup", "intranet", "office365", low severity
5. **True Positives:** Focus on 192.168.1.10 (compromised host)
6. **Time Management:** 15 minutes = don't overthink simple questions
7. **MITRE Framework:** Know the attack stages (Initial Access → Impact)

---

## Common Mistakes to Avoid ⚠️

1. **Marking legitimate traffic as malicious** (backup systems, intranet)
2. **Missing the compromised host IP** (192.168.1.10 appears repeatedly)
3. **Wrong attack type** (it's ransomware, not just malware)
4. **Incomplete attack chain** (include ALL non-false-positive alerts)
5. **Using too many hints** (costs points!)

---

## Quick Reference: Alert Categories

### False Positives (Low Severity):
- DNS to intranet.portal.local
- DNS to backup.local
- DNS to office365.com
- Firewall ALLOW to intranet (192.168.1.60)
- Normal user logins
- Backup scanner (Priority 4 IDS)

### True Positives (High/Medium):
- C2 communication (203.0.113.99)
- Malicious DNS (c2.malware-cloud.com, evil-download.net, ransom-key-server.net)
- PowerShell execution
- Registry modifications
- SMB lateral movement (445)
- Shadow copy deletion
- File encryption/renames
- Failed authentication attempts (brute force)

---

**Good Luck! 🎮🔐**
