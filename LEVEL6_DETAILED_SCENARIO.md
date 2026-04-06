# Level 6: SolarWinds / Orion Supply Chain Compromise - سيناريو تفصيلي كامل

## 📋 نظرة عامة على السيناريو

**نوع الهجوم:** Supply Chain Attack / Trusted Software Update Compromise  
**السيناريو:** Orion platform compromise leading to beaconing, persistence, lateral probing, and data exfiltration  
**التاريخ:** 6 أبريل 2026  
**الوقت:** من 09:00 صباحا حتى ~09:07 صباحا  
**الضحية الأساسية:** host `10.20.1.15`  
**المصدر الخارجي الأساسي:** `77.91.33.10`  
**المصدر الثانوي / fallback:** `185.199.110.153`  

**الفكرة الأساسية:**
المهاجم استغل تحديثا موثوقا في منصة Orion، ثم بدأ تشغيل خدمة خفية، وبعدها ظهر beaconing دوري إلى بنية خارجية، ثم persistence، ثم probing داخلي، وأخيرا exfiltration عبر قناة مشفرة.

---

## 🎯 السيناريو التفصيلي

### المرحلة الأولى: Trusted Vendor Activity and Pre-Positioning (09:00:02 - 09:02:31)

#### ما حدث:
البيئة بدأت بعدة DNS lookups تبدو عادية ظاهريا على نطاقات مرتبطة بالمورد أو بنطاقات عامة مألوفة، ثم تحولت إلى مؤشرات أكثر خطورة عندما ظهر `avsvmcloud.com` مع تكرار DNS A/TXT queries.

#### الأدلة المهمة:

**Alert ID: `a4bf8e236386`** (Low)
```json
{
  "log.original": "2026-04-06 09:00:02 10.20.1.15 A updates.orion-vendor.com 8.8.8.8 NOERROR",
  "alert_type": "suspicious_dns_query"
}
```
**التفسير:** Lookup مرتبط بتحديثات vendor بشكل طبيعي ظاهريا، لكنه مهم كجزء من سلسلة الثقة.

**Alert ID: `1b39aa7faaef`** (Low)
```json
{
  "log.original": "2026-04-06 09:00:06 10.20.1.15 A cdn.orion-vendor.com 8.8.8.8 NOERROR"
}
```
**التفسير:** نشاط CDN يبدو benign، لكنه يدعم قصة update chain.

**Alert ID: `1d7679f1e876`** و **`74f68a8e96e5`** (Low)
```json
{
  "log.original": "2026-04-06 09:01:08 10.20.1.15 A avsvmcloud.com 8.8.8.8 NOERROR"
}
```
**التفسير:** هذا النطاق أحد أقوى المؤشرات في chain الخاص بـ SolarWinds-style compromise.

**Alert ID: `0326bb5189f3`** و **`46732ba8f02f`** (Low)
```json
{
  "log.original": "2026-04-06 09:01:18 10.20.1.15 A digitalcollege.org 8.8.8.8 NOERROR"
}
```
**التفسير:** DNS related to external infrastructure probing / fallback handling.

---

### المرحلة الثانية: Update Execution and Beaconing (09:00:18 - 09:03:28)

#### ما حدث:
بعد update success ظهرت مؤشرات تنفيذ خدمة جديدة وسلوك beaconing إلى بنية خارجية مسيطر عليها من المهاجم.

#### الأدلة:

**Alert ID: `7e91dc24cb7a`** (High)
```json
{
  "log.original": "2026-04-06T09:00:18Z | Alert: [UPDATE] Orion platform service restarted after update | SID: 660004 | Source: 10.20.1.15 | Dest: 10.20.1.15 | Priority: 3"
}
```
**التفسير:** هذا هو الـ handoff من update الشرعي ظاهريا إلى execution environment الجديد.

**Alert ID: `7e91dc24cb7a`** ثم **`24383c603e35`** و **`6f61a4457fc2`** (High)
```json
{
  "log.original": "2026-04-06T09:02:00Z | Alert: [NETWORK] Outbound connection to 77.91.33.10 over HTTPS | SID: 660008 | Source: 10.20.1.15 | Dest: 77.91.33.10 | Priority: 1"
}
```
**التفسير:** outbound HTTPS إلى IP خارجي غير معتاد مع persistence-friendly timing.

**Alert ID: `24383c603e35`** (High)
```json
{
  "log.original": "2026-04-06T09:02:08Z | Alert: [ALERT] Unknown external communication detected from update service | SID: 660009 | Source: 10.20.1.15 | Dest: 77.91.33.10 | Priority: 1"
}
```
**التفسير:** ده يربط update service مباشرة باتصال خارجي مش متوقع.

**Alert ID: `6f61a4457fc2`** (High)
```json
{
  "log.original": "2026-04-06T09:02:19Z | Alert: [C2] Beacon pattern every 60 seconds to 77.91.33.10 | SID: 660010 | Source: 10.20.1.15 | Dest: 77.91.33.10 | Priority: 1"
}
```
**التفسير:** Beaconing واضح جدا، يعني النظام اتكلم مع C2 بشكل دوري.

