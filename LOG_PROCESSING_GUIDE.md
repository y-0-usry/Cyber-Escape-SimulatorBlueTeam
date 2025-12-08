# 🎮 SIEM Log Processing Pipeline - دليل التشغيل

## 📋 نظرة عامة

هذا الدليل يشرح كيفية تشغيل عملية معالجة اللوجات الشاملة التي تأخذ الملفات الخام وتحولها إلى تنبيهات تفاعلية في الـ Frontend.

---

## 🏗️ البنية العامة للعملية

```
Raw Log Files (9 أنواع مختلفة)
    ↓
📖 [Ingestion] قراءة الملفات
    ↓
📝 [Parser] اكتشاف النوع وتحويل لـ JSON
    ↓
🔄 [Normalizer] تطبيع بـ ECS Schema
    ↓
⚠️  [Alert Generator] إنشاء Alerts ذات severity
    ↓
🎨 [Frontend] عرض تفاعلي
    ↓
🎮 User Interaction (Investigation)
```

---

## 📁 ملفات اللوجات

تقع جميع ملفات اللوجات في:
```
SIEM/Data/levels/level2/logs/
├── firewall.log       (🔥 Network traffic)
├── windows.log        (🪟 Windows security events)
├── dns.log           (🌐 DNS queries)
├── ids.log           (🚨 IDS/IPS alerts)
├── ssh.log           (🔐 SSH authentication)
├── webserver.log     (🌍 Web server access)
├── database.log      (🗄️  Database operations)
├── vpn.log           (🔌 VPN connections)
└── proxy.log         (📡 Proxy traffic)
```

### أمثلة اللوجات:

#### Firewall Log
```
2025-12-07 09:15:00 ALLOW TCP 192.168.1.100:54321 -> 8.8.8.8:53
```

#### DNS Log
```
2025-12-07 09:10:00 192.168.1.100 A malware.com 8.8.8.8 NOERROR 0.052
```

#### SSH Log
```
2025-12-07T09:08:00Z sshd[2341]: Invalid user admin from 203.0.113.45 port 54321
```

#### IDS Alert
```
2025-12-07T09:12:00Z | Alert: ET MALWARE User-Agent in HTTP Header | SID: 2013504 | Source: 192.168.1.100 | Dest: 10.0.0.5 | Priority: 1
```

---

## 🚀 كيفية التشغيل

### الطريقة 1: معالجة level واحد

```bash
node processAllLogs.js level2
```

### الطريقة 2: معالجة جميع الـ levels

```bash
node processAllLogs.js all
```

### الطريقة 3: استخدام الـ default (level2)

```bash
node processAllLogs.js
```

---

## 📊 ما يحدث عند التشغيل

### Step 1: Ingestion 📖
- يقرأ جميع ملفات `.log` من المجلد
- يتخطى الأسطر الفارغة
- يرسل كل سطر للـ Parser

**الإخراج:**
```
✅ تم العثور على 9 ملفات لوج:
   • firewall.log
   • windows.log
   • dns.log
   • ids.log
   • ssh.log
   • webserver.log
   • database.log
   • vpn.log
   • proxy.log
```

### Step 2: Parsing 📝
- يكتشف نوع كل سطر تلقائياً
- يحول الـ raw text إلى JSON موحد
- يخزن النتائج في `storage/parsed/{level}/`

**الإخراج:**
```
✅ إجمالي الـ logs المحللة: 90
```

**مثال من البيانات:**
```json
{
  "@timestamp": "2025-12-07 09:15:00",
  "event": { "action": "allow", "type": "network_traffic" },
  "source": { "ip": "192.168.1.100", "port": 54321 },
  "destination": { "ip": "8.8.8.8", "port": 53 },
  "raw": "2025-12-07 09:15:00 ALLOW TCP 192.168.1.100:54321 -> 8.8.8.8:53"
}
```

### Step 3: Normalization 🔄
- يطبق الـ Mapping rules (Regex patterns)
- يحول البيانات إلى ECS Schema قياسي
- يخزن النتائج في `storage/normalized/{level}/all_normalized.json`

**الإخراج:**
```json
{
  "log.original": "2025-12-07 09:15:00 ALLOW TCP 192.168.1.100:54321 -> 8.8.8.8:53",
  "@timestamp": "2025-12-07T09:15:00.000Z",
  "observer.type": "firewall",
  "event.category": "network",
  "event.action": "allow",
  "network.protocol": "TCP",
  "source.ip": "192.168.1.100",
  "source.port": 54321,
  "destination.ip": "8.8.8.8",
  "destination.port": 53
}
```

### Step 4: Alert Generation ⚠️
- يحدد نوع كل التنبيه (authentication, intrusion, etc)
- يحسب درجة الخطورة (High/Medium/Low)
- ينشئ `alerts.json` للـ Frontend

**الإحصائيات:**
```
📊 إحصائيات الأنذارات:
   🔴 High:   25
   🟡 Medium: 35
   🟢 Low:    30

📋 أنواع التنبيهات:
   • network_traffic: 15
   • failed_authentication: 20
   • intrusion_alert: 10
   • dns_query: 12
   • database_access: 8
```

### Step 5: Frontend Preparation 🎨
- ينسخ `alerts.json` إلى Frontend
- يضعها في `SIEM/Frontend/src/pages/data/{level}/alerts.json`
- جاهزة للعرض الفوري!

**الإخراج:**
```
✅ تم نسخ الـ alerts إلى Frontend
   📍 SIEM/Frontend/src/pages/data/level2/alerts.json
```

---

## 🎮 استخدام البيانات في الـ Frontend

