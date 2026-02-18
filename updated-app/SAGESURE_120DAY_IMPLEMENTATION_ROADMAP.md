# SageSure India: 120-Day Implementation Roadmap
## 6-Module Trust Stack Platform Launch

---

## EXECUTIVE SUMMARY

**Mission:** Launch MVP of ScamShield + Policy Pulse (Modules 1-2) in 120 days.
**Goal:** Protect HNI seniors from insurance scams and mis-selling through real-time AI detection.
**Success Metric:** 50K WhatsApp messages in 60 days, 35%+ week-4 retention, 90%+ scam detection precision.

---

## PHASE 1: WEEKS 1-2 (Foundation - Feb 14 - Feb 27)

### Week 1: Architecture & Setup

**Deliverables:**
- ✅ Database schema created (all tables for 6 modules)
- ✅ Backend boilerplate (Express + TypeScript)
- ✅ Frontend boilerplate (React 18)
- ✅ Development environment (Docker Compose)
- ✅ GitHub repo structure
- ✅ Sarvam AI integration plan

**Team Allocation:**
```
Backend Lead (1 FTE):
  - Set up Express + TypeScript
  - Create database pool
  - Implement base middleware
  
DevOps (0.5 FTE):
  - Docker Compose setup
  - GitHub Actions CI/CD
  - PostgreSQL + Redis setup
  
Frontend Lead (1 FTE):
  - React project structure
  - Component architecture
  - Styling setup (Tailwind)
```

**Key Tasks:**
```
1. Initialize GitHub repo
   [ ] Create backend/ folder structure
   [ ] Create frontend/ folder structure
   [ ] Create database/ folder with schema.sql
   [ ] Add .gitignore + README

2. Backend Setup
   [ ] Install dependencies (express, cors, helmet, morgan, pg, redis)
   [ ] Create app.ts with middleware
   [ ] Create database connection pool
   [ ] Create .env.example
   [ ] Test health endpoint

3. Frontend Setup
   [ ] npx create-react-app
   [ ] Install TailwindCSS
   [ ] Create folder structure (/components, /pages, /services)
   [ ] Create App.tsx shell

4. Docker Setup
   [ ] Create Dockerfile.backend
   [ ] Create Dockerfile.frontend
   [ ] Create docker-compose.yml
   [ ] Test: docker-compose up

5. Sarvam AI Integration Planning
   [ ] Review Sarvam API docs
   [ ] Request API access
   [ ] Create sarvam-config.ts
   [ ] Test speech-to-text in sandbox
```

**Success Criteria (Week 1):**
- Docker Compose spins up all services
- Both frontend + backend load without errors
- Database schema initialized
- All 6 modules can be deployed (even if non-functional)

---

### Week 2: Regulatory Data Pipeline

**Deliverables:**
- ✅ IRDAI licensed insurers database populated
- ✅ TRAI telemarketer registry integration (manual or API)
- ✅ Ombudsman rules knowledge base
- ✅ UCC (telecom rules) knowledge base

**Team Allocation:**
```
Backend Developer (1 FTE):
  - Create data ingestion scripts
  - Populate IRDAI/TRAI data
  - Create data sync cron jobs
  
Compliance Officer (0.5 FTE):
  - Verify data accuracy
  - Document regulatory requirements
  - Create compliance checklist
```

**Key Tasks:**
```
1. IRDAI Data Pipeline
   [ ] Download licensed insurers list from IRDAI portal
   [ ] Parse into JSON format
   [ ] Create seed script (database/seeds/irdai-insurers.sql)
   [ ] Insert into verified_brands table
   [ ] Test: /api/v1/scamshield/verify-brand endpoint

2. TRAI Telemarketer Registry
   [ ] Get TRAI telemarketer list (public data)
   [ ] Create import script
   [ ] Load into telemarketer_registry table
   [ ] Set up weekly sync (cron job)

3. Ombudsman Knowledge Base
   [ ] Collect ombudsman FAQs from portal
   [ ] Create JSON rules file
   [ ] Document escalation procedures
   [ ] Create /docs/ombudsman-guide.md

4. UCC Rules Documentation
   [ ] Document TRAI UCC 2025 amendments
   [ ] Create rules checker logic
   [ ] Test against known scam patterns
   [ ] Document in /docs/ucc-rules.md
```

