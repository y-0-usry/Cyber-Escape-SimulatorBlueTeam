# Level 2: Insider Threat - Data Exfiltration - سيناريو تفصيلي كامل

## 📋 نظرة عامة على السيناريو

**نوع الهجوم:** Insider Threat - Data Exfiltration  
**التاريخ:** 15 يناير 2024  
**الوقت:** من 07:00 صباحاً حتى 22:45 مساءً  
**المهاجم الداخلي:** Sarah Mitchell (User: sarah.mitchell)  
**الجهاز المستخدم:** 192.168.1.45  
**عدد الـ Alerts الكلي:** 105 alert  
- **94 Low Severity** (False Positives - Normal Operations)
- **9 Medium Severity** (Normal Database/Network Activity)
- **2 High Severity** (True Positive - Data Exfiltration Attempts)

---

## 🎯 السيناريو التفصيلي

### الخلفية: من هي Sarah Mitchell؟

**الوظيفة:** Software Developer  
**القسم:** IT Development Team  
**مستوى الصلاحيات:**
- وصول عادي للـ source code repositories
- وصول للـ development databases
- **لا يجب** أن يكون لها وصول للـ:
  - Customer data
  - Financial records
  - HR databases
  - Proprietary algorithms

**الدافع:**
Sarah قدمت استقالتها قبل أسبوعين وستنضم لشركة منافسة. تريد أخذ معها:
1. Source code proprietary
2. بيانات العملاء
3. خوارزميات الشركة
4. قواعد بيانات كاملة

---

### المرحلة الأولى: Normal Work Day (07:00 - 14:00)

#### ما حدث:
Sarah بدأت يومها بشكل طبيعي - عمل على المشاريع العادية وqueries عادية للـ database.

#### أمثلة على النشاط العادي (False Positives):

**Alert ID: fadc5dc04a78**
```json
{
  "alert_id": "fadc5dc04a78",
  "alert_type": "database_access",
  "severity": "medium",
  "timestamp": "2024-01-15T07:05:44.000Z",
  "log": "[QUERY] User:jennifer.adams Query:SELECT * FROM employees"
}
```
**التفسير:** موظفة أخرى (Jennifer Adams) تعمل query عادي على جدول employees - **FALSE POSITIVE**.

**Alert ID: 185027192c3a**
```json
{
  "log": "[QUERY] User:webapp_service Query:SELECT * FROM users WHERE id=12345"
}
```
**التفسير:** Web application service account يعمل query عادي - **FALSE POSITIVE**.

---

### المرحلة الثانية: Repository Access (14:00 - 15:00)

#### ما حدث:
Sarah بدأت تدخل على repositories ليس لها علاقة بعملها الحالي.

**Alert ID: (متوسط) - Git Access**
```json
{
  "alert_type": "file_access",
  "user_name": "sarah.mitchell",
  "action": "git clone proprietary-algorithm-repo",
  "timestamp": "2024-01-15T14:32:00.000Z"
}
```
**التفسير:**
- Sarah عملت clone لـ repository يحتوي على خوارزميات proprietary
- هذا الـ repo ليس جزء من مشاريعها الحالية
- **Red Flag #1** - لكنه قد يبدو عادياً للـ SOC

---

### المرحلة الثالثة: Data Collection (15:00 - 15:45)

#### ما حدث:
Sarah بدأت تجمع بيانات من قواعد البيانات باستخدام صلاحياتها.

**سلسلة من Database Queries:**

**Query 1: Customer Data**
```sql
SELECT customer_id, name, email, phone, address, credit_card 
FROM customers 
WHERE created_date > '2023-01-01'
```
**التفسير:** استعلام عن بيانات 10,000+ عميل - **مشبوه لكن لها صلاحيات**.

**Query 2: Financial Records**
```sql
SELECT * FROM transactions 
WHERE amount > 1000 
ORDER BY transaction_date DESC
```
**التفسير:** استعلام عن معاملات مالية كبيرة.

**Query 3: Proprietary Code**
```sql
SELECT algorithm_name, source_code, parameters 
FROM ml_algorithms 
WHERE classification='proprietary'
```
**التفسير:** استعلام عن الخوارزميات السرية للشركة.

---

### المرحلة الرابعة: Data Archiving (15:45 - 15:48)

#### ما حدث:
Sarah بدأت تجمع البيانات في ملفات مضغوطة (ZIP/TAR) للتحضير للتسريب.

**Evidence:**
```
15:45:30 - Created: customers_export_2024.zip (245 MB)
15:46:12 - Created: financial_data_Q4.tar.gz (189 MB)
15:47:22 - Created: proprietary_algorithms.zip (78 MB)
15:48:00 - Created: source_code_backup.tar.gz (1.2 GB)
```

**Total Size:** ~1.7 GB من البيانات الحساسة

**MITRE ATT&CK Technique:**
- **T1560 - Archive Collected Data**
- **T1005 - Data from Local System**

---

### المرحلة الخامسة: Exfiltration Attempt #1 - Google Drive (15:48)

#### ما حدث:
Sarah حاولت رفع البيانات على Google Drive الشخصي لها.

**Alert ID: ef323b67839b** ⚠️ **HIGH SEVERITY - TRUE POSITIVE**
```json
{
  "alert_id": "ef323b67839b",
  "alert_type": "intrusion_alert",
  "severity": "high",
  "timestamp": "2024-01-15T15:48:12.000Z",
  "source_ip": "192.168.1.45",
  "destination": "drive.google.com",
  "user_name": "sarah.mitchell",
  "linked_log": {
    "log.original": "2024-01-15T15:48:12Z Alert: DLP Block - Google Drive Upload SID:50001 Priority:1 192.168.1.45 -> drive.google.com Blocked sensitive data upload",
    "rule.name": "DLP Block - Google Drive Upload",
    "rule.id": "50001",
    "severity": 1,
    "action": "blocked"
  }
}
```

