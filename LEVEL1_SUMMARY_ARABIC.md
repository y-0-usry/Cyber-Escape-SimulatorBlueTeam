# ملخص Level 1 - دليل شامل للفريق 📚

## 🎯 نظرة عامة على Level 1

**Level 1** هو أول مستوى في لعبة Cyber Escape Simulator، وهو محاكاة واقعية لهجوم Ransomware على شركة صغيرة. اللاعب يلعب دور **محلل SOC** يجب عليه تحليل التنبيهات (alerts) وتحديد الهجوم وإنشاء تذكرة حادثة.

---

## 📖 السيناريو الكامل

### القصة:
أنت محلل أمن سيبراني في شركة "TechCorp Solutions". في صباح يوم 5 سبتمبر 2025 الساعة 12:30 ظهراً، تلقيت إشعاراً عاجلاً من فريق IT:

> **"ملفات على الشبكة يتم تشفيرها! المستخدمون لا يستطيعون الوصول لملفاتهم!"**

مهمتك هي:
1. **تحليل 79 alert** من SIEM
2. **تحديد التنبيهات الحقيقية من الخاطئة**
3. **تصنيف كل تنبيه حسب MITRE ATT&CK**
4. **تحديد نوع الهجوم وطريقة الاختراق**
5. **إنشاء تذكرة incident** احترافية
6. **كل ذلك في 15 دقيقة!**

---

## 🔍 التفاصيل التقنية للهجوم

### نوع الهجوم: **Ransomware Attack**

### الجدول الزمني الكامل للهجوم:

#### 📅 **المرحلة 1: الأنشطة الطبيعية (08:00 - 09:00)**
```
08:00 - تسجيل دخول المسؤول (Administrator) - عادي
08:30 - تسجيل دخول المستخدم (Mohamed) - عادي
09:00 - تسجيل دخول موظف (jsmith) - عادي
```

#### 🚨 **المرحلة 2: Initial Access & Execution (09:10 - 09:30)**
```
09:10 - محاولات Brute Force فاشلة
       من IP: 10.0.0.5
       محاولات تسجيل دخول: guest, admin, root
       
09:15 - 🔴 بداية الهجوم الفعلي
       • اتصال C2 Beacon مع: 203.0.113.99:443
       • تنفيذ PowerShell مشبوه (jsmith)
       • DNS queries مشبوهة:
         - c2.malware-cloud.com
         - powershell.update-check.com
       • تعديل Registry لـ Persistence
       
09:30 - 🔴 تنفيذ أوامر مشفرة (Encoded Commands)
       • PowerShell يستخدم Base64 encoding
       • إنشاء عمليات مشبوهة (Suspicious Process Spawning)
```

#### 🔄 **المرحلة 3: Lateral Movement (09:45 - 10:15)**
```
09:45 - انتقال جانبي عبر SMB (Port 445)
       الجهاز المخترق: 192.168.1.10
       ينتقل إلى: 192.168.1.200
       
10:00 - انتقال لجهاز ثاني
       ينتقل إلى: 192.168.1.201
       
10:15 - انتقال لجهاز ثالث
       ينتقل إلى: 192.168.1.202
```

#### 💣 **المرحلة 4: Impact (11:00 - 12:30)**
```
11:00 - تغييرات في نظام الملفات
       • DNS query لـ: ransom-key-server.net
       
11:30 - بداية تشفير الملفات
       • إعادة تسمية جماعية للملفات
       • تغيير امتدادات الملفات
       
12:00 - حذف Shadow Copies (لمنع الاستعادة)
       • vssadmin delete shadows /all /quiet
       • DNS query لـ: payment-gateway-ransom.com
       
12:30 - 🚨 اكتشاف الهجوم!
       • تشفير جماعي للملفات (Mass File Encryption)
       • IT Team يبلغ عن المشكلة
```

---

## 🎮 مراحل اللعبة

### **Phase 1: General Triage Questions (14 سؤال)**

#### السؤال 1: تحديد False Positives
**نص السؤال:**
> "Enter ALL False Positive alert IDs (comma-separated)"

