# SageSure India Platform - API Architecture & Sync Patterns

## Overview

The SageSure India Platform is built as a microservices-based architecture deployed on Azure Kubernetes Service (AKS), providing AI-powered trust and workflow automation for India's insurance ecosystem.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Web App (React)  │  Mobile App  │  WhatsApp Bot  │  Partners   │
└──────────┬──────────────┬──────────────┬──────────────┬─────────┘
           │              │              │              │
           └──────────────┴──────────────┴──────────────┘
                          │
                    ┌─────▼─────┐
                    │   NGINX   │
                    │  Ingress  │
                    └─────┬─────┘
                          │
           ┌──────────────┴──────────────┐
           │                             │
    ┌──────▼──────┐              ┌──────▼──────┐
    │   API       │              │   Static    │
    │  Gateway    │              │   Assets    │
    └──────┬──────┘              └─────────────┘
           │
    ┌──────▼──────────────────────────────┐
    │     Backend Services (Node.js)      │
    ├─────────────────────────────────────┤
    │  • Authentication & Authorization   │
    │  • ScamShield Module               │
    │  • Policy Pulse Module             │
    │  • Claims Defender Module          │
    │  • Sovereign Vault Module          │
    └──────┬──────────────────────────────┘
           │
    ┌──────┴──────────────────────────────┐
    │                                     │
┌───▼────┐  ┌────────┐  ┌──────────┐  ┌─▼──────┐
│PostgreSQL Redis    │  │Azure Blob│  │Key Vault│
│  15     │  Cache   │  │ Storage  │  │         │
└─────────┘  └────────┘  └──────────┘  └─────────┘
```

## API Endpoints Structure

### Base URL
- **Production**: `https://api.sagesure-india.com`
- **Staging**: `https://api-staging.sagesure-india.com`
- **Development**: `http://localhost:3000`

### API Versioning
All endpoints are versioned: `/api/v1/*`

---

## 1. Authentication & Authorization APIs

### 1.1 User Registration
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "phone": "+919876543210",
  "role": "CONSUMER"
}

Response: 201 Created
{
  "userId": "uuid",
  "email": "user@example.com",
  "message": "Registration successful"
}
```

### 1.2 Login with JWT
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response: 200 OK
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIs...",
  "expiresIn": 86400,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "CONSUMER"
  }
}
```

### 1.3 MFA - Send OTP
```http
POST /api/v1/auth/send-otp
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "message": "OTP sent to +919876543210",
  "expiresIn": 300
}
```

### 1.4 MFA - Verify OTP
```http
POST /api/v1/auth/verify-otp
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "otp": "123456"
}

Response: 200 OK
{
  "verified": true,
  "message": "OTP verified successfully"
}
```

---

## 2. ScamShield Module APIs

### 2.1 Analyze Message for Scams
```http
POST /api/v1/scamshield/analyze-message
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "message": "Congratulations! You have won 10 lakh rupees. Click here to claim: http://scam-link.com"
}

Response: 200 OK
{
  "riskScore": 95,
  "riskLevel": "HIGH",
  "matchedPatterns": [
    {
      "pattern": "lottery scam",
      "category": "FINANCIAL_FRAUD",
      "confidence": 0.98
    }
  ],
  "warnings": [
    "Suspicious link detected",
    "Unsolicited prize claim"
  ],
  "recommendations": [
    "Do not click the link",
    "Report to 1930 helpline",
    "Block the sender"
  ]
}
```

### 2.2 Verify Phone Number
```http
POST /api/v1/scamshield/verify-phone
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "phoneNumber": "+919876543210"
}

Response: 200 OK
{
  "phoneNumber": "+919876543210",
  "isVerified": true,
  "brandName": "HDFC Life Insurance",
  "isScammer": false,
  "isDnd": false,
  "reportCount": 0
}
```

### 2.3 Analyze Video for Deepfake
```http
POST /api/v1/scamshield/analyze-video
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

video: <binary file>

Response: 200 OK
{
  "isDeepfake": true,
  "confidenceScore": 87.5,
  "anomalies": [
    "Facial landmark inconsistencies detected",
    "Audio-visual sync mismatch at 00:15-00:20"
  ],
  "suspiciousFrames": [15, 18, 22, 45],
  "incidentId": "uuid",
  "recommendation": "High probability of deepfake. Report to authorities."
}
```

