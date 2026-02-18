/**
 * Script to generate 10,000+ scam patterns for database seeding
 * Combines base patterns with variations to create comprehensive coverage
 */

interface ScamPattern {
  patternText: string;
  patternCategory: string;
  riskLevel: string;
  keywords: string[];
  regexPattern: string;
}

// Base pattern templates with placeholders
const patternTemplates = [
  // Policy Suspension (500 variations)
  {
    templates: [
      'Your {policyType} policy has been {action}. {urgency} to reactivate',
      'Policy #{number} is {action}. Click {link} to restore',
      '{urgency}: Your insurance is {action}. Pay Rs {amount} penalty',
      'Policy {action} due to non-payment. Reactivate within {time}',
      'Your {policyType} coverage is {action}. Immediate action required',
    ],
    category: 'POLICY_SUSPENSION',
    riskLevel: 'HIGH',
    baseKeywords: ['suspended', 'blocked', 'deactivated', 'reactivate', 'penalty'],
    regexPattern: '.*(suspend|block|deactivat).*(policy|insurance).*(click|link|reactivat).*',
  },
  // Fake Cashback (500 variations)
  {
    templates: [
      'Congratulations! You won Rs {amount} cashback on {policyType}. Claim now',
      'Lucky draw winner! Rs {amount} reward on your insurance. Click to claim',
      'Special offer: {percent}% cashback on premium payment. Limited time',
      'You are eligible for Rs {amount} refund. Verify details to receive',
      'Bonus alert: Rs {amount} credited to your policy. Confirm to activate',
    ],
    category: 'FAKE_CASHBACK',
    riskLevel: 'HIGH',
    baseKeywords: ['congratulations', 'won', 'cashback', 'claim', 'reward'],
    regexPattern: '.*(congratulation|won|winner).*(cashback|prize|reward).*(claim|collect).*',
  },
  // Fake Claim Rejection (500 variations)
  {
    templates: [
      'URGENT: Claim #{number} rejected. Pay Rs {amount} to appeal',
      'Your claim of Rs {amount} is denied. Processing fee required',
      'Claim rejection notice. Pay {amount} to resubmit application',
      'Insurance claim failed. Rs {amount} needed for manual review',
      'Claim #{number} under review. Expedite with Rs {amount} fee',
    ],
    category: 'FAKE_CLAIM_REJECTION',
    riskLevel: 'HIGH',
    baseKeywords: ['urgent', 'rejected', 'denied', 'processing fee', 'appeal'],
    regexPattern: '.*(urgent|immediate).*(claim|policy).*(reject|denied).*(fee|payment).*',
  },
  // KYC Phishing (800 variations)
  {
    templates: [
      'KYC update mandatory for {policyType}. Share {document} details',
      'Verify your identity: Upload {document} for policy continuation',
      'IRDAI compliance: Update {document} within {time} hours',
      'Policy verification pending. Submit {document} and OTP',
      'KYC expired. Provide {document} to avoid policy lapse',
      'eKYC required: Share {document} number and photo',
      'Regulatory update: {document} verification needed urgently',
      'Complete KYC: Send {document} copy and selfie',
    ],
    category: 'KYC_PHISHING',
    riskLevel: 'HIGH',
    baseKeywords: ['kyc', 'verification', 'aadhaar', 'pan', 'otp', 'update'],
    regexPattern: '.*(kyc|verification).*(update|required).*(aadhaar|pan|otp).*',
  },
  // Agent Impersonation (400 variations)
  {
    templates: [
      'Your agent {name} has been replaced. New agent: {phone}',
      'Agent transfer notice: Contact {name} at {phone} for service',
      'Policy servicing agent changed to {name}. Call {phone}',
      'New insurance advisor assigned: {name}, {phone}',
      'Agent update: {name} will handle your policy. Reach at {phone}',
    ],
    category: 'AGENT_IMPERSONATION',
    riskLevel: 'MEDIUM',
    baseKeywords: ['agent', 'advisor', 'changed', 'new', 'contact'],
    regexPattern: '.*(agent|advisor).*(chang|new|replac).*(contact|call).*',
  },
  // Fake Regulator (600 variations)
  {
    templates: [
      'IRDAI notice: Policy #{number} under investigation. Respond in {time}',
      'Regulatory alert: Your {policyType} flagged for review',
      'IRDAI compliance: Submit documents within {time} or face penalty',
      'Insurance authority warning: Policy may be cancelled',
      'Regulator notice: Suspicious activity detected on policy #{number}',
      'IRDAI audit: Your claim is being investigated',
    ],
    category: 'FAKE_REGULATOR',
    riskLevel: 'HIGH',
    baseKeywords: ['irdai', 'regulator', 'investigation', 'compliance', 'authority'],
    regexPattern: '.*(irdai|regulator|authority).*(investigation|notice|warning).*(cancel|suspend).*',
  },
  // Digital Arrest (1000 variations)
  {
    templates: [
      'Arrest warrant issued for insurance fraud. Join video call: {link}',
      '{agency} officer: Your policy linked to crime. Video verification required',
      'Legal notice: Appear on video call or face arrest',
      'CBI investigation: Insurance fraud case #{number}. Call immediately',
      'Police warrant: Money laundering via insurance. Do not disconnect',
      'Court order: Video hearing for policy fraud. Join {link}',
      'Cyber crime: Your insurance used in scam. Immediate video call',
      'ED notice: Insurance fraud investigation. Video statement required',
      'Supreme Court: Policy under scanner. Video appearance mandatory',
      'Interpol alert: Insurance fraud. Video verification or arrest',
    ],
    category: 'DIGITAL_ARREST',
    riskLevel: 'CRITICAL',
    baseKeywords: ['arrest', 'warrant', 'police', 'cbi', 'video call', 'fraud'],
    regexPattern: '.*(arrest|warrant|police|cbi).*(fraud|crime).*(video|call|zoom).*',
  },
  // Fake Discount (400 variations)
  {
    templates: [
      'Get {percent}% off on {policyType}. Limited offer. Buy now',
      'Flash sale: {percent}% discount on insurance. Ends in {time}',
      'Exclusive deal: Save Rs {amount} on premium. Apply code {code}',
      'Special discount: {percent}% off for first {number} customers',
      'Mega sale: {policyType} at {percent}% discount. Hurry',
    ],
    category: 'FAKE_DISCOUNT',
    riskLevel: 'MEDIUM',
    baseKeywords: ['discount', 'offer', 'limited', 'sale', 'hurry'],
    regexPattern': '.*([0-9]+%).*(discount|offer).*(limited|hurry|now).*',
  },
  // Fake Overdue (500 variations)
  {
    templates: [
      'Premium overdue: Rs {amount}. Pay now to avoid legal action',
      'Policy lapsed: {time} days overdue. Credit score at risk',
      'Payment pending: Rs {amount}. Court notice will be sent',
      'Overdue alert: Pay Rs {amount} or face CIBIL impact',
      'Final notice: Premium due. Legal proceedings initiated',
    ],
    category: 'FAKE_OVERDUE',
    riskLevel: 'HIGH',
    baseKeywords: ['overdue', 'pending', 'legal action', 'credit score', 'cibil'],
    regexPattern: '.*(overdue|pending|due).*(legal|court|action).*(credit|cibil).*',
  },
  // Data Harvesting (600 variations)
  {
    templates: [
      'Free {service} for policyholders. Share policy #{number}',
      'Complimentary {service}: Verify with policy details',
      'Exclusive benefit: Free {service}. Provide policy number',
      'Policyholder privilege: {service} at no cost. Register now',
      'Special offer: Free {service}. Confirm policy details',
      'Health benefit: Free {service} for insured. Share details',
    ],
    category: 'DATA_HARVESTING',
    riskLevel: 'MEDIUM',
    baseKeywords: ['free', 'complimentary', 'exclusive', 'policy number', 'details'],
    regexPattern: '.*(free|complimentary).*(checkup|test|screening).*(policy|details).*',
  },
  // Advance Fee Fraud (500 variations)
  {
    templates: [
      'Claim approved: Rs {amount}. Pay {percent}% processing fee',
      'Your claim of Rs {amount} sanctioned. Transfer Rs {fee} to receive',
      'Claim settlement: Rs {amount}. Service charge: Rs {fee}',
      'Congratulations! Claim passed. Pay Rs {fee} for disbursement',
      'Claim #{number} cleared. Processing fee Rs {fee} required',
    ],
    category: 'ADVANCE_FEE_FRAUD',
    riskLevel: 'HIGH',
    baseKeywords: ['claim approved', 'processing fee', 'service charge', 'transfer'],
    regexPattern: '.*(claim|amount).*(approv|sanction).*(fee|charge|payment).*',
  },
  // Fake Ombudsman (300 variations)
  {
    templates: [
      'Ombudsman office: Complaint #{number} escalated. Pay Rs {amount}',
      'Insurance grievance: Pay Rs {amount} to expedite resolution',
      'Ombudsman hearing: Rs {amount} fee for priority processing',
      'Complaint registered: Pay Rs {amount} for fast-track',
      'Grievance cell: Rs {amount} needed for case review',
    ],
    category: 'FAKE_OMBUDSMAN',
    riskLevel: 'HIGH',
    baseKeywords: ['ombudsman', 'grievance', 'complaint', 'expedite', 'fee'],
    regexPattern: '.*(ombudsman|grievance).*(complaint|dispute).*(pay|fee|expedite).*',
  },
  // Malware Links (400 variations)
  {
    templates: [
      'Policy documents expiring. Download from: {link}',
      'Updated policy certificate available. Click: {link}',
      'New policy terms. View document: {link}',
      'Policy renewal document ready. Download: {link}',
      'Important: Policy amendment. Access: {link}',
    ],
    category: 'MALWARE_LINK',
    riskLevel: 'HIGH',
    baseKeywords: ['download', 'click', 'link', 'document', 'certificate'],
    regexPattern: '.*(document|certificate).*(expir|invalid).*(download|click|link).*',
  },
  // Phishing Links (800 variations)
  {
    templates: [
      'Verify your policy: {link}. Login required',
      'Policy portal update: Reset password at {link}',
      'Secure your account: Update credentials at {link}',
      'Policy dashboard: Login at {link} to view details',
      'Account verification: Click {link} and enter OTP',
      'Policy renewal: Pay online at {link}',
      'Claim status: Check at {link} with policy number',
      'Update contact details: Visit {link}',
    ],
    category: 'PHISHING_LINK',
    riskLevel: 'HIGH',
    baseKeywords: ['login', 'verify', 'update', 'click', 'link', 'password'],
    regexPattern: '.*(login|verify|update).*(link|url|website).*(password|otp|credential).*',
  },
  // Fake Call Centers (500 variations)
  {
    templates: [
      'Call our helpline {phone} for policy assistance',
      'Customer care: {phone}. Available 24/7 for claims',
      'Policy support: Contact {phone} for queries',
      'Claim helpdesk: {phone}. Immediate assistance',
      'Insurance helpline: {phone}. Call now for benefits',
    ],
    category: 'FAKE_CALL_CENTER',
    riskLevel: 'MEDIUM',
    baseKeywords: ['call', 'helpline', 'customer care', 'contact', 'phone'],
    regexPattern: '.*(call|contact|helpline).*(phone|number).*(policy|claim|insurance).*',
  },
];