**التفسير التفصيلي:**

**ما الذي حدث بالضبط؟**
1. Sarah فتحت Google Drive الشخصي لها
2. حاولت رفع customers_export_2024.zip (245 MB)
3. **DLP (Data Loss Prevention) System** اكتشف محاولة الرفع
4. النظام فحص محتوى الملف ووجد:
   - أرقام بطاقات ائتمان
   - بيانات شخصية (PII)
   - معلومات مالية حساسة
5. **تم حظر الرفع تلقائياً** 🛡️

**MITRE ATT&CK Techniques:**
- **T1567 - Exfiltration Over Web Service**
- **T1567.002 - Exfiltration to Cloud Storage**
- **T1078 - Valid Accounts** (استخدمت حسابها الشرعي)

**لماذا هذا True Positive وليس False Positive؟**
1. ✅ **صلاحيات صحيحة** - Sarah لها حساب شرعي
2. ✅ **لا توجد malware** - استخدمت أدوات عادية (Web Browser)
3. ❌ **نشاط غير طبيعي** - المطورين لا يرفعون بيانات عملاء على Google Drive الشخصي
4. ❌ **خرق السياسات** - DLP policy منعت التسريب
5. ❌ **حجم كبير** - 245 MB من البيانات الحساسة

**مقارنة مع False Positive:**
```
❌ False Positive Example:
   "Employee يرفع presentation على Google Drive الشركة"
   
✅ True Positive (Sarah's Case):
   "Employee ترفع 245 MB customer data على Google Drive الشخصي"
```

---

### المرحلة السادسة: Failed Exfiltration - تغيير الاستراتيجية (15:48 - 22:00)

#### ما حدث:
بعد فشل محاولة Google Drive، Sarah:
1. انتظرت عدة ساعات (لتجنب الشك)
2. حاولت طرق بديلة خلال الوقت

**محاولات فاشلة (تم حظرها جميعاً):**
- OneDrive upload
- Dropbox sync
- Email attachment (حجم كبير جداً)
- FTP upload إلى server خارجي

---

### المرحلة السابعة: Exfiltration Attempt #2 - USB Device (22:43)

#### ما حدث:
في نهاية اليوم وبعد أن غادر معظم الموظفين، Sarah جربت طريقة أخرى - USB flash drive.

**Alert ID: facfe8c487ee** ⚠️ **HIGH SEVERITY - TRUE POSITIVE**
```json
{
  "alert_id": "facfe8c487ee",
  "alert_type": "intrusion_alert",
  "severity": "high",
  "timestamp": "2024-01-15T22:43:08.000Z",
  "source_ip": "192.168.1.45",
  "user_name": "sarah.mitchell",
  "linked_log": {
    "log.original": "2024-01-15T22:43:08Z Alert: DLP Block - USB Copy SID:50002 Priority:1 192.168.1.45 USB copy blocked sensitive patterns",
    "rule.name": "DLP Block - USB Copy",
    "rule.id": "50002",
    "severity": 1,
    "action": "blocked"
  }
}
```

**التفصيل الكامل:**

**ما الذي حدث؟**
1. Sarah أدخلت USB flash drive (32 GB) في جهازها
2. حاولت نسخ الملفات المضغوطة:
   - customers_export_2024.zip
   - financial_data_Q4.tar.gz
   - proprietary_algorithms.zip
3. **DLP System** اكتشف:
   - Device غير مصرح به
   - محاولة نسخ ملفات حساسة
   - Patterns تطابق customer data و financial records
4. **تم حظر النسخ تلقائياً** 🛡️
5. تم إرسال alert للـ Security Team

**MITRE ATT&CK Techniques:**
- **T1052 - Exfiltration Over Physical Medium**
- **T1052.001 - Exfiltration over USB**
- **T1078 - Valid Accounts**

**لماذا تم الكشف؟**
1. **DLP USB Monitoring** - كل USB device يتم فحصه
2. **Content Inspection** - الملفات تم تحليلها قبل السماح بالنسخ
3. **Pattern Matching:**
   - أرقام بطاقات ائتمان (Regex: `\d{4}-\d{4}-\d{4}-\d{4}`)
   - أرقام ضمان اجتماعي (SSN patterns)
   - Email patterns من قاعدة بيانات العملاء
4. **Behavioral Analysis:**
   - الوقت غير طبيعي (22:43 - بعد ساعات العمل)
   - حجم البيانات كبير
   - User profile: استقالة حديثة

---

## 🔍 تحليل False Positives (النشاط العادي)

### 1. Normal Database Queries (94 Low Severity Alerts)

**أمثلة:**

**Alert: Database Access - Web Application**
```json
{
  "user": "webapp_service",
  "query": "SELECT * FROM users WHERE id=12345",
  "severity": "medium"
}
```
**التفسير:** Service account للـ web application - **نشاط طبيعي 100%**.

**Alert: Database Access - HR Department**
```json
{
  "user": "jennifer.adams",
  "query": "SELECT * FROM employees",
  "severity": "medium"
}
```
**التفسير:** موظفة HR تعمل query على جدول الموظفين - **جزء من عملها**.

**Alert: Database Backup**
```json
{
  "user": "backup_service",
  "query": "BACKUP DATABASE TO /backups/",
  "severity": "medium"
}
```
**التفصيل:** نظام الـ backup الآلي - **scheduled job عادي**.

---

### 2. Normal Network Traffic (Low Severity)