### 2.4 Add Family Member for Alerts
```http
POST /api/v1/scamshield/add-family-member
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Jane Doe",
  "relationship": "SPOUSE",
  "phone": "+919876543211",
  "email": "jane@example.com"
}

Response: 201 Created
{
  "familyMemberId": "uuid",
  "message": "Family member added successfully"
}
```

---

## 3. Policy Pulse Module APIs

### 3.1 Upload Policy PDF
```http
POST /api/v1/policy-pulse/upload-policy
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

file: <PDF binary>

Response: 200 OK
{
  "policyId": "uuid",
  "status": "success",
  "message": "Policy parsed successfully",
  "parsedPolicy": {
    "metadata": {
      "insurerName": "HDFC Life",
      "policyNumber": "POL123456",
      "policyType": "HEALTH",
      "sumAssured": 500000,
      "premium": 15000,
      "issueDate": "2024-01-01",
      "expiryDate": "2025-01-01"
    },
    "sections": {
      "coverage": "...",
      "exclusions": ["Pre-existing diseases", "..."],
      "terms": "...",
      "conditions": "..."
    }
  },
  "anomalies": []
}
```

### 3.2 Get Red Flags Analysis
```http
GET /api/v1/policy-pulse/red-flags/{policyId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "policyId": "uuid",
  "overallRisk": "MEDIUM",
  "redFlags": [
    {
      "type": "EXCESSIVE_EXCLUSIONS",
      "severity": "HIGH",
      "description": "Policy has 18 exclusions (threshold: 15)",
      "recommendation": "Review exclusions carefully before purchase"
    },
    {
      "type": "HIGH_PREMIUM",
      "severity": "MEDIUM",
      "description": "Premium is 28% above market average",
      "recommendation": "Compare with similar policies"
    }
  ],
  "misSellingRisk": false,
  "totalFlags": 2
}
```

### 3.3 Compare Coverage
```http
POST /api/v1/policy-pulse/compare/{policyId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "userPolicy": {
    "policyId": "uuid",
    "insurerName": "HDFC Life",
    "premium": 20000,
    "sumAssured": 500000
  },
  "similarPolicies": [
    {
      "policyId": "uuid2",
      "insurerName": "ICICI Prudential",
      "premium": 15000,
      "sumAssured": 500000
    }
  ],
  "comparison": {
    "premiumDifference": {
      "min": 14000,
      "max": 18000,
      "average": 15500
    },
    "coverageGaps": [
      "Pre Hospitalization",
      "Post Hospitalization",
      "Day Care"
    ],
    "betterFeatures": [
      "AYUSH Coverage"
    ],
    "worseFeatures": [
      "Longer waiting period (4 years vs avg 3 years)"
    ]
  },
  "switchingRecommendation": {
    "shouldSwitch": true,
    "estimatedSavings": 4500,
    "improvedCoverage": ["Pre Hospitalization", "Post Hospitalization"],
    "reason": "Your policy has both higher premium (29% above average) and missing coverage features."
  }
}
```

---

## API Sync Patterns & Data Flow

### 1. Real-Time Sync Pattern (WebSocket)
Used for: Live scam alerts, family notifications

```javascript
// Client connects to WebSocket
const ws = new WebSocket('wss://api.sagesure-india.com/ws');

ws.on('connect', () => {
  ws.send({ type: 'auth', token: accessToken });
});

// Server pushes real-time alerts
ws.on('message', (data) => {
  if (data.type === 'SCAM_ALERT') {
    // Display alert to user
    showAlert(data.payload);
  }
});
```

### 2. Polling Pattern
Used for: Job status, analysis progress

```javascript
// Client polls for analysis status
async function checkAnalysisStatus(analysisId) {
  const response = await fetch(
    `/api/v1/scamshield/analysis-status/${analysisId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  const data = await response.json();
  
  if (data.status === 'COMPLETED') {
    return data.result;
  } else if (data.status === 'PROCESSING') {
    // Poll again after 2 seconds
    await sleep(2000);
    return checkAnalysisStatus(analysisId);
  }
}
```

### 3. Webhook Pattern
Used for: External integrations (1930 helpline, TRAI Chakshu)

```javascript
// Server sends webhook to external service
POST https://1930.gov.in/api/report
Content-Type: application/json
X-Signature: HMAC-SHA256(payload, secret)

{
  "reportId": "uuid",
  "incidentType": "DIGITAL_ARREST",
  "details": {...},
  "timestamp": "2024-02-18T10:30:00Z"
}

