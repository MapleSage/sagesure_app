/**
 * App Component Tests
 */

// Mock the API modules to avoid import.meta.env issues
jest.mock('./lib/api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
  getErrorMessage: jest.fn(),
}));

jest.mock('./lib/scamshield-api', () => ({
  analyzeMessage: jest.fn(),
  verifyPhone: jest.fn(),
  analyzeVideo: jest.fn(),
}));

jest.mock('./lib/policypulse-api', () => ({
  uploadPolicy: jest.fn(),
  generateSummary: jest.fn(),
  getRedFlags: jest.fn(),
  comparePolicy: jest.fn(),
}));

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

describe('App', () => {
  it('should render the home page with navigation', () => {
    render(<App />);
    expect(screen.getAllByText(/SageSure India/).length).toBeGreaterThan(0);
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
  });

  it('should show module cards on home page', () => {
    render(<App />);
    expect(screen.getAllByText(/ScamShield/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Policy Pulse/).length).toBeGreaterThan(0);
  });
});