بعد تشغيل `processAllLogs.js`، يمكنك:

1. **تشغيل السيرفر:**
```bash
cd SIEM/Backend/src
node server.js
```

2. **فتح الـ Dashboard:**
```
http://localhost:3000/
```

3. **اختيار Level:**
```
Select: level2
```

4. **رؤية الـ Alerts:**
```
✅ 90 alerts محملة وجاهزة للتحليل
```

---

## 📊 أنواع الأنذارات والـ Severity

### Alert Types

| Event | Alert Type | Severity |
|-------|-----------|----------|
| Firewall DENY | blocked_connection | High |
| Failed SSH Login | failed_authentication | Medium |
| Brute Force (5+ failed) | brute_force_attack | High |
| SQL Injection Pattern | sql_injection | High |
| Suspicious DNS Query | suspicious_dns_query | High |
| IDS Alert Priority 1 | intrusion_alert | High |
| Database DELETE | data_exfiltration | High |
| VPN Connection | vpn_connection | Low |
| Normal HTTP 200 | http_request | Low |

### Severity Calculation

```javascript
if (raw.match(/brute.force|sql.injection|malware|ransomware|exploit/i)) {
  severity = 'high';
} else if (eventCategory === 'authentication' && outcome === 'failure') {
  severity = 'medium';
} else {
  severity = 'low';
}
```

---

## 🔧 التعديلات والإضافات

### إضافة لوج جديد
1. أضف السطر في ملف `.log` المناسب
2. شغل `processAllLogs.js` مرة أخرى
3. سيتم اكتشافه تلقائياً!

### إضافة نوع لوج جديد
1. أضف Parser في `parser.js`
2. أضف Mapping في `mappings.js`
3. حدّث `detectSourceType()` في `normalizer.js`
4. الـ system سيتكيف تلقائياً

### تغيير قواعس Severity
عدّل `determineSeverity()` في `alertGenerator.js`

---

## 📈 أمثلة سيناريوهات

### Scenario 1: Brute Force Attack
```
SSH logs
├─ sshd[2341]: Invalid user admin from 203.0.113.45 port 54321
├─ sshd[2342]: Invalid user root from 203.0.113.45 port 54322
├─ sshd[2343]: Invalid user test from 203.0.113.45 port 54323
└─ sshd[2347]: Failed password for root from 203.0.113.45 port 54327

Alert Type: failed_authentication
Severity: MEDIUM (5+ failures)
```

### Scenario 2: Malware Command & Control
```
DNS logs
├─ 2025-12-07 09:10:00 192.168.1.100 A malware.com
├─ 2025-12-07 09:10:05 192.168.1.100 A c2.malware.com
└─ 2025-12-07 09:10:10 192.168.1.100 A exfil.malware.com

IDS logs
└─ Alert: ET MALWARE User-Agent in HTTP Header | SID: 2013504

Alert Type: intrusion_alert
Severity: HIGH
```

### Scenario 3: SQL Injection Attack
```
Web Server logs
├─ 192.168.1.100 - - [07/Dec/2025:09:05:15] "GET /admin?id=1' OR '1'='1" 200

Database logs
└─ [AUDIT] User: appuser | Query: SELECT * FROM users WHERE id=1' OR '1'='1

Alert Type: sql_injection
Severity: HIGH
```

---

## 🐛 استكشاف الأخطاء

### المشكلة: لا توجد ملفات لوج
**الحل:** تأكد من وجود الملفات في:
```
SIEM/Data/levels/level2/logs/*.log
```

### المشكلة: خطأ في الـ Parsing
**الحل:** تحقق من صيغة اللوج، استخدم الأمثلة المعطاة

### المشكلة: لا توجد Alerts
**الحل:** تأكد من أن الـ logs صحيح والـ normalizer يعمل

---

## 📝 ملفات المخرجات

بعد التشغيل، سيتم إنشاء:

```
SIEM/
├── Backend/src/core/
│   ├── parser/storage/parsed/level2/
│   │   ├── firewall.json
│   │   ├── windows.json
│   │   ├── dns.json
│   │   ├── ids.json
│   │   ├── ssh.json
│   │   ├── webserver.json
│   │   ├── database.json
│   │   ├── vpn.json
│   │   └── proxy.json
│   │
│   ├── normalization/storage/normalized/level2/
│   │   ├── all_normalized.json
│   │   ├── normalized_firewall.json
│   │   ├── normalized_windows.json
│   │   ├── normalized_dns.json
│   │   └── ... (باقي الأنواع)
│   │
│   └── Alert Generator/storage/level2/
│       └── alerts.json
│
└── Frontend/src/pages/data/level2/
    └── alerts.json (📍 نسخة مرئية في Frontend)
```

---

## ✅ Checklist التشغيل

- [ ] جميع ملفات `.log` موجودة في `levels/level2/logs/`
- [ ] تم تشغيل `processAllLogs.js`
- [ ] تم ظهور الـ logs بنجاح
- [ ] تم إنشاء `all_normalized.json`
- [ ] تم إنشاء `alerts.json`
- [ ] تم نسخ البيانات إلى Frontend
- [ ] Server يعمل على port 3000
- [ ] Dashboard يعرض الـ alerts

---

## 🎯 الخطوة التالية

بعد تشغيل العملية بنجاح:

1. ✅ اختبر الـ Filters في Dashboard
2. ✅ أضف الـ alerts إلى Evidence
3. ✅ أضف ملاحظات (Notes)
4. ✅ اعرض الـ Linked Log
5. ✅ export Evidence كـ JSON

---

**جاهز للـ investigation؟** 🚀