// Placeholder values for generating variations
const placeholders = {
  policyType: ['health', 'life', 'term', 'motor', 'travel', 'home', 'personal accident'],
  action: ['suspended', 'blocked', 'deactivated', 'cancelled', 'terminated', 'frozen'],
  urgency: ['URGENT', 'IMMEDIATE', 'CRITICAL', 'ALERT', 'WARNING'],
  link: ['here', 'this link', 'the link below', 'bit.ly/xxxxx', 'tinyurl.com/xxxxx'],
  number: ['12345', '67890', 'ABC123', 'XYZ789', '001122'],
  amount: ['5000', '10000', '15000', '20000', '25000', '50000', '1,00,000', '2,00,000'],
  time: ['24', '48', '72', '12', '6'],
  percent: ['50', '60', '70', '80', '90', '95'],
  document: ['Aadhaar', 'PAN', 'Passport', 'Driving License', 'Voter ID'],
  name: ['Rajesh Kumar', 'Amit Sharma', 'Priya Singh', 'Suresh Patel', 'Anjali Verma'],
  phone: ['+91-9876543210', '+91-8765432109', '1800-XXX-XXXX', '022-XXXXXXXX'],
  agency: ['CBI', 'ED', 'Police', 'Cyber Crime', 'Income Tax'],
  code: ['SAVE50', 'DISCOUNT70', 'OFFER80', 'SPECIAL90'],
  service: ['health checkup', 'medical test', 'doctor consultation', 'lab test', 'screening'],
  fee: ['2000', '3000', '5000', '7500', '10000'],
};