**المطلوب:** إدخال IDs لجميع التنبيهات الخاطئة

**كيفية التحديد:**
1. **Low Severity Network Traffic** - حركة مرور عادية ذات خطورة منخفضة
2. **Backup Systems** - IP: 192.168.1.50 (نظام الباكاب)
3. **Intranet Access** - IP: 192.168.1.60 (شبكة داخلية)
4. **Office365 Traffic** - IP: 172.16.0.15 (حركة مشروعة)
5. **Priority 4 IDS Alerts** - تنبيهات معلوماتية فقط (ET INFO)

**مثال للإجابة:**
```
68ba198d2dc4, b553a7fabc3f, a2a4458c66de, 6a2a0725a1d0, 533e1037f626, f3796c9420db
```

**نظام التقييم:**
- يُقبل 70% دقة (لا يلزم كل الـ IDs)
- 10 نقاط

**الكود المسؤول:**
```javascript
function isFalsePositive(alert) {
  const raw = alert.linked_log?.['log.original'] || '';
  if (alert.severity === 'low' && alert.alert_type === 'network_traffic') return true;
  if (alert.source_ip === '192.168.1.50' || alert.source_ip === '192.168.1.60') return true;
  if (/backup|intranet|office365/i.test(raw)) return true;
  if (/Priority 4|ET INFO/i.test(raw)) return true;
  return false;
}
```

---

#### الأسئلة 2-10: تصنيف MITRE ATT&CK (9 أسئلة)

لكل alert من التنبيهات العالية/المتوسطة، حدد التكتيك المناسب:

##### **السؤال 2: PowerShell Execution Alert**
**مثال Alert:**
```
"PowerShell execution detected: Invoke-Expression with encoded commands"
```

**الإجابة:** `malicious_script`

**التفسير:**
- PowerShell مع أوامر مشفرة (Encoded) هو علامة على تنفيذ سكريبت خبيث
- يستخدم المهاجمون PowerShell لتنفيذ payloads
- يستخدم Invoke-Expression لتشغيل الكود

**الكود المسؤول:**
```javascript
if (/PowerShell|Invoke|Encoded|script|process.*spawned/i.test(raw)) {
  correctType = 'malicious_script';
}
```

---

##### **السؤال 3: SMB/Port 445 Alert**
**مثال Alert:**
```
"SMB authentication attempt to 192.168.1.200 on port 445"
```

**الإجابة:** `lateral_movement`

**التفسير:**
- SMB (Server Message Block) يُستخدم لمشاركة الملفات في Windows
- Port 445 هو المنفذ المعروف لـ SMB
- المهاجم ينتقل من جهاز مخترق (192.168.1.10) إلى أجهزة أخرى
- هذا هو **Lateral Movement** - الانتقال الجانبي داخل الشبكة

**الكود المسؤول:**
```javascript
if (/SMB|445|Lateral|Authentication.*Attempt|File.*Transfer/i.test(raw)) {
  correctType = 'lateral_movement';
}
```

---

##### **السؤال 4: C2 Communication Alert**
**مثال Alert:**
```
"Ransomware beacon detected to 203.0.113.99:443 - c2.malware-cloud.com"
```

**الإجابة:** `c2_communication`

**التفسير:**
- C2 = Command & Control (خادم التحكم)
- Beacon = إشارة دورية للاتصال بالمهاجم
- المالوير يتصل بخادم خارجي لتلقي الأوامر
- Domain مشبوه: malware-cloud.com

**الكود المسؤول:**
```javascript
if (/Ransomware|Beacon|C2|malware-cloud/i.test(raw)) {
  correctType = 'c2_communication';
}
```

---

##### **السؤال 5: Registry Modification Alert**
**مثال Alert:**
```
"Registry modification: HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce"
```

**الإجابة:** `persistence`

**التفسير:**
- Registry هو قاعدة بيانات Windows للإعدادات
- RunOnce = تشغيل تلقائي عند بدء النظام
- المهاجم يضمن بقاء المالوير حتى بعد إعادة التشغيل
- هذا هو **Persistence** - الثبات في النظام

