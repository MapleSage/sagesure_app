/**
 * Policy Pulse UI Component Tests
 * Tests form rendering, data display, and user interactions
 *
 * **Validates: Requirements 30.10, 30.15**
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PolicyPulsePage } from './PolicyPulsePage';
import { PolicyDataDisplay } from './PolicyDataDisplay';
import { RedFlagsDisplay } from './RedFlagsDisplay';
import { CoverageComparisonTable } from './CoverageComparisonTable';
import { ParsedPolicy } from '../../lib/policypulse-api';

jest.mock('../../lib/policypulse-api', () => ({
  uploadPolicy: jest.fn().mockResolvedValue({
    policyId: 'pol-123',
    status: 'success',
    parsedPolicy: {
      policyId: 'pol-123',
      metadata: {
        insurerName: 'HDFC Ergo',
        policyNumber: 'HE-001',
        policyType: 'HEALTH',
        issueDate: '2024-01-01',
        expiryDate: '2025-01-01',
        sumAssured: 500000,
        premium: 15000,
      },
      sections: { coverage: 'Hospitalization', exclusions: ['Cosmetic surgery'], terms: '', conditions: '' },
      extractedData: { waitingPeriods: [], subLimits: [], coPayment: 20, roomRentLimit: 5000 },
    },
  }),
  generateSummary: jest.fn().mockResolvedValue({
    policyId: 'pol-123',
    language: 'en',
    summary: 'This is a health insurance policy.',
    keyPoints: ['Coverage includes hospitalization'],
    exclusionsHighlight: ['Cosmetic surgery not covered'],
    simplifiedTerms: {},
    disclaimer: 'This is a simplified summary.',
  }),
  getRedFlags: jest.fn().mockResolvedValue({
    overallRisk: 'MEDIUM',
    redFlags: [
      { type: 'HIGH_COPAYMENT', severity: 'MEDIUM', description: 'Co-payment is 20%', policyClause: '', recommendation: 'Negotiate lower co-payment' },
    ],
    recommendations: ['Review co-payment terms'],
    misSellingSuspicion: false,
  }),
  comparePolicy: jest.fn().mockResolvedValue({
    userPolicy: { insurerName: 'HDFC Ergo', premium: 15000, sumAssured: 500000 },
    similarPolicies: [
      { insurerName: 'Star Health', premium: 12000, sumAssured: 500000, claimSettlementRatio: 85 },
    ],
    comparison: { premiumDifference: -3000, coverageGaps: [], betterFeatures: ['Lower premium'], worseFeatures: [] },
    switchingRecommendation: { shouldSwitch: true, estimatedSavings: 3000 },
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

const mockPolicy: ParsedPolicy = {
  policyId: 'pol-123',
  metadata: {
    insurerName: 'HDFC Ergo',
    policyNumber: 'HE-001',
    policyType: 'HEALTH',
    issueDate: '2024-01-01',
    expiryDate: '2025-01-01',
    sumAssured: 500000,
    premium: 15000,
  },
  sections: {
    coverage: 'Hospitalization, surgery, day care',
    exclusions: ['Cosmetic surgery', 'Self-inflicted injuries'],
    terms: 'Standard terms',
    conditions: 'Standard conditions',
  },
  extractedData: {
    waitingPeriods: [{ condition: 'Pre-existing', period: '4 years' }],
    subLimits: [],
    coPayment: 20,
    roomRentLimit: 5000,
  },
};

describe('PolicyDataDisplay', () => {
  it('should display policy metadata', () => {
    render(<PolicyDataDisplay policy={mockPolicy} />, { wrapper });
    expect(screen.getByText('HDFC Ergo')).toBeInTheDocument();
    expect(screen.getByText('HE-001')).toBeInTheDocument();
    expect(screen.getByText('HEALTH')).toBeInTheDocument();
  });

  it('should display exclusions', () => {
    render(<PolicyDataDisplay policy={mockPolicy} />, { wrapper });
    expect(screen.getByText(/Cosmetic surgery/)).toBeInTheDocument();
  });

  it('should display co-payment', () => {
    render(<PolicyDataDisplay policy={mockPolicy} />, { wrapper });
    expect(screen.getByText('20%')).toBeInTheDocument();
  });
});

describe('RedFlagsDisplay', () => {
  it('should render analyze button', () => {
    render(<RedFlagsDisplay policyId="pol-123" />, { wrapper });
    expect(screen.getByRole('button', { name: /detect red flags/i })).toBeInTheDocument();
  });

  it('should display red flags after analysis', async () => {
    render(<RedFlagsDisplay policyId="pol-123" />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /detect red flags/i }));
    await waitFor(() => {
      expect(screen.getByText(/Overall Risk: MEDIUM/)).toBeInTheDocument();
      expect(screen.getByText(/Co-payment is 20%/)).toBeInTheDocument();
    });
  });
});

describe('CoverageComparisonTable', () => {
  it('should render compare button', () => {
    render(<CoverageComparisonTable policyId="pol-123" />, { wrapper });
    expect(screen.getByRole('button', { name: /compare/i })).toBeInTheDocument();
  });

  it('should display comparison table after clicking compare', async () => {
    render(<CoverageComparisonTable policyId="pol-123" />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /compare/i }));
    await waitFor(() => {
      expect(screen.getByText('Star Health')).toBeInTheDocument();
    });
  });
});

describe('PolicyPulsePage', () => {
  it('should render upload form', () => {
    render(<PolicyPulsePage />, { wrapper });
    expect(screen.getByText(/Policy Pulse/)).toBeInTheDocument();
    expect(screen.getByText(/Upload Policy PDF/)).toBeInTheDocument();
  });
});
