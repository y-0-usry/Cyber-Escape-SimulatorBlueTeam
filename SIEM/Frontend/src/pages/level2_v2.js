// === LEVEL 2: INSIDER THREAT INVESTIGATION - REBUILD ===
// Static questions based on Answer Key for consistent evaluation

// === GLOBAL STATE ===
let alerts = [];
let score = 0;
let hintsUsed = 0;
let freeHints = 0;
let attempts = 3;
let timerSeconds = 20 * 60;
let startTime = 0;
let timerId = null;
let correctAnswers = 0;
let totalQuestions = 0;
let timeExtensions = 0;
let impactLevel = 0;
let impactInterval = null;

// === STATIC QUESTIONS - Phase 1 (Based on Answer Key) ===
const PHASE1_QUESTIONS = [
  // Q1-Q6: Key True Positives
  {
    id: 'q1-git-clone',
    type: 'select',
    title: 'Q1: Git Clone (Large - 4.8GB) from sarah.mitchell',
    description: 'Developer cloned repository outside normal workflow, extremely large size',
    options: [
      { value: 'true_positive', label: 'True Positive (Malicious)' },
      { value: 'false_positive', label: 'False Positive (Benign)' },
      { value: 'needs_context', label: 'Needs More Context' }
    ],
    answer: 'true_positive',
    hint: 'Outside normal developer workflow + Extremely large repository size = HIGH severity'
  },
  {
    id: 'q2-hr-access',
    type: 'select',
    title: 'Q2: HR Repository Access (Outside Role)',
    description: 'Developer accessing HR employee database - clear role violation',
    options: [
      { value: 'true_positive', label: 'True Positive (Malicious)' },
      { value: 'false_positive', label: 'False Positive (Benign)' },
      { value: 'needs_context', label: 'Needs More Context' }
    ],
    answer: 'true_positive',
    hint: 'Developer accessing HR employee database = Clear role violation (HIGH severity)'
  },
  {
    id: 'q3-file-read',
    type: 'select',
    title: 'Q3: Massive File Read (4,823 files, 2.1GB)',
    description: 'Bulk data collection pattern with sequential read operation',
    options: [
      { value: 'true_positive', label: 'True Positive (Malicious)' },
      { value: 'false_positive', label: 'False Positive (Benign)' },
      { value: 'needs_context', label: 'Needs More Context' }
    ],
    answer: 'true_positive',
    hint: 'Bulk data collection pattern + Sequential read = HIGH severity'
  },
  {
    id: 'q4-zip-creation',
    type: 'select',
    title: 'Q4: ZIP Archive Creation (1.9GB)',
    description: 'Archiving collected data - preparation for exfiltration',
    options: [
      { value: 'true_positive', label: 'True Positive (Malicious)' },
      { value: 'false_positive', label: 'False Positive (Benign)' },
      { value: 'needs_context', label: 'Needs More Context' }
    ],
    answer: 'true_positive',
    hint: 'Archiving collected data = Preparation for exfiltration (CRITICAL)'
  },
  {
    id: 'q5-google-drive',
    type: 'select',
    title: 'Q5: Google Drive Upload (Success - 1.9GB)',
    description: 'Personal cloud account upload (not corporate) - large data exfiltration',
    options: [
      { value: 'true_positive', label: 'True Positive (Malicious)' },
      { value: 'false_positive', label: 'False Positive (Benign)' },
      { value: 'needs_context', label: 'Needs More Context' }
    ],
    answer: 'true_positive',
    hint: 'Personal cloud account + Large data exfiltration = CRITICAL'
  },
  {
    id: 'q6-dlp-block',
    type: 'select',
    title: 'Q6: DLP Block - Cloud Upload',
    description: 'Sensitive data patterns detected - attempted exfiltration',
    options: [
      { value: 'true_positive', label: 'True Positive (Malicious)' },
      { value: 'false_positive', label: 'False Positive (Benign)' },
      { value: 'needs_context', label: 'Needs More Context' }
    ],
    answer: 'true_positive',
    hint: 'Sensitive data patterns detected = Attempted exfiltration (HIGH)'
  },
  
  // Q7-Q12: Key False Positives
  {
    id: 'q7-devops-backup',
    type: 'select',
    title: 'Q7: DevOps CI/CD Backup (Automated 3.2GB Git mirror)',
    description: 'Service account (SVC_DevOps) - scheduled backup - approved automation',
    options: [
      { value: 'true_positive', label: 'True Positive (Malicious)' },
      { value: 'false_positive', label: 'False Positive (Benign)' },
      { value: 'needs_context', label: 'Needs More Context' }
    ],
    answer: 'false_positive',
    hint: 'Service account + Scheduled backup + Approved automation = Benign'
  },
  {
    id: 'q8-hr-payroll',
    type: 'select',
    title: 'Q8: HR Payroll Export (482MB)',
    description: 'HR team member (jennifer.adams) - legitimate job function - approved export',
    options: [
      { value: 'true_positive', label: 'True Positive (Malicious)' },
      { value: 'false_positive', label: 'False Positive (Benign)' },
      { value: 'needs_context', label: 'Needs More Context' }
    ],
    answer: 'false_positive',
    hint: 'HR team member + Legitimate job function = Benign'
  },
  {
    id: 'q9-onedrive-sync',
    type: 'select',
    title: 'Q9: OneDrive Corporate Sync (1.8GB)',
    description: 'Corporate OneDrive account - standard sync operation - business hours',
    options: [
      { value: 'true_positive', label: 'True Positive (Malicious)' },
      { value: 'false_positive', label: 'False Positive (Benign)' },
      { value: 'needs_context', label: 'Needs More Context' }
    ],
    answer: 'false_positive',
    hint: 'Corporate OneDrive + Standard sync + Business hours = Benign'
  },
  {
    id: 'q10-it-usb',
    type: 'select',
    title: 'Q10: IT Support USB Usage',
    description: 'IT support role - ticket number (INC-2024-0145) - documented purpose',
    options: [
      { value: 'true_positive', label: 'True Positive (Malicious)' },
      { value: 'false_positive', label: 'False Positive (Benign)' },
      { value: 'needs_context', label: 'Needs More Context' }
    ],
    answer: 'false_positive',
    hint: 'IT support role + Ticket number + Documented = Benign'
  },
  {
    id: 'q11-db-backup',
    type: 'select',
    title: 'Q11: Database Backup Job (2.4GB)',
    description: 'Service account (SVC_SQLBackup) - scheduled (02:00) - standard backup',
    options: [
      { value: 'true_positive', label: 'True Positive (Malicious)' },
      { value: 'false_positive', label: 'False Positive (Benign)' },
      { value: 'needs_context', label: 'Needs More Context' }
    ],
    answer: 'false_positive',
    hint: 'Service account + Scheduled overnight + Standard backup = Benign'
  },
  {
    id: 'q12-dev-overtime',
    type: 'select',
    title: 'Q12: Developer Overtime (VPN 20:45)',
    description: 'Approved ticket (CHG-2024-0089) - production deployment - documented purpose',
    options: [
      { value: 'true_positive', label: 'True Positive (Malicious)' },
      { value: 'false_positive', label: 'False Positive (Benign)' },
      { value: 'needs_context', label: 'Needs More Context' }
    ],
    answer: 'false_positive',
    hint: 'Approved ticket + Production deployment = Benign'
  },
  
  // Q13: Multi-Select False Positives
  {
    id: 'q13-fp-multiselect',
    type: 'multiselect',
    title: 'Q13: Which of these are FALSE POSITIVES? (Select all that apply)',
    description: 'Identify legitimate business operations',
    options: [
      { value: 'devops_backup', label: 'DevOps CI/CD backup (SVC_DevOps)', isCorrect: true },
      { value: 'hr_payroll', label: 'HR payroll export (HR team member)', isCorrect: true },
      { value: 'onedrive_sync', label: 'Corporate OneDrive sync', isCorrect: true },
      { value: 'it_usb', label: 'IT support USB (ticket INC-2024-0145)', isCorrect: true },
      { value: 'db_backup', label: 'Database backup (SVC_SQLBackup)', isCorrect: true },
      { value: 'dev_overtime', label: 'Developer overtime (ticket CHG-2024-0089)', isCorrect: true },
      { value: 'git_clone', label: 'Git clone (4.8GB from sarah.mitchell)', isCorrect: false },
      { value: 'hr_access', label: 'HR repo access (outside role)', isCorrect: false },
      { value: 'google_drive', label: 'Google Drive upload (1.9GB)', isCorrect: false }
    ],
    correctCount: 6,
    minCorrect: 4,
    hint: 'Look for: Service accounts (SVC_*), Tickets (INC-*, CHG-*), Scheduled jobs, Business roles'
  },
  
  // Q14: Top 5 Priority Alerts
  {
    id: 'q14-top5',
    type: 'multiselect',
    title: 'Q14: Select the TOP 5 alerts requiring immediate investigation',
    description: 'Focus on data exfiltration, role violations, and DLP blocks',
    options: [
      { value: 'google_drive', label: 'Google Drive upload (1.9GB to personal account)', isCorrect: true, priority: 10 },
      { value: 'dlp_block', label: 'DLP block - sensitive data', isCorrect: true, priority: 9 },
      { value: 'hr_access', label: 'HR repo access (outside role)', isCorrect: true, priority: 8 },
      { value: 'git_clone', label: 'Git clone (4.8GB repository)', isCorrect: true, priority: 7 },
      { value: 'zip_creation', label: 'ZIP archive creation (1.9GB)', isCorrect: true, priority: 6 },
      { value: 'file_read', label: 'Massive file read (4,823 files)', isCorrect: true, priority: 5 },
      { value: 'devops_backup', label: 'DevOps backup (scheduled)', isCorrect: false },
      { value: 'hr_payroll', label: 'HR payroll export (approved)', isCorrect: false }
    ],
    correctCount: 5,
    minCorrect: 3,
    hint: 'Prioritize: Data exfiltration > Role violations > DLP blocks'
  },
  
  // Q15: Correlation
  {
    id: 'q15-correlation',
    type: 'select',
    title: 'Q15: Are these alerts part of the SAME incident or SEPARATE incidents?',
    description: 'Consider: Git clone, HR access, file reads, ZIP creation, Google Drive upload, DLP blocks',
    options: [
      { value: 'same', label: 'Same incident (coordinated attack chain)' },
      { value: 'separate', label: 'Separate unrelated incidents' },
      { value: 'unclear', label: 'Unclear - need more investigation' }
    ],
    answer: 'same',
    hint: 'Look at: Same user (sarah.mitchell), Timeline sequence, Attack pattern (collect → archive → exfiltrate)'
  },
  
  // Q16: Behavior Analysis
  {
    id: 'q16-behavior',
    type: 'select',
    title: 'Q16: Which behavior is MOST suspicious?',
    description: 'Single indicators vs. combined patterns',
    options: [
      { value: 'large_data', label: 'Large data access' },
      { value: 'off_hours', label: 'Off-hours activity' },
      { value: 'non_role', label: 'Non-role resource access' },
      { value: 'combination', label: 'Combination of all' }
    ],
    answer: 'combination',
    hint: 'Individually legitimate indicators become suspicious when combined'
  },
  
  // Q17: MITRE Mapping
  {
    id: 'q17-mitre',
    type: 'select',
    title: 'Q17: Which MITRE ATT&CK technique best matches this attack?',
    description: 'Consider: Valid credentials, no malware, legitimate tools',
    options: [
      { value: 'T1078', label: 'T1078 – Valid Accounts' },
      { value: 'T1486', label: 'T1486 – Data Encrypted for Impact' },
      { value: 'T1190', label: 'T1190 – Exploit Public-Facing Application' },
      { value: 'T1046', label: 'T1046 – Network Service Discovery' }
    ],
    answer: 'T1078',
    hint: 'Attacker using legitimate credentials (sarah.mitchell) - no exploitation needed'
  },
  
  // Q18: Hypothesis
  {
    id: 'q18-hypothesis',
    type: 'select',
    title: 'Q18: What best describes this situation?',
    description: 'Overall assessment of the incident',
    options: [
      { value: 'isolated', label: 'Isolated alerts requiring individual investigation' },
      { value: 'misconfiguration', label: 'System misconfiguration causing false alerts' },
      { value: 'insider_threat', label: 'Insider threat - internal user stealing data' },
      { value: 'external_attack', label: 'External attack campaign' }
    ],
    answer: 'insider_threat',
    hint: 'Valid credentials + Purposeful actions + Role violations + Data exfiltration'
  }
];