**الكود المسؤول:**
```javascript
if (/Registry|Persistence|RunOnce/i.test(raw)) {
  correctType = 'persistence';
}
```

---

##### **السؤال 6: Shadow Copy Deletion Alert**
**مثال Alert:**
```
"Shadow copy deletion detected: vssadmin delete shadows /all /quiet"
```

**الإجابة:** `defense_evasion`

**التفسير:**
- Shadow Copies = نسخ احتياطية تلقائية في Windows
- vssadmin = أداة لإدارة النسخ الاحتياطية
- حذف Shadow Copies يمنع استعادة الملفات
- هذا هو **Defense Evasion** - التهرب من وسائل الدفاع

**الكود المسؤول:**
```javascript
if (/Shadow.*copy|Shadow.*Deletion|Delete/i.test(raw)) {
  correctType = 'defense_evasion';
}
```

---

##### **السؤال 7: File Encryption Alert**
**مثال Alert:**
```
"Mass file encryption activity: 500+ files renamed with .encrypted extension"
```

**الإجابة:** `impact`

**التفسير:**
- تشفير جماعي للملفات = المرحلة النهائية من Ransomware
- تغيير امتدادات الملفات (.encrypted, .locked, .ransom)
- هذا هو **Impact** - التأثير المباشر على المنظمة
- DNS queries لخوادم الفدية (ransom-key-server.net)

**الكود المسؤول:**
```javascript
if (/Encryption|Rename|File.*Extension|bulk.*file|mass.*file.*encryption|ransom.*key|payment.*gateway/i.test(raw)) {
  correctType = 'impact';
}
```

---

##### **السؤال 8: Failed Login Alert**
**مثال Alert:**
```
"Failed login attempt: user 'guest' from 10.0.0.5 - brute force detected"
```

**الإجابة:** `credential_access`

**التفسير:**
- محاولات تسجيل دخول فاشلة متعددة
- Brute Force = تجربة كلمات مرور كثيرة
- هذا هو **Credential Access** - محاولة الحصول على بيانات الدخول

**الكود المسؤول:**
```javascript
if (/Failed.*login|brute.*force|authentication.*failed/i.test(raw)) {
  correctType = 'credential_access';
}
```

---

#### السؤال 11: Compromised Host IP
**نص السؤال:**
> "What is the primary compromised host IP address?"

**الإجابة:** `192.168.1.10`

**كيفية التحديد:**
1. نبحث عن IP الذي يظهر أكثر في التنبيهات الخطيرة
2. نفلتر التنبيهات لـ Internal IPs (192.168.1.x)
3. نعد تكرار كل IP

**الكود المسؤول:**
```javascript
const primaryHost = tp.reduce((acc, a) => {
  const ip = a.source_ip || '';
  if (ip.startsWith('192.168.1.')) {
    acc[ip] = (acc[ip] || 0) + 1;
  }
  return acc;
}, {});
const mostFrequent = Object.entries(primaryHost)
  .sort((a, b) => b[1] - a[1])[0]?.[0] || '192.168.1.10';
```

**10 نقاط**

---

#### السؤال 12: إجراء PowerShell
**نص السؤال:**
> "Recommended action for suspicious PowerShell execution alert?"

**الخيارات:**
- Ignore - False Positive
- Monitor Only
- Investigate Further
- **Isolate Host Immediately** ✅

**الإجابة الصحيحة:** `isolate`

**التفسير:**
- PowerShell مع encoded commands خطير جداً
- يجب عزل الجهاز فوراً من الشبكة
- منع انتشار المالوير لأجهزة أخرى

**10 نقاط**

---

#### السؤال 13: إجراء SMB Lateral Movement
**نص السؤال:**
> "Recommended action for SMB lateral movement alert?"

**الخيارات:**
- Allow - Legitimate Traffic
- Monitor Only
- Block SMB Port
- **Isolate All Affected Hosts** ✅

**الإجابة الصحيحة:** `isolate_all`

**التفسير:**
- Lateral Movement يعني أن المهاجم موجود في الشبكة
- يجب عزل جميع الأجهزة المتأثرة
- منع انتشار الهجوم لأجهزة أخرى

**10 نقاط**

