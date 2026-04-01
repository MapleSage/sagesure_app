/**
 * ScamShield UI Component Tests
 * Tests form validation, rendering, and user interactions
 *
 * **Validates: Requirements 30.10, 30.15**
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScamShieldPage } from './ScamShieldPage';
import { MessageAnalysisForm } from './MessageAnalysisForm';
import { PhoneVerificationForm } from './PhoneVerificationForm';
import { RiskScoreBadge } from './RiskScoreBadge';

// Mock the API module
jest.mock('../../lib/scamshield-api', () => ({
  analyzeMessage: jest.fn().mockResolvedValue({
    riskScore: 75,
    isScam: true,
    matchedPatterns: ['DIGITAL_ARREST'],
    warnings: ['This appears to be a digital arrest scam'],
    recommendations: ['Do not respond to this message'],
    confidence: 85,
  }),
  verifyPhone: jest.fn().mockResolvedValue({
    isVerified: false,
    isDND: false,
    isKnownScammer: true,
    warnings: ['This number has been reported as a scammer'],
  }),
  analyzeVideo: jest.fn().mockResolvedValue({
    incidentId: 'inc-123',
    analysis: {
      isDeepfake: true,
      confidence: 90,
      anomalies: {
        facialInconsistencies: ['Lip sync mismatch'],
        audioVisualSync: false,
        backgroundAnomalies: [],
      },
      suspiciousFrames: [10, 25],
    },
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

describe('RiskScoreBadge', () => {
  it('should display risk score', () => {
    render(<RiskScoreBadge score={75} />, { wrapper });
    expect(screen.getByText('75/100')).toBeInTheDocument();
    expect(screen.getByText('High Risk')).toBeInTheDocument();
  });

  it('should show Medium Risk for scores 41-70', () => {
    render(<RiskScoreBadge score={55} />, { wrapper });
    expect(screen.getByText('Medium Risk')).toBeInTheDocument();
  });

  it('should show Low Risk for scores 0-40', () => {
    render(<RiskScoreBadge score={20} />, { wrapper });
    expect(screen.getByText('Low Risk')).toBeInTheDocument();
  });

  it('should have accessible aria-label', () => {
    render(<RiskScoreBadge score={75} />, { wrapper });
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('75'));
  });
});

describe('MessageAnalysisForm', () => {
  it('should render the form', () => {
    render(<MessageAnalysisForm />, { wrapper });
    expect(screen.getByLabelText(/paste the suspicious message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze message/i })).toBeInTheDocument();
  });

  it('should show validation error for empty submission', async () => {
    render(<MessageAnalysisForm />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /analyze message/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('should submit and display results', async () => {
    render(<MessageAnalysisForm />, { wrapper });
    const textarea = screen.getByLabelText(/paste the suspicious message/i);
    fireEvent.change(textarea, { target: { value: 'Your policy has been suspended' } });
    fireEvent.click(screen.getByRole('button', { name: /analyze message/i }));

    await waitFor(() => {
      expect(screen.getByText('75/100')).toBeInTheDocument();
    });
  });
});

describe('PhoneVerificationForm', () => {
  it('should render the form', () => {
    render(<PhoneVerificationForm />, { wrapper });
    expect(screen.getByLabelText(/enter phone number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify number/i })).toBeInTheDocument();
  });

  it('should show validation error for invalid phone', async () => {
    render(<PhoneVerificationForm />, { wrapper });
    const input = screen.getByLabelText(/enter phone number/i);
    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /verify number/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

describe('ScamShieldPage', () => {
  it('should render with tabs', () => {
    render(<ScamShieldPage />, { wrapper });
    expect(screen.getByText(/ScamShield/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /message analysis/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /phone verification/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /deepfake detection/i })).toBeInTheDocument();
  });

  it('should switch tabs', () => {
    render(<ScamShieldPage />, { wrapper });
    fireEvent.click(screen.getByRole('tab', { name: /phone verification/i }));
    expect(screen.getByLabelText(/enter phone number/i)).toBeInTheDocument();
  });
});
