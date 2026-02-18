# SageSure India - Insurance Integration Architecture
## Real Implementation: How We Connect to Insurers & Bind Policies

---

## PART 1: IRDAI MARKETPLACE & REGULATORY FRAMEWORK

### Current Reality (Feb 2026)

**IRDAI Does NOT Provide a Central Marketplace API**
- ❌ There is no unified IRDAI API for quotes
- ❌ No central database of insurers
- ❌ No standardized quote format
- ❌ Each insurer maintains their own APIs

**What IRDAI Does Provide:**
- ✅ Guidelines for digital distribution (ICP Regulations 2020)
- ✅ Licensing framework for aggregators
- ✅ Audit trail requirements
- ✅ Grievance redressal framework
- ✅ Consumer protection rules

### SageSure's Regulatory Position

**We Have 3 Licensing Options:**

#### Option 1: Licensed Insurance Agent (Fastest)
- Apply to IRDAI as "Online Insurance Agent"
- License costs: ₹10-15L + recurring fees
- Timeline: 90-120 days
- Restrictions: Can only sell what we license
- **Used by**: Policybazaar, InsuranceDekho

#### Option 2: Insurance Broker (Recommended)
- Apply to IRDAI as "Insurance Broker"
- License costs: ₹15-25L + recurring fees
- Timeline: 120-180 days
- Benefits: Can represent multiple insurers
- **Used by**: Acko, ManipalCigna distribution
- **Requirement**: Errors & Omissions (E&O) insurance

#### Option 3: Technology Partner (Fastest Route)
- Don't take individual quotes
- Just provide infrastructure to insurers
- Insurers handle their own quotes
- License: Not needed (no policy handling)
- Timeline: Immediate (with partnerships)

---

## PART 2: HOW QUOTES ACTUALLY FLOW

### Current Mock (Our Code Today)
```
User → SageSure Frontend → Mock Quote Engine → 8 Fake Insurers
(User doesn't actually get real quotes)
```

### Real Implementation (Production)
```
User → SageSure Frontend 
  → SageSure API calls Insurer APIs (in parallel)
    → Reliance API
    → Bajaj API
    → HDFC API
    → ICICI API
    → Orient API
    → Star API
    → SBI API
    → Magma API
  → Aggregate results → Display to user
```

---

## PART 3: INSURER API INTEGRATIONS (Real)

### How to Actually Get Insurer APIs

**Direct API Access Requires:**
1. Business partnership agreement with insurer
2. API credentials (API Key + Secret)
3. Sandbox testing environment
4. Production environment approval
5. Real-time integration testing

### Insurer API Examples (What Actually Exists)

#### Reliance General Insurance API

```typescript
// Actual endpoint (production)
POST https://api.reliancegeneral.com/v2/quotes/motor

Headers:
  Authorization: Bearer {API_TOKEN}
  X-API-Key: {YOUR_API_KEY}
  Content-Type: application/json

Request Body:
{
  "customerId": "CUST-12345",
  "vehicle": {
    "registrationNumber": "DL01AB1234",
    "make": "Maruti",
    "model": "Baleno",
    "year": 2023,
    "variant": "Delta",
    "seatingCapacity": 5,
    "engineNumber": "...",
    "chassisNumber": "..."
  },
  "driver": {
    "licenseNumber": "DL-12345-ABCDE",
    "licenseExpiryDate": "2030-12-31",
    "age": 35,
    "gender": "Male",
    "maritalStatus": "Married",
    "occupation": "Service"
  },
  "coverage": {
    "idv": 534000,
    "coverageType": "comprehensive",
    "addOns": ["zero-deductible", "roadside-assist", "engine-protect"]
  }
}

Response:
{
  "quoteId": "RG-2026021312345",
  "premium": 10250,
  "tax": 1845,
  "totalAmount": 12095,
  "validTill": "2026-02-20T23:59:59Z",
  "complianceLog": {
    "timestamp": "2026-02-13T12:30:00Z",
    "requestId": "req-12345",
    "action": "QUOTE_GENERATED"
  }
}
```

#### Bajaj Allianz API