---

#### السؤال 14: إجراء File Encryption
**نص السؤال:**
> "Recommended action for mass file encryption activity?"

**الخيارات:**
- Restore from Backup Only
- Reboot System
- **Isolate Network Immediately** ✅
- Continue Monitoring

**الإجابة الصحيحة:** `isolate`

**التفسير:**
- تشفير الملفات = المرحلة النهائية من Ransomware
- يجب عزل الشبكة فوراً
- منع تشفير المزيد من الملفات
- ثم التفكير في الاستعادة من Backup

**10 نقاط**

---

### **Phase 2: Scenario Investigation (4 أسئلة)**

#### السؤال 1: نوع الهجوم
**نص السؤال:**
> "Based on all collected evidence, what type of attack occurred? (One or two words)"

**الإجابة المقبولة:** `ransomware` أو `crypto` أو `encrypt`

**الأدلة:**
1. ✅ تشفير جماعي للملفات
2. ✅ حذف Shadow Copies
3. ✅ إعادة تسمية الملفات بامتدادات جديدة
4. ✅ DNS query لـ ransom-key-server.net
5. ✅ DNS query لـ payment-gateway-ransom.com
6. ✅ C2 communication
7. ✅ Lateral movement

**Pattern Matching:**
```javascript
if (/(ransomware|crypto|encrypt)/i.test(value)) {
  isCorrect = true;
}
```

**20 نقطة**

---

#### السؤال 2: طريقة الاختراق الأولية
**نص السؤال:**
> "What was the most likely initial attack vector? (One or two words)"

**الإجابة المقبولة:** `phishing` أو `email` أو `malicious attachment` أو `spear phishing`

**التفسير:**
- معظم هجمات Ransomware تبدأ بـ Phishing Email
- البريد الإلكتروني يحتوي على مرفق خبيث (Malicious Attachment)
- الموظف يفتح المرفق → تنزيل المالوير
- في السيناريو: المستخدم jsmith فتح المرفق الساعة 09:00

**Pattern Matching:**
```javascript
if (/(phishing|email|malicious.*attachment|spear.*phishing)/i.test(value)) {
  isCorrect = true;
}
```

**20 نقطة**

---

#### السؤال 3: Alert IDs للهجوم الرئيسي
**نص السؤال:**
> "Enter ALL alert IDs that are part of the main attack chain (comma-separated)"

**الإجابة:** جميع IDs للتنبيهات الحقيقية (True Positives)

**المطلوب:**
- استبعاد False Positives من السؤال 1
- إدخال جميع IDs المتبقية
- عادة 30-40 alert ID

**التحديد:**
```javascript
const tp = alerts.filter(a => !isFalsePositive(a) && a.severity !== 'low');
const answer = tp.map(a => a.alert_id).sort().join(',');
```

**نظام التقييم:**
- يُقبل 80% دقة
- 20 نقطة

---

#### السؤال 4: مرحلة اكتشاف الهجوم
**نص السؤال:**
> "At what stage of the attack was the incident detected?"

**الخيارات:**
- Initial Access (Early Detection)
- Execution Phase
- Lateral Movement
- **Impact Phase (Files Being Encrypted)** ✅

**الإجابة الصحيحة:** `impact`

**التفسير:**
- الإشعار جاء الساعة 12:30: "الملفات يتم تشفيرها"
- هذا يعني أننا في مرحلة **Impact**
- المرحلة الأخيرة والأخطر
- للأسف: اكتشاف متأخر (Late Detection)

**20 نقطة**

---

### **Phase 3: Incident Ticket Creation**

#### المطلوب:
إنشاء تذكرة حادثة احترافية تحتوي على:

1. **Title (العنوان):**
   ```
   مثال: "Ransomware Attack - Mass File Encryption Detected"
   ```

2. **Priority (الأولوية):**
   - **Critical** ✅ (لأنه ransomware)

3. **Attack Type (نوع الهجوم):**
   ```
   Ransomware
   ```

4. **Summary (الملخص):**
   يجب أن يتضمن:
   - وقت الاكتشاف
   - الجهاز المخترق (192.168.1.10)
   - نوع الهجوم
   - الإجراءات المتخذة
   - الأجهزة المتأثرة

