# SageSure India - Technical Requirements Document
## 6-Module Trust Stack Platform (Updated)

---

## 1. PRODUCT ARCHITECTURE OVERVIEW

```
SageSure India = Consumer Trust Stack
├── Module 1: ScamShield (Real-time scam + deepfake detection)
├── Module 2: Policy Pulse Check (Policy parsing + understanding)
├── Module 3: Claims Defender (Denial analysis + escalation)
├── Module 4: Sovereign Vault (Family document repository)
├── Module 5: Underwriting Engine (ABDM + pre-claim risk)
└── Module 6: Marketplace (Aggregation + servicing)

All modules share:
  ✓ Unified user vault
  ✓ Consent management layer
  ✓ Audit logging (compliance)
  ✓ Sarvam AI for language (Hindi/regional)
  ✓ Encryption at rest + in transit
```

---

## 2. MODULE 1: SCAMSHIELD

### 2.1 Core Features

```
Feature 1: General Scam Detection
  Input: Text/image/voice message
  Output: Scam risk score + safe action
  Examples:
    - "Your policy expiring"
    - "Free health checkup"
    - "KYC update required"

Feature 2: Digital Arrest Shield (Specialized)
  Input: Video call metadata + deepfake analysis
  Output: Real-time alert to victim + family
  Integration: 1930 helpline + CBI
  
Feature 3: Telemarketer Registry Check
  Input: Phone number / Brand name
  Output: Is this licensed? Is this real brand?
  Data source: TRAI registry + IRDAI list
```

### 2.2 API Specification

```yaml
POST /api/v1/scamshield/check-message
  Description: Analyze incoming message for scam risk
  Body:
    type: "sms" | "whatsapp" | "call_summary" | "image"
    content: string
    language: "en" | "hi" | "ta" | "te" | "ml"
    metadata:
      sender_number: string
      timestamp: datetime
      user_id: string
  
  Response:
    risk_level: "LEGITIMATE" | "SUSPICIOUS" | "SCAM"
    confidence: 0-100
    reason: string (in user's language)
    flags: [
      { flag_type: string, severity: "LOW"|"MEDIUM"|"HIGH" }
    ]
    safe_actions: [
      { action: string, next_step: string, link: string? }
    ]
    audit_trail:
      checks_run: [string]
      sources_consulted: [string]
      timestamp: datetime

POST /api/v1/scamshield/digital-arrest-detection
  Description: Real-time digital arrest pattern detection
  Body:
    call_metadata:
      incoming: boolean
      duration_seconds: number
      caller_id: string
      platform: "skype" | "whatsapp" | "native"
      started_at: datetime
    video_analysis:
      deepfake_confidence: 0-100
      artifacts: [string]
      face_match_to_known_officials: boolean
    audio_analysis:
      voice_biometric_match: string | null
      accent_origin: string
      stress_level: "low" | "medium" | "high"
      script_patterns: [string]
    conversation_summary:
      mentioned_keywords: [string]
      demands: [string]
      threats: [string]
  
  Response:
    is_digital_arrest: boolean
    confidence: 0-100
    immediate_actions:
      alert_victim: {
        message: string (in local language)
        action_buttons: [string]
        urgency: "IMMEDIATE"
      }
      alert_family: {
        emergency_contacts: [
          { name: string, phone: string, method: "call"|"sms"|"whatsapp" }
        ]
        summary: string
        evidence: {
          call_duration: number
          caller_id: string
          deepfake_confidence: number
          pattern_match: string
        }
      }
      helpline_integration:
        pre_filled_report: {
          incident_type: "DIGITAL_ARREST"
          victim_name: string
          bank_accounts: [string]
          scammer_contact: string
          evidence_attached: boolean
          one_click_call_to_1930: string (phone number)
        }

GET /api/v1/scamshield/verify-brand
  Parameters:
    brand_name: string
    phone_number: string (optional)
  
  Response:
    is_legitimate: boolean
    official_contact:
      phone: string
      email: string
      website: string
      last_verified: datetime
    registry_status: "ACTIVE" | "SUSPENDED" | "NOT_FOUND"
    irdai_license: string | null
    trai_telemarketer_status: "LICENSED" | "UNLICENSED" | "SUSPENDED"

POST /api/v1/scamshield/report-scam
  Description: User confirms scam for corpus building
  Body:
    scam_id: string
    confirmation: boolean
    scammer_contact: string
    amount_lost: number
    outcome: "IGNORED" | "REPORTED" | "SCAMMER_ARRESTED"
    feedback: string
  
  Response:
    success: boolean
    evidence_stored: boolean
    cbi_case_number: string | null
    compensation_eligibility: boolean
```

### 2.3 Data Schema