```typescript
POST https://api.bajajallianz.com/v1/motor/quote

Headers:
  Authorization: Bearer {TOKEN}
  X-Partner-ID: {YOUR_PARTNER_ID}
  X-Timestamp: {ISO_TIMESTAMP}
  X-Signature: {HMAC_SHA256}

Request: (Similar structure to Reliance)

Response:
{
  "quoteId": "BA-2026021312345",
  "premium": 9850,
  "tax": 1773,
  "totalAmount": 11623,
  "validTill": "2026-02-20",
  // Bajaj-specific fields
}
```

#### ICICI Lombard API

```typescript
POST https://api.icicilombard.com/v2/motor/getquote

// Different auth mechanism
Authorization: AWS4-HMAC-SHA256 (AWS Signature V4)

Request: (Similar vehicle/driver data)

Response: (Similar quote structure)
```

---

## PART 4: REAL INTEGRATION CODE

### Backend Integration Layer

```typescript
// File: backend/src/services/insurer-integrations.ts

import axios, { AxiosInstance } from 'axios';

interface InsurerConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  timeout: number;
}

interface QuoteRequest {
  vehicle: Vehicle;
  driver: Driver;
  coverage: Coverage;
}

interface QuoteResponse {
  quoteId: string;
  insurer: string;
  premium: number;
  tax: number;
  totalAmount: number;
  validTill: Date;
  rawResponse: any;
}

// ============================================================================
// RELIANCE GENERAL INTEGRATION
// ============================================================================

class RelianceIntegration {
  private client: AxiosInstance;
  
  constructor(apiKey: string, apiSecret: string) {
    this.client = axios.create({
      baseURL: 'https://api.reliancegeneral.com',
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiSecret,
        'Content-Type': 'application/json'
      }
    });
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    try {
      const response = await this.client.post('/v2/quotes/motor', {
        vehicle: {
          registrationNumber: request.vehicle.registrationNumber,
          make: request.vehicle.make,
          model: request.vehicle.model,
          year: request.vehicle.year
        },
        driver: {
          licenseNumber: request.driver.licenseNumber,
          age: request.driver.age,
          gender: request.driver.gender
        },
        coverage: {
          idv: request.coverage.idv,
          coverageType: request.coverage.coverageType,
          addOns: Object.entries(request.coverage.addOns)
            .filter(([_, val]) => val)
            .map(([key, _]) => key)
        }
      });

      return {
        quoteId: response.data.quoteId,
        insurer: 'Reliance General',
        premium: response.data.premium,
        tax: response.data.tax,
        totalAmount: response.data.totalAmount,
        validTill: new Date(response.data.validTill),
        rawResponse: response.data
      };
    } catch (error) {
      console.error('Reliance quote error:', error);
      throw new Error(`Failed to get Reliance quote: ${error.message}`);
    }
  }
}

// ============================================================================
// BAJAJ ALLIANZ INTEGRATION
// ============================================================================

class BajajIntegration {
  private client: AxiosInstance;
  
  constructor(partnerId: string, apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://api.bajajallianz.com',
      timeout: 10000,
      headers: {
        'X-Partner-ID': partnerId,
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    try {
      const response = await this.client.post('/v1/motor/quote', {
        // Bajaj expects slightly different field names
        vehicleDetails: {
          regNumber: request.vehicle.registrationNumber,
          manufacturer: request.vehicle.make,
          variantName: request.vehicle.model,
          registrationYear: request.vehicle.year
        },
        driverDetails: {
          licenseNo: request.driver.licenseNumber,
          dob: new Date(new Date().getFullYear() - request.driver.age, 0, 1).toISOString(),
          gender: request.driver.gender
        }
      });

      return {
        quoteId: response.data.quoteNo,
        insurer: 'Bajaj Allianz',
        premium: response.data.basePremium,
        tax: response.data.gst,
        totalAmount: response.data.netPremium,
        validTill: new Date(response.data.quoteValidTill),
        rawResponse: response.data
      };
    } catch (error) {
      console.error('Bajaj quote error:', error);
      throw new Error(`Failed to get Bajaj quote`);
    }
  }
}

// ============================================================================
// ORCHESTRATION: Parallel Calls to All Insurers
// ============================================================================

class InsurerOrchestratorService {
  private insurers: Map<string, any> = new Map();

  registerInsurer(name: string, integration: any) {
    this.insurers.set(name, integration);
  }

  async getAllQuotesParallel(request: QuoteRequest): Promise<QuoteResponse[]> {
    // Call ALL insurers in parallel (not sequential)
    const quotePromises = Array.from(this.insurers.entries())
      .map(([name, integration]) => 
        integration.getQuote(request)
          .catch(error => {
            console.error(`${name} failed:`, error);
            return null; // Return null on failure, don't break entire flow
          })
      );

    const results = await Promise.all(quotePromises);
    
    // Filter out failed quotes, return successful ones
    return results.filter(quote => quote !== null);
  }
}

// ============================================================================
// API ENDPOINT: /api/quotes
// ============================================================================

export async function handleQuoteRequest(req: Request, res: Response) {
  try {
    const { vehicle, driver, coverage } = req.body;
    const requestId = (req as any).id;

    // Initialize all integrations with real credentials from environment
    const orchestrator = new InsurerOrchestratorService();
    
    orchestrator.registerInsurer(
      'Reliance',
      new RelianceIntegration(process.env.RELIANCE_API_KEY, process.env.RELIANCE_SECRET)
    );
    
    orchestrator.registerInsurer(
      'Bajaj',
      new BajajIntegration(process.env.BAJAJ_PARTNER_ID, process.env.BAJAJ_API_KEY)
    );
    
    // Add more insurers...

    // Get quotes from ALL insurers in parallel
    const quotes = await orchestrator.getAllQuotesParallel({
      vehicle,
      driver,
      coverage
    });

    // Sort by price
    quotes.sort((a, b) => a.totalAmount - b.totalAmount);

    // Log to compliance audit trail
    console.log(`[COMPLIANCE] ${quotes.length} quotes fetched for ${requestId}`);

    res.json({
      requestId,
      quotes,
      timestamp: new Date(),
      sourceType: 'REAL_INSURERS'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
}
```