**Data Validation Checklist:**
```
✓ IRDAI data: 50+ insurers, official contact info verified
✓ TRAI data: 1000+ telemarketer records, phone numbers valid
✓ Ombudsman data: Complete FAQs, links to official portal
✓ UCC rules: All 2025 amendments documented
✓ All data encrypted in transit
```

---

## PHASE 2: WEEKS 3-6 (Module 1: ScamShield)

### Week 3-4: Core Pattern Detection

**Deliverables:**
- ✅ Message parsing engine (text, image, voice)
- ✅ Scam pattern database (1000+ patterns)
- ✅ Rules-based scam classifier
- ✅ Brand verification endpoint working
- ✅ WhatsApp bot integration started

**Team Allocation:**
```
Backend Developers (2 FTE):
  - Implement pattern matching engine
  - Create scam detection service
  - Integrate Sarvam for language processing
  
ML Engineer (0.5 FTE):
  - Design pattern matching algorithm
  - Create evaluation metrics
  - Build test dataset
  
Frontend Developer (0.5 FTE):
  - Create ScamShield UI components
  - Test message input form
```

**Implementation Steps:**

```
1. Pattern Matching Engine (backend/src/modules/scamshield/engine.ts)
   [ ] Create ScamPattern interface
   [ ] Implement keyword matching
   [ ] Implement urgency language detection
   [ ] Implement payment request detection
   [ ] Implement phone number extraction
   [ ] Create scoring algorithm
   [ ] Add unit tests

   Pseudocode:
   ```
   function scoreMessage(content):
     riskScore = 0
     flags = []
     
     for pattern in SCAM_PATTERNS:
       matched_keywords = pattern.keywords.filter(kw => content.includes(kw))
       if matched_keywords.length > 0:
         riskScore += pattern.confidence_boost
         flags.push({pattern, keywords: matched_keywords})
     
     if hasUrgencyLanguage(content):
       riskScore += 15
       flags.push('HIGH_URGENCY')
     
     if hasPaymentRequest(content):
       riskScore += 20
       flags.push('PAYMENT_REQUEST')
     
     return {
       riskScore: min(riskScore, 100),
       riskLevel: riskScore >= 70 ? 'SCAM' : (riskScore >= 40 ? 'SUSPICIOUS' : 'LEGITIMATE'),
       flags: flags
     }
   ```

2. Scam Corpus Database
   [ ] Create /data/scam-patterns.json (100+ patterns)
   [ ] Load into scam_patterns table
   [ ] Create UI to add new patterns (admin only)
   [ ] Document pattern format

3. Brand Verification Service
   [ ] GET /api/v1/scamshield/verify-brand endpoint
   [ ] Query IRDAI registry
   [ ] Check phone number against official list
   [ ] Return confidence + official contact

4. WhatsApp Bot Integration (Twilio)
   [ ] Create /integrations/whatsapp-bot.ts
   [ ] Set up Twilio account
   [ ] Create webhook endpoint
   [ ] Handle incoming messages
   [ ] Send analysis back to user
   [ ] Test with 5-10 beta users

5. Frontend UI
   [ ] Create ScamShieldPage component
   [ ] Text input for message
   [ ] Image upload for screenshots
   [ ] Display risk level + explanation
   [ ] Show safe actions
   [ ] Mobile-responsive design

6. Testing & Evaluation
   [ ] Create test dataset (100 scams, 100 legitimate)
   [ ] Measure precision/recall
   [ ] Target: 85%+ precision on MVP
```