// === STATIC QUESTIONS - Phase 2 (Scenario) ===
const PHASE2_QUESTIONS = [
  {
    id: 'sc-attack-type',
    type: 'text',
    title: 'Q1: What type of attack occurred? (1-2 words)',
    hint: 'Internal user + Valid credentials + Data theft',
    patterns: ['insider.*threat', 'data.*exfiltration', 'insider.*theft', 'internal.*breach', 
               'تهديد.*داخلي', 'تسريب.*بيانات', 'سرقة.*بيانات']
  },
  {
    id: 'sc-evidence',
    type: 'multiselect',
    title: 'Q2: Select TWO pieces of evidence supporting your conclusion',
    options: [
      { value: 'valid_creds', label: 'Valid credentials used (no account compromise)', isCorrect: true },
      { value: 'no_malware', label: 'No malware traces (legitimate tools only)', isCorrect: true },
      { value: 'unusual_behavior', label: 'Unusual user behavior (role violations, off-hours)', isCorrect: true },
      { value: 'external_ip', label: 'External IP reputation', isCorrect: false }
    ],
    minCorrect: 2
  },
  {
    id: 'sc-mitre-techniques',
    type: 'multiselect',
    title: 'Q3: Which MITRE ATT&CK techniques apply? (Select ALL)',
    options: [
      { value: 'T1078', label: 'T1078 – Valid Accounts', isCorrect: true },
      { value: 'T1560', label: 'T1560 – Archive Collected Data', isCorrect: true },
      { value: 'T1567', label: 'T1567 – Exfiltration Over Web Service', isCorrect: true },
      { value: 'T1486', label: 'T1486 – Data Encrypted for Impact', isCorrect: false }
    ],
    minCorrect: 3
  },
  {
    id: 'sc-timeline',
    type: 'select',
    title: 'Q4: What happened FIRST in the attack chain?',
    options: [
      { value: 'repo_access', label: 'Repository access attempt' },
      { value: 'zip_creation', label: 'ZIP file creation' },
      { value: 'cloud_upload', label: 'Cloud upload' },
      { value: 'dlp_alert', label: 'DLP alert' }
    ],
    answer: 'repo_access',
    hint: 'Review the timeline from earliest event'
  },
  {
    id: 'sc-not-ransomware',
    type: 'multiselect',
    title: 'Q5: Why is this NOT a ransomware attack? (Select all)',
    options: [
      { value: 'no_encryption', label: 'No file encryption', isCorrect: true },
      { value: 'no_ransom', label: 'No ransom note', isCorrect: true },
      { value: 'legit_access', label: 'Legitimate user access', isCorrect: true },
      { value: 'data_theft', label: 'Data theft, not destruction', isCorrect: true }
    ],
    minCorrect: 2
  },
  {
    id: 'sc-impact',
    type: 'select',
    title: 'Q6: What is the primary business impact?',
    options: [
      { value: 'confidentiality', label: 'Data confidentiality breach' },
      { value: 'availability', label: 'Service availability impact' },
      { value: 'financial', label: 'Financial fraud' },
      { value: 'defacement', label: 'Website defacement' }
    ],
    answer: 'confidentiality',
    hint: 'Focus on CIA triad - what was compromised?'
  },
  {
    id: 'sc-failed-attack',
    type: 'select',
    title: 'Q7: Which represents a FAILED external attack (not related)?',
    options: [
      { value: 'ssh_bruteforce', label: 'External SSH brute-force (blocked)' },
      { value: 'git_clone_failed', label: 'Git clone attempt (failed)' },
      { value: 'dlp_block', label: 'DLP block - cloud upload' },
      { value: 'port_scan', label: 'Port scan (blocked)' }
    ],
    answer: 'ssh_bruteforce',
    hint: 'External threats vs internal threats'
  },
  {
    id: 'sc-soc-decision',
    type: 'select',
    title: 'Q8: What should the SOC do FIRST?',
    options: [
      { value: 'disable_access', label: 'Disable user access immediately' },
      { value: 'scan_endpoints', label: 'Scan all endpoints for malware' },
      { value: 'block_ips', label: 'Block external IP addresses' },
      { value: 'av_scan', label: 'Run full antivirus scan' }
    ],
    answer: 'disable_access',
    hint: 'Immediate containment for insider threats'
  }
];

// Export for use
window.PHASE1_QUESTIONS = PHASE1_QUESTIONS;
window.PHASE2_QUESTIONS = PHASE2_QUESTIONS;