**مثال Summary:**
```
At 12:30 on September 5, 2025, mass file encryption was detected across 
multiple workstations. Primary compromised host identified as 192.168.1.10 
(user: jsmith). Attack characteristics include:

- C2 communication with malware-cloud.com
- PowerShell execution with encoded commands
- SMB lateral movement to 192.168.1.200, .201, .202
- Shadow copy deletion via vssadmin
- Mass file encryption with ransomware extensions
- DNS queries to ransom payment servers

Immediate actions:
1. Isolated affected hosts from network
2. Blocked C2 communication
3. Preserved forensic evidence
4. Initiated backup restoration procedures

Attack timeline: 09:15-12:30 (Initial access to impact)
Estimated impact: 3-4 workstations compromised
```

**نقاط التذكرة:** 50 نقطة

---

## 💯 نظام التقييم الكامل

### النقاط الأساسية:
| المرحلة | عدد الأسئلة | نقاط لكل سؤال | المجموع |
|---------|-------------|---------------|----------|
| Phase 1 (Triage) | 14 | 10 | 140 |
| Phase 2 (Investigation) | 4 | 20 | 80 |
| Ticket Creation | 1 | 50 | 50 |
| **المجموع الأساسي** | | | **270** |

### المكافآت والعقوبات:

#### ✅ **Speed Bonus (مكافأة السرعة)**
```
المكافأة = (الدقائق المتبقية) × 5 نقاط
```

**مثال:**
- انتهيت في 10 دقائق
- الوقت المتبقي = 5 دقائق
- المكافأة = 5 × 5 = **+25 نقطة**

---

#### ❌ **Hint Penalty (عقوبة التلميحات)**
```
العقوبة = (عدد التلميحات) × 5 نقاط
```

**مثال:**
- استخدمت 3 تلميحات
- العقوبة = 3 × 5 = **-15 نقطة**

**ملاحظة:** يمكن الحصول على Free Hints من المستويات السابقة

---

#### ⏰ **Time Extension Penalty (عقوبة تمديد الوقت)**
```
التمديد الأول: -5 نقاط
التمديد الثاني: -10 نقاط إضافية (-15 تراكمي)
التمديد الثالث: -20 نقطة إضافية (-35 تراكمي)
```

**الحد الأقصى:** 3 تمديدات (كل تمديد = +5 دقائق)

---

#### 🔥 **Impact Penalty (عقوبة التأثير)**
```
العقوبة = (مستوى التأثير) ÷ 2
```

- يبدأ Impact Level من 0%
- يزيد 10% كل دقيقتين
- الحد الأقصى: 100% (عقوبة -50 نقطة)

**مثال:**
- Impact Level وصل لـ 80%
- العقوبة = 80 ÷ 2 = **-40 نقطة**

---

### حساب النقاط النهائية:
```javascript
Final Score = Base Points + Speed Bonus - Hint Penalty - Time Extension Penalty - Impact Penalty

مثال:
= 270 (أسئلة) + 25 (سرعة) - 15 (تلميحات) - 5 (تمديد واحد) - 40 (تأثير)
= 235 نقطة
```

---

### تقييم الأداء:

| النقاط | التقييم | الوصف | المكافأة |
|--------|---------|--------|----------|
| 250+ | 🏆 **Expert** | محلل SOC ممتاز | 3 free hints للمستوى التالي |
| 200-249 | ⭐ **Proficient** | قدرات تحليلية قوية | 2 free hints |
| 150-199 | ✅ **Competent** | فهم جيد | 1 free hint |
| 100-149 | 📚 **Developing** | يحتاج تحسين | 0 hints |
| <100 | ❌ **Novice** | يحتاج تدريب إضافي | 0 hints |

---

## 🛠️ التفاصيل التقنية للتنفيذ

### 1️⃣ معالجة اللوجز (Log Processing)

**الملف:** `SIEM/Backend/src/processAllLogs.js`