**Alert ID: `2bf8a0006aa4`** (High)
```json
{
  "log.original": "2026-04-06T09:02:30Z | Alert: [C2] Secondary fallback communication to 185.199.110.153 | SID: 660011 | Source: 10.20.1.15 | Dest: 185.199.110.153 | Priority: 1"
}
```
**التفسير:** وجود fallback C2 يوحي بمرونة attacker infrastructure وحرص على الاستمرار.

**Alert ID: `c461c27b219d`** (High)
```json
{
  "log.original": "2026-04-06T09:03:04Z | Alert: [PERSISTENCE] Service registered for auto-start: windows_update_monitor | SID: 660012 | Source: 10.20.1.15 | Dest: 10.20.1.15 | Priority: 1"
}
```
**التفسير:** persistence mechanism باسم يبدو بريئا ويستغل الثقة في التسمية.

**Alert ID: `07bf7e72ab8c`** (High)
```json
{
  "log.original": "2026-04-06T09:03:28Z | Alert: [PERSISTENCE] Scheduled task created: UpdateTelemetryHealthCheck | SID: 660014 | Source: 10.20.1.15 | Dest: 10.20.1.15 | Priority: 1"
}
```
**التفسير:** scheduled task name يوحي telemetry طبيعية، لكنه فعليا supports persistence.

---

### المرحلة الثالثة: Internal Expansion and Staging (09:05:19 - 09:06:40)

#### ما حدث:
بعد تثبيت الـ implant، بدأ staging للبيانات ثم ظهرت حركة داخلية باتجاه خدمات أعلى قيمة.

#### الأدلة:

**Alert ID: `f04b8e7dc01a`** (High)
```json
{
  "log.original": "2026-04-06T09:05:32Z | Alert: [ALERT] Compressed archive prepared: telemetry_bundle_20260406.zip | SID: 660021 | Source: 10.20.1.15 | Dest: 10.20.1.15 | Priority: 1"
}
```
**التفسير:** archive preparation يشير إلى staging قبل exfiltration.

**Alert ID: `a5c1b38d89c7`** (High)
```json
{
  "log.original": "2026-04-06T09:05:45Z | Alert: [SECURITY] Data staging activity outside maintenance window | SID: 660022 | Source: 10.20.1.15 | Dest: 10.20.1.15 | Priority: 1"
}
```
**التفسير:** staging خارج نافذة الصيانة يرفع الاحتمال كثيرا.

**Alert ID: `17e713089f3e`** (High)
```json
{
  "log.original": "2026-04-06T09:06:23Z | Alert: [C2] Tasking response received from remote infrastructure | SID: 660024 | Source: 77.91.33.10 | Dest: 10.20.1.15 | Priority: 1"
}
```
**التفسير:** هذا يؤكد bidirectional C2، مش مجرد outbound beacon.

**Alert ID: `8b378a126d48`** (High)
```json
{
  "log.original": "2026-04-06T09:06:40Z | Alert: [ALERT] Lateral credential probing against admin-vault service | SID: 660025 | Source: 10.20.1.15 | Dest: 10.20.4.90 | Priority: 1"
}
```
**التفسير:** الهجوم بدأ يتحول من implant control إلى internal expansion / credential probing.

---

### المرحلة الرابعة: Exfiltration and Impact (09:05:19 - 09:07:49)

#### ما حدث:
النظام بدأ يخرج بيانات مشفرة بشكل دوري ثم ظهرت محاولات للوصول إلى target داخلي حساس وobject endpoint سحابي.

#### الأدلة:

**Alert ID: `c65c1f576675`** (High)
```json
{
  "log.original": "2026-04-06T09:06:12Z | Alert: [ALERT] Large encrypted outbound burst to 77.91.33.10 | SID: 660023 | Source: 10.20.1.15 | Dest: 77.91.33.10 | Priority: 1"
}
```
**التفسير:** هذه لحظة exfiltration/impact حقيقية، مش مجرد beaconing.

**Alert ID: `d9755d5c8ac2`** (High)
```json
{
  "log.original": "2026-04-06T09:07:49Z | Alert: [ALERT] Potential data exfiltration detected toward cloud object endpoint | SID: 660030 | Source: 10.20.1.15 | Dest: 104.18.12.201 | Priority: 1"
}
```
**التفسير:** exfiltration toward cloud storage/object endpoint usually means staging or direct theft.

---

## 🔍 False Positives وContext Alerts مهمة

### 1) تحديثات ومصادر موثوقة ظاهريا

**Alert ID: `a4bf8e236386`** (Low)  
**Alert ID: `1b39aa7faaef`** (Low)

**التفسير:** ليست incident بحد ذاتها، لكنها بداية قصة الثقة في vendor infrastructure.

### 2) نشاط DNS عام أو متعلق بخدمات مألوفة

