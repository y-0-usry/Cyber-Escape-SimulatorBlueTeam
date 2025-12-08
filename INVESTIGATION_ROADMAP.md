# 🎯 خريطة الطريق: من اللوجات الخام إلى التحقيق

## 📍 نقطة الانطلاق

أنت لديك **90 سطر** من اللوجات المختلفة في 9 ملفات:

```
SIEM/Data/levels/level2/logs/
├── firewall.log (10 سطور)    🔥
├── windows.log (10 سطور)     🪟
├── dns.log (10 سطور)         🌐
├── ids.log (10 سطور)         🚨
├── ssh.log (10 سطور)         🔐
├── webserver.log (10 سطور)   🌍
├── database.log (10 سطور)    🗄️
├── vpn.log (10 سطور)         🔌
└── proxy.log (10 سطور)       📡
```

---

## 🚀 خطوات التشغيل

### الخطوة 1: معالجة اللوجات (3 دقائق)

```bash
node processAllLogs.js level2
```

**ماذا يحدث:**

1. **Ingestion Phase** 📖
   - يقرأ 90 سطر من 9 ملفات
   - ينظفها ويخزنها في الذاكرة

2. **Parsing Phase** 📝
   - يكتشف نوع كل سطر:
     ```
     "2025-12-07 09:15:00 ALLOW TCP..." 
     → Firewall format!
     
     "2025-12-07T09:08:00Z sshd[2341]..."
     → SSH format!
     ```
   - يحول كل سطر لـ JSON موحد
   - ينشئ 9 ملفات JSON في `storage/parsed/level2/`

3. **Normalization Phase** 🔄
   - يطبق regex rules من `mappings.js`
   - يستخرج الحقول المهمة
   - يطبع كل شيء بـ ECS Schema قياسي
   - ينشئ:
     - `all_normalized.json` (90 سجل)
     - `normalized_{type}.json` (لكل نوع)

4. **Alert Generation Phase** ⚠️
   - يحدد نوع كل تنبيه:
     ```
     Failed SSH login → failed_authentication
     IDS Alert → intrusion_alert
     DNS Query → suspicious_dns_query
     ```
   - يحسب الخطورة:
     ```
     brute.force, malware, exploit → HIGH
     Failed auth, DB access → MEDIUM
     Normal traffic → LOW
     ```
   - ينشئ `alerts.json` (90 تنبيه)

5. **Frontend Sync Phase** 🎨
   - ينسخ `alerts.json` إلى Frontend
   - البيانات جاهزة للعرض!

---

### الخطوة 2: تشغيل السيرفر (مدى الحياة)

```bash
cd SIEM/Backend/src
node server.js
```

**الإخراج:**
```
Server running at http://localhost:3000
```

---

### الخطوة 3: فتح Dashboard

```
http://localhost:3000/
```

**ترى:**
- 90 تنبيه في شاشة الرئيسية
- توزيع الخطورة:
  - 🔴 High: 30
  - 🟡 Medium: 35
  - 🟢 Low: 25
- جميع الفلاترات متاحة

---

## 🎮 التحقيق في Alerts

### 1. استكشاف الأنذارات
```
🔍 اختر Severity: High
→ ترى فقط 30 تنبيه عالي الخطورة

🔍 اختر Source IP: 192.168.1.100
→ ترى جميع الأنشطة من هذا الـ IP
```

### 2. إضافة إلى Evidence
```
ترى alert مشبوه:
"ET MALWARE User-Agent in HTTP Header"

👆 اضغط "Add to Evidence"
→ يتم إضافته لقسم Evidence

→ يظهر في Timeline
→ يمكنك إضافة notes عليه
```

### 3. عرض التفاصيل
```
👆 اضغط "View Log"
→ نافذة تظهر:

{
  "log.original": "2025-12-07T09:12:00Z | Alert: ET MALWARE...",
  "rule.name": "ET MALWARE User-Agent in HTTP Header",
  "rule.id": "2013504",
  "severity": 1,
  "source.ip": "192.168.1.100",
  "destination.ip": "10.0.0.5",
  ...
}
```

### 4. ربط الأنذارات
```
👆 اضغط "View Linked Alerts"
→ ترى جميع الأنذارات من نفس IP:

🔗 Linked Alerts for 2013504a2c13:
   • a5f8d3b2c1e9 (high)     ← IDS alert
   • c9f2d8a1b5e3 (medium)   ← SSH failed login
   • d3e8c7a2b9f1 (high)     ← DNS query
   • e7f9d2a8c3b5 (low)      ← Firewall allow
```