**الخطوات:**
```javascript
// 1. قراءة الملفات الخام
const rawLogs = fs.readdirSync('SIEM/Data/levels/level1/logs/');

// 2. Parsing - تحويل النصوص لـ JSON
const parsedLogs = parser.parseLogs(rawContent, logType);

// 3. Normalization - توحيد الصيغة
const normalizedLogs = normalizer.normalize(parsedLogs, logType);

// 4. Alert Generation - إنشاء التنبيهات
const alerts = alertGenerator.generateAlerts(normalizedLogs);

// 5. حفظ النتائج
fs.writeFileSync('alerts.json', JSON.stringify(alerts, null, 2));
```

**تشغيل المعالجة:**
```powershell
cd SIEM/Backend/src
node processAllLogs.js level1
```

**النتيجة:**
- ملف `alerts.json` يحتوي على 79 alert
- كل alert له structure موحد
- يتم نسخه إلى Frontend

---

### 2️⃣ Alert Structure

كل alert يحتوي على:

```json
{
  "alert_id": "5284108be3a0",           // معرف فريد
  "alert_type": "network_traffic",      // نوع التنبيه
  "severity": "low",                     // الخطورة: low/medium/high/critical
  "timestamp": "2025-09-05T09:30:01Z",  // وقت الحدث
  "source_ip": "192.168.1.10",          // IP المصدر
  "destination_ip": "8.8.8.8",          // IP الوجهة
  "event_action": "allow",               // الإجراء: allow/deny/block
  "event_type": "network_traffic",       // نوع الحدث
  "user_name": "jsmith",                 // اسم المستخدم
  "linked_log": {                        // اللوج الأصلي
    "log.original": "...",               // النص الخام
    "@timestamp": "...",
    "observer.type": "firewall",
    "event.category": "network",
    "source.ip": "192.168.1.10",
    ...
  }
}
```

---

### 3️⃣ Game Logic (منطق اللعبة)

**الملف:** `SIEM/Frontend/src/pages/level1.js`

#### Global State (الحالة العامة):
```javascript
let alerts = [];           // جميع التنبيهات
let score = 0;             // النقاط
let hintsUsed = 0;         // التلميحات المستخدمة
let freeHints = 0;         // تلميحات مجانية
let attempts = 3;          // عدد المحاولات
let timerSeconds = 900;    // 15 دقيقة
let correctAnswers = 0;    // الإجابات الصحيحة
let totalQuestions = 0;    // مجموع الأسئلة
let timeExtensions = 0;    // تمديدات الوقت
let impactLevel = 0;       // مستوى التأثير (0-100)
```

#### Timer System (نظام التوقيت):
```javascript
function startTimer() {
  timerId = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    
    if (timerSeconds <= 0) {
      clearInterval(timerId);
      alert('⏰ Time expired! Attack succeeded.');
      handleReset();
    }
  }, 1000);
  
  // Progressive Impact System
  impactInterval = setInterval(() => {
    impactLevel = Math.min(100, impactLevel + 10);
    updateImpactDisplay();
    if (impactLevel >= 80) showImpactWarning();
  }, 120000); // كل دقيقتين
}
```

#### False Positive Detection:
```javascript
function isFalsePositive(alert) {
  const raw = alert.linked_log?.['log.original'] || '';
  
  // Low severity routine traffic
  if (alert.severity === 'low' && 
      alert.alert_type === 'network_traffic') return true;
  
  // Backup/intranet systems
  if (alert.source_ip === '192.168.1.50' || 
      alert.source_ip === '192.168.1.60') return true;
  
  // Known safe patterns
  if (/backup|intranet|office365/i.test(raw)) return true;
  
  // Priority 4 IDS alerts
  if (/Priority 4|ET INFO/i.test(raw)) return true;
  
  return false;
}
```

