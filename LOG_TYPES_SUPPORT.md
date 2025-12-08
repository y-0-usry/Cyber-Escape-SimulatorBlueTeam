# Log Types Support - شرح شامل

## 📊 أنواع اللوجات المدعومة

تم تحديث نظام SIEM ليدعم **9 أنواع لوجات مختلفة** بدلاً من نوعين فقط:

### 1️⃣ **Firewall Logs** 🔥
- **المصدر**: Firewalls, Network Security Appliances
- **الصيغة**: `2025-12-07 10:23:45 ALLOW TCP 192.168.1.100 10.0.0.50 443 443`
- **الحقول**: Timestamp, Action, Protocol, Source IP, Dest IP, Source Port, Dest Port
- **الكشف**: يبحث عن `ALLOW|DENY|DROP|REJECT` في البداية
- **الـ Mapping**: `firewall`

---

### 2️⃣ **Windows Event Logs** 🪟
- **المصدر**: Windows Systems, Active Directory
- **الصيغة**: `2025-12-07 12:32:11 SECURITY_SUCCESS User "Administrator" logged in from 192.168.1.10`
- **الحقول**: Timestamp, Event Type, User, Source IP, Action, Outcome
- **الكشف**: يبحث عن `SECURITY_SUCCESS|SECURITY_FAILURE|SECURITY_WARNING`
- **الـ Mapping**: `windows`

---

### 3️⃣ **DNS Logs** 🌐
- **المصدر**: DNS Servers, DNS Firewalls
- **الصيغة**: `2025-12-07 10:23:45 192.168.1.100 A malware.com 8.8.8.8 NOERROR 0.052`
- **الحقول**: Timestamp, Client IP, Query Type, Domain, Resolver IP, Response Code, Response Time
- **الكشف**: يبحث عن أنواع الـ DNS Queries: `A|AAAA|MX|CNAME|TXT|NS`
- **الـ Mapping**: `dns`

---

### 4️⃣ **IDS/IPS Alerts** 🚨
- **المصدر**: Suricata, Snort, Zeek
- **الصيغة**: `2025-12-07T10:23:45Z | Alert: ET MALWARE User-Agent in HTTP Header | SID: 2013504 | Source: 192.168.1.100 | Dest: 10.0.0.5 | Priority: 1`
- **الحقول**: Timestamp, Alert Name, SID, Source IP, Dest IP, Priority
- **الكشف**: يبحث عن `Alert:|SID:|Priority:`
- **الـ Mapping**: `ids`

---

### 5️⃣ **SSH/System Authentication Logs** 🔐
- **المصدر**: SSH Servers, Linux Systems, PAM
- **الصيغة**: `2025-12-07T10:23:45Z sshd[12345]: Invalid user admin from 203.0.113.45 port 54321`
- **الحقول**: Timestamp, Process Name, PID, Message, User, Source IP, Port
- **الكشف**: يبحث عن `sshd[|authentication failure|invalid user|failed password`
- **الـ Mapping**: `ssh`

---

### 6️⃣ **Web Server Logs** 🌍
- **المصدر**: Apache, Nginx, IIS
- **الصيغة**: `192.168.1.100 - - [07/Dec/2025:10:23:45 +0000] "GET /admin HTTP/1.1" 401 523 "-" "Mozilla/5.0"`
- **الحقول**: Client IP, Timestamp, HTTP Method, URI, HTTP Version, Status Code, Response Size, User-Agent
- **الكشف**: يبحث عن نمط `[date]` و `HTTP/d.d`
- **الـ Mapping**: `web_server`

---

### 7️⃣ **Database Logs** 🗄️
- **المصدر**: MySQL, PostgreSQL, Oracle, SQL Server
- **الصيغة**: `2025-12-07 10:23:45 [AUDIT] User: dbadmin | Query: SELECT * FROM users WHERE id=1 OR 1=1 | Result: 1523 rows | Duration: 0.234s`
- **الحقول**: Timestamp, Audit Level, User, Query, Rows Returned, Execution Time
- **الكشف**: يبحث عن `[AUDIT]|[QUERY]|SELECT|INSERT|UPDATE|DELETE`
- **الـ Mapping**: `database`