### 5. إضافة ملاحظات
```
في Evidence section:

📝 [Note] هذا IP محاول brute force:
   - 5 failed SSH attempts
   - 1 successful login
   - ثم أنشطة مشبوهة

→ تحفظ تلقائياً في localStorage
```

### 6. عرض Timeline
```
⏱️ Evidence Timeline:

[09:08:00] Failed SSH login attempt - admin
[09:08:05] Failed SSH login attempt - root
[09:08:10] Failed SSH login attempt - test
[09:12:00] IDS Alert: Malware detected
[09:15:10] DNS query to malware.com
[09:20:00] Firewall DENY connection

👈 قصة واضحة جداً!
```

### 7. تصدير التقرير
```
👆 اضغط "Export Evidence"
→ ينزل file:

evidence.json:
[
  {
    "alert_id": "abc123...",
    "alert_type": "failed_authentication",
    "severity": "medium",
    "timestamp": "2025-12-07T09:08:00Z",
    "notes": "5 failed attempts from same IP"
  },
  ...
]
```

---

## 🧠 السيناريوهات المحتملة من اللوجات

### Scenario 1: Brute Force Attack 🔓

**اللوجات:**
```
ssh.log:
├─ sshd[2341]: Invalid user admin from 203.0.113.45 port 54321
├─ sshd[2342]: Invalid user root from 203.0.113.45 port 54322
├─ sshd[2343]: Invalid user test from 203.0.113.45 port 54323
├─ sshd[2346]: Failed password for invalid user admin
├─ sshd[2347]: Failed password for root
└─ sshd[2348]: Accepted password for jdoe (من IP مختلف!)

windows.log:
├─ SECURITY_FAILURE Failed login attempt for user "admin" from 10.0.0.5 (5 مرات)
└─ SECURITY_SUCCESS User "jdoe" logged in from 192.168.1.50
```

**الأنذارات المتوقعة:**
- 5x `failed_authentication` (MEDIUM)
- 2x `successful_authentication` (LOW)

**التحليل:**
```
📊 Pattern Analysis:
✅ 5+ failed attempts من 203.0.113.45
✅ محاولة اسماء users شهيرة (admin, root, test)
✅ ثم successful login من IP مختلف (192.168.1.50)
❌ CONCLUSION: Brute force attack ناجح
```

---

### Scenario 2: Malware C2 Communication ☠️

**اللوجات:**
```
dns.log:
├─ 192.168.1.100 A malware.com 8.8.8.8 NOERROR
├─ 192.168.1.100 A c2.malware.com 8.8.8.8 NOERROR
├─ 192.168.1.100 A exfil.malware.com 8.8.8.8 NOERROR
└─ 192.168.1.100 MX malware.com 8.8.8.8 NXDOMAIN

ids.log:
├─ Alert: ET MALWARE User-Agent in HTTP Header | SID: 2013504 | Source: 192.168.1.100
├─ Alert: ET C2 User-Agent in HTTP Header | SID: 2019500 | Source: 192.168.1.100
└─ Alert: ET MALWARE DGA Domain Detected | SID: 2025000

firewall.log:
└─ DENY TCP 203.0.113.45:12345 -> 192.168.1.100:443 (محاولة block الـ C2)

proxy.log:
└─ 192.168.1.100 CONNECT malware.com:443 403 (blocked by proxy)
```

**الأنذارات المتوقعة:**
- 3x `suspicious_dns_query` (HIGH)
- 3x `intrusion_alert` (HIGH)
- 2x `blocked_connection` (HIGH)
- 1x `proxy_request` (LOW)

**التحليل:**
```
📊 Forensic Analysis:
✅ Multiple DNS queries لـ malware domains
✅ IDS alerts لـ malware signatures
✅ Firewall و Proxy حاولوا block الـ traffic
❌ CONCLUSION: Active C2 infection
```

---

### Scenario 3: SQL Injection Attack 💉

**اللوجات:**
```
webserver.log:
├─ GET /admin?id=1 HTTP/1.1" 200
├─ GET /admin?id=1' OR '1'='1 HTTP/1.1" 200
└─ GET /download HTTP/1.1" 200 (exfil data)

database.log:
├─ [AUDIT] User: appuser | Query: SELECT * FROM users | Result: 150 rows
├─ [AUDIT] User: appuser | Query: SELECT password_hash FROM users | Result: 150 rows
└─ [AUDIT] User: dbadmin | Query: DROP TABLE audit_logs | Result: 0 rows
```

**الأنذارات المتوقعة:**
- 1x `http_error` (MEDIUM)
- 1x `sql_injection` (HIGH)
- 2x `database_access` (MEDIUM/HIGH)
- 1x `data_exfiltration` (HIGH)