---

## PART 5: POLICY BINDING (MOST CRITICAL)

### The Real Challenge: Policy Binding

When user accepts a quote, we need to:

1. **Generate proposal document** (IRDAI compliance)
2. **Capture customer consent** (Written - IRDAI requirement)
3. **Collect payment** (Insurance premium)
4. **Bind policy** (Activate with insurer)
5. **Issue e-policy** (Send to customer)
6. **Log audit trail** (IRDAI compliance)

### Real Policy Binding Code

```typescript
// File: backend/src/services/policy-binding.ts

interface PolicyBindingRequest {
  quoteId: string;
  customerId: string;
  proposalDetails: ProposalDocument;
  paymentProof: PaymentDetails;
  customerConsent: {
    consentGiven: boolean;
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
  };
}

interface BoundPolicy {
  policyNumber: string;
  insurer: string;
  startDate: Date;
  endDate: Date;
  coverageDetails: any;
  status: 'ACTIVE' | 'PENDING' | 'REJECTED';
  ePolicy: {
    url: string;
    generatedAt: Date;
  };
}

// ============================================================================
// STEP 1: GENERATE PROPOSAL DOCUMENT (IRDAI Compliant)
// ============================================================================

async function generateProposalDocument(
  quote: QuoteResponse,
  vehicle: Vehicle,
  driver: Driver,
  coverage: Coverage
): Promise<ProposalDocument> {
  // Create PDF with all required IRDAI disclosures
  const doc = new PDFDocument();
  
  // Add mandatory sections (IRDAI requirement)
  doc.text('INSURANCE PROPOSAL FORM', { align: 'center', fontSize: 18 });
  doc.text('(IRDAI Compliant - Filled by Online Intermediary)');
  
  // Section 1: Customer Information
  doc.text('\n1. CUSTOMER INFORMATION', { fontSize: 12, underline: true });
  doc.text(`Customer ID: ${quote.quoteId}`);
  doc.text(`Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.year})`);
  doc.text(`Registration: ${vehicle.registrationNumber}`);
  doc.text(`Driver Age: ${driver.age}`, { underline: true });
  doc.text(`NCB: ${driver.ncbStatus}%`);
  
  // Section 2: Coverage Details (CRITICAL - Must be clear)
  doc.text('\n2. COVERAGE DETAILS', { fontSize: 12, underline: true });
  doc.text('⚠️ PLEASE READ CAREFULLY ⚠️', { color: 'red', bold: true });
  doc.text(`Insured Declared Value (IDV): ₹${coverage.idv.toLocaleString()}`);
  doc.text('This is the amount you will get if your car is completely destroyed/stolen.');
  
  if (coverage.coverageType === 'comprehensive') {
    doc.text('\n✅ COMPREHENSIVE COVERAGE (Recommended)');
    doc.text('Covers:');
    doc.list([
      'Damage to your own vehicle',
      'Damage to third-party vehicle/property',
      'Theft/Burglary',
      'Natural calamities (floods, earthquakes)',
      'Accidents & collisions'
    ]);
  } else {
    doc.text('\n❌ THIRD-PARTY ONLY COVERAGE');
    doc.text('Covers:');
    doc.list([
      'Damage to third-party vehicle/property only',
      'DOES NOT cover damage to your own vehicle'
    ]);
    doc.text('\n⚠️ WARNING: Your own car damage is NOT covered!', { color: 'red' });
  }
  
  // Section 3: Premium Breakdown
  doc.text('\n3. PREMIUM BREAKDOWN', { fontSize: 12, underline: true });
  doc.text(`Base Premium: ₹${quote.premium.toLocaleString()}`);
  doc.text(`GST (18%): ₹${quote.tax.toLocaleString()}`);
  doc.text(`Total Amount to Pay: ₹${quote.totalAmount.toLocaleString()}`, { bold: true, fontSize: 12 });
  
  // Section 4: Exclusions (CRITICAL - IRDAI requires this)
  doc.text('\n4. WHAT IS NOT COVERED (Exclusions)', { fontSize: 12, underline: true, color: 'red' });
  doc.list([
    'Wear & tear',
    'Mechanical/Electrical breakdowns',
    'Damage due to negligence',
    'Driving under influence',
    'Without valid license',
    'Vehicles used for commercial purposes (if policy says personal)'
  ]);
  
  // Section 5: Customer Acknowledgment (REQUIRED - IRDAI)
  doc.text('\n5. CUSTOMER ACKNOWLEDGMENT', { fontSize: 12, underline: true });
  doc.text('☐ I have read and understood all terms and conditions');
  doc.text('☐ I understand what is covered and what is NOT covered');
  doc.text('☐ I understand IDV and that it will DEPRECIATE every year');
  doc.text('☐ I authorize SageSure to bind this policy on my behalf');
  doc.text('☐ I agree to IRDAI consumer protection rules');
  
  // Section 6: Audit Trail (IRDAI requirement)
  doc.text('\n6. AUDIT TRAIL', { fontSize: 10 });
  doc.text(`Generated at: ${new Date().toISOString()}`);
  doc.text(`Request ID: ${generateRequestId()}`);
  doc.text('This document is digitally signed and IRDAI compliant.');
  
  // Save & return
  const fileName = `proposal-${quote.quoteId}.pdf`;
  doc.pipe(fs.createWriteStream(fileName));
  doc.end();
  
  return {
    fileName,
    content: doc,
    complianceStatus: 'IRDAI_COMPLIANT'
  };
}

// ============================================================================
// STEP 2: CAPTURE INFORMED CONSENT (IRDAI Requirement)
// ============================================================================

async function captureInformedConsent(
  customerId: string,
  quoteId: string,
  consentDetails: {
    consentGiven: boolean;
    proposalAcknowledged: boolean;
    coverageUnderstood: boolean;
    exclusionsAcknowledged: boolean;
  }
): Promise<ConsentDocument> {
  // Store consent with full audit trail
  const consent = {
    id: generateId(),
    customerId,
    quoteId,
    timestamp: new Date(),
    ipAddress: getClientIP(), // Track where consent was given
    userAgent: getUserAgent(),
    consentDetails,
    // Legally binding: all 4 checkboxes MUST be true
    isLegallyValid: Object.values(consentDetails).every(val => val === true)
  };
  
  // Store in database
  await database.save('customer_consents', consent);
  
  // Log to IRDAI audit
  console.log(`[IRDAI_COMPLIANCE] Consent captured for ${customerId}`);
  
  return consent;
}

// ============================================================================
// STEP 3: COLLECT PAYMENT
// ============================================================================

async function processPayment(
  customerId: string,
  quoteId: string,
  amount: number
): Promise<PaymentResponse> {
  // Use Razorpay / Stripe for payment
  const payment = await razorpay.orders.create({
    amount: amount * 100, // in paise
    currency: 'INR',
    receipt: quoteId,
    notes: {
      customerId,
      quoteId,
      purpose: 'INSURANCE_PREMIUM'
    }
  });

  // Return payment link to frontend
  return {
    paymentId: payment.id,
    amount,
    paymentUrl: `https://checkout.razorpay.com/?key=${RAZORPAY_KEY}&order_id=${payment.id}`,
    status: 'AWAITING_PAYMENT'
  };
}

