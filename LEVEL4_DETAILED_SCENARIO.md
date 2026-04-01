# Level 4: Ghost Mode Ransomware - سيناريو تفصيلي كامل

## 📋 نظرة عامة على السيناريو

**نوع الهجوم:** Multi-Stage Ransomware (External Recon -> SMB Exploit -> Malware Execution -> Lateral Spread -> Encryption)  
**التاريخ:** 18 مارس 2026  
**الوقت:** من 09:10 صباحا حتى ~09:18 صباحا  
**المهاجم الخارجي:** 185.44.12.77  
**الهدف الأولي:** 10.0.0.5 (SMB service)  
**عدد الـ Alerts الكلي:** 77 alert  
- **43 Low Severity** (Noise / normal activity / context-only)  
- **14 Medium Severity** (Recon + blocked + warning-grade detections)  
- **12 High Severity** (confirmed malicious operations)  
- **8 Critical Severity** (active compromise, spread, ransomware impact)  

---

## 🎯 السيناريو التفصيلي

### المرحلة الأولى: External Reconnaissance (09:10:00 - 09:10:10)

#### ما حدث:
المهاجم بدأ بمسح SMB خارجي على الشبكة الداخلية بحثا عن host مكشوف على port 445.

#### الأدلة:

**Alert ID: `792e3390b006`** (Medium)
```json
{
  "log.original": "[SCAN] Connection attempt from 185.44.12.77 to 10.0.0.5:445",
  "alert_type": "smb_scan_detected",
  "source_ip": "185.44.12.77",
  "destination_ip": "10.0.0.5"
}
```
**التفسير:** External scan واضح ومباشر لاستكشاف SMB exposure.

**Alert ID: `3af37657c7f2`** (Medium)
```json
{
  "log.original": "[ALERT] SMB service exposed",
  "rule.id": "L4-1002"
}
```
**التفسير:** الخدمة مكشوفة فعلا، يعني سطح الهجوم متاح للمهاجم.

---

### المرحلة الثانية: Exploitation via SMB (09:10:10 - 09:10:40)

#### ما حدث:
بعد إثبات وجود SMB exposed، بدأ استغلال فعلي عبر packet مشبوهة.

**Alert ID: `a9cd3b7201cb`** (Critical)
```json
{
  "log.original": "[EXPLOIT] Suspicious SMB packet detected",
  "alert_type": "smb_exploit_attempt"
}
```
**التفسير:** دي نقطة التحول من Recon إلى Initial Access/Execution.

**MITRE ATT&CK (تقريبي):**
- **T1595** Active Scanning
- **T1133 / T1190** External service abuse / exploit path

---

### المرحلة الثالثة: Malware Execution (09:10:40 - 09:11:20)

#### ما حدث:
الـ payload اشتغل على host الهدف وظهر process معروف بنمط ransomware.

**Alert ID: `e7378a82ca87`** (High)
```json
{
  "log.original": "[PROCESS] New process started: wannacry.exe",
  "alert_type": "malware_execution"
}
```
**التفسير:** تشغيل binary باسم ransomware family indicator.

**مؤشرات داعمة:**
- HTTP anomalies
- session/auth events غير معتادة

---

### المرحلة الرابعة: Internal Spread / Lateral Movement (09:11 - 09:14)

#### ما حدث:
بعد التنفيذ، بدأ المهاجم ينشر التهديد أفقيا داخل الشبكة.

**Alert ID: `0702fc13af60`** (Critical)
```json
{
  "log.original": "[ALERT] Rapid lateral movement detected",
  "alert_type": "network_spread"
}
```
**التفسير:** حركة سريعة بين عدة hosts، ودي علامة compromise مش isolated.

**نمط الخطر هنا:**
- الانتشار السريع يرفع impact هندسيا
- تأخير العزل يسمح بتشفير عدد أكبر من الأجهزة

---

### المرحلة الخامسة: Ransomware Impact (09:14 - 09:18)

#### ما حدث:
ظهرت مؤشرات التشفير الفعلي وransom note.

**Alert ID: `f1a241ce940b`** (Critical)
```json
{
  "log.original": "[FILE] File encrypted: report.docx",
  "alert_type": "ransomware_activity"
}
```
**التفسير:** التشفير بدأ على مستوى الملفات.

**Alert ID: `7c5257bdbeb3`** (Critical)
```json
{
  "log.original": "[FILE] Ransomware note created",
  "alert_type": "ransomware_activity"
}
```
**التفسير:** وجود ransom note يعني impact stage مكتمل تقريبا.

---

## 🔍 False Positives وContext Alerts (أمثلة مهمة)

### 1) نشاط مشروع غير ضار

**Alert ID: `e6e65cb94d1e`** (Low)
```json
{
  "log.original": "[ALERT] Approved vulnerability scan",
  "severity": "low"
}
```
**التفسير:** Security scanning معتمد، ليس جزءا من سلسلة الاختراق.

### 2) VPN دخول طبيعي

**Alert ID: `6b839b7f8038`** (Low)
```json
{
  "log.original": "[VPN] User ahmed.tarek connected successfully using MFA",
  "event.outcome": "success"
}
```
**التفسير:** Login ناجح طبيعي ومؤكد بـ MFA.

### 3) هجوم خارجي تم منعه

**Alert ID: `f37d7daebf61`** (Medium)
```json
{
  "log.original": "[FIREWALL] Blocked RDP brute-force from 91.210.47.11 to 10.0.0.20:3389",
  "event.action": "deny"
}
```
**التفسير:** هجوم حقيقي لكنه **خارج الـ main chain** لأنه blocked.

---

## 📊 Timeline الكامل للهجوم (مختصر)

```text
09:10:00  External SMB scan starts (185.44.12.77 -> 10.0.0.5:445)
09:10:08  SMB exposure confirmed
09:10:xx  Suspicious SMB exploit packet detected
09:10:xx  wannacry.exe process observed
09:11-14  Rapid lateral movement across internal assets
09:14+    File encryption events appear
09:15+    Ransom note creation confirmed
```

---

## 🚨 لماذا هذا Incident خطير؟

1. بدأ من **external recon** وانتهى بـ **active ransomware impact** في دقائق.
2. فيه **exploit + malware + spread + encryption** (kill chain شبه مكتملة).
3. وجود lateral movement مع ransomware يعني الخطر ليس على جهاز واحد.

---

## ✅ أولويات الاستجابة (SOC)

1. عزل host البداية `10.0.0.5` فورا من الشبكة.
2. حظر المصدر الخارجي `185.44.12.77` على كل الـ perimeter controls.
3. إيقاف SMB مؤقتا بين segments المتأثرة (micro-segmentation emergency).
4. Hunt سريع على نفس IOC patterns:
   - wannacry.exe process creation
   - file encryption markers
   - ransom note creation events
5. تشغيل incident containment playbook (EDR isolate + credential reset + backup validation).

---

## 🧠 الدرس المستفاد

- Alert واحد medium في البداية (scan) قد يبدو بسيط، لكن correlation مع exploit + process + spread يحوله لهجوم critical.
- لازم نقرأ التسلسل الزمني، مش كل Alert منفرد.
- سرعة القرار (containment خلال أول دقائق) هي الفرق بين incident محدود وbusiness-wide outage.