```sql
-- ScamShield Corpus
CREATE TABLE scam_patterns (
  id UUID PRIMARY KEY,
  pattern_type ENUM('POLICY_EXPIRING', 'CLAIM_SETTLEMENT', 'KYC_UPDATE', 'DIGITAL_ARREST'),
  script_text TEXT,
  language VARCHAR(10),
  variants JSONB, -- variations of script
  confidence_score FLOAT,
  occurrence_count INT,
  last_seen TIMESTAMP,
  geographic_distribution JSONB, -- by state/city
  created_at TIMESTAMP
);

-- Digital Arrest Pattern Database
CREATE TABLE digital_arrest_patterns (
  id UUID PRIMARY KEY,
  caller_spoofed_agency ENUM('CBI', 'ED', 'NARCOTICS', 'CUSTOMS'),
  call_duration_seconds INT,
  deepfake_artifacts JSONB,
  audio_patterns JSONB,
  script_phrases TEXT[],
  video_background_description TEXT,
  threat_language TEXT[],
  demanded_amount_range JSONB,
  target_profile JSONB, -- age, asset range, etc.
  success_rate FLOAT,
  syndicat_id VARCHAR(100),
  geographic_origin VARCHAR(100),
  last_detected TIMESTAMP
);

-- Telemarketer Registry (synced from TRAI)
CREATE TABLE telemarketer_registry (
  id UUID PRIMARY KEY,
  phone_number VARCHAR(20),
  company_name VARCHAR(255),
  licensed BOOLEAN,
  license_expiry DATE,
  purpose ENUM('INSURANCE', 'BANKING', 'TELECOM'),
  complaint_count INT,
  suspension_status ENUM('ACTIVE', 'SUSPENDED', 'REVOKED'),
  last_updated TIMESTAMP
);

-- Verified Brands (IRDAI licensed entities)
CREATE TABLE verified_brands (
  id UUID PRIMARY KEY,
  brand_name VARCHAR(255),
  official_phone VARCHAR(20),
  official_email VARCHAR(255),
  official_website VARCHAR(255),
  irdai_license_number VARCHAR(100),
  license_type ENUM('LIFE', 'GENERAL', 'HEALTH'),
  license_status ENUM('ACTIVE', 'SUSPENDED', 'REVOKED'),
  last_verified TIMESTAMP
);

-- Scam Detection Results (Audit Trail)
CREATE TABLE scam_detections (
  id UUID PRIMARY KEY,
  user_id UUID,
  detection_timestamp TIMESTAMP,
  input_type VARCHAR(50),
  risk_level ENUM('LEGITIMATE', 'SUSPICIOUS', 'SCAM'),
  confidence_score FLOAT,
  flags_detected JSONB,
  patterns_matched JSONB,
  safe_actions_provided JSONB,
  user_action_taken VARCHAR(100),
  outcome ENUM('IGNORED', 'REPORTED', 'FOLLOWED_SAFE_ACTION'),
  consent_given BOOLEAN,
  encrypted BOOLEAN
);

-- Digital Arrest Real-Time Logs
CREATE TABLE digital_arrest_alerts (
  id UUID PRIMARY KEY,
  user_id UUID,
  detected_at TIMESTAMP,
  confidence_score FLOAT,
  victim_name VARCHAR(255),
  emergency_contacts_notified INT,
  one_click_1930_called BOOLEAN,
  1930_case_number VARCHAR(100),
  case_status ENUM('ONGOING', 'RESOLVED', 'FUNDS_RECOVERED'),
  amount_at_risk DECIMAL,
  amount_saved DECIMAL,
  outcome_notes TEXT
);
```

### 2.4 Integration Requirements

```
Integrations:
  1. TRAI Telemarketer Registry
     - API endpoint (if available)
     - Or: Daily download + sync
     - Or: Weekly public data portal scrape
  
  2. IRDAI Licensed Entities List
     - Daily sync from IRDAI portal
     - Brand name → license number mapping
  
  3. UCC (Unsolicited Commercial Communication) Rules
     - Embed rules as knowledge base
     - Map incoming calls to UCC violations
  
  4. 1930 Helpline Integration
     - Direct API call to file report
     - Pre-fill with victim data
     - One-click call button
  
  5. CBI Cyber Crime Portal
     - Report submission (if API available)
     - Case tracking (if available)
  
  6. Deepfake Detection API (Third-party)
     - Microsoft Azure Computer Vision (deepfake detection)
     - Or: In-house model (train on 10K+ videos)
  
  7. Voice Biometric (Optional Phase 2)
     - Compare against known CBI officer voices
     - Public domain sources (YouTube, news videos)
```

---

## 3. MODULE 2: POLICY PULSE CHECK

### 3.1 Core Features

```
Feature 1: Policy PDF Parsing
  Input: Policy PDF, quote screenshot, renewal notice
  Output: Structured policy object
  
Feature 2: Coverage Summary
  Extract: Coverage amounts, waiting periods, exclusions, caps
  Translate: Legal language → Plain Hindi/regional
  
Feature 3: Red Flag Detection
  Rules:
    - Room rent cap < ₹7K in metros → FLAG
    - PED waiting period > 2 years → FLAG
    - Broad exclusions → FLAG
    - Pre-auth required → FLAG
  
Feature 4: Agent Claim vs Reality
  Input: Agent's stated coverage
  Check against: Actual policy terms
  Output: Mismatch score (potential mis-selling)
```