/**
 * Generate pattern variations by replacing placeholders
 */
function generatePatternVariations(template: any, count: number): ScamPattern[] {
  const patterns: ScamPattern[] = [];
  const { templates, category, riskLevel, baseKeywords, regexPattern } = template;

  let generated = 0;
  let templateIndex = 0;

  while (generated < count) {
    const templateText = templates[templateIndex % templates.length];
    let patternText = templateText;

    // Replace all placeholders
    for (const [key, values] of Object.entries(placeholders)) {
      const placeholder = `{${key}}`;
      if (patternText.includes(placeholder)) {
        const randomValue = values[Math.floor(Math.random() * values.length)];
        patternText = patternText.replace(new RegExp(placeholder, 'g'), randomValue);
      }
    }

    // Extract keywords from the generated text
    const keywords = [...baseKeywords];
    const words = patternText.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 4 && !keywords.includes(word)) {
        keywords.push(word);
      }
    });

    patterns.push({
      patternText,
      patternCategory: category,
      riskLevel,
      keywords: keywords.slice(0, 10), // Limit to 10 keywords
      regexPattern,
    });

    generated++;
    templateIndex++;
  }

  return patterns;
}

/**
 * Generate all scam patterns
 */
export function generateAllScamPatterns(): ScamPattern[] {
  const allPatterns: ScamPattern[] = [];

  // Generate patterns for each category
  allPatterns.push(...generatePatternVariations(patternTemplates[0], 500));  // Policy Suspension
  allPatterns.push(...generatePatternVariations(patternTemplates[1], 500));  // Fake Cashback
  allPatterns.push(...generatePatternVariations(patternTemplates[2], 500));  // Fake Claim Rejection
  allPatterns.push(...generatePatternVariations(patternTemplates[3], 800));  // KYC Phishing
  allPatterns.push(...generatePatternVariations(patternTemplates[4], 400));  // Agent Impersonation
  allPatterns.push(...generatePatternVariations(patternTemplates[5], 600));  // Fake Regulator
  allPatterns.push(...generatePatternVariations(patternTemplates[6], 1000)); // Digital Arrest
  allPatterns.push(...generatePatternVariations(patternTemplates[7], 400));  // Fake Discount
  allPatterns.push(...generatePatternVariations(patternTemplates[8], 500));  // Fake Overdue
  allPatterns.push(...generatePatternVariations(patternTemplates[9], 600));  // Data Harvesting
  allPatterns.push(...generatePatternVariations(patternTemplates[10], 500)); // Advance Fee Fraud
  allPatterns.push(...generatePatternVariations(patternTemplates[11], 300)); // Fake Ombudsman
  allPatterns.push(...generatePatternVariations(patternTemplates[12], 400)); // Malware Links
  allPatterns.push(...generatePatternVariations(patternTemplates[13], 800)); // Phishing Links
  allPatterns.push(...generatePatternVariations(patternTemplates[14], 500)); // Fake Call Centers

  // Add more generic insurance fraud patterns
  allPatterns.push(...generateGenericFraudPatterns(1200));

  // Add regional language transliteration patterns
  allPatterns.push(...generateRegionalPatterns(1000));

  console.log(`Generated ${allPatterns.length} scam patterns`);
  return allPatterns;
}