**Success Criteria (Weeks 3-4):**
- Pattern matching engine detects 80%+ scams in test set
- Brand verification endpoint works for 50+ insurers
- WhatsApp bot receives + responds to messages
- 10-20 beta users testing via WhatsApp

**Metrics to Track:**
```
- Pattern coverage: How many scam types detected
- Precision: Of scams flagged, how many are real?
- Response time: <2 seconds per analysis
- False positive rate: <5%
```

---

### Week 5-6: Digital Arrest Shield (Specialized Feature)

**Deliverables:**
- ✅ Deepfake detection model integrated
- ✅ Digital arrest pattern database (500+ patterns)
- ✅ Real-time alert system working
- ✅ Family notification system built
- ✅ 1930 helpline integration designed

**Team Allocation:**
```
ML Engineer (1 FTE):
  - Integrate deepfake detection model
  - Train on digital arrest videos
  - Create evaluation framework
  
Backend Developer (1 FTE):
  - Build real-time alert system
  - Implement family notifications
  - Design 1930 integration
  
Frontend Developer (1 FTE):
  - Create emergency alert UI
  - Family member notification design
  - Real-time alert display
```

**Implementation:**

```
1. Deepfake Detection Model
   [ ] Choose model: MediaPipe Face Detection + custom classifier
       OR AWS Rekognition Deepfake API
       OR Open source: Face Alignment + Temporal consistency check
   
   [ ] Train on dataset:
       - 100+ real CBI officer videos (public domain)
       - 500+ deepfake videos (collected from victims/public)
       - Mix with legitimate video calls
   
   [ ] Metrics to track:
       - Detection accuracy on unseen deepfakes: 95%+
       - False positive rate on real videos: <5%
   
   [ ] Deploy as:
       - Cloud API (AWS/Google) OR
       - Local TensorFlow model (on-device)

2. Digital Arrest Pattern Database
   [ ] Collect 500+ real digital arrest calls/scripts
       Sources: Victim reports, news articles, government data
   [ ] Extract features:
       - Caller claims to be CBI/ED/Narcotics
       - Mentions Aadhaar/money laundering
       - Demands security deposit
       - Threatens immediate arrest
       - Deepfake video detection
       - Call duration >20 minutes
   
   [ ] Store in digital_arrest_patterns table
   [ ] Create confidence scoring

3. Real-Time Alert System
   [ ] Monitor incoming calls for digital arrest patterns
   [ ] If detected (confidence >85%):
       - Send alert to victim's phone
       - Notify family members
       - Generate 1930 pre-filled report
   
   [ ] Technology:
       - Bull job queue for async processing
       - Redis pub/sub for real-time events
       - WebSocket for UI updates

4. Family Notification
   [ ] GET /api/v1/vault/family-members endpoint
   [ ] Send SMS + WhatsApp to emergency contacts
   [ ] Include:
       - Victim name
       - Time of call
       - Scammer contact details
       - Evidence (deepfake confidence, pattern match)
       - Safe actions (call 1930, hang up, contact victim)
   
   [ ] Track: Did family member act within 1 hour?

5. 1930 Helpline Integration
   [ ] Design API contract with 1930 (if available)
   [ ] Create pre-filled report generator
   [ ] One-click "call 1930" button
   [ ] Automatic report submission
   [ ] Case tracking (if available)

6. Testing
   [ ] Create test scenarios:
       - Real deepfake video call (simulated)
       - Fake CBI impersonator call
       - Legitimate police call (negative test)
   
   [ ] Measure:
       - Detection accuracy: 99%+
       - Alert latency: <10 seconds
       - Family notification success: 100%
```

**Success Criteria (Weeks 5-6):**
- Digital arrest alerts trigger in <10 seconds
- 99%+ confidence on deepfake detection
- Family members notified within 1 minute
- All 3 test scenarios detect correctly
- Pre-filled 1930 report generated automatically

