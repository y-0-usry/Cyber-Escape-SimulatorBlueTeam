#!/usr/bin/env node

/**
 * quickTest.js
 * اختبار سريع لتتبع عملية المعالجة خطوة بخطوة
 */

const fs = require('fs').promises;
const path = require('path');

async function testPipeline() {
  console.log(`\n${'█'.repeat(80)}`);
  console.log(`🔬 اختبار سريع لـ SIEM Log Processing Pipeline`);
  console.log(`${'█'.repeat(80)}\n`);

  const level = 'level2';
  const baseDir = path.join(__dirname, 'SIEM/Data/levels', level, 'logs');

  try {
    // Test 1: Check Log Files
    console.log(`✅ [Test 1] التحقق من ملفات اللوجات`);
    console.log(`─────────────────────────────────────────────`);
    
    const files = await fs.readdir(baseDir);
    const logFiles = files.filter(f => f.endsWith('.log'));
    
    console.log(`📁 عدد ملفات اللوجات: ${logFiles.length}`);
    
    let totalLines = 0;
    for (const file of logFiles) {
      const content = await fs.readFile(path.join(baseDir, file), 'utf8');
      const lines = content.split('\n').filter(l => l.trim()).length;
      totalLines += lines;
      console.log(`   • ${file}: ${lines} سطر`);
    }
    
    console.log(`\n   📊 إجمالي الأسطر: ${totalLines}\n`);

    // Test 2: Check Parsed Data
    console.log(`✅ [Test 2] التحقق من البيانات المحللة`);
    console.log(`─────────────────────────────────────────────`);
    
    const parsedDir = path.join(__dirname, `SIEM/Backend/src/core/parser/storage/parsed/${level}`);
    let parsedCount = 0;
    
    try {
      const parsedFiles = await fs.readdir(parsedDir);
      const jsonFiles = parsedFiles.filter(f => f.endsWith('.json'));
      
      console.log(`📁 عدد ملفات البيانات المحللة: ${jsonFiles.length}`);
      
      for (const file of jsonFiles) {
        const content = await fs.readFile(path.join(parsedDir, file), 'utf8');
        const data = JSON.parse(content);
        const count = Array.isArray(data) ? data.length : 1;
        parsedCount += count;
        console.log(`   • ${file}: ${count} سجل`);
      }
      
      console.log(`\n   📊 إجمالي السجلات المحللة: ${parsedCount}\n`);
    } catch (err) {
      console.log(`   ⚠️  لم يتم العثور على البيانات المحللة (شغّل processAllLogs.js أولاً)\n`);
    }

    // Test 3: Check Normalized Data
    console.log(`✅ [Test 3] التحقق من البيانات المطبعة`);
    console.log(`─────────────────────────────────────────────`);
    
    const normalizedFile = path.join(__dirname, `SIEM/Backend/src/core/normalization/storage/normalized/${level}/all_normalized.json`);
    
    try {
      const normalizedContent = await fs.readFile(normalizedFile, 'utf8');
      const normalized = JSON.parse(normalizedContent);
      const normalizedCount = Array.isArray(normalized) ? normalized.length : 1;
      
      console.log(`📊 البيانات المطبعة: ${normalizedCount} سجل`);
      
      if (normalizedCount > 0) {
        const sample = normalized[0];
        console.log(`\n   📋 عينة من البيانات:`);
        console.log(`   • Event Type: ${sample['event.type']}`);
        console.log(`   • Event Action: ${sample['event.action']}`);
        console.log(`   • Source IP: ${sample['source.ip']}`);
        console.log(`   • Observer Type: ${sample['observer.type']}`);
      }
      
      console.log();
    } catch (err) {
      console.log(`   ⚠️  لم يتم العثور على البيانات المطبعة (شغّل processAllLogs.js أولاً)\n`);
    }

    // Test 4: Check Alerts
    console.log(`✅ [Test 4] التحقق من الأنذارات`);
    console.log(`─────────────────────────────────────────────`);
    
    const alertsFile = path.join(__dirname, `SIEM/Backend/src/core/Alert Generator/storage/${level}/alerts.json`);
    
    try {
      const alertsContent = await fs.readFile(alertsFile, 'utf8');
      const alerts = JSON.parse(alertsContent);
      const alertsCount = Array.isArray(alerts) ? alerts.length : 1;
      
      console.log(`⚠️  عدد الأنذارات: ${alertsCount}`);
      
      const severityCounts = { high: 0, medium: 0, low: 0 };
      const typeCounts = {};
      
      alerts.forEach(alert => {
        severityCounts[alert.severity]++;
        typeCounts[alert.alert_type] = (typeCounts[alert.alert_type] || 0) + 1;
      });
      
      console.log(`\n   📊 توزيع الخطورة:`);
      console.log(`   🔴 High:   ${severityCounts.high}`);
      console.log(`   🟡 Medium: ${severityCounts.medium}`);
      console.log(`   🟢 Low:    ${severityCounts.low}`);
      
      console.log(`\n   📋 أنواع الأنذارات:`);
      Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        console.log(`   • ${type}: ${count}`);
      });
      
      console.log(`\n   📍 الملف: ${alertsFile}\n`);
    } catch (err) {
      console.log(`   ⚠️  لم يتم العثور على الأنذارات (شغّل processAllLogs.js أولاً)\n`);
    }

    // Test 5: Check Frontend Data
    console.log(`✅ [Test 5] التحقق من بيانات Frontend`);
    console.log(`─────────────────────────────────────────────`);
    
    const frontendFile = path.join(__dirname, `SIEM/Frontend/src/pages/data/${level}/alerts.json`);
    
    try {
      const frontendContent = await fs.readFile(frontendFile, 'utf8');
      const frontendAlerts = JSON.parse(frontendContent);
      const frontendCount = Array.isArray(frontendAlerts) ? frontendAlerts.length : 1;
      
      console.log(`✅ بيانات Frontend موجودة: ${frontendCount} تنبيه`);
      console.log(`   📍 ${frontendFile}\n`);
    } catch (err) {
      console.log(`   ⚠️  بيانات Frontend غير موجودة (شغّل processAllLogs.js أولاً)\n`);
    }

    // Summary
    console.log(`${'█'.repeat(80)}`);
    console.log(`📊 الملخص`);
    console.log(`${'█'.repeat(80)}\n`);
    
    console.log(`✅ الخطوات للبدء:`);
    console.log(`\n1. شغّل معالج اللوجات:`);
    console.log(`   $ node processAllLogs.js level2\n`);
    
    console.log(`2. ابدأ السيرفر:`);
    console.log(`   $ cd SIEM/Backend/src && node server.js\n`);
    
    console.log(`3. افتح الـ Dashboard:`);
    console.log(`   🌐 http://localhost:3000/\n`);
    
    console.log(`${'█'.repeat(80)}\n`);

  } catch (err) {
    console.error(`\n❌ خطأ: ${err.message}\n`);
    process.exit(1);
  }
}

testPipeline();
