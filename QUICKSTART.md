# 🎮 Cyber-Escape-Simulator: Blue Team Edition

## 🚀 البدء السريع

### الخطوة 1: تشغيل معالج اللوجات
```bash
node processAllLogs.js level2
```

هذا الأمر:
- 📖 يقرأ اللوجات من 9 ملفات مختلفة
- 📝 يحلل ويكتشف نوع كل سطر تلقائياً
- 🔄 يطبع البيانات بـ ECS Schema
- ⚠️  ينشئ Alerts ذات Severity صحيحة
- 🎨 ينسخ كل شيء للـ Frontend

### الخطوة 2: تشغيل السيرفر
```bash
cd SIEM/Backend/src
node server.js
```

### الخطوة 3: فتح الـ Dashboard
```
http://localhost:3000/
```

---

## 📊 أنواع اللوجات المدعومة

| النوع | الملف | الغرض |
|------|------|-------|
| 🔥 Firewall | firewall.log | حركة الشبكة المسموحة والمرفوضة |
| 🪟 Windows | windows.log | أحداث الأمان والـ authentication |
| 🌐 DNS | dns.log | استعلامات DNS والمجالات المشبوهة |
| 🚨 IDS | ids.log | تنبيهات الاختراق والتهديدات |
| 🔐 SSH | ssh.log | محاولات تسجيل الدخول والقوة الغاشمة |
| 🌍 Web Server | webserver.log | الوصول للـ HTTP والـ SQL injection |
| 🗄️  Database | database.log | الاستعلامات والتعديلات على البيانات |
| 🔌 VPN | vpn.log | اتصالات الـ VPN والجلسات |
| 📡 Proxy | proxy.log | حركة الإنترنت والتنزيلات |

---

## 🧪 اختبار سريع

لمعرفة حالة المعالجة:
```bash
node quickTest.js
```

يظهر:
- ✅ عدد ملفات اللوجات
- ✅ عدد السجلات المحللة
- ✅ عدد البيانات المطبعة
- ✅ عدد الأنذارات
- ✅ توزيع الخطورة (High/Medium/Low)

---

## 📁 بنية المجلدات

```
Cyber-Escape-SimulatorBlueTeam/
├── processAllLogs.js          ← شغّل هذا!
├── quickTest.js               ← اختبر هذا!
├── LOG_TYPES_SUPPORT.md       ← شرح الأنواع
├── LOG_PROCESSING_GUIDE.md    ← دليل معالجة كامل
│
├── SIEM/
│   ├── Backend/
│   │   └── src/
│   │       ├── server.js      ← السيرفر الرئيسي
│   │       ├── core/
│   │       │   ├── ingestion/     ← قراءة الملفات
│   │       │   ├── parser/        ← تحليل اللوجات
│   │       │   ├── normalization/ ← تطبيع البيانات
│   │       │   └── Alert Generator/ ← إنشاء Alerts
│   │       └── api/
│   │
│   ├── Data/
│   │   └── levels/
│   │       └── level2/
│   │           └── logs/          ← ملفات اللوجات (9 أنواع)
│   │
│   └── Frontend/
│       └── src/
│           ├── pages/
│           │   ├── Alerts.html    ← واجهة الـ Dashboard
│           │   ├── script.js      ← منطق التفاعل
│           │   └── style.css      ← التصميم
│           └── data/
│               └── level2/
│                   └── alerts.json ← البيانات المعالجة ✅
```

---

## 🎯 السيناريوهات المدعومة

### 1. Brute Force Attack 🔓
```
5+ Failed SSH/Windows login attempts من نفس IP
Alert Type: failed_authentication
Severity: MEDIUM
```

### 2. Malware C2 Communication ☠️
```
DNS queries لـ malware domains
+ IDS alerts للـ suspicious traffic
Alert Type: intrusion_alert
Severity: HIGH
```

### 3. SQL Injection Attack 💉
```
Web server logs مع SQL patterns
+ Database audit logs
Alert Type: sql_injection
Severity: HIGH
```

### 4. Data Exfiltration 📤
```
Large database SELECT queries
+ Database DELETE/DROP operations
Alert Type: data_exfiltration
Severity: HIGH
```