**Metrics:**
```
- Deepfake detection precision: 99%+
- False alarm rate: <1%
- Alert time (detection to notification): <10 seconds
- Family notification delivery: 95%+
```

---

## PHASE 3: WEEKS 7-10 (Module 2: Policy Pulse Check)

### Week 7-8: PDF Parsing & Policy Extraction

**Deliverables:**
- ✅ PDF parsing engine (extracts policy structure)
- ✅ Policy clause ontology (500+ terms mapped)
- ✅ Plain language translation service
- ✅ Policy upload + analysis working

**Team Allocation:**
```
Backend Developer (1.5 FTE):
  - Implement PDF parsing
  - Create policy ontology
  - Build extraction service
  
ML Engineer (0.5 FTE):
  - LLM integration (Sarvam or OpenAI)
  - Policy understanding model
  
Frontend Developer (1 FTE):
  - Policy upload UI
  - Analysis display
  - Plain language summary view
```

**Implementation:**

```
1. PDF Parsing Engine
   [ ] Use library: pdfparse OR pdf-lib OR Textract
   [ ] Extract:
       - Text content
       - Tables (room rent cap, waiting periods)
       - Structured data (policy number, insurer)
   
   [ ] Handle:
       - Scanned PDFs (OCR)
       - Different insurer formats
       - Multiple pages
   
   [ ] Output: Normalized JSON structure
   
   Pseudocode:
   ```
   async function parsePolicy(pdfBuffer):
     // Extract text from PDF
     const text = await pdf.getTextContent(pdfBuffer)
     
     // Use LLM to understand structure
     const structuredData = await llm.prompt(
       `Extract policy details from this text:
        - Insurer name
        - Policy number
        - Coverage amounts
        - Waiting periods
        - Exclusions
        
        Text: ${text}
        
        Return as JSON`
     )
     
     return structuredData
   ```

2. Coverage Ontology (500+ terms)
   [ ] Create comprehensive mapping:
       Hospital Bill ↔ In-patient benefit ↔ Hospitalization expense
       Room Rent Cap ↔ Daily limit ↔ Ward charges
       PED ↔ Pre-existing disease ↔ Waiting period
   
   [ ] For each term, store:
       - Standard definition
       - Hindi translation
       - Tamil translation
       - Industry benchmarks (min/avg/max)
       - Risk level if below benchmark
   
   [ ] Populate database:
       INSERT INTO coverage_ontology (standard_term, synonyms, ...)

3. Plain Language Translation
   [ ] Use Sarvam AI for Hindi/regional translation
   [ ] Create templates for common clauses:
       "Room rent capped at ₹5,000/day"
       → "अगर आप अस्पताल में भर्ती हो तो कमरे का खर्च ₹5,000 तक दैनिक बीमा कंपनी देगी"
   
   [ ] Implement context-aware translation:
       Policy context determines which translation
       e.g., "room rent cap" in health policy vs P&C

4. Policy Analysis Endpoint
   [ ] POST /api/v1/policy-pulse/analyze
   [ ] Body: policy PDF URL
   [ ] Response:
       {
         policy_details: {...},
         coverage: {...},
         waiting_periods: [...],
         exclusions: [...],
         red_flags: [...],
         plain_language_summary: string
       }

5. Frontend UI
   [ ] PolicyPulseAnalyzer component
   [ ] Upload policy PDF
   [ ] Show analysis in steps:
       1. Extracting policy...
       2. Identifying coverage...
       3. Detecting red flags...
   [ ] Display results:
       - Coverage summary (colorful cards)
       - Red flags (with severity)
       - Plain language summary
       - Download report button

6. Testing
   [ ] Test with 20+ real policies from different insurers
   [ ] Metrics:
       - Accuracy of extracted fields: 95%+
       - Coverage detection: 90%+
       - Plain language clarity: 90% users understand
```

**Success Criteria (Weeks 7-8):**
- PDF parsing works for 10+ insurer formats
- 95%+ accuracy on coverage extraction
- Plain language translation intelligible
- 100+ policies parsed successfully

