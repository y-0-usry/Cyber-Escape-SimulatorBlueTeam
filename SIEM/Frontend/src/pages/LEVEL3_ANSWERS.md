# Level 3 Answer Key: Linux SSH Attack Investigation

## Overview
This document contains the complete answer key for Level 3 of the Cyber Escape Simulator. The investigation involves analyzing a Linux server breach initiated through SSH brute-force attack.

---

## Phase 1: Alert Triage Analysis

### Alert Classification Summary
- **Total Alerts:** 19
- **True Positives (TP):** 8 alerts (actual attack)
- **False Positives (FP):** 6 alerts (legitimate activity)
- **Failed External Attacks:** 5 alerts (blocked external attempts)

---

## Phase 1: Individual Alert Answers

### TRUE POSITIVES (TP) - Attack Chain

| Q# | Alert ID | Alert Type | Classification | Reason |
|---|---|---|---|---|
| Q1 | Alert-001 | SSH Success from 185.122.21.55 | **TP** | Successful login from external attacker IP (compromised access) |
| Q2 | Alert-007 | Privilege Escalation to Root | **TP** | Unauthorized sudo/su access by developer user (gaining control) |
| Q3 | Alert-011 | Malware Download via wget | **TP** | Suspicious file download from external server (payload acquisition) |
| Q4 | Alert-013 | Executable Modification (chmod +x) | **TP** | Making downloaded file executable (malware preparation) |
| Q5 | Alert-015 | Unauthorized Data Transfer via curl | **TP** | Exfiltration of stolen data to external destination |
| Q6 | Alert-018 | Suspicious Archive Operation (tar) | **TP** | Compression of logs/data for theft (data staging) |
| Q7 | Alert-003 | IDS Blocked SSH Attack | **TP** | Failed attack attempt from attacker IP (hostile activity indicator) |
| Q8 | Alert-009 | Network Anomaly Detected | **TP** | Unusual external communication pattern (attack behavior) |

### FALSE POSITIVES (FP) - Legitimate Activity

| Q# | Alert ID | Alert Type | Classification | Reason |
|---|---|---|---|---|
| Q9 | Alert-002 | SSH Admin Login from 192.168.1.100 | **FP** | Legitimate admin login from internal IP (expected behavior) |
| Q10 | Alert-008 | Sudo APT Update | **FP** | Normal system maintenance by administrator |
| Q11 | Alert-012 | Scheduled Backup Job (cron) | **FP** | Automated backup that runs on schedule (routine operation) |
| Q12 | Alert-017 | Normal Web Traffic | **FP** | Legitimate HTTP access (admin management interface) |

---

## Phase 1: Multi-Select Questions

### Q13: False Positive Alerts (Select ALL)
**Correct Answers:** 4 alerts
```
✅ Alert-002 (SSH Admin Login from 192.168.1.100)
✅ Alert-008 (Sudo APT Update)
✅ Alert-012 (Scheduled Backup)
✅ Alert-017 (Normal Web Traffic)
```

### Q14: Top 5 Priority Alerts
**Correct Priority Order:**
```
1. Alert-001 - SSH Success from 185.122.21.55 (Initial compromise)
2. Alert-007 - Privilege Escalation to Root (Gained root access)
3. Alert-011 - Malware Download via wget (Malicious payload)
4. Alert-015 - Unauthorized Data Transfer (Data stolen)
5. Alert-018 - Suspicious Archive (Evidence of staging)
```
**Reasoning:** These represent the complete attack chain from entry to impact

---

## Phase 1: Scenario Understanding Questions

### Q15: What is the attacker's likely objective?
**Correct Answer:** 
- To steal sensitive data from the Linux server
- OR: Gain root access and exfiltrate logs
- OR: Data theft and system compromise

**Why:** Multiple indicators point to data exfiltration (curl uploads, tar compression, archives)

### Q16: What is the relationship between these alerts?
**Correct Answer:**
- They form a complete attack chain
- Sequential stages of the same attack
- OR: Progression from initial access → privilege escalation → malware → data theft

**Why:** Alerts follow logical attack progression: SSH success → sudo escalation → malware → exfiltration

### Q17: Which MITRE ATT&CK technique is primary here?
**Correct Answer:** T1110 (Brute Force)
- **Secondary techniques:** T1548 (Privilege Escalation), T1105 (Ingress Transfer), T1030 (Data Transfer)

**Why:** Initial compromise occurs via SSH brute-force attack from 185.122.21.55

### Q18: What immediate actions should be taken?
**Correct Answer:** (Any of these)
- Block attacker IP 185.122.21.55 in firewall
- Disable SSH for compromised developer account
- Force password reset for all users
- Enable MFA for all SSH access
- Isolate the server from network

**Priority:** IP blocking + account disabling + server isolation

---

## Phase 2: Scenario Analysis Questions

### Q1: What is the Attack Vector?
**Answer:** SSH (Secure Shell)

### Q2: From which IP did the successful attack originate?
**Answer:** 185.122.21.55

### Q3: What command shows privilege escalation occurred?
**Answer:** 
- `sudo -u root`
- OR: `su -` (switching to root user)
- OR: Any reference to root execution

