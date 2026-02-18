import { PrismaClient } from '@prisma/client';
import { generateAllScamPatterns } from './scripts/generate-scam-patterns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Seed Scam Patterns
  console.log('📝 Seeding scam patterns...');
  console.log('⏳ Generating 10,000+ scam patterns...');
  
  const scamPatterns = generateAllScamPatterns();
  
  console.log(`✅ Generated ${scamPatterns.length} scam patterns`);
  console.log('⏳ Inserting patterns into database (this may take a few minutes)...');
  
  // Insert in batches for better performance
  const batchSize = 1000;
  for (let i = 0; i < scamPatterns.length; i += batchSize) {
    const batch = scamPatterns.slice(i, i + batchSize);
    await prisma.scamPattern.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(scamPatterns.length / batchSize)}`);
  }

  // Also add the original high-quality patterns
  const corePatterns = [
    {
      patternText: 'Your policy has been suspended. Click here to reactivate immediately or pay penalty',
      patternCategory: 'POLICY_SUSPENSION',
      riskLevel: 'HIGH',
      keywords: ['suspended', 'reactivate', 'penalty', 'click here'],
      regexPattern: '.*(suspend|block|deactivat).*(policy|insurance).*(click|link|reactivat).*',
    },
    {
      patternText: 'Congratulations! You have won a cashback of Rs 50,000 on your insurance premium. Claim now',
      patternCategory: 'FAKE_CASHBACK',
      riskLevel: 'HIGH',
      keywords: ['congratulations', 'won', 'cashback', 'claim now'],
      regexPattern: '.*(congratulation|won|winner).*(cashback|prize|reward).*(claim|collect).*',
    },
    {
      patternText: 'URGENT: Your claim has been rejected. Pay Rs 5,000 processing fee to appeal',
      patternCategory: 'FAKE_CLAIM_REJECTION',
      riskLevel: 'HIGH',
      keywords: ['urgent', 'rejected', 'processing fee', 'appeal'],
      regexPattern: '.*(urgent|immediate).*(claim|policy).*(reject|denied).*(fee|payment).*',
    },
    {
      patternText: 'KYC update required for your insurance policy. Share Aadhaar and PAN details',
      patternCategory: 'KYC_PHISHING',
      riskLevel: 'HIGH',
      keywords: ['kyc', 'update required', 'aadhaar', 'pan'],
      regexPattern: '.*(kyc|verification).*(update|required).*(aadhaar|pan|otp).*',
    },
    {
      patternText: 'Your insurance agent has changed. Contact new agent at +91-XXXXXXXXXX for policy details',
      patternCategory: 'AGENT_IMPERSONATION',
      riskLevel: 'MEDIUM',
      keywords: ['agent changed', 'new agent', 'contact'],
      regexPattern: '.*(agent|advisor).*(chang|new|replac).*(contact|call).*',
    },
    {
      patternText: 'IRDAI notice: Your policy is under investigation. Respond within 24 hours to avoid cancellation',
      patternCategory: 'FAKE_REGULATOR',
      riskLevel: 'HIGH',
      keywords: ['irdai', 'investigation', '24 hours', 'cancellation'],
      regexPattern: '.*(irdai|regulator|authority).*(investigation|notice|warning).*(cancel|suspend).*',
    },
    {
      patternText: 'Get 80% discount on health insurance. Limited time offer. Buy now at www.fake-insurance.com',
      patternCategory: 'FAKE_DISCOUNT',
      riskLevel: 'MEDIUM',
      keywords: ['discount', 'limited time', 'buy now'],
      regexPattern: '.*([0-9]+%).*(discount|offer).*(limited|hurry|now).*',
    },
    {
      patternText: 'Your policy premium is overdue. Pay immediately to avoid legal action and credit score impact',
      patternCategory: 'FAKE_OVERDUE',
      riskLevel: 'HIGH',
      keywords: ['overdue', 'legal action', 'credit score'],
      regexPattern: '.*(overdue|pending|due).*(legal|court|action).*(credit|cibil).*',
    },
    {
      patternText: 'Free health checkup for policyholders. Book appointment and share policy number',
      patternCategory: 'DATA_HARVESTING',
      riskLevel: 'MEDIUM',
      keywords: ['free', 'health checkup', 'policy number'],
      regexPattern: '.*(free|complimentary).*(checkup|test|screening).*(policy|details).*',
    },
    {
      patternText: 'Your claim of Rs 2,00,000 has been approved. Pay 2% processing fee to receive amount',
      patternCategory: 'ADVANCE_FEE_FRAUD',
      riskLevel: 'HIGH',
      keywords: ['claim approved', 'processing fee', 'receive amount'],
      regexPattern: '.*(claim|amount).*(approv|sanction).*(fee|charge|payment).*',
    },
    {
      patternText: 'Digital arrest warrant issued in your name for insurance fraud. Join video call immediately',
      patternCategory: 'DIGITAL_ARREST',
      riskLevel: 'CRITICAL',
      keywords: ['arrest warrant', 'insurance fraud', 'video call', 'immediately'],
      regexPattern: '.*(arrest|warrant|police|cbi).*(fraud|crime).*(video|call|zoom).*',
    },
    {
      patternText: 'CBI officer calling. Your insurance claim is linked to money laundering. Do not disconnect',
      patternCategory: 'DIGITAL_ARREST',
      riskLevel: 'CRITICAL',
      keywords: ['cbi', 'money laundering', 'do not disconnect'],
      regexPattern: '.*(cbi|police|officer).*(laundering|crime|fraud).*(disconnect|hang).*',
    },
    {
      patternText: 'Supreme Court order: Your policy is under investigation. Transfer funds to safe account',
      patternCategory: 'DIGITAL_ARREST',
      riskLevel: 'CRITICAL',
      keywords: ['supreme court', 'investigation', 'transfer funds', 'safe account'],
      regexPattern: '.*(court|judge|legal).*(investigation|order).*(transfer|move|safe).*',
    },
    {
      patternText: 'Insurance Ombudsman: Your complaint has been escalated. Pay Rs 10,000 to expedite resolution',
      patternCategory: 'FAKE_OMBUDSMAN',
      riskLevel: 'HIGH',
      keywords: ['ombudsman', 'complaint', 'pay', 'expedite'],
      regexPattern: '.*(ombudsman|grievance).*(complaint|dispute).*(pay|fee|expedite).*',
    },
    {
      patternText: 'Your policy documents are expiring. Download updated documents from this link',
      patternCategory: 'MALWARE_LINK',
      riskLevel: 'HIGH',
      keywords: ['documents expiring', 'download', 'link'],
      regexPattern: '.*(document|certificate).*(expir|invalid).*(download|click|link).*',
    },
  ];

  // Insert core patterns
  for (const pattern of corePatterns) {
    await prisma.scamPattern.upsert({
      where: { id: pattern.patternText }, // Using patternText as unique identifier for upsert
      update: {},
      create: pattern,
    });
  }

  console.log(`✅ Seeded total ${scamPatterns.length + corePatterns.length} scam patterns`);

  // Create full-text search index
  console.log('📝 Creating full-text search index...');
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS idx_scam_patterns_fulltext 
    ON scam_patterns USING GIN(to_tsvector('english', pattern_text));
  `;
  console.log('✅ Full-text search index created');


  // Seed Verified Brands
  console.log('📝 Seeding verified brands...');

  const verifiedBrands = [
    {
      brandName: 'Life Insurance Corporation of India (LIC)',
      officialContacts: {
        phone: ['1800-227-717', '022-68276827'],
        email: ['customerservice@licindia.com'],
        website: 'https://www.licindia.in',
        socialMedia: {
          twitter: '@LICIndiaForever',
          facebook: 'LICIndiaOfficial',
        },
      },
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      brandName: 'HDFC Life Insurance',
      officialContacts: {
        phone: ['1860-267-9999'],
        email: ['customer.service@hdfclife.com'],
        website: 'https://www.hdfclife.com',
        socialMedia: {
          twitter: '@HDFCLifeIns',
          facebook: 'HDFCLife',
        },
      },
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      brandName: 'ICICI Prudential Life Insurance',
      officialContacts: {
        phone: ['1860-266-7766'],
        email: ['care@iciciprulife.com'],
        website: 'https://www.iciciprulife.com',
        socialMedia: {
          twitter: '@ICICIPruLife',
          facebook: 'ICICIPrudentialLife',
        },
      },
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      brandName: 'SBI Life Insurance',
      officialContacts: {
        phone: ['1800-267-9090', '022-3025-9090'],
        email: ['care@sbilife.co.in'],
        website: 'https://www.sbilife.co.in',
        socialMedia: {
          twitter: '@SBILife_Connect',
          facebook: 'SBILifeInsurance',
        },
      },
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      brandName: 'Max Life Insurance',
      officialContacts: {
        phone: ['1860-120-5577'],
        email: ['customerservice@maxlifeinsurance.com'],
        website: 'https://www.maxlifeinsurance.com',
        socialMedia: {
          twitter: '@MaxLifeIns',
          facebook: 'MaxLifeInsurance',
        },
      },
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      brandName: 'Bajaj Allianz Life Insurance',
      officialContacts: {
        phone: ['1800-209-7272'],
        email: ['customercare@bajajallianz.co.in'],
        website: 'https://www.bajajallianzlife.com',
        socialMedia: {
          twitter: '@BajajAllianzLif',
          facebook: 'BajajAllianzLife',
        },
      },
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      brandName: 'Tata AIA Life Insurance',
      officialContacts: {
        phone: ['1860-266-9966'],
        email: ['life.customerservice@tata-aia.com'],
        website: 'https://www.tataaia.com',
        socialMedia: {
          twitter: '@TataAIALife',
          facebook: 'TataAIALife',
        },
      },
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      brandName: 'Star Health Insurance',
      officialContacts: {
        phone: ['1800-425-2255', '044-28288800'],
        email: ['support@starhealth.in'],
        website: 'https://www.starhealth.in',
        socialMedia: {
          twitter: '@StarHealthIns',
          facebook: 'StarHealthInsurance',
        },
      },
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      brandName: 'HDFC ERGO Health Insurance',
      officialContacts: {
        phone: ['1800-266-0700'],
        email: ['customersupport@hdfcergo.com'],
        website: 'https://www.hdfcergo.com',
        socialMedia: {
          twitter: '@HDFCERGO',
          facebook: 'HDFCERGOGeneralInsurance',
        },
      },
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      brandName: 'Care Health Insurance',
      officialContacts: {
        phone: ['1800-102-4488'],
        email: ['care@careinsurance.com'],
        website: 'https://www.careinsurance.com',
        socialMedia: {
          twitter: '@CareHealthIns',
          facebook: 'CareHealthInsurance',
        },
      },
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
  ];

  for (const brand of verifiedBrands) {
    await prisma.verifiedBrand.upsert({
      where: { brandName: brand.brandName },
      update: {},
      create: brand,
    });
  }

  console.log(`✅ Seeded ${verifiedBrands.length} verified brands`);

  // Seed Telemarketer Registry (sample DND numbers)
  console.log('📝 Seeding telemarketer registry...');

  const telemarketers = [
    // Verified insurance companies
    {
      phoneNumber: '+911800227717',
      brandName: 'LIC India',
      isVerified: true,
      isScammer: false,
      isDnd: false,
      reportCount: 0,
      lastVerified: new Date(),
    },
    {
      phoneNumber: '+911800209090',
      brandName: 'HDFC Life',
      isVerified: true,
      isScammer: false,
      isDnd: false,
      reportCount: 0,
      lastVerified: new Date(),
    },
    {
      phoneNumber: '+911800258585',
      brandName: 'ICICI Prudential',
      isVerified: true,
      isScammer: false,
      isDnd: false,
      reportCount: 0,
      lastVerified: new Date(),
    },
    {
      phoneNumber: '+911800220004',
      brandName: 'SBI Life',
      isVerified: true,
      isScammer: false,
      isDnd: false,
      reportCount: 0,
      lastVerified: new Date(),
    },
    {
      phoneNumber: '+911800266666',
      brandName: 'Max Life Insurance',
      isVerified: true,
      isScammer: false,
      isDnd: false,
      reportCount: 0,
      lastVerified: new Date(),
    },
    // Known scammer numbers
    {
      phoneNumber: '+919999999999',
      brandName: null,
      isVerified: false,
      isScammer: true,
      isDnd: false,
      reportCount: 47,
      lastVerified: null,
    },
    {
      phoneNumber: '+918888888888',
      brandName: null,
      isVerified: false,
      isScammer: true,
      isDnd: false,
      reportCount: 32,
      lastVerified: null,
    },
    {
      phoneNumber: '+917777777777',
      brandName: null,
      isVerified: false,
      isScammer: true,
      isDnd: false,
      reportCount: 28,
      lastVerified: null,
    },
    // DND registered numbers
    {
      phoneNumber: '+919876543210',
      brandName: null,
      isVerified: false,
      isScammer: false,
      isDnd: true,
      reportCount: 0,
      lastVerified: new Date(),
    },
    {
      phoneNumber: '+918765432109',
      brandName: null,
      isVerified: false,
      isScammer: false,
      isDnd: true,
      reportCount: 0,
      lastVerified: new Date(),
    },
  ];

  for (const telemarketer of telemarketers) {
    await prisma.telemarketerRegistry.upsert({
      where: { phoneNumber: telemarketer.phoneNumber },
      update: {},
      create: telemarketer,
    });
  }

  console.log(`✅ Seeded ${telemarketers.length} telemarketer records`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