---

### Week 9-10: Red Flags & Mis-selling Detection

**Deliverables:**
- ✅ Red flag detection rules (20+ patterns)
- ✅ Agent claim vs reality matching
- ✅ Mis-selling report generation
- ✅ IRDAI grievance form pre-fill

**Team Allocation:**
```
Backend Developer (1 FTE):
  - Implement red flag rules
  - Agent claim matching
  - Grievance form generation
  
Insurance Compliance (0.5 FTE):
  - Define red flag rules
  - Validate against IRDAI standards
```

**Implementation:**

```
1. Red Flag Rules (20+ patterns)
   
   Rule 1: Low room rent cap
   [ ] IF policy.room_rent_cap < 7000 AND city == 'metro'
   [ ] THEN RAISE 'HIGH' severity flag
   [ ] Message: "Room rent cap below typical hospital rates"
   [ ] Industry benchmark: "₹7K-10K/day in major cities"
   
   Rule 2: High PED waiting period
   [ ] IF policy.ped_waiting_period > 730 days
   [ ] THEN RAISE 'HIGH' severity flag
   [ ] Message: "Pre-existing condition waiting >2 years"
   [ ] Benchmark: "2-year standard, some offer 0-year"
   
   Rule 3: Broad exclusions
   [ ] IF policy.exclusions.count > 10
   [ ] THEN RAISE 'MEDIUM' severity flag
   [ ] Typical: 5-8 exclusions
   
   ... (17 more rules)
   
   [ ] Store all rules in red_flag_rules table
   [ ] Run against every policy parsed

2. Agent Claim Matching
   [ ] User inputs: "Agent said: [claim]"
   [ ] Compare against extracted policy
   [ ] Find mismatches (e.g., agent said "covers all", policy has limits)
   [ ] Calculate mismatch score (0-100)
   [ ] If >50: Flag as potential mis-selling
   
   Example:
   ```
   Agent claimed: "Covers all hospital bills"
   Actual policy: "Up to ₹5L/year, room rent capped at ₹5K/day"
   Mismatch score: 85%
   Recommendation: "Get written confirmation from insurer"
   ```

3. Mis-selling Report
   [ ] User can report suspected mis-selling
   [ ] Form includes:
       - Agent name + contact
       - What agent claimed
       - What policy actually covers
       - User description
   [ ] Auto-generates IRDAI complaint packet
   [ ] Fields pre-filled from policy analysis

4. IRDAI Grievance Form Pre-fill
   [ ] POST /api/v1/policy-pulse/flag-misselling
   [ ] Generate downloadable form
   [ ] Pre-fill:
       - Complainant details
       - Policy number + insurer
       - Complaint description
       - Evidence (policy PDF, agent communication)
   [ ] Include instructions:
       - Where to submit (IRDAI Bima Bharosa portal)
       - Expected timeline (30 days)
       - Next steps

5. Testing
   [ ] Test with 50+ real mis-selling cases
   [ ] Accuracy: 85%+ (correctly identify actual mismatches)
   [ ] False positive rate: <10%
```

**Success Criteria (Weeks 9-10):**
- 20+ red flag rules implemented
- Agent claim matching accuracy: 85%+
- 100+ policies analyzed for red flags
- Mis-selling reports downloadable

---

## PHASE 4: WEEKS 11-12 (Frontend + Integration)

### Week 11: Frontend Development

**Deliverables:**
- ✅ ScamShield UI (WhatsApp + web)
- ✅ Policy Pulse UI (upload + analysis)
- ✅ Dashboard (user portal)
- ✅ Mobile-responsive design

**Team Allocation:**
```
Frontend Developer (2 FTE):
  - Build all UI components
  - Responsive design
  - Animation/UX
  
UI/UX Designer (0.5 FTE):
  - Design system
  - Color scheme
  - Brand guidelines
```

**Implementation:**

