# SageSure India - Practical Integration Guide
## Real Implementation Steps: From Quote to Bound Policy

---

## STEP 1: GETTING INSURER API CREDENTIALS (6-12 weeks per insurer)

### Contact Insurer's Business Development Team

**Email Template:**
```
Subject: B2B API Partnership - Insurance Quotes & Distribution

Dear [Insurer Name] Business Development Team,

We are SageSure India, building a digital distribution platform for insurance.

We would like to integrate your insurance products via API to:
1. Display real-time quotes to customers
2. Bind policies through our platform
3. Handle claims tracking

Proposed partnership model:
- Commission: 4% of premium (standard market rate)
- Volume target: 5,000+ policies/month by Year 2
- IRDAI licensed: Yes (Insurance Broker)

Could we schedule a meeting with your:
- API/Technology team
- Commercial/Partnerships team
- Compliance team

Contact: [Your email]
```

### What Insurer Will Ask
1. **Your IRDAI License** (Broker/Agent license)
2. **Financial stability** (Bank statements, funding)
3. **Volume commitment** (How many policies/month)
4. **Technical capabilities** (API integration, uptime guarantee)
5. **Compliance setup** (Audit trails, KYC process)

### What Insurer Will Give You
1. **API documentation** (PDF, OpenAPI spec, or Postman collection)
2. **Sandbox API credentials** (API Key + Secret)
3. **Test environment** (Test quote/policy endpoints)
4. **Dedicated technical contact** (For integration support)
5. **SLA** (Service level agreement - 99.9% uptime, response time)

### Timeline per Insurer
```
Week 1-2: Initial contact + meetings
Week 3-4: Commercial negotiation (commission rate, volume, SLA)
Week 5-6: Get API docs + sandbox credentials
Week 7-8: Build integration in our backend
Week 9-10: Sandbox testing
Week 11-12: Production approval + go-live
```

---

## STEP 2: BUILD INTEGRATION LAYER (Real Code)

### Create Insurer Integration Service

**File: backend/src/services/insurers/reliance.integration.ts**