### 3.2 API Specification

```yaml
POST /api/v1/policy-pulse/analyze
  Description: Complete policy analysis
  Body:
    user_id: string
    document_type: "policy_pdf" | "quote_screenshot" | "renewal_notice"
    document_url: string (signed S3 URL)
    language: "en" | "hi" | "ta" | "te" | "ml"
    optional:
      agent_claims: [
        { claim: string, timestamp: datetime }
      ]
  
  Response:
    policy_details:
      policy_name: string
      insurer_name: string
      policy_number: string
      policy_dates:
        start: date
        end: date
      coverage:
        hospital_bill: {
          amount: number
          currency: "INR"
        }
        room_rent_cap: {
          amount: number
          frequency: "per_day"
        }
        pre_hospitalization_days: number
        pharmacy: {
          amount: number
          frequency: "per_year"
        }
        other_coverages: [{ name: string, amount: number }]
    
    waiting_periods: [
      { period_name: string, days: number }
    ]
    
    exclusions: [
      { exclusion: string, reason: string }
    ]
    
    red_flags: [
      {
        flag: string
        severity: "LOW" | "MEDIUM" | "HIGH"
        explanation: string (in user's language)
        industry_benchmark: string
        action_recommended: string
      }
    ]
    
    agent_claim_analysis: {
      claims_made: [string]
      mismatches: [
        {
          claim: string
          actual_policy_term: string
          mismatch_score: 0-100
          recommendation: string
        }
      ]
    }
    
    plain_language_summary: string (2-3 paragraphs in local language)
    
    document_confidence: 0-100
    ready_for_vault: boolean

GET /api/v1/policy-pulse/compare
  Parameters:
    policy_id_1: string
    policy_id_2: string
  
  Response:
    comparison: {
      coverage: { policy_1: object, policy_2: object, winner: string }
      exclusions: { policy_1: array, policy_2: array, better: string }
      waiting_periods: { policy_1: object, policy_2: object, better: string }
      room_rent_cap: { policy_1: number, policy_2: number, better: string }
      overall_recommendation: string
    }

POST /api/v1/policy-pulse/flag-miselling
  Description: Report suspected mis-selling by agent
  Body:
    policy_id: string
    agent_name: string
    agent_contact: string
    claimed_coverage: string
    actual_coverage: string
    grievance_description: string
  
  Response:
    grievance_filed: boolean
    irdai_reference: string
    next_steps: [string]
```

### 3.3 Data Schema

```sql
CREATE TABLE policy_objects (
  id UUID PRIMARY KEY,
  user_id UUID,
  policy_document_url VARCHAR(500),
  insurer_name VARCHAR(255),
  policy_number VARCHAR(100),
  policy_type ENUM('HEALTH', 'MOTOR', 'TRAVEL', 'LIFE'),
  extracted_data JSONB, -- full structured policy
  coverage_summary JSONB,
  exclusions JSONB,
  waiting_periods JSONB,
  red_flags JSONB,
  confidence_score FLOAT,
  language_analyzed VARCHAR(10),
  parsed_at TIMESTAMP,
  uploaded_by UUID,
  shared_with JSONB -- {user_id, family_member_type}
);

CREATE TABLE coverage_ontology (
  id UUID PRIMARY KEY,
  standard_term VARCHAR(100),
  synonyms JSONB, -- how different insurers call it
  definition_en TEXT,
  definition_hi TEXT,
  definition_ta TEXT,
  unit ENUM('AMOUNT', 'DAYS', 'PERCENTAGE'),
  industry_benchmark JSONB, -- {avg, min, max, median}
  risk_level_if_below_benchmark ENUM('LOW', 'MEDIUM', 'HIGH')
);

CREATE TABLE red_flag_rules (
  id UUID PRIMARY KEY,
  flag_name VARCHAR(100),
  condition JSONB, -- rule definition
  severity ENUM('LOW', 'MEDIUM', 'HIGH'),
  explanation_template VARCHAR(500),
  recommended_action VARCHAR(500),
  applicable_to JSONB -- {policy_types, regions, customer_profiles}
);

CREATE TABLE mis_selling_reports (
  id UUID PRIMARY KEY,
  policy_id UUID,
  user_id UUID,
  agent_name VARCHAR(255),
  claimed_vs_actual JSONB,
  filed_at TIMESTAMP,
  irdai_grievance_id VARCHAR(100),
  status ENUM('FILED', 'ACKNOWLEDGED', 'RESOLVED'),
  resolution_date DATE
);
```

---

## 4. MODULE 3: CLAIMS DEFENDER