```
1. Component Architecture

ScamShield Components:
  - ScamShieldPage
    ├─ MessageInput (text, image, voice)
    ├─ AnalysisResult
    │   ├─ RiskBadge (LEGITIMATE/SUSPICIOUS/SCAM)
    │   ├─ FlagsList
    │   └─ SafeActionsList
    └─ ReportButton

PolicyPulse Components:
  - PolicyPulseAnalyzer
    ├─ PolicyUpload
    ├─ LoadingState
    └─ AnalysisResult
        ├─ CoverageSummary
        ├─ RedFlagsList
        ├─ PlainLanguageSummary
        ├─ AgentClaimMismatchList
        └─ DownloadReportButton

Dashboard:
  - UserDashboard
    ├─ QuickStats (policies, scams detected, claims denied)
    ├─ RecentAnalyses
    └─ FamilyAccess (coming Module 4)

2. Design System
   [ ] Color palette:
       - Primary: SageSure brand blue
       - Success: Green (legitimate/safe)
       - Warning: Orange (suspicious)
       - Danger: Red (scam)
   
   [ ] Typography: Poppins (web), System font (mobile)
   
   [ ] Components: Button, Card, Badge, Alert, Modal

3. Mobile Optimization
   [ ] Responsive breakpoints (mobile, tablet, desktop)
   [ ] Touch-friendly inputs
   [ ] Fast loading (optimize images/assets)
   [ ] Works offline (cache analysis results)

4. WhatsApp Bot UI
   [ ] Simple message input
   [ ] Quick response display
   [ ] Share report with family
   [ ] Call 1930 button (for Digital Arrest)
```

**Success Criteria (Week 11):**
- All UI components built + responsive
- Mobile testing on 5+ devices
- Page load time <3 seconds
- Accessibility: WCAG AA compliant

---

### Week 12: Beta Launch + Hardening

**Deliverables:**
- ✅ All endpoints integrated
- ✅ Security audit completed
- ✅ DPDP compliance verified
- ✅ 100 beta users onboarded
- ✅ Production-ready deployment

**Team Allocation:**
```
Security Engineer (1 FTE):
  - Penetration testing
  - OWASP compliance
  - Encryption verification
  
DevOps (1 FTE):
  - Production deployment setup
  - Monitoring/logging
  - Backup strategy
  
QA (1 FTE):
  - End-to-end testing
  - Regression testing
  - Performance testing
```

**Implementation:**