```typescript
import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

export class RelianceInsuranceIntegration {
  private baseURL: string;
  private apiKey: string;
  private apiSecret: string;
  private client: AxiosInstance;

  constructor(config: {
    apiKey: string;
    apiSecret: string;
    environment: 'sandbox' | 'production';
  }) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    
    // Different endpoints for sandbox vs production
    this.baseURL = config.environment === 'sandbox' 
      ? 'https://sandbox-api.reliancegeneral.com'
      : 'https://api.reliancegeneral.com';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 15000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-API-Key': this.apiSecret,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Generate Insurance Quote from Reliance API
   */
  async generateQuote(params: {
    registrationNumber: string;
    make: string;
    model: string;
    year: number;
    mileage: number;
    driverAge: number;
    ncbStatus: number;
    idv: number;
    coverageType: 'TP' | 'OD'; // TP=Third Party, OD=Own Damage (Comprehensive)
    addOns?: string[];
  }): Promise<{
    quoteId: string;
    premium: number;
    tax: number;
    totalAmount: number;
    validTill: Date;
  }> {
    try {
      const response = await this.client.post('/v2/quotes/motor', {
        // Reliance expects specific field mapping
        vehicle: {
          regNumber: params.registrationNumber,
          make: params.make,
          model: params.model,
          registrationYear: params.year,
          currentKM: params.mileage
        },
        driver: {
          age: params.driverAge,
          ncbPercentage: params.ncbStatus // 0, 25, 50, 75, 100
        },
        coverage: {
          idv: params.idv,
          type: params.coverageType, // TP or OD
          addOns: params.addOns || []
        }
      });

      // Validate response
      if (!response.data || !response.data.quoteId) {
        throw new Error('Invalid response from Reliance API');
      }

      return {
        quoteId: response.data.quoteId,
        premium: response.data.basePremium,
        tax: response.data.gst,
        totalAmount: response.data.netPremium,
        validTill: new Date(response.data.validTill)
      };
    } catch (error) {
      console.error('Reliance quote generation failed:', error);
      throw new Error(`Reliance quote failed: ${error.message}`);
    }
  }

  /**
   * Bind Policy with Reliance (Creates actual policy number)
   */
  async bindPolicy(params: {
    quoteId: string;
    customerId: string;
    paymentId: string; // From Razorpay/payment gateway
    driverAge: number;
    registrationNumber: string;
    // IRDAI-mandatory fields
    consentGiven: boolean;
    customerKYCStatus: 'VERIFIED' | 'PENDING';
  }): Promise<{
    policyNumber: string;
    startDate: Date;
    endDate: Date;
    ePolicyUrl: string;
  }> {
    try {
      // Step 1: Verify payment with payment gateway
      const paymentVerified = await this.verifyPayment(params.paymentId);
      if (!paymentVerified) {
        throw new Error('Payment verification failed');
      }

      // Step 2: Send policy binding request to Reliance
      const response = await this.client.post('/v1/policies/bind', {
        quoteId: params.quoteId,
        customerId: params.customerId,
        paymentGatewayId: params.paymentId,
        paymentStatus: 'VERIFIED',
        // IRDAI compliance fields
        consentGiven: params.consentGiven,
        kycStatus: params.customerKYCStatus,
        timestamp: new Date().toISOString()
      });

      if (!response.data || !response.data.policyNumber) {
        throw new Error('Policy binding failed - no policy number returned');
      }

      return {
        policyNumber: response.data.policyNumber,
        startDate: new Date(response.data.startDate),
        endDate: new Date(response.data.endDate),
        ePolicyUrl: response.data.ePolicyUrl // URL to download PDF
      };
    } catch (error) {
      console.error('Policy binding failed:', error);
      throw new Error(`Policy binding failed: ${error.message}`);
    }
  }

  /**
   * Download e-policy PDF
   */
  async getEPolicy(policyNumber: string): Promise<Buffer> {
    try {
      const response = await this.client.get(`/v1/policies/${policyNumber}/epolicy`, {
        responseType: 'arraybuffer'
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch e-policy:', error);
      throw error;
    }
  }

  /**
   * Get Policy Status
   */
  async getPolicyStatus(policyNumber: string): Promise<{
    status: 'ACTIVE' | 'EXPIRED' | 'LAPSED' | 'CANCELLED';
    startDate: Date;
    endDate: Date;
    premiumAmount: number;
  }> {
    try {
      const response = await this.client.get(`/v1/policies/${policyNumber}/status`);
      return {
        status: response.data.status,
        startDate: new Date(response.data.startDate),
        endDate: new Date(response.data.endDate),
        premiumAmount: response.data.premium
      };
    } catch (error) {
      console.error('Failed to get policy status:', error);
      throw error;
    }
  }

  /**
   * File a Claim
   */
  async fileClaim(params: {
    policyNumber: string;
    claimType: string; // ACCIDENT, THEFT, NATURAL_CALAMITY
    description: string;
    documents: string[]; // File URLs
  }): Promise<{
    claimNumber: string;
    status: string;
  }> {
    try {
      const response = await this.client.post('/v1/claims/file', {
        policyNumber: params.policyNumber,
        claimType: params.claimType,
        description: params.description,
        attachments: params.documents,
        filedAt: new Date().toISOString()
      });

      return {
        claimNumber: response.data.claimNumber,
        status: response.data.status
      };
    } catch (error) {
      console.error('Failed to file claim:', error);
      throw error;
    }
  }

  private async verifyPayment(paymentId: string): Promise<boolean> {
    // Implement based on your payment gateway (Razorpay/Stripe)
    // This is just a placeholder
    return true;
  }
}
```

### Create Main Orchestrator Service

**File: backend/src/services/quote.orchestrator.ts**