### 4.1 Core Features

```
Feature 1: Denial Analysis
  Input: Claim rejection email/letter
  Output: Is this valid denial or can we appeal?
  Analysis:
    - Map denial reason to clause
    - Check regulatory interpretation
    - Assess evidence quality
  
Feature 2: Evidence Packet Generation
  Auto-create:
    - Timeline of events
    - Your proof documents
    - Policy clause citations
    - Regulatory standards
    - Ombudsman precedents
  
Feature 3: Escalation Guidance
  Tier 1: IRDAI complaint (free, fastest)
  Tier 2: Insurance Ombudsman (free, <₹50L)
  Tier 3: Consumer forum (paid, legal)
  
Feature 4: Timeline Tracker
  Alert on deadlines:
    - 30 days for IRDAI response
    - 3 months for ombudsman
    - Escalate if no response
```

### 4.2 API Specification

```yaml
POST /api/v1/claims-defender/analyze-denial
  Description: Analyze claim denial for appealability
  Body:
    user_id: string
    policy_id: string
    claim_id: string
    rejection_letter_url: string (PDF)
    claim_documents_url: [string] (receipts, discharge summary, etc.)
    language: "en" | "hi" | "ta"
  
  Response:
    denial_analysis:
      stated_reason: string
      mapped_to_clause: {
        clause_number: string
        full_text: string
        insurer_interpretation: string
      }
    
    validity_assessment:
      is_valid_denial: boolean
      confidence_percentage: 0-100
      regulatory_standard: string
      regulation_source: string
      gap_between_stated_and_actual: string
    
    success_probability: {
      tier_1_irdai: 0-100
      tier_2_ombudsman: 0-100
      tier_3_legal: 0-100
      overall_recommendation: string
    }
    
    evidence_assessment:
      documents_you_have: [string]
      documents_you_need: [string]
      strength_of_proof: "WEAK" | "MODERATE" | "STRONG"
    
    similar_cases: [
      {
        case_type: string
        success_rate: 0-100
        ombudsman_precedent: string
        award_amount: number
      }
    ]

POST /api/v1/claims-defender/generate-evidence-packet
  Description: Auto-generate escalation document
  Body:
    denial_analysis_id: string
    user_id: string
    format: "pdf" | "docx" | "html"
  
  Response:
    packet_url: string (signed S3 URL)
    packet_contents: [
      { section: string, pages: number }
    ]
    irdai_complaint_prefilled: {
      form_url: string
      pre_filled_fields: object
    }
    ombudsman_eligibility: boolean
    consumer_forum_info: {
      filing_cost: number
      expected_timeline_months: number
      lawyer_recommendation: boolean
    }

POST /api/v1/claims-defender/file-complaint
  Description: Assist with filing IRDAI/ombudsman complaint
  Body:
    denial_id: string
    tier: 1 | 2 | 3
    user_contact:
      name: string
      email: string
      phone: string
      address: string
    language: "en" | "hi"
  
  Response:
    complaint_drafted: boolean
    complaint_content: string
    submission_method: "online" | "offline"
    submission_deadline: date
    tracking_id: string
    expected_resolution_date: date

GET /api/v1/claims-defender/timeline/:denial_id
  Parameters:
    denial_id: string
  
  Response:
    timeline: [
      {
        event: string
        date: date
        days_remaining: number
        alert: boolean
        action_if_no_response: string
      }
    ]
    current_status: "FILED" | "PENDING_RESPONSE" | "ESCALATE" | "RESOLVED"
    next_action: string
    next_action_deadline: date
```

### 4.3 Data Schema

```sql
CREATE TABLE claim_denials (
  id UUID PRIMARY KEY,
  user_id UUID,
  policy_id UUID,
  claim_id VARCHAR(100),
  denial_date DATE,
  denial_letter_url VARCHAR(500),
  stated_reason TEXT,
  insurer_name VARCHAR(255),
  claim_amount DECIMAL,
  denial_amount DECIMAL,
  processed_at TIMESTAMP,
  language_analyzed VARCHAR(10)
);

CREATE TABLE denial_analysis (
  id UUID PRIMARY KEY,
  denial_id UUID,
  mapped_clause VARCHAR(100),
  clause_interpretation TEXT,
  regulatory_standard TEXT,
  validity_assessment JSONB,
  success_probability JSONB,
  evidence_needed JSONB,
  similar_ombudsman_cases JSONB,
  analysis_confidence FLOAT,
  analyzed_at TIMESTAMP
);

CREATE TABLE ombudsman_precedents (
  id UUID PRIMARY KEY,
  denial_type ENUM('PRE_EXISTING_CONDITION', 'EXCLUSION', 'DOCUMENTATION', 'NON_DISCLOSURE'),
  insurer_name VARCHAR(255),
  ombudsman_decision TEXT,
  award_percentage FLOAT,
  award_date DATE,
  ombudsman_reference_number VARCHAR(100),
  policy_type ENUM('HEALTH', 'MOTOR', 'LIFE'),
  reasoning TEXT,
  similar_cases_success_rate FLOAT
);

CREATE TABLE escalation_timeline (
  id UUID PRIMARY KEY,
  denial_id UUID,
  tier_1_filed_date DATE,
  tier_1_deadline DATE,
  tier_2_filed_date DATE,
  tier_2_deadline DATE,
  tier_3_filed_date DATE,
  current_status VARCHAR(50),
  alerts_generated JSONB,
  case_resolved_date DATE,
  final_outcome ENUM('APPROVED', 'PARTIAL', 'REJECTED', 'SETTLED')
);
```