```
1. Security Hardening
   [ ] OWASP Top 10 Mitigation:
       - SQL Injection: Use parameterized queries (pg library)
       - XSS: Sanitize all user inputs
       - CSRF: Implement CSRF tokens
       - Broken auth: Use JWT properly
   
   [ ] Encryption:
       - TLS 1.3 for all HTTPS
       - AES-256 for sensitive data at rest
       - Database encryption (AWS RDS encryption)
   
   [ ] Rate limiting:
       - 10 requests/minute per IP for login
       - 100 requests/minute per user for API
   
   [ ] Logging:
       - All authentication attempts
       - All data access
       - All compliance events

2. DPDP Compliance Check
   [ ] Purpose limitation: Data used only for stated purpose
   [ ] Consent tracking: Every consent has timestamp
   [ ] Data minimization: Collect only necessary data
   [ ] User rights: Implement deletion, portability
   [ ] Breach notification: Process in place for incidents
   
   [ ] Checklist:
       ✓ Privacy policy updated
       ✓ Consent forms in place
       ✓ Data processing agreement (if using 3rd party)
       ✓ Encryption verified
       ✓ Access logs enabled

3. IRDAI Compliance Verification
   [ ] Audit trail: Every action logged
   [ ] Consumer protection: Comply with policy rules
   [ ] Complaint handling: IRDAI grievance process supported
   [ ] Documentation: All processes documented
   
   [ ] Checklist:
       ✓ Compliance logs enabled
       ✓ IRDAI rules encoded in system
       ✓ Complaint escalation working
       ✓ Audit trail immutable

4. Beta User Onboarding
   [ ] Recruit 100 users (ideally HNI/seniors):
       - 50 via your acquaintance's network
       - 30 via HNI WhatsApp groups
       - 20 via Slack/online community
   
   [ ] Onboarding flow:
       1. Sign up with email/phone
       2. KYC verification (light)
       3. Language preference (en/hi)
       4. Consent forms
       5. Welcome email + training
   
   [ ] Track:
       - Sign-ups/day
       - Activation rate
       - First action within 24h
       - Any errors/bugs

5. Pre-Launch Testing
   [ ] Functional testing:
       - All API endpoints respond correctly
       - Message analysis working
       - Brand verification accurate
       - PDF parsing correct
   
   [ ] Integration testing:
       - WhatsApp webhook receiving messages
       - Email notifications sending
       - Database writes + reads working
       - Redis caching working
   
   [ ] Performance testing:
       - Response time <2s at scale
       - Throughput: 100+ requests/second
       - Database query time <100ms
       - Memory usage stable
   
   [ ] Security testing:
       - SQL injection attempts blocked
       - XSS payloads sanitized
       - CSRF tokens validated
       - Rate limiting working
   
   [ ] Compliance testing:
       - Audit logs complete
       - Encryption verified
       - DPDP rules enforced

6. Production Deployment
   [ ] Infrastructure:
       - AWS ECS cluster (Fargate)
       - RDS for PostgreSQL (multi-AZ)
       - ElastiCache for Redis
       - CloudFront CDN
       - WAF (Web Application Firewall)
   
   [ ] Monitoring:
       - DataDog or New Relic
       - PagerDuty alerts
       - CloudWatch dashboards
   
   [ ] Documentation:
       - API docs (Swagger/OpenAPI)
       - Deployment runbook
       - Incident response plan
```

**Success Criteria (Week 12):**
- 100 beta users active
- 50K+ WhatsApp messages in first week
- Zero critical bugs reported
- 35%+ week-4 retention
- Security audit passed
- DPDP compliance certified

---

## TEAM STRUCTURE (10-14 FTE for 120 Days)

```
Engineering (7-8 FTE):
  ├─ Backend Lead (1 FTE)
  │   └─ Owns app.ts, module routing, integrations
  ├─ Backend Developers (2-3 FTE)
  │   ├─ One: ScamShield module
  │   ├─ One: Policy Pulse module
  │   └─ One: Infrastructure/DevOps
  ├─ Frontend Lead (1 FTE)
  │   └─ Owns component architecture, design system
  ├─ Frontend Developers (1-2 FTE)
  │   ├─ One: ScamShield UI
  │   └─ One: Policy Pulse UI
  ├─ ML Engineer (0.5 FTE)
  │   └─ Deepfake detection, pattern matching
  └─ DevOps/Security (0.5-1 FTE)
      └─ Docker, CI/CD, security audit

Product & Design (1.5-2 FTE):
  ├─ Product Manager (0.5 FTE)
  │   └─ Feature prioritization, roadmap
  ├─ Designer (0.5 FTE)
  │   └─ UI/UX design system
  └─ QA/Testing (0.5 FTE)
      └─ Test plans, beta management

Compliance & Operations (1-2 FTE):
  ├─ Compliance Officer (0.5 FTE)
  │   └─ IRDAI/DPDP/UCC alignment
  ├─ Partnerships (0.5 FTE)
  │   └─ 1930 integration, insurer relationships
  └─ Operations (0.5 FTE)
      └─ Customer support, beta user management
```

---

## BUDGET ESTIMATE (120 Days)

