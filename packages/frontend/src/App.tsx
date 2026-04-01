import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { ScamShieldPage } from './components/scamshield/ScamShieldPage';
import { PolicyPulsePage } from './components/policypulse/PolicyPulsePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const navItems = [
  { to: '/', label: '🏠 Home' },
  { to: '/scamshield', label: '🛡️ ScamShield' },
  { to: '/policy-pulse', label: '📋 Policy Pulse' },
];

function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center py-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome to SageSure India</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          AI-powered trust and workflow platform for India's insurance ecosystem.
          Protect yourself from scams, understand your policies, and make informed decisions.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <NavLink to="/scamshield" className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-blue-500">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">🛡️ ScamShield</h3>
          <p className="text-gray-600">Detect insurance scams, verify phone numbers, and analyze video calls for deepfakes.</p>
        </NavLink>
        <NavLink to="/policy-pulse" className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-green-500">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">📋 Policy Pulse</h3>
          <p className="text-gray-600">Upload your policy PDF to get plain language summaries, red flag detection, and coverage comparison.</p>
        </NavLink>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <h1 className="text-xl font-bold text-gray-900">SageSure India</h1>
                <nav className="flex space-x-1" aria-label="Main navigation">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/scamshield" element={<ScamShieldPage />} />
              <Route path="/policy-pulse" element={<PolicyPulsePage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