```typescript
import { RelianceInsuranceIntegration } from './insurers/reliance.integration';
import { BajajInsuranceIntegration } from './insurers/bajaj.integration';
import { HDFCInsuranceIntegration } from './insurers/hdfc.integration';
// Import more insurers...

export class QuoteOrchestratorService {
  private insurers: Map<string, any> = new Map();

  constructor() {
    // Initialize all insurer integrations with credentials from env
    this.insurers.set('Reliance', new RelianceInsuranceIntegration({
      apiKey: process.env.RELIANCE_API_KEY!,
      apiSecret: process.env.RELIANCE_API_SECRET!,
      environment: process.env.NODE_ENV as 'sandbox' | 'production'
    }));

    this.insurers.set('Bajaj', new BajajInsuranceIntegration({
      partnerId: process.env.BAJAJ_PARTNER_ID!,
      apiKey: process.env.BAJAJ_API_KEY!,
      environment: process.env.NODE_ENV as 'sandbox' | 'production'
    }));

    // Add more...
  }

  /**
   * Get quotes from all insurers in parallel
   */
  async getAllQuotes(request: {
    registrationNumber: string;
    make: string;
    model: string;
    year: number;
    mileage: number;
    driverAge: number;
    ncbStatus: number;
    idv: number;
    coverageType: 'thirdParty' | 'comprehensive';
  }): Promise<Array<{
    insurer: string;
    quoteId: string;
    premium: number;
    tax: number;
    totalAmount: number;
    validTill: Date;
    rawResponse?: any;
  }>> {
    // Call all insurers in PARALLEL (not sequentially)
    const quotePromises = Array.from(this.insurers.entries())
      .map(async ([insurerName, integration]) => {
        try {
          const quote = await integration.generateQuote({
            registrationNumber: request.registrationNumber,
            make: request.make,
            model: request.model,
            year: request.year,
            mileage: request.mileage,
            driverAge: request.driverAge,
            ncbStatus: request.ncbStatus,
            idv: request.idv,
            coverageType: request.coverageType === 'comprehensive' ? 'OD' : 'TP'
          });

          return {
            insurer: insurerName,
            ...quote,
            rawResponse: quote // Store for audit trail
          };
        } catch (error) {
          console.error(`${insurerName} quote failed:`, error);
          return null; // Return null on failure, don't break entire flow
        }
      });

    const results = await Promise.all(quotePromises);
    
    // Filter out failed quotes, sort by price
    return results
      .filter(quote => quote !== null)
      .sort((a, b) => a!.totalAmount - b!.totalAmount);
  }

  /**
   * Bind policy with selected insurer
   */
  async bindPolicy(request: {
    quoteId: string;
    insurer: string;
    customerId: string;
    paymentId: string;
    driverAge: number;
    registrationNumber: string;
    consentGiven: boolean;
  }): Promise<{
    policyNumber: string;
    insurer: string;
    startDate: Date;
    endDate: Date;
    ePolicyUrl: string;
  }> {
    const integration = this.insurers.get(request.insurer);
    if (!integration) {
      throw new Error(`Insurer ${request.insurer} not found`);
    }

    const policy = await integration.bindPolicy({
      quoteId: request.quoteId,
      customerId: request.customerId,
      paymentId: request.paymentId,
      driverAge: request.driverAge,
      registrationNumber: request.registrationNumber,
      consentGiven: request.consentGiven,
      customerKYCStatus: 'VERIFIED' // Assuming KYC done
    });

    return {
      policyNumber: policy.policyNumber,
      insurer: request.insurer,
      startDate: policy.startDate,
      endDate: policy.endDate,
      ePolicyUrl: policy.ePolicyUrl
    };
  }
}
```

---

## STEP 3: API ENDPOINTS FOR QUOTE & POLICY

**File: backend/src/routes/quotes.routes.ts**