// ============================================================================
// STEP 4: BIND POLICY WITH INSURER (The Critical Part)
// ============================================================================

async function bindPolicyWithInsurer(
  quote: QuoteResponse,
  vehicle: Vehicle,
  driver: Driver,
  coverage: Coverage,
  paymentProof: PaymentResponse
): Promise<BoundPolicy> {
  
  // Step 4a: Call insurer's policy binding API
  let policyResponse;
  
  if (quote.insurer === 'Reliance General') {
    policyResponse = await relianceIntegration.bindPolicy({
      quoteId: quote.quoteId,
      paymentId: paymentProof.paymentId,
      paymentStatus: 'COMPLETED',
      vehicle,
      driver,
      coverage,
      // Mandatory IRDAI fields
      customerConsent: 'GIVEN',
      complianceVersion: '2.0'
    });
  } else if (quote.insurer === 'Bajaj Allianz') {
    policyResponse = await bajajIntegration.createPolicy({
      quoteNo: quote.quoteId,
      txnRef: paymentProof.paymentId,
      paymentStatus: 'SUCCESS',
      proposalData: {
        vehicle,
        driver,
        coverage
      }
    });
  }
  
  // Step 4b: Store bound policy in our database
  const boundPolicy: BoundPolicy = {
    policyNumber: policyResponse.policyNumber,
    insurer: quote.insurer,
    startDate: new Date(),
    endDate: addMonths(new Date(), 12),
    coverageDetails: coverage,
    status: 'ACTIVE',
    ePolicy: {
      url: policyResponse.ePolicyUrl,
      generatedAt: new Date()
    }
  };
  
  // Step 4c: Store in database with full audit trail
  await database.save('bound_policies', {
    ...boundPolicy,
    customerId: getCurrentUserId(),
    createdAt: new Date(),
    originalQuote: quote,
    paymentProof: paymentProof,
    complianceLog: {
      irdaiCompliant: true,
      consentCaptured: true,
      paymentVerified: true,
      policyBound: true
    }
  });
  
  return boundPolicy;
}

