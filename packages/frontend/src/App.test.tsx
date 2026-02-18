import { screen } from '@testing-library/react';
import App from './App';
import { renderWithProviders } from './test/helpers';

describe('App', () => {
  it('should render without crashing', () => {
    renderWithProviders(<App />);
    expect(screen.getByText(/SageSure India Platform/i)).toBeInTheDocument();
  });

  it('should display welcome message', () => {
    renderWithProviders(<App />);
    expect(
      screen.getByText(/Welcome to SageSure India Platform - Development Environment Ready/i)
    ).toBeInTheDocument();
  });
});
