/**
 * SageSure India - Backend Application
 * Express.js server with insurance quote engine
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).id = uuidv4();
  res.setHeader('X-Request-ID', (req as any).id);
  next();
});

// Types
interface Vehicle {
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  garageLocation: string;
}

interface Driver {
  licenseNumber: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  pincode: string;
  ncbStatus: number;
  claimHistory: number;
}

interface Coverage {
  idv: number;
  coverageType: 'thirdParty' | 'comprehensive';
  addOns: {
    zeroDeductible: boolean;
    roadsideAssistance: boolean;
    engineProtection: boolean;
  };
}

interface Quote {
  id: string;
  insurer: string;
  premium: number;
  tax: number;
  totalAmount: number;
  coverageDetails: any;
  validUntil: Date;
  complianceLog: any;
}

// Insurance data
const INSURERS = ['Reliance General', 'Bajaj Allianz', 'HDFC ERGO', 'ICICI Lombard', 'Orient Insurance', 'Star Insurance', 'SBI General', 'Magma HDI'];

// Premium calculation
function calculateBasePremium(vehicle: Vehicle, driver: Driver): number {
  const baseRate = 5000;
  const ageFactor = driver.age < 25 ? 1.5 : driver.age > 60 ? 1.3 : 1.0;
  const mileageFactor = vehicle.mileage > 50000 ? 1.2 : 1.0;
  const claimPenalty = driver.claimHistory > 0 ? 1 + (driver.claimHistory * 0.1) : 1.0;
  return baseRate * ageFactor * mileageFactor * claimPenalty;
}

function calculateNCB(ncbStatus: number): number {
  const nclDiscounts: { [key: number]: number } = { 0: 0, 25: 0.25, 50: 0.50, 75: 0.75, 100: 0.85 };
  return nclDiscounts[ncbStatus] || 0;
}

function adjustForIDV(basePremium: number, idv: number): number {
  const idvFactor = (idv / 500000);
  return basePremium * (0.8 + idvFactor * 0.4);
}

function getCoverageTypeFactor(coverageType: string): number {
  return coverageType === 'comprehensive' ? 1.5 : 1.0;
}

function getAddOnsPremium(addOns: any): number {
  let premium = 0;
  if (addOns.zeroDeductible) premium += 1500;
  if (addOns.roadsideAssistance) premium += 500;
  if (addOns.engineProtection) premium += 800;
  return premium;
}

function generateQuote(insurer: string, vehicle: Vehicle, driver: Driver, coverage: Coverage, requestId: string): Quote {
  const basePremium = calculateBasePremium(vehicle, driver);
  const nclDiscount = calculateNCB(driver.ncbStatus);
  const idvAdjustedPremium = adjustForIDV(basePremium, coverage.idv);
  const coverageFactor = getCoverageTypeFactor(coverage.coverageType);
  const addOnsPremium = getAddOnsPremium(coverage.addOns);
  
  let premium = idvAdjustedPremium * coverageFactor;
  premium = premium * (1 - nclDiscount);
  premium += addOnsPremium;
  
  const variance = (Math.random() - 0.5) * 0.2;
  premium = premium * (1 + variance);
  premium = Math.round(premium / 100) * 100;
  
  const tax = Math.round(premium * 0.18);
  const totalAmount = premium + tax;
  
  return {
    id: `${insurer}-${requestId}-${uuidv4()}`,
    insurer,
    premium,
    tax,
    totalAmount,
    coverageDetails: {
      idv: coverage.idv,
      thirdParty: coverage.coverageType === 'thirdParty',
      ncbApplied: driver.ncbStatus,
      addOns: Object.entries(coverage.addOns).filter(([_, value]) => value).map(([key, _]) => key)
    },
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    complianceLog: {
      timestamp: new Date(),
      userId: 'system',
      action: 'QUOTE_GENERATED'
    }
  };
}

// Routes
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date(), service: 'SageSure India Backend' });
});

app.post('/api/quotes', (req: Request, res: Response) => {
  try {
    const { vehicle, driver, coverage } = req.body;
    const requestId = (req as any).id;
    
    if (!vehicle || !driver || !coverage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const quotes = INSURERS.map(insurer => generateQuote(insurer, vehicle, driver, coverage, requestId));
    quotes.sort((a, b) => a.totalAmount - b.totalAmount);
    
    res.json({ requestId, quotes, timestamp: new Date() });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate quotes', message: error.message });
  }
});

app.post('/api/quotes/:id/select', (req: Request, res: Response) => {
  try {
    const quoteId = req.params.id;
    const { customerId, consentGiven } = req.body;
    
    if (!customerId || !consentGiven) {
      return res.status(400).json({ error: 'Customer ID and consent required' });
    }
    
    res.json({ status: 'selected', quoteId, customerId, nextStep: '/api/checkout', complianceStatus: 'IRDAI_COMPLIANT' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to select quote', message: error.message });
  }
});

app.post('/api/coverage-comparison', (req: Request, res: Response) => {
  try {
    const { quote1, quote2 } = req.body;
    const comparison = {
      quote1Details: { insurer: quote1.insurer, premium: quote1.premium, idv: quote1.coverageDetails.idv },
      quote2Details: { insurer: quote2.insurer, premium: quote2.premium, idv: quote2.coverageDetails.idv },
      differences: {
        premiumDifference: Math.abs(quote1.premium - quote2.premium),
        idvDifference: Math.abs(quote1.coverageDetails.idv - quote2.coverageDetails.idv),
        recommendation: quote1.premium < quote2.premium ? quote1.insurer : quote2.insurer
      }
    };
    res.json(comparison);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to compare coverage' });
  }
});

app.post('/api/claims/file', (req: Request, res: Response) => {
  try {
    const { policyId, claimType, description, documents } = req.body;
    const claimId = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({
      claimId,
      policyId,
      status: 'SUBMITTED',
      estimatedApprovalTime: '7-10 business days',
      documents: documents?.length || 0
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to file claim' });
  }
});

app.get('/api/claims/:id/status', (req: Request, res: Response) => {
  try {
    const claimId = req.params.id;
    const statuses = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PAID'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    res.json({
      claimId,
      status,
      estimatedAmount: 200000,
      approvalProbability: status === 'APPROVED' ? 100 : 75,
      timeline: {
        filed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updated: new Date(),
        expectedSettlement: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch claim status' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 SageSure India Backend running on http://localhost:${PORT}`);
  console.log(`💡 Health check: http://localhost:${PORT}/health`);
});

export default app;