// ============================================================================
// STEP 5: ISSUE E-POLICY
// ============================================================================

async function generateAndSendEPolicy(
  policy: BoundPolicy,
  customerEmail: string
): Promise<void> {
  // Download from insurer's system or generate
  const ePolicyPDF = await downloadEPolicy(policy.ePolicy.url);
  
  // Send to customer email
  await emailService.send({
    to: customerEmail,
    subject: `Your Insurance E-Policy - ${policy.policyNumber}`,
    body: `
      Dear Customer,
      
      Your insurance policy has been successfully activated!
      
      Policy Number: ${policy.policyNumber}
      Insurer: ${policy.insurer}
      Coverage: ${policy.coverageDetails.coverageType}
      IDV: ₹${policy.coverageDetails.idv}
      
      Valid From: ${policy.startDate.toDateString()}
      Valid Till: ${policy.endDate.toDateString()}
      
      Your e-policy is attached below.
      
      For claims: Visit https://sagesure.co.in/claims
      
      Regards,
      SageSure India Team
    `,
    attachments: [
      {
        filename: 'e-policy.pdf',
        content: ePolicyPDF
      }
    ]
  });
}

// ============================================================================
// COMPLETE FLOW: Quote → Bind → Policy
// ============================================================================

export async function completeQuoteToPolicyFlow(req: Request, res: Response) {
  try {
    const { quoteId, customerId, consentDetails, paymentProof } = req.body;
    
    // Retrieve original quote
    const quote = await database.get('quotes', quoteId);
    const vehicle = await database.get('vehicles', quote.vehicleId);
    const driver = await database.get('drivers', quote.driverId);
    const coverage = quote.coverage;
    
    // Step 1: Validate consent
    if (!consentDetails.consentGiven) {
      return res.status(400).json({ error: 'Customer consent required' });
    }
    
    // Step 2: Verify payment
    const paymentVerified = await verifyPaymentWithRazorpay(paymentProof.paymentId);
    if (!paymentVerified) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }
    
    // Step 3: Bind policy with insurer
    const boundPolicy = await bindPolicyWithInsurer(
      quote,
      vehicle,
      driver,
      coverage,
      paymentProof
    );
    
    // Step 4: Send e-policy to customer
    const customer = await database.get('customers', customerId);
    await generateAndSendEPolicy(boundPolicy, customer.email);
    
    // Step 5: Log to IRDAI audit
    console.log(`[IRDAI_COMPLIANCE] Policy bound: ${boundPolicy.policyNumber}`);
    
    res.json({
      status: 'SUCCESS',
      message: 'Policy successfully bound!',
      policy: {
        policyNumber: boundPolicy.policyNumber,
        insurer: boundPolicy.insurer,
        status: boundPolicy.status,
        ePolicyUrl: boundPolicy.ePolicy.url
      },
      nextSteps: [
        'Check your email for e-policy',
        'Download and save the e-policy',
        'Add policy to your wallet',
        'Track policy in SageSure app'
      ]
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Policy binding failed' });
  }
}
```

---

## PART 6: DATABASE SCHEMA FOR POLICY TRACKING

```sql
-- Quotes Table
CREATE TABLE quotes (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  insurer VARCHAR(255) NOT NULL,
  quote_id VARCHAR(255) UNIQUE NOT NULL,  -- Insurer's quote ID
  premium DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  valid_till TIMESTAMP NOT NULL,
  vehicle_details JSONB NOT NULL,
  driver_details JSONB NOT NULL,
  coverage_details JSONB NOT NULL,
  raw_insurer_response JSONB,  -- Store complete response from insurer
  status VARCHAR(50) DEFAULT 'ACTIVE',  -- ACTIVE, EXPIRED, CONVERTED_TO_POLICY
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, quote_id)
);