---

## 5. MODULE 4: SOVEREIGN VAULT

### 5.1 Core Features

```
Feature 1: Document Repository
  Store: Policies, KYC, health records, financial docs, wills
  Encrypt: At rest + in transit (AES-256)
  Version: Keep history of changes
  
Feature 2: Policy Catalog + Renewals
  Auto-track:
    - All policies
    - Renewal dates
    - Missing nominees
    - Coverage gaps
  Alert: 30 days before renewal
  
Feature 3: Legacy Heartbeat
  Check-in: User confirms monthly
  If no check-in for 90 days:
    - Unlock vault to designated heir
    - Send transition documents
    - Notify care coordinators
  
Feature 4: Family Access Control
  Roles:
    - Owner (full access)
    - Emergency contact (access if owner unavailable)
    - Beneficiary (read-only legacy docs)
  Consent-based: Each share requires owner approval
```

### 5.2 API Specification

```yaml
POST /api/v1/vault/upload-document
  Description: Securely upload document
  Body:
    user_id: string
    document_type: ENUM('POLICY', 'KYC', 'HEALTH', 'FINANCIAL', 'LEGAL')
    document_category: string
    file_url: string (signed S3 URL)
    policy_details: {
      policy_number: string
      insurer_name: string
      policy_type: string
    } (if policy document)
    document_expiry_date: date (optional)
    consent_timestamp: datetime
  
  Response:
    document_id: string
    stored_encrypted: boolean
    indexed_for_search: boolean
    auto_extracted_fields: object
    renewal_alert_scheduled: boolean

GET /api/v1/vault/dashboard/:user_id
  Description: User's complete vault overview
  Response:
    policies: [
      {
        policy_id: string
        insurer: string
        coverage_amount: number
        renewal_date: date
        days_to_renewal: number
        nominee_status: "SET" | "MISSING"
        last_updated: date
      }
    ]
    document_checklist: {
      total_documents: number
      categories:
        policies: number
        kyc: number
        health: number
        financial: number
        legal: number
      missing_recommended: [string]
    }
    renewal_alerts: [
      { policy: string, days_remaining: number, action_link: string }
    ]
    family_members_with_access: [
      { name: string, role: string, access_granted_date: date }
    ]
    next_heartbeat_due: date

POST /api/v1/vault/legacy-heartbeat-check
  Description: User confirms they're OK
  Body:
    user_id: string
    timestamp: datetime
  
  Response:
    heartbeat_recorded: boolean
    next_heartbeat_due: date
    emergency_status: "OK" | "CHECK_REQUIRED"
    if_no_response_60_days: string (what happens)

POST /api/v1/vault/emergency-unlock
  Description: Family member initiates emergency access
  Body:
    vault_owner_id: string
    emergency_contact_id: string
    reason: string
    supporting_document: string (death cert, medical cert, etc.)
  
  Response:
    unlock_approved: boolean
    unlock_code: string
    documents_accessible: [string]
    audit_logged: boolean
    vault_owner_notification: {
      method: "email" | "sms"
      timing: "immediate" | "after_30_days"
    }

POST /api/v1/vault/add-family-member
  Description: Grant controlled access to family
  Body:
    user_id: string
    family_member:
      name: string
      relationship: string
      phone: string
      email: string
      access_level: "EMERGENCY_ONLY" | "BENEFICIARY" | "FULL"
    access_grant_reason: string
  
  Response:
    invitation_sent: boolean
    access_type: string
    can_access_documents: [string]
    notification_sent: boolean
```

### 5.3 Data Schema