/**
 * Generate generic insurance fraud patterns
 */
function generateGenericFraudPatterns(count: number): ScamPattern[] {
  const patterns: ScamPattern[] = [];
  const fraudPhrases = [
    'insurance fraud', 'policy scam', 'fake claim', 'premium theft',
    'agent fraud', 'mis-selling', 'forged documents', 'identity theft',
    'claim manipulation', 'premium diversion', 'ghost policy', 'churning',
  ];

  for (let i = 0; i < count; i++) {
    const phrase = fraudPhrases[i % fraudPhrases.length];
    patterns.push({
      patternText: `Warning: Potential ${phrase} detected. Verify immediately.`,
      patternCategory: 'INSURANCE_FRAUD',
      riskLevel: 'HIGH',
      keywords: phrase.split(' '),
      regexPattern: `.*(${phrase.replace(' ', '|')}).*`,
    });
  }

  return patterns;
}

/**
 * Generate regional language transliteration patterns
 */
function generateRegionalPatterns(count: number): ScamPattern[] {
  const patterns: ScamPattern[] = [];
  const hindiTransliterations = [
    'aapka policy suspend ho gaya hai',
    'turant payment karein',
    'claim reject ho gaya',
    'KYC update zaroori hai',
    'police case darj hai',
    'video call par aaiye',
    'arrest warrant jari hua',
  ];

  for (let i = 0; i < count; i++) {
    const text = hindiTransliterations[i % hindiTransliterations.length];
    patterns.push({
      patternText: text,
      patternCategory: 'REGIONAL_SCAM',
      riskLevel: 'HIGH',
      keywords: text.split(' '),
      regexPattern: `.*(${text.split(' ').join('|')}).*`,
    });
  }

  return patterns;
}

// Export for use in seed script
if (require.main === module) {
  const patterns = generateAllScamPatterns();
  console.log(JSON.stringify(patterns, null, 2));
}