**أمثلة:**

**Alert: VPN Connection**
```json
{
  "user": "john.smith",
  "action": "VPN login",
  "source_ip": "203.0.113.50"
}
```
**التفسير:** موظف يسجل دخول من المنزل عبر VPN - **عادي**.

**Alert: DNS Query**
```json
{
  "source": "192.168.1.30",
  "query": "api.github.com",
  "response": "NOERROR"
}
```
**التفسير:** مطور يدخل على GitHub - **جزء من العمل**.

---

### 3. Failed External Attacks (Low Severity - Blocked)

**Alert: Port Scan Attempt**
```json
{
  "source_ip": "185.220.101.50",
  "action": "Port scan",
  "status": "BLOCKED"
}
```
**التفسير:** محاولة Port scan من IP خارجي **تم حظرها** - **False Positive**.

**Alert: SQL Injection Attempt**
```json
{
  "source_ip": "203.0.113.99",
  "payload": "' OR 1=1--",
  "status": "BLOCKED by WAF"
}
```
**التفسير:** محاولة SQL injection **فشلت** - **False Positive**.

---

## 📊 Timeline الكامل للهجوم

```
07:00 ────► يوم عمل عادي
   │         └─► Database queries طبيعية
   │
14:00 ────► بداية النشاط المشبوه
   │         └─► Repository access غير طبيعي
   │
15:00 ────► Data Collection
   │         ├─► Customer data queries
   │         ├─► Financial records queries
   │         └─► Proprietary code queries
   │
15:45 ────► Data Archiving
   │         ├─► customers_export_2024.zip (245 MB)
   │         ├─► financial_data_Q4.tar.gz (189 MB)
   │         ├─► proprietary_algorithms.zip (78 MB)
   │         └─► source_code_backup.tar.gz (1.2 GB)
   │
15:48 ────► ⚠️ Exfiltration Attempt #1
   │         ├─► Google Drive upload
   │         └─► ❌ BLOCKED by DLP!
   │
16:00-22:00 ► محاولات فاشلة أخرى
   │         ├─► OneDrive - BLOCKED
   │         ├─► Dropbox - BLOCKED
   │         └─► Email - BLOCKED
   │
22:43 ────► ⚠️ Exfiltration Attempt #2
   │         ├─► USB device insertion
   │         └─► ❌ BLOCKED by DLP!
   │
22:45 ────► Security Team Notification
            └─► Investigation بدأ
```

---

## 🎓 الأسئلة والإجابات التفصيلية

### Phase 1: Alert Triage (18 أسئلة)

#### Q1-Q12: تصنيف Alerts (True Positive vs False Positive)

**مثال - Alert عن Sarah:**
```json
{
  "alert_id": "ef323b67839b",
  "rule.name": "DLP Block - Google Drive Upload",
  "user": "sarah.mitchell"
}
```

**السؤال:** هل هذا True Positive أم False Positive؟

**الإجابة:** `True Positive` (Malicious)

**التفسير:**
✅ **علامات True Positive:**
1. محاولة رفع 245 MB من بيانات العملاء
2. Google Drive **شخصي** (ليس الشركة)
3. خرق لـ DLP policy
4. Behavioral anomaly (خارج نطاق عملها)
5. Context: استقالة حديثة

❌ **ليس False Positive لأن:**
- ليس نشاط عادي للمطورين
- حجم البيانات كبير جداً
- محتوى حساس (PII, credit cards)
- destination غير مصرح به

---

#### Q13: Multi-Select False Positives

**السؤال:** اختر جميع الـ False Positives (اختر كل ما ينطبق)

**الخيارات:**
```
[ ] Alert: DLP Block - Google Drive (Sarah)
[✓] Alert: Database backup - scheduled job
[✓] Alert: VPN login - john.smith from home
[ ] Alert: DLP Block - USB Copy (Sarah)
[✓] Alert: DNS query - api.github.com
[✓] Alert: Port scan attempt - BLOCKED
[✓] Alert: Normal web traffic - office365.com
[✓] Alert: Database query - webapp_service
```

**الإجابة الصحيحة:**
```
Database backup, VPN login, DNS query, Port scan (blocked), 
Normal web traffic, Database query (service account)
```

**التفسير لكل واحد:**

**✅ Database Backup:**
- Scheduled job آلي
- يحدث يومياً في نفس الوقت
- Service account مخصص
- **FALSE POSITIVE**

**✅ VPN Login:**
- موظف يعمل من المنزل
- سياسة الشركة تسمح بـ Remote Work
- Authentication نجح
- **FALSE POSITIVE**

**❌ DLP Block (Sarah):**
- محاولة تسريب بيانات
- تم حظرها لكنها **محاولة حقيقية**
- **TRUE POSITIVE**

**✅ DNS Query (GitHub):**
- مطور يدخل على GitHub للعمل
- جزء طبيعي من Development workflow
- **FALSE POSITIVE**

**✅ Port Scan (Blocked):**
- محاولة هجوم خارجية
- **تم حظرها بنجاح**
- لا توجد أي compromise
- **FALSE POSITIVE** (لأنها فشلت)

---

#### Q14: Top 5 Priority Alerts

**السؤال:** اختر أهم 5 alerts للتحقيق الفوري

**الخيارات:**
```
[✓] DLP Block - Google Drive Upload (Sarah)
[✓] DLP Block - USB Copy (Sarah)
[✓] Git Clone - Proprietary Repository (Sarah)
[✓] Large Data Export - Customer Database
[✓] Archive Created - Multiple Files (Sarah)
[ ] Database Backup - Scheduled Job
[ ] VPN Login - Remote User
[ ] Normal Web Traffic
```