---

### 8️⃣ **VPN Logs** 🔌
- **المصدر**: OpenVPN, IPSec, Cisco AnyConnect
- **الصيغة**: `2025-12-07T10:23:45Z VPN_CONNECT User: jdoe | IP: 203.0.113.100 | Protocol: OpenVPN | Status: SUCCESS | Duration: 3600s`
- **الحقول**: Timestamp, Event Type, Username, Client IP, Protocol, Status, Session Duration
- **الكشف**: يبحث عن `VPN_CONNECT|VPN_DISCONNECT|OpenVPN|IPSec`
- **الـ Mapping**: `vpn`

---

### 9️⃣ **Proxy Logs** 📡
- **المصدر**: Squid, Microsoft Forefront, Blue Coat
- **الصيغة**: `2025-12-07 10:23:45 192.168.1.100 CONNECT example.com:443 200 15234 "-" "Mozilla/5.0" 0.523`
- **الحقول**: Timestamp, Client IP, Method, Destination, Status Code, Bytes Transferred, User-Agent, Response Time
- **الكشف**: يبحث عن `CONNECT|GET|POST|HEAD|PUT|DELETE` + حقول Status
- **الـ Mapping**: `proxy`

---

## 🔄 تدفق المعالجة (Pipeline)

```
Raw Log File (.log)
        ↓
[Ingestion] readLogFiles()
        ↓
Log Lines (filename, line)
        ↓
[Parser - detectFormat()]
├─→ Firewall format?  → parseFirewall()
├─→ Windows format?   → parseWindows()
├─→ DNS format?       → parseDns()
├─→ IDS format?       → parseIds()
├─→ SSH format?       → parseSsh()
├─→ Web Server format?→ parseWebServer()
├─→ Database format?  → parseDatabase()
├─→ VPN format?       → parseVpn()
├─→ Proxy format?     → parseProxy()
└─→ CSV format?       → parseCsv()
        ↓
Parsed JSON (unified schema)
        ↓
[Normalizer - detectSourceType()]
        ↓
Applied Mapping (firewall, windows, dns, ids, ssh, web_server, database, vpn, proxy)
        ↓
ECS Normalized Schema
        ↓
[Alert Generator]
├─→ determineAlertType() - نوع التنبيه
├─→ determineSeverity() - درجة الخطورة
└─→ alerts.json
        ↓
Frontend Display (Script.js)
        ↓
User Interaction (Investigation)
```

---

## 🎯 Alert Types (أنواع التنبيهات)

```
| Event Category | Alert Type |
|---|---|
| Authentication | failed_authentication / successful_authentication |
| Network | blocked_connection / network_traffic / suspicious_dns_query / vpn_connection |
| Intrusion Detection | intrusion_alert |
| Database | database_access |
| Web | http_error / http_request |
```

---

## 📊 Severity Levels (درجات الخطورة)

```
High:   برute force, SQL injection, malware, ransomware, exploit, unauthorized, privilege escalation, critical
Medium: Failed authentication, Database access, 401 HTTP errors
Low:    Other logs
```

---

## ✅ الملفات المحدثة

1. ✅ **`parser.js`** - أضفنا 7 parsers جديدة
2. ✅ **`mappings.js`** - أضفنا 7 mappings جديدة
3. ✅ **`normalizer.js`** - حدثنا `detectSourceType()` لكل الأنواع
4. ✅ **`alertGenerator.js`** - أضفنا `determineAlertType()` و `determineSeverity()`

---

## 🚀 الخطوة التالية

الآن بتقدر:
1. ✅ تضيف ملفات لوج من أي نوع من الأنواع التسعة
2. ✅ النظام يكتشفها تلقائياً ويحللها
3. ✅ ينتج Alerts ذات severity صحيحة
4. ✅ تستخدمها لإنشاء سيناريوهات ستاتيكية

---

**جاهز للخطوة الجاية؟** 🎮