```sql
CREATE TABLE vault_documents (
  id UUID PRIMARY KEY,
  vault_owner_id UUID,
  document_type ENUM('POLICY', 'KYC', 'HEALTH', 'FINANCIAL', 'LEGAL'),
  document_category VARCHAR(100),
  encrypted_file_s3_path VARCHAR(500),
  encryption_key_id UUID,
  extracted_metadata JSONB, -- searchable fields
  document_expiry_date DATE,
  version_number INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  uploaded_by UUID,
  consent_timestamp DATETIME
);

CREATE TABLE vault_policies_index (
  id UUID PRIMARY KEY,
  vault_owner_id UUID,
  policy_number VARCHAR(100),
  insurer_name VARCHAR(255),
  policy_type ENUM('HEALTH', 'MOTOR', 'LIFE', 'TRAVEL'),
  coverage_amount DECIMAL,
  renewal_date DATE,
  nominee_registered BOOLEAN,
  nominee_name VARCHAR(255),
  nominee_relationship VARCHAR(50),
  policy_document_id UUID,
  claim_history JSONB,
  last_updated TIMESTAMP
);

CREATE TABLE legacy_heartbeat (
  id UUID PRIMARY KEY,
  vault_owner_id UUID,
  last_checkin_timestamp TIMESTAMP,
  check_in_frequency_days INT,
  days_since_last_checkin INT,
  emergency_triggered BOOLEAN,
  emergency_triggered_date DATE,
  emergency_unlock_code VARCHAR(100),
  vault_unlocked_to UUID[], -- heir IDs
  notification_sent_date DATE
);

CREATE TABLE family_access_control (
  id UUID PRIMARY KEY,
  vault_owner_id UUID,
  family_member_id UUID,
  relationship VARCHAR(50),
  access_level ENUM('EMERGENCY_ONLY', 'BENEFICIARY', 'FULL'),
  granted_at TIMESTAMP,
  approved_by UUID,
  documents_accessible JSONB,
  access_activated BOOLEAN,
  activated_reason VARCHAR(100),
  audit_log JSONB
);

CREATE TABLE vault_audit_log (
  id UUID PRIMARY KEY,
  vault_owner_id UUID,
  action ENUM('DOCUMENT_UPLOADED', 'DOCUMENT_ACCESSED', 'FAMILY_ADDED', 'HEARTBEAT_CHECKIN', 'EMERGENCY_UNLOCK'),
  action_by UUID,
  action_timestamp TIMESTAMP,
  details JSONB,
  encrypted BOOLEAN
);
```

---

## 6. MODULE 5: UNDERWRITING ENGINE

### 6.1 Core Features

```
Feature 1: Pre-Claim Risk Scoring
  Input: ABDM health data (with consent)
  Output: Claim denial probability before purchase
  
Feature 2: Health Record Analysis
  Parse: Discharge summaries, prescriptions, diagnostics
  Extract: Pre-existing conditions, risk factors
  Predict: Claim denial risk per insurer
  
Feature 3: Fraud Red Flag Detection
  Identify: Suspicious patterns
  Flag: For insurer fraud team
  Report: To regulatory framework
  
Feature 4: Underwriting Fairness Evidence
  Generate: Documentation showing
    - You disclosed everything
    - You're not high-risk
    - Insurer should approve claims
```

### 6.2 API Specification

```yaml
POST /api/v1/underwriting/get-abdm-consent
  Description: Request ABDM health data consent
  Body:
    user_id: string
    purpose: "UNDERWRITING" | "CLAIMS_DEFENSE"
    reason: string
  
  Response:
    consent_form_url: string
    abdm_gateway_redirect: string
    consent_timeline: "5-10 minutes"

POST /api/v1/underwriting/analyze-health-profile
  Description: Analyze ABDM records for claim probability
  Body:
    user_id: string
    abdm_records: {
      discharge_summaries: [{ document_id: string, date: date }]
      prescriptions: [{ drug: string, dosage: string, period: string }]
      lab_reports: [{ test: string, result: string, date: date }]
      diagnoses: [{ condition: string, icd_code: string, date: date }]
    }
    target_policies: [
      { policy_type: string, insurer: string }
    ]
  
  Response:
    health_profile:
      pre_existing_conditions: [
        {
          condition: string
          diagnosed_date: date
          status: "ACTIVE" | "RESOLVED" | "CONTROLLED"
          risk_level: "LOW" | "MEDIUM" | "HIGH"
        }
      ]
      risk_factors: [string]
      medication_profile: object
      lab_abnormalities: [string]
    
    claim_denial_probability: {
      overall: 0-100
      by_insurer: [
        {
          insurer: string
          denial_probability: 0-100
          likely_denial_reasons: [string]
          underwriting_recommendation: string
        }
      ]
    }
    
    underwriting_fairness_evidence: {
      full_disclosure: boolean
      documentation_completeness: 0-100
      risk_assessment_valid: boolean
      summary_for_appeal: string
    }

POST /api/v1/underwriting/fraud-detection
  Description: Detect fraud patterns in claim
  Body:
    claim_data: {
      policy_id: string
      claim_description: string
      claimed_amount: number
      supporting_documents: [string]
      hospital_details: object
      doctor_details: object
    }
    claim_history: [
      { claim_id: string, amount: number, date: date }
    ]
  
  Response:
    fraud_risk_score: 0-100
    red_flags: [
      {
        flag: string
        severity: "LOW" | "MEDIUM" | "HIGH"
        evidence: string
        recommendation: string
      }
    ]
    pattern_matches: [
      {
        known_fraud_pattern: string
        similarity_score: 0-100
      }
    ]
    regulatory_report_required: boolean

GET /api/v1/underwriting/claim-probability/:user_id/:policy_id
  Description: Get claim approval probability
  Response:
    approval_probability: 0-100
    expected_payout_percentage: 0-100
    likely_disputes: [string]
    evidence_needed_for_approval: [string]
    timeline_to_approval_days: number
```