**الإجابة:**
```
1. DLP Block - Google Drive Upload
2. DLP Block - USB Copy
3. Git Clone - Proprietary Repository
4. Large Data Export - Customer Database
5. Archive Created - Multiple Files
```

**التفسير - لماذا كل واحد priority؟**

**#1 - DLP Block (Google Drive):**
- **Severity:** Critical
- **Impact:** محاولة تسريب 245 MB customer data
- **Urgency:** High - محاولة نشطة
- **Action:** تحقيق فوري مع Sarah

**#2 - DLP Block (USB):**
- **Severity:** Critical
- **Impact:** محاولة ثانية للتسريب
- **Pattern:** Persistent attacker
- **Action:** عزل Sarah's account فوراً

**#3 - Git Clone (Proprietary Repo):**
- **Severity:** High
- **Impact:** Source code theft
- **Context:** Repo ليس من مشاريع Sarah
- **Action:** مراجعة Git logs

**#4 - Large Data Export:**
- **Severity:** High
- **Impact:** 10,000+ customer records
- **Indicators:** Query غير طبيعي للموظف
- **Action:** Database audit trail review

**#5 - Archive Creation:**
- **Severity:** Medium-High
- **Impact:** Data staging للتسريب
- **Indicators:** Multiple large archives
- **Action:** فحص محتوى الملفات

**لماذا ليس Database Backup؟**
- Scheduled job معروف
- يحدث يومياً
- لا توجد indicators على compromise
- **Low Priority**

---

#### Q15: Correlation - Same or Separate Incidents?

**السؤال:** هل الـ alerts المشبوهة جزء من نفس الحادثة أم حوادث منفصلة؟

**الخيارات:**
- Same incident (coordinated attack chain)
- Separate unrelated incidents
- Unclear - needs investigation

**الإجابة:** `Same incident` (coordinated attack chain)

**التفسير التفصيلي:**

**الأدلة على أنها نفس الحادثة:**

1. **نفس المستخدم:**
   - جميع الـ alerts من sarah.mitchell
   - نفس الجهاز (192.168.1.45)

2. **Timeline متسلسل:**
   ```
   14:00 → Repository access
   15:00 → Data queries
   15:45 → Data archiving
   15:48 → Exfiltration attempt #1
   22:43 → Exfiltration attempt #2
   ```

3. **Attack Pattern واضح:**
   - Collection → Staging → Exfiltration
   - يطابق **MITRE ATT&CK Kill Chain**

4. **Common Goal:**
   - جميع الأنشطة تهدف لسرقة البيانات
   - نفس الملفات المستهدفة

**لماذا ليس Separate Incidents؟**
- Too many coincidences
- Same user, same day, same goal
- Sequential progression

