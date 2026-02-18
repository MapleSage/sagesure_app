import React, { useState } from 'react';
import './App.css';

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
  validUntil: string;
}

const VehicleStep: React.FC<{ onNext: (data: Vehicle) => void }> = ({ onNext }) => {
  const [formData, setFormData] = useState<Vehicle>({
    registrationNumber: '',
    make: 'Maruti',
    model: 'Baleno',
    year: 2023,
    mileage: 17859,
    garageLocation: '110077'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseInt(value) : value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  return (
    <div className="form-container">
      <h2>🚗 Your Vehicle Details</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Registration Number</label>
          <input type="text" name="registrationNumber" placeholder="DL-01-AB-1234" value={formData.registrationNumber} onChange={handleChange} required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Make</label>
            <input type="text" name="make" value={formData.make} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Model</label>
            <input type="text" name="model" value={formData.model} onChange={handleChange} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Year</label>
            <input type="number" name="year" min="2000" max={new Date().getFullYear()} value={formData.year} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Mileage (km)</label>
            <input type="number" name="mileage" value={formData.mileage} onChange={handleChange} />
          </div>
        </div>
        <button type="submit" className="btn-primary">Continue → Driver Details</button>
      </form>
    </div>
  );
};

const DriverStep: React.FC<{ onNext: (data: Driver) => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const [formData, setFormData] = useState<Driver>({
    licenseNumber: '',
    age: 35,
    gender: 'M',
    pincode: '110077',
    ncbStatus: 25,
    claimHistory: 0
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseInt(value) : value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  return (
    <div className="form-container">
      <h2>👤 Driver Details</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>License Number</label>
          <input type="text" name="licenseNumber" placeholder="DL-123456" value={formData.licenseNumber} onChange={handleChange} required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Age</label>
            <input type="number" name="age" min="18" max="100" value={formData.age} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select name="gender" value={formData.gender} onChange={handleChange}>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>NCB Status (%)</label>
          <select name="ncbStatus" value={formData.ncbStatus} onChange={handleChange}>
            <option value={0}>0%</option>
            <option value={25}>25%</option>
            <option value={50}>50%</option>
            <option value={75}>75%</option>
          </select>
        </div>
        <div className="form-buttons">
          <button type="button" className="btn-secondary" onClick={onBack}>← Back</button>
          <button type="submit" className="btn-primary">Continue → Coverage</button>
        </div>
      </form>
    </div>
  );
};

const CoverageStep: React.FC<{ onNext: (data: Coverage) => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const [formData, setFormData] = useState<Coverage>({
    idv: 534000,
    coverageType: 'comprehensive',
    addOns: { zeroDeductible: false, roadsideAssistance: true, engineProtection: false }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        addOns: { ...formData.addOns, [name]: checked }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'number' ? parseInt(value) : value
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  return (
    <div className="form-container">
      <h2>🛡️ Coverage Preferences</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>IDV (Insured Declared Value)</label>
          <input type="number" name="idv" value={formData.idv} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Coverage Type</label>
          <select name="coverageType" value={formData.coverageType} onChange={handleChange}>
            <option value="thirdParty">Third-Party Only</option>
            <option value="comprehensive">Comprehensive</option>
          </select>
        </div>
        <div className="form-buttons">
          <button type="button" className="btn-secondary" onClick={onBack}>← Back</button>
          <button type="submit" className="btn-primary">Get Quotes →</button>
        </div>
      </form>
    </div>
  );
};

const QuoteComparison: React.FC<{ quotes: Quote[]; onSelect: (quote: Quote) => void; loading: boolean }> = ({ quotes, onSelect, loading }) => {
  if (loading) return <div className="loading-container"><div className="spinner"></div><p>Fetching quotes...</p></div>;
  if (quotes.length === 0) return <div className="error-container"><p>No quotes available</p></div>;

  return (
    <div className="quotes-container">
      <h2>💰 Compare Your Insurance Quotes</h2>
      <div className="quotes-grid">
        {quotes.map((quote, index) => (
          <div key={quote.id} className={`quote-card ${index === 0 ? 'best-price' : ''}`}>
            {index === 0 && <div className="badge">Best Price</div>}
            <h3>{quote.insurer}</h3>
            <div className="quote-price">
              <div className="amount">₹{quote.totalAmount.toLocaleString()}</div>
            </div>
            <button className="btn-select" onClick={() => onSelect(quote)}>Select Quote</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [step, setStep] = useState<'vehicle' | 'driver' | 'coverage' | 'quotes'>('vehicle');
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);

  const handleVehicleNext = (data: Vehicle) => {
    setVehicle(data);
    setStep('driver');
  };

  const handleDriverNext = (data: Driver) => {
    setDriver(data);
    setStep('coverage');
  };

  const handleCoverageNext = async (data: Coverage) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle, driver, coverage: data })
      });
      const result = await response.json();
      setQuotes(result.quotes || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setStep('quotes');
    }
  };

  const handleQuoteSelect = (quote: Quote) => {
    alert(`✅ Quote selected from ${quote.insurer}\n\nAmount: ₹${quote.totalAmount}`);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🛡️ SageSure</h1>
        <p>Insurance Without Agents</p>
      </header>
      <main className="app-main">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: step === 'vehicle' ? '25%' : step === 'driver' ? '50%' : step === 'coverage' ? '75%' : '100%' }} />
        </div>
        {step === 'vehicle' && <VehicleStep onNext={handleVehicleNext} />}
        {step === 'driver' && <DriverStep onNext={handleDriverNext} onBack={() => setStep('vehicle')} />}
        {step === 'coverage' && <CoverageStep onNext={handleCoverageNext} onBack={() => setStep('driver')} />}
        {step === 'quotes' && <QuoteComparison quotes={quotes} onSelect={handleQuoteSelect} loading={loading} />}
      </main>
      <footer className="app-footer">
        <p>🔒 IRDAI Compliant | ✅ Privacy First</p>
      </footer>
    </div>
  );
};

export default App;