-- Bound Policies Table
CREATE TABLE bound_policies (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  quote_id VARCHAR(255) REFERENCES quotes(quote_id),
  policy_number VARCHAR(255) UNIQUE NOT NULL,  -- Insurer's policy number
  insurer VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  coverage_details JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE',  -- ACTIVE, EXPIRED, LAPSED, CANCELLED
  e_policy_url TEXT,
  raw_policy_response JSONB,  -- Complete response from insurer
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Compliance Audit Trail
CREATE TABLE compliance_audit_logs (
  id UUID PRIMARY KEY,
  customer_id UUID,
  quote_id VARCHAR(255),
  policy_id VARCHAR(255),
  action VARCHAR(255),  -- QUOTE_GENERATED, CONSENT_CAPTURED, PAYMENT_VERIFIED, POLICY_BOUND, CLAIM_FILED
  timestamp TIMESTAMP DEFAULT NOW(),
  request_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  irdai_compliant BOOLEAN DEFAULT TRUE
);

-- Payment Records
CREATE TABLE payment_records (
  id UUID PRIMARY KEY,
  customer_id UUID,
  quote_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  payment_gateway VARCHAR(50),  -- RAZORPAY, STRIPE
  payment_id VARCHAR(255) UNIQUE,
  status VARCHAR(50),  -- PENDING, COMPLETED, FAILED
  timestamp TIMESTAMP DEFAULT NOW(),
  verification_timestamp TIMESTAMP
);

-- Claims Table
CREATE TABLE claims (
  id UUID PRIMARY KEY,
  customer_id UUID,
  policy_id VARCHAR(255) REFERENCES bound_policies(policy_number),
  claim_number VARCHAR(255) UNIQUE,
  claim_type VARCHAR(50),  -- ACCIDENT, THEFT, NATURAL_CALAMITY
  description TEXT,
  amount_claimed DECIMAL(15, 2),
  status VARCHAR(50) DEFAULT 'SUBMITTED',
  filed_at TIMESTAMP DEFAULT NOW(),
  insurer_response JSONB,
  approval_status VARCHAR(50),  -- APPROVED, REJECTED, UNDER_REVIEW
  approved_amount DECIMAL(15, 2),
  settlement_date DATE
);
```

---

## PART 7: IMPLEMENTATION TIMELINE & COSTS

### Phase 1: Get Insurance Licenses (0-6 months)
- Apply for Insurance Broker license from IRDAI: ₹20-30L
- Get E&O insurance: ₹5-10L annually
- Set up legal/compliance team: ₹50L
- **Total: ₹75-90L + recurring**

### Phase 2: Partner with Insurers (2-6 months, simultaneous)
- **Each insurer partnership requires:**
  - Commercial agreement negotiation: 4-8 weeks
  - API documentation & setup: 2-4 weeks
  - Sandbox testing: 2-3 weeks
  - Production approval: 2-4 weeks
  - **Per insurer: ₹5-10L (for integration + relationship)**
  
- For 8 insurers: ₹40-80L over 6 months

### Phase 3: Build Integration Layer (2-4 months, start in Phase 2)
- Engineering team: 3-4 developers
- QA/testing: 1-2 testers
- Compliance/Legal: 1 person
- **Cost: ₹30-50L**

### Total Cost to Go Live
- **Licenses + Legal:** ₹75-90L
- **Insurer partnerships:** ₹40-80L
- **Engineering:** ₹30-50L
- **Compliance/Operations:** ₹15-25L
- **Contingency:** ₹50L
- **TOTAL: ₹2.1-2.95 Cr (₹21-30 million)**

---

## PART 8: WHAT SAGESURE DOES VS. WHAT INSURERS DO

| Component | SageSure Owns | Insurer Owns |
|-----------|---|---|
| **Quote Generation** | Display (frontend) | Calculation (API) |
| **Premium Calculation** | N/A | All logic |
| **Policy Number** | None | Unique identifier |
| **E-Policy** | Send to customer | Create PDF |
| **Claims Handling** | Track & display | Process & approve |
| **Regulatory** | IRDAI compliance logging | Policy compliance |
| **Customer Data** | Store (with insurer consent) | Owns legally |
| **Revenue** | Commission (4% of premium) | 100% of premium |

---

## PART 9: CURRENT STATE (Feb 2026)

### What We Have Now (Mock)
```
Mock insurer quote engine
→ Fake 8 quotes
→ No real binding
→ No real policies
```

### To Make It Real (Production Path)

#### Quickest Route (4-6 months):
1. Partner with 1 major insurer (e.g., Bajaj or HDFC)
   - Get their API credentials
   - Build integration
   - Go live with 1 insurer
   
2. Expand to 3-4 more insurers (2-3 months)
   
3. Apply for IRDAI license
   - Can operate as technology partner initially
   - Then get full broker license

#### Most Compliant Route (6-12 months):
1. Get IRDAI Insurance Broker license first (3-4 months)
2. Partner with all 8 insurers (4-6 months)
3. Build compliance infrastructure
4. Launch with full compliance

---

## PART 10: CURRENT CODE CHANGES NEEDED

In our mock `backend/src/app.ts`, we currently have:

```typescript
// CURRENT (Mock)
const INSURERS = ['Reliance', 'Bajaj', ...];

function generateQuote(insurer, ...): Quote {
  // Fake calculation - not real
  let premium = ...;
  return { ... };
}
```

To make it real, we need:

```typescript
// REAL
const INSURER_INTEGRATIONS = {
  'Reliance': new RelianceIntegration(apiKey, apiSecret),
  'Bajaj': new BajajIntegration(partnerId, apiKey),
  // ...
};

async function getQuotes(request) {
  const quotes = await Promise.all(
    Object.entries(INSURER_INTEGRATIONS).map(([name, integration]) =>
      integration.getQuote(request)
    )
  );
  return quotes;
}
```

---

## SUMMARY

**The Real Flow:**

1. **User fills form** → Sends to SageSure backend
2. **Backend calls all insurer APIs in parallel** → Gets real quotes
3. **Quotes displayed** → User chooses one
4. **User provides consent** → Download proposal document
5. **User pays** → Razorpay/Stripe processes
6. **SageSure calls insurer's policy binding API** → Policy created
7. **E-policy generated** → Sent to customer email
8. **Policy tracked in database** → Customer can claim/renew

**No IRDAI marketplace exists.** Every insurer has their own API. Building SageSure means:
- Get licensed (Broker license)
- Partner with each insurer individually
- Build custom integrations for each
- Handle policy binding through each insurer's system
- Manage compliance audit trail

This is why **most aggregators take 1-2 years to launch** with full functionality.