### 6.3 Data Schema

```sql
CREATE TABLE health_profiles (
  id UUID PRIMARY KEY,
  user_id UUID,
  abdm_abha_number VARCHAR(100),
  consent_timestamp DATETIME,
  consent_expiry_date DATE,
  pre_existing_conditions JSONB,
  medication_list JSONB,
  lab_results JSONB,
  risk_score FLOAT,
  last_updated TIMESTAMP,
  encrypted BOOLEAN
);

CREATE TABLE claim_denial_predictions (
  id UUID PRIMARY KEY,
  user_id UUID,
  policy_id UUID,
  health_profile_id UUID,
  overall_denial_probability FLOAT,
  by_insurer JSONB,
  factors_contributing JSONB,
  underwriting_fairness_score FLOAT,
  prediction_confidence FLOAT,
  created_at TIMESTAMP
);

CREATE TABLE fraud_red_flags (
  id UUID PRIMARY KEY,
  user_id UUID,
  claim_id VARCHAR(100),
  flag_type ENUM('DUPLICATE_CLAIM', 'INFLATED_AMOUNT', 'FAKE_DOCUMENTS', 'PATTERN_MATCH'),
  severity ENUM('LOW', 'MEDIUM', 'HIGH'),
  flag_description TEXT,
  evidence JSONB,
  regulatory_report_needed BOOLEAN,
  reported_to_cib BOOLEAN,
  report_date DATE
);

CREATE TABLE underwriting_evidence (
  id UUID PRIMARY KEY,
  user_id UUID,
  claim_id VARCHAR(100),
  disclosure_completeness FLOAT,
  documentation_score FLOAT,
  fairness_summary TEXT,
  usable_for_appeal BOOLEAN,
  generated_at TIMESTAMP
);
```

---

## 7. MODULE 6: MARKETPLACE (Future Phase)

### 7.1 Core Features

```
Feature 1: Aggregator with Filters
  Show: Quotes from 8+ insurers
  Filter: By coverage, price, rating
  Compare: Side-by-side
  
Feature 2: Pre-Underwriting Certification
  SageSure seal: "We've verified your health data"
  Insurer commitment: "Won't deny based on non-disclosure"
  
Feature 3: Integrated Claims + Servicing
  Track: Policy + claims in one place
  Renew: One-click renewal
  Support: In-app claims assistance
  
Feature 4: Bima Sugam Readiness
  When marketplace goes live:
    - Consent-based integration
    - No data storage (per Bima Sugam design)
    - Open standards
```

### 7.2 API Specification

```yaml
POST /api/v1/marketplace/get-quotes
  Description: Get quotes from multiple insurers
  Body:
    user_id: string
    insurance_type: "HEALTH" | "MOTOR" | "TRAVEL"
    coverage_details: object
    health_profile_id: string (optional - for underwriting)
    language: "en" | "hi"
  
  Response:
    quotes: [
      {
        quote_id: string
        insurer_name: string
        premium: number
        coverage_summary: object
        sagesure_certified: boolean
        denial_probability: 0-100 (if health_profile provided)
        buy_link: string
      }
    ]
    comparison_enabled: boolean

POST /api/v1/marketplace/purchase-policy
  Description: Purchase selected quote
  Body:
    quote_id: string
    customer_id: string
    payment_method: "UPI" | "CARD" | "NETBANKING"
    consent_confirmations: object
  
  Response:
    purchase_successful: boolean
    policy_number: string
    e_policy_url: string
    renewal_reminder_date: date
    claims_help_link: string

GET /api/v1/marketplace/policy-servicing/:policy_number
  Description: View policy servicing options
  Response:
    policy_details: object
    claim_filing_link: string
    claims_tracker_link: string
    renewal_status: string
    policy_documents: [string]
    support_options: {
      whatsapp: string
      phone: string
      email: string
      ai_assistant_link: string
    }
```

---

## 8. CROSS-MODULE INFRASTRUCTURE

### 8.1 Authentication + Authorization

```
OAuth 2.0 (Google + Mobile):
  - Email/phone login
  - Social sign-in
  - Role-based access (user, family, admin)
  
Consent Management (DPDP-compliant):
  - Purpose-based access
  - Timestamp on every access
  - Audit trail
  - Easy revocation
```

### 8.2 Data Encryption

```
At Rest:
  - AES-256 encryption
  - Customer-managed keys (bring your own)
  
In Transit:
  - TLS 1.3
  - Certificate pinning
  
Key Management:
  - AWS KMS or equivalent
  - Rotation every 90 days
```