#### Question Evaluation:
```javascript
function evaluateGeneralQuestions() {
  const cards = document.querySelectorAll('[data-qid]');
  let correct = 0;
  
  cards.forEach(card => {
    const input = card.querySelector('.answer-input');
    const value = input.value.trim().toLowerCase();
    const correctAnswer = card.dataset.answer.toLowerCase();
    
    let isCorrect = false;
    
    // Q1: False Positives - 70% accuracy
    if (card.dataset.qid === 'q-fp-ids') {
      const userIds = value.split(',').map(s => s.trim()).sort();
      const correctIds = correctAnswer.split(',').map(s => s.trim()).sort();
      const overlap = userIds.filter(id => correctIds.includes(id)).length;
      const minRequired = Math.ceil(correctIds.length * 0.7);
      isCorrect = overlap >= minRequired;
    }
    // Other questions...
    else {
      isCorrect = value === correctAnswer;
    }
    
    if (isCorrect) {
      correct++;
      score += 10;
      card.classList.add('border-green-500');
    } else {
      card.classList.add('border-red-500');
    }
  });
  
  updateScore();
}
```

---

### 4️⃣ Frontend Structure

**ملفات HTML:**
- `Level1.html` - صفحة اللعبة الرئيسية
- `AnswerKey.html` - صفحة شرح الإجابات

**المكونات:**
1. **Intro Section** - مقدمة السيناريو
2. **Questions Section** - Phase 1 (14 سؤال)
3. **Scenario Section** - Phase 2 (4 أسئلة)
4. **Ticket Section** - إنشاء التذكرة
5. **Final Section** - النتائج النهائية

**Styling:**
- Tailwind CSS للتنسيق
- Font Awesome للأيقونات
- Canvas للرسوم البيانية

---

### 5️⃣ Server Configuration

**الملف:** `SIEM/Backend/src/server.js`

```javascript
// Routes
app.get('/level1', (req, res) => {
  res.sendFile(path.join(__dirname, '../../Frontend/src/pages/Level1.html'));
});

app.get('/AnswerKey.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../Frontend/src/pages/AnswerKey.html'));
});

app.get('/api/alerts/level1', (req, res) => {
  const alerts = JSON.parse(fs.readFileSync('data/level1/alerts.json'));
  res.json(alerts);
});
```

**تشغيل السيرفر:**
```powershell
cd SIEM/Backend/src
node server.js
# Server at http://localhost:3000
```

---

## 🎓 نصائح للتقديم والمذاكرة

### للاعبين:

1. **اقرأ السيناريو جيداً قبل البدء**
   - افهم القصة
   - حدد الهدف
   - لاحظ الوقت المحدد

2. **ابدأ بالسهل أولاً**
   - حدد False Positives بسرعة
   - ركز على الأنماط الواضحة

3. **استخدم التلميحات بحكمة**
   - كل تلميح = -5 نقاط
   - استخدمها للأسئلة الصعبة فقط

4. **راقب الوقت**
   - 15 دقيقة تمر بسرعة
   - يمكن إضافة وقت (مع عقوبة)

5. **كن دقيقاً في التصنيف**
   - افهم MITRE ATT&CK جيداً
   - اقرأ log.original بعناية

---

### للمقدمين:

#### **1. شرح المشكلة التي يحلها المشروع:**
```
في الواقع العملي، محللو SOC يواجهون مئات التنبيهات يومياً.
مشروعنا يوفر بيئة تدريب آمنة لتطوير مهارات:
- Triage (فرز التنبيهات)
- Incident Response (الاستجابة للحوادث)
- MITRE ATT&CK Framework
- Time Management تحت الضغط
```

#### **2. التقنيات المستخدمة:**
- **Backend:** Node.js + Express
- **Frontend:** HTML5 + JavaScript + Tailwind CSS
- **Data Processing:** Custom Log Parsers & Normalizers
- **Alert Generation:** Rule-based Engine
- **Game Logic:** State Management + Timer System

#### **3. النقاط القوية:**
- ✅ سيناريو واقعي (Ransomware)
- ✅ بيانات حقيقية (79 alerts)
- ✅ نظام تقييم ذكي
- ✅ Progressive difficulty
- ✅ Reward system
- ✅ شرح تفصيلي للإجابات

#### **4. الـ Demo:**
1. **عرض السيناريو** (30 ثانية)
2. **تشغيل اللعبة** (2-3 دقائق)
3. **شرح Phase 1** (1 دقيقة)
4. **شرح Phase 2** (1 دقيقة)
5. **عرض النتائج والتقييم** (1 دقيقة)
6. **فتح Answer Key** (1 دقيقة)

