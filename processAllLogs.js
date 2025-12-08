#!/usr/bin/env node

/**
 * processAllLogs.js
 * ملف معالجة شاملة لجميع أنواع اللوجات
 * يقرأ اللوجات -> يحللها -> يطبعها -> ينشئ alerts.json
 */

const fs = require('fs').promises;
const path = require('path');

// استيراد الدوال
const { readLogFiles } = require('./src/core/ingestion/fileReader');
const { parseLogFile } = require('./src/core/parser/parser');
const { normalizeLogs } = require('./src/core/normalization/normalizer');
const { generateAlerts } = require('./src/core/Alert Generator/alertGenerator');

/**
 * نقطة الدخول الرئيسية
 */
async function processAllLogsLevel(level) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 بدء معالجة جميع اللوجات للـ ${level}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Step 1: Ingestion - قراءة الملفات
    console.log(`📖 [Step 1] Ingestion - قراءة الملفات الخام`);
    console.log(`════════════════════════════════════════════`);
    
    const logsDir = path.join(__dirname, `SIEM/Data/levels/${level}/logs`);
    const files = (await fs.readdir(logsDir)).filter(f => f.endsWith('.log'));
    
    console.log(`✅ تم العثور على ${files.length} ملفات لوج:`);
    files.forEach(f => console.log(`   • ${f}`));
    
    // Step 2: Parsing - تحليل كل ملف
    console.log(`\n📝 [Step 2] Parsing - تحليل الملفات`);
    console.log(`════════════════════════════════════════════`);
    
    let totalLogs = 0;
    for (const file of files) {
      const filePath = path.join(logsDir, file);
      console.log(`\n🔍 تحليل: ${file}`);
      
      try {
        const parsed = await parseLogFile(filePath);
        totalLogs += parsed.length;
        console.log(`   ✅ تم تحليل ${parsed.length} سطر من الـ logs`);
      } catch (err) {
        console.log(`   ❌ خطأ: ${err.message}`);
      }
    }
    
    console.log(`\n✅ إجمالي الـ logs المحللة: ${totalLogs}`);
    
    // Step 3: Normalization - تطبيع البيانات
    console.log(`\n🔄 [Step 3] Normalization - تطبيع البيانات بـ ECS Schema`);
    console.log(`════════════════════════════════════════════`);
    
    try {
      const normalized = await normalizeLogs(level);
      console.log(`✅ تم تطبيع ${normalized.length} سجل`);
      
      // عرض عينة من البيانات
      if (normalized.length > 0) {
        console.log(`\n📊 عينة من البيانات المطبعة:`);
        const sample = normalized[0];
        console.log(`   - Event Type: ${sample['event.type']}`);
        console.log(`   - Event Action: ${sample['event.action']}`);
        console.log(`   - Source IP: ${sample['source.ip']}`);
        console.log(`   - Timestamp: ${sample['@timestamp']}`);
      }
    } catch (err) {
      console.log(`❌ خطأ في التطبيع: ${err.message}`);
    }
    
    // Step 4: Alert Generation - إنشاء Alerts
    console.log(`\n⚠️  [Step 4] Alert Generation - إنشاء الأنذارات`);
    console.log(`════════════════════════════════════════════`);
    
    try {
      await generateAlerts(level);
      
      // قراءة الـ alerts للتحقق
      const alertsPath = path.join(__dirname, `SIEM/Backend/src/core/Alert Generator/storage/${level}/alerts.json`);
      const alertsData = await fs.readFile(alertsPath, 'utf8');
      const alerts = JSON.parse(alertsData);
      
      console.log(`✅ تم إنشاء ${alerts.length} تنبيه`);
      
      // إحصائيات
      const severityCount = { high: 0, medium: 0, low: 0 };
      const typeCount = {};
      
      alerts.forEach(alert => {
        severityCount[alert.severity]++;
        typeCount[alert.alert_type] = (typeCount[alert.alert_type] || 0) + 1;
      });
      
      console.log(`\n📊 إحصائيات الأنذارات:`);
      console.log(`   🔴 High:   ${severityCount.high}`);
      console.log(`   🟡 Medium: ${severityCount.medium}`);
      console.log(`   🟢 Low:    ${severityCount.low}`);
      
      console.log(`\n📋 أنواع التنبيهات:`);
      Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`   • ${type}: ${count}`);
      });
    } catch (err) {
      console.log(`❌ خطأ في إنشاء الأنذارات: ${err.message}`);
    }
    
    // Step 5: Frontend Display Preparation
    console.log(`\n🎨 [Step 5] إعداد البيانات للـ Frontend`);
    console.log(`════════════════════════════════════════════`);
    
    try {
      // نسخ alerts.json للـ Frontend
      const backendPath = path.join(__dirname, `SIEM/Backend/src/core/Alert Generator/storage/${level}/alerts.json`);
      const frontendPath = path.join(__dirname, `SIEM/Frontend/src/pages/data/${level}/alerts.json`);
      
      await fs.mkdir(path.dirname(frontendPath), { recursive: true });
      await fs.copyFile(backendPath, frontendPath);
      
      console.log(`✅ تم نسخ الـ alerts إلى Frontend`);
      console.log(`   📍 ${frontendPath}`);
    } catch (err) {
      console.log(`❌ خطأ في نسخ البيانات: ${err.message}`);
    }
    
    // Final Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ اكتملت المعالجة بنجاح!`);
    console.log(`${'='.repeat(80)}`);
    console.log(`\n🎮 الآن يمكنك الوصول للـ Dashboard:`);
    console.log(`   📍 http://localhost:3000/?level=${level}`);
    console.log(`\n`);
    
  } catch (err) {
    console.error(`\n❌ خطأ عام: ${err.message}`);
    process.exit(1);
  }
}

/**
 * معالجة جميع الـ levels
 */
async function processAllLevels() {
  const levels = ['level1', 'level2', 'level3'];
  
  for (const level of levels) {
    try {
      await processAllLogsLevel(level);
    } catch (err) {
      console.error(`خطأ في معالجة ${level}: ${err.message}`);
    }
  }
}

// تحديد أي level يتم معالجته
const args = process.argv.slice(2);
const level = args[0] || 'level2';

if (level === 'all') {
  processAllLevels().catch(console.error);
} else {
  processAllLogsLevel(level).catch(console.error);
}