### Q4: How was malware delivered to the server?
**Answer:** wget

### Q5: What method was used to transfer data out?
**Answer:** 
- curl
- OR: HTTP POST upload

### Q6: Which user account was compromised?
**Answer:** developer

### Q7: What is the estimated time of compromise?
**Answer:** 2024-11-20 14:22:10 UTC (or the timestamp of first SSH success from 185.122.21.55)

### Q8: What should be your first mitigation step?
**Answer:**
- Block the attacker's IP 185.122.21.55
- OR: Disable SSH for developer account
- OR: Isolate the server

---

## Attack Chain Timeline

```
TIME PROGRESSION:
├─ 14:22:10 → SSH brute-force attempts begin
├─ 14:22:10 → Successful login from 185.122.21.55
├─ 14:23:45 → Privilege escalation to root
├─ 14:25:12 → Malware download via wget
├─ 14:26:30 → Malware execution (chmod +x)
├─ 14:28:15 → Data collection / compression
├─ 14:30:00 → Data exfiltration via curl
└─ 14:31:20 → Log cleanup / archiving
```

---

## Classification Logic Reference

### How to Identify TRUE POSITIVES
✓ Alerts from attacker IP (185.122.21.55)
✓ Successful SSH login followed by unauthorized actions
✓ Privilege escalation without admin authorization
✓ Malware download/execution patterns (wget, chmod +x, /tmp)
✓ Unauthorized data transfer (curl, tar to external IP)
✓ Failed attacks from attacker IP (still indicates threat)

### How to Identify FALSE POSITIVES
✓ Alerts from internal IPs (192.168.1.x)
✓ Legitimate admin operations (sudo apt, backup scripts)
✓ Scheduled/cron jobs (expected behavior)
✓ Normal application traffic (web server logs)
✓ Service accounts performing expected functions

### RED FLAGS (Attack Indicators)
🚩 SSH from external/unknown IP
🚩 Multiple SSH failures followed by success
🚩 Unexpected privilege escalation
🚩 Download + execute pattern
🚩 Outbound data transfer with compression
🚩 Timestamps correlated between events
🚩 New user creation or access changes

---

## Key Insights for Future Levels

### Prevention Strategies
1. **SSH Hardening:**
   - Disable password authentication (keys only)
   - Implement 2-factor authentication
   - Use SSH jump servers/bastion hosts
   - IP whitelisting for SSH access

2. **Detection Improvements:**
   - Monitor brute-force patterns (>5 failed attempts)
   - Alert on privilege escalation events
   - Track outbound connections from servers
   - Monitor uncommon process execution (wget, curl from root)

3. **Response Actions:**
   - Kill active SSH sessions from suspicious IPs
   - Force password reset for all accounts
   - Audit logs for data theft timeline
   - Restore from clean backups
   - Implement network segmentation

---

## Grading Rubric

### Phase 1: Alert Triage (100% accuracy required)
- Q1-Q12: 1 point each (correct TP/FP classification)
- Q13: 4 points (all FP alerts selected correctly)
- Q14: 5 points (correct top 5 priority order)
- Q15-Q18: 1 point each (scenario understanding)
- **Total: 20 points**

### Phase 2: Scenario Analysis (minimum 6/8 correct)
- Q1-Q8: 1 point each (factual answers about attack)
- **Total: 8 points**

### Phase 3: Incident Ticket (20 points)
- Evaluation: All required fields completed + reasonable assessment

**Final Score: 48 points maximum**

---

## Common Mistakes to Avoid

❌ **Mistake 1:** Marking legitimate admin SSH as FP
- Admin SSH from 192.168.1.100 is legitimate
- Only mark as TP if from 185.122.21.55

❌ **Mistake 2:** Ignoring failed attacks
- Failed attacks (Q7) are still attack indicators
- They show hostile intent from external IP

❌ **Mistake 3:** Not seeing the chain relationship
- Alerts are correlated by timestamp and user
- developer user appears in multiple TP alerts
- Timeline shows progression of attack

❌ **Mistake 4:** Confusing protocols
- SSH = brute-force attack vector
- HTTP/curl = data exfiltration method
- Both are part of same attack chain

❌ **Mistake 5:** Missing legitimate operations
- Scheduled backups (cron) are normal
- APT updates are expected
- System admin login is authorized

---

## Additional Resources

### MITRE ATT&CK Framework
- **T1110 - Brute Force:** Credential guessing for SSH
- **T1548 - Privilege Escalation:** Gaining root access
- **T1105 - Ingress Tool Transfer:** wget for malware delivery
- **T1059 - Command and Scripting Interpreter:** Executing malware
- **T1030 - Data Transfer Size Limits:** Large tar archive exfiltration

### Log Analysis Tips
- Look for user context (who ran what)
- Check source/destination IPs
- Note timestamps for correlation
- Identify processes spawned by unusual users
- Monitor for unusual outbound connections

---

**Answer Key Version:** 1.0  
**Last Updated:** 2024-11-20  
**Difficulty Level:** Intermediate  
**Average Completion Time:** 15-20 minutes