### 8.3 Compliance + Audit

```
IRDAI Compliance:
  - Every action logged
  - Audit trail immutable
  - Consent tracked
  
DPDP (Data Protection):
  - Minimal data collection
  - Purpose limitation
  - Retention limits
  - User right to deletion
  
Cyber Security (IRDAI Guidelines):
  - Board oversight
  - Incident response plan
  - Cloud data isolation
  - Access controls
```

### 8.4 Integrations

```
Sarvam AI:
  - Language layers (Hindi/regional/Hinglish)
  - Speech-to-text
  - Translation
  
Twilio (WhatsApp):
  - WhatsApp bot integration
  - SMS alerts
  - Voice calls (for Digital Arrest real-time)
  
Payment Gateways:
  - Razorpay (UPI, card, netbanking)
  - PayU (backup)
  
External APIs:
  - IRDAI portal (grievance submission)
  - 1930 helpline (Digital Arrest)
  - CBI Cyber (case tracking)
  - ABDM (ABHA + HIE-CM)
  - DigiLocker (document verification)
```

---

## 9. SUCCESS METRICS (120-Day MVP)

### 9.1 Module-Specific Metrics

```
ScamShield:
  - Scam detection precision: 90%+
  - Response time: <30 seconds
  - User retention (week 4): 35%+
  - Digital Arrest detection confidence: 99%+

Policy Pulse:
  - Parse accuracy: 95%+
  - User clarity: 90% say "now I understand"
  - Red flag precision: 85%+

Claims Defender:
  (Will ship Month 6, tracked separately)

Vault:
  (Will ship Month 6, tracked separately)
```

### 9.2 Overall Platform Metrics

```
Adoption:
  - 50K WhatsApp messages (60 days)
  - 35%+ week-4 retention
  - 30% viral coefficient

Business:
  - Zero CAC
  - 100% free (build trust)
  - 1M+ scams prevented in first 6 months

Trust:
  - 4.8+ NPS (from beta users)
  - Family/friend referrals (30%)
  - Media coverage (3+ major publications)
```

---

## 10. TECH STACK (Updated)

```
Frontend:
  - React 18 + TypeScript
  - TailwindCSS
  - Zustand (state management)
  - React Query (data fetching)
  - WhatsApp Web API (for bot UI)

Backend:
  - Node.js (Express or Fastify)
  - TypeScript
  - PostgreSQL (main DB)
  - Redis (caching + real-time alerts)
  - Bull (job queue for async tasks)

AI/ML:
  - Sarvam AI (language layer)
  - LLaMA or similar (policy parsing)
  - TensorFlow (deepfake detection)
  - Scikit-learn (pattern matching)

Infrastructure:
  - Docker + Docker Compose (local)
  - AWS ECS/Fargate (production)
  - S3 (encrypted document storage)
  - KMS (key management)
  - CloudFront (CDN)
  - RDS (managed PostgreSQL)
  - ElastiCache (managed Redis)

Integrations:
  - Twilio WhatsApp API
  - Sarvam AI API
  - AWS Rekognition (deepfake detection - optional)
  - Razorpay (payments)
  - IRDAI portal APIs (when available)

Monitoring:
  - DataDog / New Relic
  - CloudWatch
  - PagerDuty (alerts)
  - Sentry (error tracking)
```

---

## 11. DEPLOYMENT ARCHITECTURE (120-Day MVP)

```
Development:
  - Docker Compose locally
  - GitHub for version control
  - GitHub Actions for CI/CD

Staging:
  - AWS ECS (staging environment)
  - RDS PostgreSQL
  - ElastiCache Redis

Production (Launch):
  - AWS ECS on Fargate
  - RDS for database (multi-AZ)
  - ElastiCache for caching
  - CloudFront for CDN
  - WAF for security
  - VPC + security groups (isolated)
```

---

## 12. TIMELINE (120-Day MVP)

```
Week 1-2: Foundation
  - Set up Sarvam AI integration
  - Database schema
  - Auth + encryption
  - WhatsApp bot setup

Week 3-4: ScamShield Core
  - Pattern matching engine
  - Message parsing
  - Brand verification API
  - Basic scam detection (rules-based)

Week 5-6: Digital Arrest Shield
  - Deepfake detection model
  - Real-time alert system
  - Family notification
  - 1930 integration

Week 7-8: Policy Pulse Core
  - PDF parsing
  - Clause extraction
  - Plain language translation
  - Red flag detection

Week 9-10: Frontend + Integration
  - WhatsApp bot UI
  - Web dashboard
  - Real-time alerts
  - Testing

Week 11-12: Beta + Hardening
  - 100 beta users
  - Security audit
  - Compliance review
  - Launch preparation

Week 13-16: Optimization + Preparation for Phase 2
  - Iteration based on beta feedback
  - Deepfake model improvement
  - Claims Defender design
  - Vault MVP planning
```