```
Team Salaries (10 FTE avg, ₹8-15L/month):
  Engineering (7 FTE × ₹80K): ₹56L
  Product/Design (1.5 FTE × ₹70K): ₹10.5L
  Compliance/Ops (1.5 FTE × ₹50K): ₹7.5L
  ─────────────────────────────────
  Subtotal: ₹74L (4 months)

Infrastructure & Tools:
  AWS (RDS, ECS, S3, CDN): ₹5L
  Redis, Twilio, Sarvam API: ₹2L
  GitHub, DataDog, Dev tools: ₹1L
  ─────────────────────────────────
  Subtotal: ₹8L

Other:
  Legal/Compliance audit: ₹1L
  Design/branding: ₹0.5L
  Data (scam patterns, deepfakes): ₹1L
  Testing/QA tools: ₹0.5L
  ─────────────────────────────────
  Subtotal: ₹3L

═════════════════════════════════
TOTAL: ₹85L (approximately $10K/month × 10-12 months)
```

---

## SUCCESS METRICS (End of 120 Days)

### Adoption
```
✓ WhatsApp users: 50,000+
✓ Web users: 5,000+
✓ Week-4 retention: 35%+
✓ Viral coefficient: 0.3+ (30% of users refer 1 friend)
```

### Quality
```
✓ Scam detection precision: 90%+
✓ Red flag detection: 85%+
✓ API response time: <2 seconds
✓ System uptime: 99.5%+
```

### Business
```
✓ Zero CAC (organic growth)
✓ Zero churn in first 60 days
✓ 100% free (trust-building phase)
✓ Ready for Module 3+ (Claims Defender)
```

### Compliance
```
✓ IRDAI audit trail: 100% coverage
✓ DPDP compliance: Certified
✓ Security audit: Zero critical findings
✓ Encryption: AES-256 verified
```

---

## PHASE 5-6 PLANNING (Months 5-24)

Once Modules 1-2 launch, proceed with:

**Months 5-9 (Phase 2): Claims Defender + Vault**
- Module 3: Claims Defender (denial analysis)
- Module 4: Sovereign Vault (document repo + legacy heartbeat)

**Months 10-24 (Phase 3): Underwriting + Marketplace**
- Module 5: Underwriting Engine (ABDM integration)
- Module 6: Marketplace (aggregation + purchase)

Full roadmaps and requirements for these phases in separate documents.

---

## CRITICAL SUCCESS FACTORS

```
1. Regulatory Alignment
   - Work closely with IRDAI on compliance
   - Integrate with 1930 early
   - Get CBI buy-in for digital arrest data

2. Data Quality
   - Accuracy of scam patterns (crowdsourced)
   - Freshness of IRDAI/TRAI data
   - Quality of deepfake training data

3. User Experience
   - <1 minute to analyze message
   - <2 seconds response time
   - Mobile-first design (WhatsApp priority)

4. Trust Building
   - Be 100% honest about limitations
   - Show evidence for every flag
   - Never over-promise on recoveries

5. Team Execution
   - Daily standups for core team
   - Weekly demos to stakeholders
   - Clear ownership of each module
```

---

## RISKS & MITIGATION

```
Risk: Deepfake detection accuracy <95%
Mitigation: Partner with academic/research team, allocate 2-3 FTE to ML model

Risk: Data quality issues (wrong scam patterns)
Mitigation: Rigorous manual review, crowdsource verification, user feedback loop

Risk: Integration with 1930 delayed
Mitigation: Start conversations now, build backup (direct email to IRDAI)

Risk: Low initial adoption (<10K users in 60 days)
Mitigation: Target HNI networks, heavy media push on digital arrest crisis

Risk: Regulatory rejection
Mitigation: Legal review at every step, document compliance, get IRDAI pre-approval

Risk: Security breach
Mitigation: Penetration testing, bug bounty, incident response plan, cyber insurance
```

---

**Status: READY FOR EXECUTION**

This 120-day plan is achievable with a focused team, clear ownership, and daily execution discipline. The first 2 modules (ScamShield + Policy Pulse) provide immediate value and build the data moats for Modules 3-6.

Let's ship! 🚀