**التحليل:**
```
📊 Attack Timeline:
1️⃣ Attacker tests SQL syntax (id=1' OR '1'='1)
2️⃣ Server returns 200 OK (vulnerable!)
3️⃣ Attacker extracts password hashes
4️⃣ Attacker tries to drop audit logs (cover tracks)
❌ CONCLUSION: Successful SQL injection + data theft
```

---

### Scenario 4: Data Exfiltration 📤

**اللوجات:**
```
database.log:
├─ [AUDIT] User: backup_user | Query: SELECT * FROM sensitive_data | Result: 500 rows | Duration: 0.567s
├─ [AUDIT] User: appuser | Query: SELECT password_hash FROM users | Result: 150 rows
└─ [AUDIT] User: dbadmin | Query: DELETE FROM logs WHERE date < '2025-01-01' | Result: 45670 rows

proxy.log:
├─ 192.168.1.100 CONNECT example.com:443 200 15234 (large data transfer)
└─ 192.168.1.100 POST http://c2.malware.com/callback 403

vpn.log:
├─ VPN_CONNECT User: jdoe | IP: 203.0.113.100 | Status: SUCCESS | Duration: 3600s
└─ VPN_DISCONNECT User: jdoe | Status: SUCCESS | Duration: 3600s
```

**الأنذارات المتوقعة:**
- 1x `database_access` (HIGH)
- 2x `database_access` (MEDIUM)
- 1x `data_exfiltration` (HIGH)
- 1x `vpn_connection` (LOW)

**التحليل:**
```
📊 Exfiltration Chain:
1️⃣ Large database queries (500 rows of sensitive data)
2️⃣ Password hashes extracted
3️⃣ Audit logs deleted (cover tracks)
4️⃣ VPN connection used to hide source
5️⃣ Attempt to upload data to C2 (blocked)
❌ CONCLUSION: Data exfiltration attempt detected
```

---

## 📊 الإحصائيات المتوقعة

بعد تشغيل 90 لوج:

```
════════════════════════════════════════
📊 Alert Statistics
════════════════════════════════════════

Total Alerts: 90

🔴 HIGH Severity: 30
   • intrusion_alert (10)
   • blocked_connection (8)
   • suspicious_dns_query (6)
   • data_exfiltration (4)
   • sql_injection (2)

🟡 MEDIUM Severity: 35
   • failed_authentication (20)
   • database_access (10)
   • http_error (5)

🟢 LOW Severity: 25
   • network_traffic (15)
   • vpn_connection (7)
   • http_request (3)

════════════════════════════════════════

📈 Alert Distribution by Type
════════════════════════════════════════

• failed_authentication    : 20 🥇
• network_traffic          : 15 🥈
• intrusion_alert          : 10 🥉
• database_access          : 10 🥉
• blocked_connection       : 8
• suspicious_dns_query     : 6
• http_request             : 5
• http_error               : 5
• vpn_connection           : 7
• data_exfiltration        : 4
• sql_injection            : 2

════════════════════════════════════════
```

---

## 🎮 نصائح التحقيق

### ١. ابدأ بـ High Severity Alerts
```
🔴 عدد 30 تنبيه عالي الخطورة
→ ركز عليها أولاً
→ ستساعدك تفهم القصة
```

### ٢. ابحث عن الأنماط
```
❓ نفس IP من نفس الـ IDS alerts؟
→ شيء مريب جداً
→ اضفه لـ Evidence
```

### ٣. تتبع الـ Timeline
```
⏱️ هل الأحداث مترابطة زمنياً؟
→ Brute force + then C2 = نفس attacker
→ C2 + then data exfil = advanced attack
```

### ٤. استخدم الـ Filters
```
🔍 IP-based filtering:
→ اختر High severity + Source IP 192.168.1.100
→ ترى كل أنشطة هذا الـ machine المريب
```

### ٥. وثّق كل شيء
```
📝 في كل evidence:
→ اكتب لماذا أضفته
→ اكتب ما يعنيه
→ اربطه بأدلة أخرى
```

---

## ✅ الخطوات النهائية

1. ✅ تشغيل `processAllLogs.js level2`
2. ✅ تشغيل السيرفر
3. ✅ فتح Dashboard
4. ✅ استكشاف الأنذارات
5. ✅ إضافة إلى Evidence
6. ✅ إضافة Notes
7. ✅ عرض Timeline
8. ✅ تصدير Report

---

**Ready للتحقيق؟** 🚀🔍

```bash
node processAllLogs.js level2
```