#### **5. الأسئلة المتوقعة:**

**Q: كيف تم توليد البيانات؟**
```
A: كتبنا log parsers لـ 5 أنواع logs:
   - Windows Event Logs
   - Firewall Logs
   - IDS/IPS Alerts
   - DNS Queries
   - File System Events
   
   ثم Normalizer يوحد الصيغة، وAlert Generator يطبق قواعد
   لاكتشاف الأنماط المشبوهة.
```

**Q: كيف يتم التقييم؟**
```
A: نظام نقاط متعدد المستويات:
   - Base Points للإجابات الصحيحة
   - Speed Bonus للسرعة
   - Penalties للتلميحات والوقت الإضافي
   - Impact Penalty يزيد مع الوقت
```

**Q: ما الفرق بينكم وبين CTF عادي؟**
```
A: نحن نركز على:
   - Real-world scenarios (ليس puzzles فقط)
   - SOC analyst skills بالتحديد
   - Progressive learning (من سهل لصعب)
   - Immediate feedback مع شرح
   - Gamification (نقاط، مكافآت، تحديات)
```

**Q: هل يمكن إضافة مستويات جديدة؟**
```
A: نعم! النظام modular:
   1. أضف logs جديدة في SIEM/Data/levels/level2/
   2. شغل processAllLogs.js level2
   3. انسخ الـ template من Level1.html
   4. عدّل الأسئلة حسب السيناريو الجديد
```

---

## 📊 الإحصائيات

### Level 1 Metrics:
- **عدد الـ Alerts:** 79
- **False Positives:** ~6-8
- **True Positives:** ~71-73
- **عدد الأسئلة:** 18
- **الوقت المحدد:** 15 دقيقة
- **Maximum Score:** 270 + bonuses
- **Minimum Passing:** 150
- **Average Completion Time:** 12-14 دقيقة

### Attack Metrics:
- **Attack Duration:** 3 ساعات 45 دقيقة (09:15 - 12:30)
- **Compromised Hosts:** 4 (192.168.1.10, .200, .201, .202)
- **C2 Domains:** 2 (malware-cloud.com, ransom-key-server.net)
- **MITRE Tactics Used:** 8
  1. Initial Access (Phishing)
  2. Execution (PowerShell)
  3. Persistence (Registry)
  4. Defense Evasion (Shadow Copy Deletion)
  5. Credential Access (Brute Force)
  6. Lateral Movement (SMB)
  7. Command & Control (C2 Beacons)
  8. Impact (File Encryption)

---

## 🔐 الخلاصة

**Level 1** هو محاكاة شاملة لهجوم Ransomware حقيقي، مصمم لتدريب محللي SOC على:

1. **Triage Skills** - فرز التنبيهات بسرعة
2. **Pattern Recognition** - التعرف على الأنماط المشبوهة
3. **MITRE ATT&CK** - تصنيف التكتيكات
4. **Incident Response** - الاستجابة السريعة
5. **Time Management** - العمل تحت الضغط
6. **Documentation** - توثيق الحوادث

**النتيجة:** محلل SOC مدرب يستطيع التعامل مع سيناريوهات حقيقية باحترافية.

---

## 📚 مصادر إضافية

### للتعلم الذاتي:
1. **MITRE ATT&CK Framework:** https://attack.mitre.org/
2. **Ransomware Response Guide:** NIST SP 1800-11
3. **SOC Analyst Training:** Splunk, ELK Stack tutorials
4. **Incident Response:** SANS PICERL methodology

### للتطوير:
1. **Node.js Documentation:** https://nodejs.org/docs
2. **Express.js Guide:** https://expressjs.com/
3. **Tailwind CSS:** https://tailwindcss.com/docs
4. **Canvas API:** MDN Web Docs

---

**🎮 Good Luck with Level 1!**
**🚀 استخدم هذا الملخص للمذاكرة والتحضير للتقديم!**

---

*آخر تحديث: ديسمبر 2025*
*إعداد: فريق Cyber Escape Simulator*