```typescript
import express from 'express';
import { QuoteOrchestratorService } from '../services/quote.orchestrator';
import { PaymentService } from '../services/payment.service';
import { database } from '../database';

const router = express.Router();
const quoteService = new QuoteOrchestratorService();
const paymentService = new PaymentService();

/**
 * POST /api/quotes
 * Get real quotes from all insurers
 */
router.post('/quotes', async (req, res) => {
  try {
    const { registrationNumber, make, model, year, mileage, driverAge, ncbStatus, idv, coverageType } = req.body;

    // Validate request
    if (!registrationNumber || !make || !model) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get quotes from all insurers in parallel
    const quotes = await quoteService.getAllQuotes({
      registrationNumber,
      make,
      model,
      year,
      mileage,
      driverAge,
      ncbStatus,
      idv,
      coverageType
    });

    // Store quotes in database for later reference
    for (const quote of quotes) {
      await database.save('quotes', {
        quoteId: quote.quoteId,
        insurer: quote.insurer,
        premium: quote.premium,
        tax: quote.tax,
        totalAmount: quote.totalAmount,
        validTill: quote.validTill,
        requestDetails: {
          registrationNumber,
          make,
          model,
          year,
          driverAge,
          ncbStatus,
          idv,
          coverageType
        },
        status: 'ACTIVE',
        createdAt: new Date()
      });
    }

    res.json({
      quoteCount: quotes.length,
      quotes: quotes.map(q => ({
        insurer: q.insurer,
        quoteId: q.quoteId,
        premium: q.premium,
        tax: q.tax,
        totalAmount: q.totalAmount,
        validTill: q.validTill
      }))
    });
  } catch (error) {
    console.error('Quote generation failed:', error);
    res.status(500).json({ error: 'Failed to generate quotes' });
  }
});

/**
 * POST /api/quotes/:quoteId/purchase
 * User selects quote and proceeds to payment
 */
router.post('/quotes/:quoteId/purchase', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { customerId, consentGiven } = req.body;

    if (!consentGiven) {
      return res.status(400).json({ error: 'Customer consent required' });
    }

    // Retrieve quote details
    const quote = await database.get('quotes', quoteId);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Create payment order
    const paymentOrder = await paymentService.createOrder({
      amount: quote.totalAmount,
      customerId,
      quoteId
    });

    res.json({
      paymentId: paymentOrder.paymentId,
      amount: quote.totalAmount,
      paymentUrl: paymentOrder.paymentUrl,
      nextStep: 'Complete payment at ' + paymentOrder.paymentUrl
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

/**
 * POST /api/policies/bind
 * After payment, bind the policy with insurer
 */
router.post('/policies/bind', async (req, res) => {
  try {
    const { quoteId, paymentId, customerId, driverAge, registrationNumber, insurer } = req.body;

    // Verify payment completion
    const paymentStatus = await paymentService.verifyPayment(paymentId);
    if (paymentStatus.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Bind policy with insurer
    const policy = await quoteService.bindPolicy({
      quoteId,
      insurer,
      customerId,
      paymentId,
      driverAge,
      registrationNumber,
      consentGiven: true
    });

    // Store bound policy in database
    await database.save('bound_policies', {
      policyNumber: policy.policyNumber,
      insurer: policy.insurer,
      customerId,
      quoteId,
      startDate: policy.startDate,
      endDate: policy.endDate,
      ePolicyUrl: policy.ePolicyUrl,
      status: 'ACTIVE',
      createdAt: new Date()
    });

    res.json({
      status: 'SUCCESS',
      policyNumber: policy.policyNumber,
      insurer: policy.insurer,
      startDate: policy.startDate,
      endDate: policy.endDate,
      ePolicyUrl: policy.ePolicyUrl,
      message: 'Policy successfully bound! E-policy will be sent to your email.'
    });
  } catch (error) {
    console.error('Policy binding failed:', error);
    res.status(500).json({ error: 'Failed to bind policy' });
  }
});

/**
 * GET /api/policies/:policyNumber/status
 * Get real-time policy status from insurer
 */
router.get('/policies/:policyNumber/status', async (req, res) => {
  try {
    const { policyNumber } = req.params;

    // Get policy details
    const policy = await database.get('bound_policies', { policyNumber });
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    // Get real status from insurer
    const integration = quoteService.getIntegration(policy.insurer);
    const status = await integration.getPolicyStatus(policyNumber);

    res.json({
      policyNumber,
      insurer: policy.insurer,
      status: status.status,
      startDate: status.startDate,
      endDate: status.endDate,
      premiumAmount: status.premiumAmount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch policy status' });
  }
});

export default router;
```