// External service responds
Response: 200 OK
{
  "referenceNumber": "1930-2024-12345",
  "status": "RECEIVED"
}
```

### 4. Event-Driven Pattern (Message Queue)
Used for: Async processing, background jobs

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│  API     │─────▶│  Redis   │─────▶│  Worker  │
│ Endpoint │      │  Queue   │      │ Process  │
└──────────┘      └──────────┘      └──────────┘
                                          │
                                          ▼
                                    ┌──────────┐
                                    │ Database │
                                    └──────────┘
```

Example: PDF Processing
```javascript
// API endpoint queues job
POST /api/v1/policy-pulse/upload-policy
→ Job added to queue: { type: 'PDF_PARSE', policyId: 'uuid' }
→ Response: 202 Accepted { jobId: 'uuid', status: 'QUEUED' }

// Worker processes job
Worker picks job from queue
→ Extract text from PDF
→ Parse metadata
→ Store in database
→ Update job status: 'COMPLETED'

// Client checks status
GET /api/v1/policy-pulse/job-status/{jobId}
→ Response: { status: 'COMPLETED', result: {...} }
```

---

## Rate Limiting & Throttling

All API endpoints are rate-limited:

```
┌─────────────────────┬──────────────┬─────────────┐
│ Endpoint Type       │ Rate Limit   │ Window      │
├─────────────────────┼──────────────┼─────────────┤
│ Authentication      │ 5 requests   │ 15 minutes  │
│ Scam Analysis       │ 100 requests │ 1 minute    │
│ Policy Upload       │ 10 requests  │ 1 hour      │
│ General APIs        │ 100 requests │ 1 minute    │
└─────────────────────┴──────────────┴─────────────┘
```

Response when rate limit exceeded:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1708252800

{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again in 60 seconds.",
  "retryAfter": 60
}
```

---

## Error Handling

All errors follow consistent format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Specific field that caused error",
    "reason": "Detailed reason"
  },
  "requestId": "uuid",
  "timestamp": "2024-02-18T10:30:00Z"
}
```

Common error codes:
- `UNAUTHORIZED` (401): Invalid or missing authentication
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

---

## Security

### Authentication Flow
```
1. User logs in → Server generates JWT (RS256)
2. JWT contains: { userId, role, exp: 24h }
3. Client stores JWT in httpOnly cookie
4. Client sends JWT in Authorization header
5. Server verifies JWT signature using public key
6. Server checks expiry and extracts user context
```

### Data Encryption
- **In Transit**: TLS 1.3
- **At Rest**: AES-256-GCM (Azure Key Vault)
- **Database**: Transparent Data Encryption (TDE)
- **Passwords**: bcrypt (12 rounds)

### Audit Trail
All API calls are logged:
```json
{
  "auditId": "uuid",
  "userId": "uuid",
  "action": "POLICY_UPLOAD",
  "resourceType": "POLICY",
  "resourceId": "uuid",
  "ipAddress": "203.0.113.1",
  "userAgent": "Mozilla/5.0...",
  "outcome": "SUCCESS",
  "timestamp": "2024-02-18T10:30:00Z",
  "hash": "SHA256 hash for tamper-proof"
}
```

---

## Deployment & CI/CD

### Deployment Pipeline
```
1. Code Push → GitHub
2. GitHub Actions triggers CI/CD
3. Run tests (unit + property-based)
4. Build Docker image
5. Push to GitHub Container Registry
6. Deploy to Azure Kubernetes Service
7. Run database migrations
8. Health check verification
9. Rollback if health check fails
```

### Zero-Downtime Deployment
- Rolling update strategy
- Max surge: 1 pod
- Max unavailable: 0 pods
- Health checks before routing traffic

### Monitoring
- **Metrics**: Prometheus + Grafana
- **Logs**: Azure Log Analytics
- **Tracing**: Application Insights
- **Alerts**: Azure Monitor

---

## API Versioning Strategy

- **Current Version**: v1
- **Deprecation Policy**: 6 months notice
- **Breaking Changes**: New major version (v2)
- **Backward Compatibility**: Maintained for 1 year

---

## Next Steps

1. ✅ Complete Phase 1 implementation
2. ⏭️ Set up monitoring and alerting
3. ⏭️ Implement API gateway (Azure API Management)
4. ⏭️ Add GraphQL layer for flexible queries
5. ⏭️ Implement caching strategy (Redis)
6. ⏭️ Set up CDN for static assets
7. ⏭️ Performance testing and optimization