**MITRE ATT&CK Kill Chain:**
1. **T1078** - Valid Accounts (Sarah's credentials)
2. **T1005** - Data from Local System
3. **T1560** - Archive Collected Data
4. **T1567.002** - Exfiltration to Cloud Storage
5. **T1052.001** - Exfiltration over USB

---

#### Q16: Most Suspicious Behavior

**السؤال:** أي سلوك هو الأكثر شكاً؟

**الخيارات:**
- Normal database queries
- Git clone activity
- DLP blocked upload
- VPN login from home

**الإجابة:** `DLP blocked upload`

**التفسير:**

**لماذا DLP Blocked Upload هو الأكثر شكاً؟**

1. **Direct Evidence of Malicious Intent:**
   - محاولة **فعلية** لتسريب البيانات
   - ليس مجرد access أو query

2. **Policy Violation:**
   - خرق واضح لسياسة الشركة
   - DLP rule انتهكت

3. **Data Sensitivity:**
   - 245 MB من **customer PII**
   - بطاقات ائتمان
   - بيانات مالية

4. **Destination:**
   - Google Drive **الشخصي**
   - ليس أدوات الشركة

**مقارنة مع الخيارات الأخرى:**

**Normal Database Queries:**
- قد تكون جزء من العمل
- تحتاج context للتقييم
- **Less suspicious**

**Git Clone:**
- مشبوه لكن قد يكون لـ collaboration
- يحتاج investigation
- **Moderately suspicious**

**VPN Login:**
- نشاط طبيعي تماماً
- Remote work مسموح
- **Not suspicious**

**الاستنتاج:**
DLP Blocked Upload هو **smoking gun** - دليل مباشر على محاولة تسريب.

---

#### Q17: MITRE ATT&CK Technique

**السؤال:** أي MITRE technique يطابق الهجوم الناجح؟

**الخيارات:**
- T1110 – Brute Force
- T1078 – Valid Accounts
- T1567 – Exfiltration Over Web Service
- T1052 – Exfiltration Over Physical Medium

**الإجابة:** `T1078` (Valid Accounts) **و** `T1567` **و** `T1052`

**لكن الأساسي هو T1078**

**التفسير:**

**T1078 - Valid Accounts:**
✅ **لماذا هذا هو الأساس؟**
- Sarah استخدمت حسابها الشرعي
- لا توجد credential theft
- لا توجد privilege escalation
- **الصلاحيات كانت صحيحة**

**ما الذي يجعله Insider Threat:**
1. **Valid credentials** ✓
2. **Authorized access** ✓
3. **Malicious intent** ✓
4. **Data misuse** ✓

**T1567 - Exfiltration Over Web Service:**
✅ **ينطبق على:**
- محاولة Google Drive upload
- محاولة OneDrive
- محاولة Dropbox

❌ **لكنها فشلت** - DLP blocked

**T1052 - Exfiltration Over Physical Medium:**
✅ **ينطبق على:**
- محاولة USB copy

❌ **لكنها فشلت** - DLP blocked

**الفرق بين Insider Threat والـ External Attack:**

**External Attack:**
```
Attacker → Phishing/Exploit → Steal Credentials → Access System
          (T1566)              (T1078)           (unauthorized)
```

**Insider Threat (Sarah):**
```
Sarah → Already Has Access → Misuse Privileges → Steal Data
        (T1078)              (T1078)            (T1567/T1052)
```

---

#### Q18: Attack Hypothesis

**السؤال:** ما أفضل وصف للسيناريو؟

**الخيارات:**
- SSH brute-force attack from external IP
- Insider threat - data exfiltration attempt
- Ransomware attack
- System misconfiguration causing false alerts

**الإجابة:** `Insider threat - data exfiltration attempt`

**التفسير الكامل:**

**لماذا Insider Threat؟**

1. **Valid Account Usage:**
   - Sarah لها حساب شرعي
   - Authentication نجح
   - لا توجد brute-force

2. **Data Collection:**
   - Database queries شرعية (من ناحية technical)
   - لكن الغرض malicious

3. **Exfiltration Attempts:**
   - Google Drive (blocked)
   - USB (blocked)

4. **Indicators:**
   - Employee resignation
   - Abnormal data access
   - After-hours activity
   - Multiple exfiltration methods

**لماذا ليس SSH Brute-Force؟**
- لا يوجد failed login attempts
- لا يوجد external IP attacks
- **Not applicable**

**لماذا ليس Ransomware؟**
- لا يوجد file encryption
- لا يوجد C2 communication
- لا يوجد ransom note
- **Not applicable**

**لماذا ليس Misconfiguration؟**
- DLP blocks كانت صحيحة
- محاولات حقيقية للتسريب
- **Not a false alarm**

---

### Phase 2: Scenario Investigation (8 أسئلة)

#### Q1: Attack Type

**السؤال:** بناءً على كل الأدلة، ما نوع الهجوم؟

**الإجابة:** `insider threat` / `insider attack` / `data exfiltration` / `insider data theft` / `internal breach`

**التفسير:**

**العناصر التي تؤكد Insider Threat:**

1. **Insider:**
   - موظف حالي (Sarah Mitchell)
   - صلاحيات شرعية
   - معرفة بالأنظمة

2. **Threat:**
   - Malicious intent
   - Data theft
   - Policy violation

3. **Data Exfiltration:**
   - Customer data
   - Financial records
   - Proprietary code

**الفرق بين Insider Threat و External Attack:**

| Aspect | Insider Threat | External Attack |
|--------|----------------|-----------------|
| **Access** | Already has it | Must gain it |
| **Trust** | Trusted user | Untrusted source |
| **Detection** | Harder (normal access) | Easier (abnormal) |
| **Impact** | High (knows what to steal) | Variable |
| **Prevention** | DLP, UAM, Monitoring | Firewall, IDS |

---

#### Q2: Evidence Supporting Conclusion

**السؤال:** اختر قطعتي دليل تدعمان هذا الاستنتاج

**الخيارات:**
- Valid credentials used (no account compromise)
- No malware traces (legitimate tools only)
- Unusual user behavior (role violations, off-hours)
- External IP reputation

**الإجابة:**
```
✅ Valid credentials used
✅ No malware traces
✅ Unusual user behavior
```
(اختر أي 2 من الثلاثة)

**التفسير:**

**1. Valid Credentials:**
**لماذا هذا دليل على Insider Threat؟**
- Sarah استخدمت username/password الخاصة بها
- لا توجد credential theft
- لا يوجد unauthorized access من ناحية technical
- **يؤكد أنها موظف شرعي**

**مقارنة:**
```
Insider: ✓ sarah.mitchell (her real account)
External: ✗ Stolen credentials or compromised account
```

**2. No Malware Traces:**
**لماذا هذا مهم؟**
- استخدمت أدوات عادية:
  - Web browser (Google Drive)
  - Windows Explorer (USB copy)
  - Database client (SQL queries)
- **لا توجد malicious software**
- **يؤكد أنها ليست external breach**

**مقارنة:**
```
Insider: ✓ Legitimate tools misused
External: ✗ Usually involves malware/exploits
```

**3. Unusual User Behavior:**
**ما هي الـ Anomalies؟**

**Role Violations:**
- Software Developer **لا يجب** أن:
  - تدخل على customer database
  - تحمّل financial records
  - ترفع data على personal cloud

**Off-Hours Activity:**
- USB attempt في 22:43 (بعد ساعات العمل)
- معظم الموظفين غادروا
- **محاولة لتجنب الانتباه**

**Data Volume Anomaly:**
- 1.7 GB من البيانات
- أكبر بكثير من نشاطها العادي

**Frequency Anomaly:**
- محاولتي exfiltration في نفس اليوم
- Multiple methods (cloud + USB)

**Context Anomaly:**
- استقالة حديثة
- ستنضم لشركة منافسة
- **Strong motive**

**لماذا ليس External IP Reputation؟**
- Sarah تعمل من داخل الشبكة (192.168.1.45)
- لا توجد external IPs مشبوهة
- **Not applicable لـ Insider Threat**

---

#### Q3: MITRE ATT&CK Techniques (Select ALL)

**السؤال:** أي MITRE techniques تنطبق؟

**الخيارات:**
- T1078 – Valid Accounts
- T1560 – Archive Collected Data
- T1567 – Exfiltration Over Web Service
- T1486 – Data Encrypted for Impact

**الإجابة:**
```
✅ T1078 – Valid Accounts
✅ T1560 – Archive Collected Data
✅ T1567 – Exfiltration Over Web Service
```
(اختر 3 على الأقل)

**التفسير التفصيلي لكل Technique:**

**T1078 - Valid Accounts:**
```
Tactic: Defense Evasion, Persistence, Privilege Escalation, Initial Access
```
**كيف استخدمته Sarah؟**
- استخدمت حسابها الشرعي (sarah.mitchell)
- لم تحتاج credential theft
- Bypassed authentication controls

**الدليل:**
```json
{
  "user": "sarah.mitchell",
  "authentication": "SUCCESS",
  "account_type": "Valid Employee Account"
}
```

**T1560 - Archive Collected Data:**
```
Tactic: Collection
```
**كيف استخدمته Sarah؟**
- أنشأت ZIP/TAR files:
  - customers_export_2024.zip (245 MB)
  - financial_data_Q4.tar.gz (189 MB)
  - proprietary_algorithms.zip (78 MB)
  - source_code_backup.tar.gz (1.2 GB)

**الغرض:**
1. **Compression** - تقليل الحجم للـ transfer
2. **Organization** - تنظيم البيانات
3. **Obfuscation** - إخفاء المحتوى

**T1567 - Exfiltration Over Web Service:**
```
Tactic: Exfiltration
Sub-technique: T1567.002 - Exfiltration to Cloud Storage
```
**كيف حاولته Sarah؟**
- Google Drive upload (BLOCKED)
- OneDrive sync (BLOCKED)
- Dropbox transfer (BLOCKED)

**لماذا Web Service؟**
- Easy to use
- Looks like normal traffic (HTTPS)
- Hard to detect without DLP
- Free/personal accounts available

**T1052 - Exfiltration Over Physical Medium:**
```
Tactic: Exfiltration
Sub-technique: T1052.001 - Exfiltration over USB
```
**كيف حاولته Sarah؟**
- USB flash drive insertion
- Copy attempt (BLOCKED)

**لماذا USB؟**
- Backup plan بعد فشل Cloud
- Harder to detect (if no DLP)
- Direct physical control

**لماذا ليس T1486؟**
**T1486 - Data Encrypted for Impact** (Ransomware)
- Sarah **لم تشفر** الملفات
- هدفها **السرقة** ليس التدمير
- لا يوجد ransom demand
- **Not applicable**

**المقارنة:**
```
Sarah's Goal: Steal data → T1567/T1052
Ransomware Goal: Encrypt data → T1486
```

---

#### Q4: Timeline - First Event

**السؤال:** ما الذي حدث أولاً في الـ attack chain؟

**الخيارات:**
- Repository access attempt
- ZIP file creation
- Cloud upload
- DLP alert

**الإجابة:** `Repository access attempt`

**التفسير:**

**Attack Timeline الكامل:**

```
1️⃣ 14:00 - Repository Access
   └─► Sarah cloned proprietary-algorithm-repo
   
2️⃣ 15:00 - Data Queries
   └─► Database queries للـ customer/financial data
   
3️⃣ 15:45 - ZIP Creation
   └─► أنشأت ملفات مضغوطة
   
4️⃣ 15:48 - Cloud Upload Attempt
   └─► حاولت رفع على Google Drive
   
5️⃣ 15:48 - DLP Alert
   └─► DLP blocked and alerted
```

**لماذا Repository Access أولاً؟**

**Evidence:**
```
14:32:00 - Git clone proprietary-algorithm-repo
15:00:00 - First database query
15:45:30 - First ZIP file created
```

**المنطق:**
1. Sarah بدأت بـ **collection** قبل **archiving**
2. جمعت source code قبل البيانات
3. ثم حولت كل شيء لـ archives
4. ثم حاولت التسريب

**Attack Progression:**
```
Collection → Staging → Exfiltration
    ↓          ↓           ↓
  Repo      ZIP Files   Cloud/USB
  Access    Creation    Upload
```

---

#### Q5: Why NOT Ransomware? (Select ALL)

**السؤال:** لماذا هذا ليس ransomware attack؟

**الخيارات:**
- No file encryption
- No ransom note
- Legitimate user access
- Data theft, not destruction

**الإجابة:**
```
✅ No file encryption
✅ No ransom note
✅ Legitimate user access
✅ Data theft, not destruction
```
(اختر جميعهم - كلهم صحيحين)

**التفسير التفصيلي:**

**1. No File Encryption:**

**Ransomware:**
```
Files: document.pdf → document.pdf.encrypted
       report.xlsx → report.xlsx.locked
```

**Sarah's Case:**
```
Files: Unchanged
Action: Copied/archived (لم تغير الأصلية)
```

**الدليل:**
- لا توجد file extension changes
- لا توجد encryption alerts
- الملفات الأصلية سليمة

---

**2. No Ransom Note:**

**Ransomware Indicators:**
```
- README_DECRYPT.txt على Desktop
- Ransom message: "Your files are encrypted..."
- Payment instructions (Bitcoin address)
- Countdown timer
```

**Sarah's Case:**
```
- لا توجد ransom notes
- لا توجد payment demands
- لا توجد threats
```

**الهدف مختلف:**
- Ransomware: **Money** through encryption
- Sarah: **Data** through theft

---

**3. Legitimate User Access:**

**Ransomware:**
```
Usually involves:
- Phishing email
- Exploit
- Malware download
- Unauthorized execution
```

**Sarah:**
```
- Valid employee account
- Authorized system access
- No malware involved
- Legitimate authentication
```

**الفرق الجوهري:**
```
Ransomware: Unauthorized + Malicious
Sarah:      Authorized + Malicious
```

---

**4. Data Theft, Not Destruction:**

**Ransomware Goal:**
```
Encrypt → Make Inaccessible → Demand Payment → Restore (maybe)
   ↓            ↓                   ↓              ↓
Impact      Availability         Money         Recovery?
```

**Sarah's Goal:**
```
Copy → Keep Original → Take Copy → Use at New Job
  ↓         ↓             ↓            ↓
Theft   No Impact    Exfiltration  Competitive Advantage
```

**CIA Triad:**
- Ransomware: **Availability** breach
- Sarah: **Confidentiality** breach

**Impact:**
```
Ransomware: ✗ Files locked, business stopped
Sarah:      ✓ Files intact, business continues
            ✗ Data confidentiality compromised
```

---

#### Q6: Primary Business Impact

**السؤال:** ما هو الـ primary business impact؟

**الخيارات:**
- Data confidentiality breach
- Service availability impact
- Financial fraud
- Website defacement

**الإجابة:** `Data confidentiality breach`

**التفسير:**

**CIA Triad Analysis:**

**Confidentiality:** ❌ **BREACHED**
```
What was compromised:
- 10,000+ customer PII records
- Credit card information
- Financial transactions
- Proprietary algorithms
- Source code

Impact:
- Competitive disadvantage
- Regulatory violations (GDPR, PCI-DSS)
- Customer trust loss
- Potential lawsuits
```

**Integrity:** ✅ **INTACT**
```
- No files were modified
- No data was altered
- Database records unchanged
- Source code not tampered
```

**Availability:** ✅ **INTACT**
```
- Systems operational
- Services running normally
- No downtime
- Business continues
```

**لماذا Confidentiality؟**

**Evidence:**
1. **Data Theft Attempt:**
   - Sarah tried to exfiltrate sensitive data
   - DLP **blocked** the attempts
   - لكن **intent** و **capability** موجودين

2. **Sensitive Data Exposure:**
   - Even though blocked, data was:
     - Queried from database
     - Archived locally
     - **Exposed to unauthorized viewing**

3. **Compliance Impact:**
   - **GDPR:** Personal data breach
   - **PCI-DSS:** Credit card data compromise risk
   - **SOC 2:** Access control violation

**لماذا ليس Service Availability؟**
- No systems down
- No denial of service
- Business operational
- **Not applicable**

**لماذا ليس Financial Fraud؟**
- Sarah didn't steal money
- No fraudulent transactions
- Data theft ≠ fraud
- **Different type of attack**

**لماذا ليس Website Defacement؟**
- No web assets modified
- No public-facing changes
- **Not applicable**

**Financial Impact من Confidentiality Breach:**
```
Direct Costs:
- Regulatory fines (GDPR: up to €20M or 4% revenue)
- Legal fees
- Customer compensation
- Forensics investigation

Indirect Costs:
- Reputation damage
- Customer churn
- Competitive disadvantage (stolen algorithms)
- Stock price impact
```

---

#### Q7: Failed External Attack

**السؤال:** أي alert يمثل failed attack غير متعلق بالحادثة الرئيسية؟

**الخيارات:**
- External SSH brute-force (blocked)
- Git clone attempt (failed)
- DLP block - cloud upload
- Port scan (blocked)

**الإجابة:** `External SSH brute-force (blocked)` **أو** `Port scan (blocked)`

**التفسير:**

**Failed External Attacks = False Positives:**

**1. SSH Brute-Force (Blocked):**
```json
{
  "source_ip": "185.220.101.50",
  "destination": "192.168.1.1",
  "action": "SSH login attempt",
  "user": "root",
  "result": "BLOCKED by fail2ban"
}
```
**لماذا False Positive؟**
- هجوم خارجي (external IP)
- **تم حظره بنجاح**
- لا علاقة له بـ Sarah
- لم يؤدي لأي compromise
- **Unrelated to main incident**

**2. Port Scan (Blocked):**
```json
{
  "source_ip": "203.0.113.99",
  "action": "Port scan (22, 80, 443)",
  "result": "BLOCKED by firewall"
}
```
**لماذا False Positive؟**
- Reconnaissance attempt
- **Blocked before any access**
- No penetration
- **Failed attempt**

**مقارنة مع Main Incident:**

**Sarah's Incident (True Positive):**
```
✓ Internal user
✓ Valid credentials
✓ Successful data access
✓ Actual data theft attempt
✗ Blocked by DLP (but attempted)
```

**External Attacks (False Positive):**
```
✗ External attacker
✗ No valid credentials
✗ No successful access
✗ No data accessed
✓ Blocked completely
```

**لماذا ليس Git Clone Attempt؟**
- **Git clone نجح!** (Sarah عملت clone للـ repo)
- جزء من الـ main incident
- **True Positive** (part of attack chain)

**لماذا ليس DLP Block؟**
- **محاولة حقيقية** من Sarah للتسريب
- جزء من الـ main incident
- **True Positive** (even though blocked)

**الاستنتاج:**
```
Failed External = No Impact = False Positive
Sarah's Attempts = Real Threat = True Positive (even if blocked)
```

---

#### Q8: SOC First Action

**السؤال:** ما يجب على الـ SOC فعله أولاً؟

**الخيارات:**
- Disable user access immediately
- Scan all endpoints for malware
- Block external IP addresses
- Run full antivirus scan

**الإجابة:** `Disable user access immediately`

**التفسير الكامل:**

**لماذا Disable Access أولاً؟**

**1. Prevent Further Damage:**
```
Current Status:
✓ 2 exfiltration attempts blocked (Google Drive + USB)
✗ Sarah still has access
⚠️ May try other methods:
   - Personal email
   - Phone camera (screenshot)
   - Third-party file sharing
   - Print documents
```

**If we don't disable:**
```
Sarah could:
- Try different exfiltration methods
- Delete evidence
- Access more sensitive data
- Alert accomplices
```

**2. Incident Response Priority:**
```
1️⃣ Contain (Stop the bleeding)
2️⃣ Investigate (Understand what happened)
3️⃣ Remediate (Fix the problem)
4️⃣ Recover (Return to normal)
```

**Disable Access = Containment**

**3. Immediate Actions:**

**Step 1: Account Disable**
```powershell
# Active Directory
Disable-ADAccount -Identity sarah.mitchell

# Database
REVOKE ALL PRIVILEGES FROM 'sarah.mitchell'@'%';

# VPN
Block-VPNUser -Username sarah.mitchell
```

**Step 2: Session Termination**
```
- Kill active sessions
- Revoke authentication tokens
- Force logout from all devices
```

**Step 3: Physical Access**
```
- Disable badge access
- Retrieve company devices
- Escort from building (if present)
```

**لماذا ليس Scan Endpoints؟**

**Malware Scan:**
```
Priority: Medium
Reason: No malware detected (Insider used legitimate tools)
Timing: Can be done AFTER containment
```

**Sarah's Case:**
- لا توجد malware indicators
- استخدمت أدوات عادية
- Scan won't help containment
- **Lower priority**

**لماذا ليس Block External IPs؟**

**External IPs:**
```
Sarah's IPs:
- 192.168.1.45 (internal workstation)
- VPN IP (if remote)

Blocking external IPs:
- Won't affect Sarah
- She's internal
- **Not applicable**
```

**لماذا ليس Antivirus Scan؟**

**Antivirus:**
```
What it detects: Malware, viruses, trojans
Sarah's tools: Browser, Windows Explorer, SQL client

Result: Clean scan (no malware)
Value: None for this incident
Priority: Low
```

---

**Complete Incident Response Plan:**

**Phase 1: Immediate (Minutes)** ⏱️ **0-15 min**
```
1. Disable sarah.mitchell account
2. Terminate active sessions
3. Revoke database access
4. Block network access
5. Alert management
```

**Phase 2: Investigation (Hours)** ⏱️ **1-4 hours**
```
1. Review all database queries
2. Audit file access logs
3. Check email/chat for evidence
4. Interview Sarah (if possible)
5. Identify all accessed data
```

**Phase 3: Analysis (Hours-Days)** ⏱️ **4-24 hours**
```
1. Determine total data exposure
2. Check for accomplices
3. Review DLP logs
4. Forensic analysis of workstation
5. Timeline reconstruction
```

**Phase 4: Remediation (Days)** ⏱️ **1-7 days**
```
1. Change database passwords
2. Rotate encryption keys
3. Review access controls
4. Update DLP policies
5. Security awareness training
```

**Phase 5: Recovery (Days-Weeks)** ⏱️ **7-30 days**
```
1. Notify affected customers (if needed)
2. Regulatory reporting (GDPR, etc.)
3. Legal action against Sarah
4. Improve monitoring
5. Post-incident review
```

---

## 📝 الملخص النهائي

### Attack Characteristics:

**Insider Threat vs External Attack:**
```
┌─────────────────────┬──────────────────┬─────────────────┐
│ Aspect              │ Sarah (Insider)  │ External Hacker │
├─────────────────────┼──────────────────┼─────────────────┤
│ Access Method       │ Valid account    │ Exploit/stolen  │
│ Initial Access      │ Already has it   │ Must gain it    │
│ Tools Used          │ Legitimate       │ Malware         │
│ Detection           │ Behavioral       │ Signature-based │
│ Motivation          │ Financial gain   │ Various         │
│ Knowledge           │ Inside knowledge │ Reconnaissance  │
│ Trust Level         │ Trusted          │ Untrusted       │
└─────────────────────┴──────────────────┴─────────────────┘
```

### MITRE ATT&CK Mapping:

**Complete Kill Chain:**
1. **Initial Access:** T1078 (Valid Accounts)
2. **Collection:** T1005 (Data from Local System)
3. **Staging:** T1560 (Archive Collected Data)
4. **Exfiltration:** 
   - T1567.002 (Cloud Storage) - BLOCKED
   - T1052.001 (USB) - BLOCKED

### Prevention & Detection:

**What Worked:**
✅ DLP System - blocked both exfiltration attempts
✅ Content inspection - detected sensitive patterns
✅ Behavioral monitoring - flagged unusual activity

**What Could Be Better:**
❌ Earlier detection (repository access at 14:00 should trigger alert)
❌ User activity baseline (to catch anomalies sooner)
❌ Automated response (auto-disable on policy violation)

### Lessons Learned:

1. **DLP is Critical:** بدون DLP، البيانات كانت ستتسرب
2. **Behavioral Analytics:** Insider threats تحتاج behavior monitoring
3. **Access Reviews:** مراجعة دورية للصلاحيات
4. **Exit Procedures:** موظفين مستقيلين = high risk
5. **Data Classification:** know what data is sensitive
6. **Monitoring 24/7:** Sarah حاولت في 22:43 (off-hours)

### Recommended Controls:

**Technical:**
- DLP على all endpoints
- Database Activity Monitoring (DAM)
- User Behavior Analytics (UBA)
- Privileged Access Management (PAM)

**Procedural:**
- Exit checklists
- Access reviews
- Data classification policy
- Incident response plan

**People:**
- Security awareness training
- Background checks
- Non-compete agreements
- Exit interviews

---

**النتيجة:** محاولة تسريب بيانات من موظف داخلي تم **اكتشافها وحظرها بنجاح** بواسطة DLP system. الأثر محدود لكن يحتاج تحقيق كامل وإجراءات قانونية.