---

## STEP 4: ENVIRONMENT VARIABLES

**File: .env**

```bash
# RELIANCE GENERAL
RELIANCE_API_KEY=your_api_key_here
RELIANCE_API_SECRET=your_api_secret_here

# BAJAJ ALLIANZ
BAJAJ_PARTNER_ID=your_partner_id_here
BAJAJ_API_KEY=your_api_key_here
BAJAJ_API_SECRET=your_api_secret_here

# HDFC ERGO
HDFC_API_KEY=your_api_key_here
HDFC_API_SECRET=your_api_secret_here

# ICICI LOMBARD
ICICI_API_KEY=your_api_key_here
ICICI_API_SECRET=your_api_secret_here

# PAYMENT GATEWAY
RAZORPAY_KEY_ID=your_key_here
RAZORPAY_KEY_SECRET=your_secret_here

# DATABASE
DATABASE_URL=postgresql://user:password@localhost:5432/sagesure

# ENVIRONMENT
NODE_ENV=sandbox # or production
```

---

## STEP 5: TESTING THE FLOW

### Test Quote Generation

```bash
curl -X POST http://localhost:5000/api/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "registrationNumber": "DL01AB1234",
    "make": "Maruti",
    "model": "Baleno",
    "year": 2023,
    "mileage": 17859,
    "driverAge": 35,
    "ncbStatus": 25,
    "idv": 534000,
    "coverageType": "comprehensive"
  }'
```

Expected Response:
```json
{
  "quoteCount": 8,
  "quotes": [
    {
      "insurer": "Orient Insurance",
      "quoteId": "OI-2026021312345",
      "premium": 9200,
      "tax": 1656,
      "totalAmount": 10856,
      "validTill": "2026-02-20T23:59:59Z"
    },
    // ... 7 more quotes, sorted by price
  ]
}
```

### Test Policy Binding

```bash
curl -X POST http://localhost:5000/api/policies/bind \
  -H "Content-Type: application/json" \
  -d '{
    "quoteId": "OI-2026021312345",
    "insurer": "Orient Insurance",
    "customerId": "CUST-12345",
    "paymentId": "pay_XXXXX",
    "driverAge": 35,
    "registrationNumber": "DL01AB1234",
    "consentGiven": true
  }'
```

Expected Response:
```json
{
  "status": "SUCCESS",
  "policyNumber": "OI/MV/2026/00012345",
  "insurer": "Orient Insurance",
  "startDate": "2026-02-13",
  "endDate": "2027-02-12",
  "ePolicyUrl": "https://api.orientinsurance.com/epolicy/OI-MV-2026-00012345.pdf",
  "message": "Policy successfully bound! E-policy will be sent to your email."
}
```

---

## REAL TIMELINE & COSTS

| Phase | Duration | Cost | Status |
|-------|----------|------|--------|
| IRDAI License | 3-4 months | ₹25-30L | Before launch |
| First Insurer Integration (Bajaj) | 2-3 months | ₹10L | Can start in parallel |
| 2nd-3rd Insurer | 1-2 months each | ₹5-10L each | Sequential |
| Engineering & Compliance | 4-6 months | ₹50L | Ongoing |
| Total to 8 Insurers | 9-12 months | ₹1.5-2Cr | Full platform |

---

## CONCLUSION

**Current State:** Mock quotes, no real binding
**Production State:** Real quotes from 8 insurers, real policy binding

This document shows the EXACT code and process needed to make SageSure real.

The biggest difference from the mock is:
- Replace `generateQuote()` fake calculation with real API calls
- Add `bindPolicy()` with actual insurer policy creation
- Handle payment verification before binding
- Store everything in database with IRDAI audit trail

**Timeline to go live with 1 insurer: 6-8 weeks**
**Timeline to go live with 8 insurers: 6-12 months**

