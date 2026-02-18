# SageSure India Platform

> AI-powered trust and workflow platform for India's insurance ecosystem

[![CI/CD](https://github.com/sagesure/sagesure-india/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/sagesure/sagesure-india/actions)
[![codecov](https://codecov.io/gh/sagesure/sagesure-india/branch/main/graph/badge.svg)](https://codecov.io/gh/sagesure/sagesure-india)
[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7

### Local Development

```bash
# Clone repository
git clone https://github.com/sagesure/sagesure-india.git
cd sagesure-india

# Install dependencies
npm install

# Start infrastructure (PostgreSQL + Redis)
docker-compose up -d

# Run database migrations
cd packages/backend
npx prisma migrate dev
npx prisma db seed

# Start development servers
npm run dev
```

Backend API: http://localhost:3000
Frontend: http://localhost:5173

## 📁 Project Structure

```
sagesure-india/
├── packages/
│   ├── backend/          # Node.js/TypeScript/Express API
│   └── frontend/         # React/TypeScript UI
├── infrastructure/
│   ├── terraform/        # Azure infrastructure as code
│   └── kubernetes/       # Kubernetes manifests
├── .github/
│   └── workflows/        # CI/CD pipelines
└── docs/                 # Documentation
```

## 🏗️ Architecture

The platform consists of 4 core modules:

1. **ScamShield** - Consumer protection against insurance scams
   - Real-time message analysis (10,000+ scam patterns)
   - Phone number verification (TRAI DND integration)
   - Deepfake detection (TensorFlow.js)
   - Family alert system

2. **Policy Pulse** - Policy understanding and analysis
   - PDF parsing with OCR
   - Plain language translation (6 Indian languages)
   - Red flag detection (20+ mis-selling indicators)
   - Coverage comparison engine

3. **Claims Defender** - Claim denial assistance
   - Denial letter analysis
   - Ombudsman precedent matching
   - Evidence packaging
   - Complaint draft generation

4. **Sovereign Vault** - Secure document management
   - End-to-end encryption (AES-256-GCM)
   - Family access control
   - Legacy planning
   - Audit trail

See [API_ARCHITECTURE.md](API_ARCHITECTURE.md) for detailed API documentation.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm test -- --testPathIgnorePatterns="property.test"

# Run property-based tests
npm test -- --testPathPattern="property.test"

# Run with coverage
npm test -- --coverage
```

## 🚢 Deployment

### Azure Kubernetes Service

```bash
# Login to Azure
az login

# Deploy infrastructure
cd infrastructure/terraform
terraform init
terraform plan
terraform apply

# Deploy application
kubectl apply -f ../kubernetes/
```

### CI/CD Pipeline

Automated deployment on push to `main` branch:
1. Run tests
2. Build Docker images
3. Push to GitHub Container Registry
4. Deploy to AKS
5. Run database migrations
6. Health check verification

## 📊 Monitoring

- **Metrics**: Prometheus + Grafana
- **Logs**: Azure Log Analytics
- **Tracing**: Application Insights
- **Alerts**: Azure Monitor

## 🔒 Security

- JWT authentication (RS256)
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)
- Rate limiting (100 req/min)
- Audit trail (tamper-proof)
- DPDP Act 2023 compliant

## 📝 Documentation

- [API Architecture](API_ARCHITECTURE.md)
- [Setup Guide](SETUP_COMPLETE.md)
- [Testing Guide](TESTING_SETUP.md)
- [Phase 1 Progress](PHASE_1_PROGRESS_SUMMARY.md)
- [Azure Communication Services](packages/backend/AZURE_COMMUNICATION_SERVICES_GUIDE.md)

## 🤝 Contributing

This is a proprietary project. For contribution guidelines, contact the development team.

## 📄 License

Copyright © 2024 SageSure India. All rights reserved.

## 🔗 Links

- **Production**: https://sagesure-india.com
- **API Docs**: https://api.sagesure-india.com/docs
- **Status Page**: https://status.sagesure-india.com
- **Parent Organization**: [MapleSage](https://maplesage.com)

## 📞 Support

- Email: support@sagesure-india.com
- Slack: #sagesure-india
- Issues: GitHub Issues (internal team only)

---

Built with ❤️ by the SageSure India team