**Alert ID: `842100d63da4`** (Low)
```json
{
  "log.original": "2026-04-06 09:02:22 10.20.1.15 A docs.microsoft.com 8.8.8.8 NOERROR"
}
```
**التفسير:** access إلى documentation ليس سلوك عدائي.

**Alert ID: `cbb273ed3ea6`** (Low)
```json
{
  "log.original": "2026-04-06 09:02:31 10.20.1.15 A login.microsoftonline.com 8.8.8.8 NOERROR"
}
```
**التفسير:** authentication-related DNS is normal context.

### 3) نشاط داخلي طبيعي من فرق أخرى

**Alert ID: `10cf4ded5903`** (Low)
```json
{
  "log.original": "2026-04-06 09:03:04 10.20.10.25 A api.telegram.org 1.1.1.1 NOERROR"
}
```
**التفسير:** قد يكون tool أو integration مشروع، ولا يجب خلطه مع main chain إلا لو correlation أثبت غير ذلك.

**Alert ID: `6efa5791e8fb`** (Low)
```json
{
  "log.original": "2026-04-06 09:03:12 10.20.10.25 A update.nodejs.org 1.1.1.1 NOERROR"
}
```
**التفسير:** تحديثات tools/dev dependencies ليست دليل هجوم تلقائيا.

### 4) هجمات أخرى تم منعها

**Alert ID: `9d42896c961e`** (Low / blocked)
```json
{
  "log.original": "2026-04-06 09:06:02 DENY TCP 198.55.44.9:60010 -> 10.20.7.20:443"
}
```
**التفسير:** هجوم خارجي حقيقي لكنه blocked، وبالتالي ليس جزءا من main compromise chain.

**Alert ID: `8ceef2e44863`** (Low / blocked)
```json
{
  "log.original": "2026-04-06 09:06:05 DENY TCP 176.33.14.22:60011 -> 10.20.7.21:443"
}
```
**التفسير:** blocked connection، useful context فقط.

**Alert ID: `ac0a4942ab75`** (Low / blocked)
```json
{
  "log.original": "2026-04-06 09:06:08 DENY TCP 45.190.11.77:3389 -> 10.20.8.30:3389"
}
```
**التفسير:** RDP brute-force blocked; attack observed but not part of main chain.

**Alert ID: `33faf136045d`** (Low / blocked)
```json
{
  "log.original": "2026-04-06 09:06:11 DENY TCP 102.44.21.18:60122 -> 10.20.8.40:8080"
}
```
**التفسير:** another blocked external probe.

---

## 📊 Timeline الكامل للهجوم (مختصر)

```text
09:00:02  updates.orion-vendor.com queried
09:00:06  cdn.orion-vendor.com queried
09:00:18  Orion platform service restarted after update
09:01:08  avsvmcloud.com query appears
09:02:00  outbound HTTPS to 77.91.33.10
09:02:19  beaconing starts every 60 seconds
09:02:30  secondary fallback communication to 185.199.110.153
09:03:04  windows_update_monitor service registered
09:03:28  UpdateTelemetryHealthCheck task created
09:05:32  telemetry bundle archive prepared
09:06:12  large encrypted outbound burst to 77.91.33.10
09:06:23  tasking response received from remote infrastructure
09:06:40  lateral credential probing against admin-vault service
09:07:49  exfiltration toward cloud object endpoint
```

---

## 🚨 لماذا هذا Incident خطير؟

1. البداية تبدو شرعية لأن vector الأساسي هو **trusted update** وليس exploit noisy.
2. الـ payload حافظ على مظهر نظامي من خلال أسماء services/tasks مقنعة.
3. وجود **beaconing + persistence + tasking + lateral probing + exfiltration** يعني إن الهجوم اكتمل تقريبا من منظور attacker lifecycle.
4. في supply chain incidents، الثقة في vendor تجعل الـ detection أصعب من ransomware التقليدي.

---

## ✅ أولويات الاستجابة (SOC)

1. عزل host `10.20.1.15` فورا من الشبكة.
2. حظر `77.91.33.10` و `185.199.110.153` على perimeter controls وproxy/DNS.
3. فحص Orion platform integrity والتأكد من سلامة update pipeline.
4. Hunt سريع على مؤشرات:
   - `avsvmcloud.com`
   - `windows_update_monitor`
   - `UpdateTelemetryHealthCheck`
   - beaconing كل 60 ثانية
   - encrypted outbound stream
5. مراجعة كل الأنظمة التي اتصلت بنفس infrastructure أو استخدمت نفس update source.
6. Reset credentials وتقوية segmentation لأن probing الداخلي بدأ بالفعل.

---

## 🧠 الدرس المستفاد

- الهجوم لا يبدأ دائما من exploit مباشر؛ أحيانا يبدأ من **ثقة غير مُراقبة**.
- لازم نفرّق بين update عادي وبين update chain تم اختراقه.
- correlation بين DNS + service restart + beaconing + persistence + exfiltration هو المفتاح الحقيقي للفهم.
- في supply chain attacks، الـ prevention أهم من detection فقط، لأن المهاجم يستغل الثقة نفسها.