---

## ⚙️ كيفية إضافة لوجات جديدة

### الطريقة 1: أضف في ملف موجود
```bash
echo '2025-12-07 09:20:00 ALLOW TCP 192.168.1.150:55000 -> 10.0.0.100:443' >> SIEM/Data/levels/level2/logs/firewall.log
```

### الطريقة 2: أنشئ نوع لوج جديد
1. أضف ملف جديد في `logs/` مثل `newtype.log`
2. أضف Parser في `parser.js`
3. أضف Mapping في `mappings.js`
4. شغّل `processAllLogs.js` مرة أخرى

---

## 🎮 استخدام الـ Dashboard

### الفلترة
- 🕐 Filter by Time (آخر 5 دقائق، ساعة، يوم)
- 🔴 Filter by Severity (High, Medium, Low)
- 🔍 Filter by IP (Source/Destination)
- 📝 Search in Logs

### التحليل
- ➕ Add alerts إلى Evidence
- 📝 Add Notes لكل alert
- 🔗 View Linked Alerts
- 📁 Export Evidence كـ JSON
- 📊 View Timeline

### الإحصائيات
- 📈 Threat Summary (عدد الأنذارات)
- 🥧 Severity Pie Chart
- 📝 Investigation Status (Progress)
- 🕐 Analyst Actions Log

---

## 🔧 التخصيص والإضافات

### تغيير قواعس Severity
في `alertGenerator.js`:
```javascript
function determineSeverity(log, alertType) {
  if (/brute.force|sql.injection|malware/i.test(raw)) {
    return 'high';
  }
  // ... add more rules
}
```

### إضافة نوع Alert جديد
في `alertGenerator.js`:
```javascript
function determineAlertType(log) {
  if (log['event.category'] === 'custom') {
    return 'custom_alert_type';
  }
  // ... add more types
}
```

---

## 📚 الدلائل الكاملة

- 📖 **LOG_TYPES_SUPPORT.md** - شرح تفصيلي لجميع 9 أنواع لوجات
- 📖 **LOG_PROCESSING_GUIDE.md** - دليل المعالجة خطوة بخطوة

---

## 🐛 استكشاف الأخطاء

### المشكلة: "No log files found"
```bash
# تأكد من الملفات:
ls SIEM/Data/levels/level2/logs/
```

### المشكلة: "Module not found"
```bash
# تأكد من المسارات النسبية:
cd Cyber-Escape-SimulatorBlueTeam
node processAllLogs.js level2
```

### المشكلة: Dashboard فارغ
```bash
# شغّل processAllLogs.js:
node processAllLogs.js level2

# ثم أعد تحميل الـ page
http://localhost:3000/
```

---

## ✅ Checklist قبل اللعب

- [ ] Clone أو تحميل المشروع
- [ ] الملفات في `levels/level2/logs/` موجودة
- [ ] تشغيل `processAllLogs.js level2`
- [ ] تشغيل السيرفر
- [ ] Dashboard يعرض الـ alerts
- [ ] يمكنك اختيار alerts وإضافتها لـ Evidence
- [ ] يمكنك عرض الـ linked logs

---

## 🎯 الهدف من اللعبة

كـ Blue Team (الدفاع)، مهمتك:

1. 👁️ **لاحظ** جميع الأنذارات
2. 🔍 **حقّق** وحدد الأنشطة المشبوهة
3. 📝 **وثّق** الأدلة والملاحظات
4. 🔗 **ربط** الأحداث المرتبطة
5. 📊 **حلّل** الخط الزمني
6. 📁 **صدّر** التقارير

---

## 📞 الدعم والمساعدة

- تحقق من **LOG_PROCESSING_GUIDE.md** للأسئلة الشائعة
- شغّل **quickTest.js** للتشخيص السريع
- افحص **browser console** للأخطاء

---

## 🎉 Ready to Play?

```bash
# 1. معالجة اللوجات
node processAllLogs.js level2

# 2. السيرفر
cd SIEM/Backend/src && node server.js

# 3. الـ Dashboard
http://localhost:3000/

# 4. Investigation! 🎮
```

**اتمنى لك تحقيقات ناجحة!** 🚀

