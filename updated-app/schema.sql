-- ============================================================================
-- SageSure India - Database Schema (6 Modules)
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "jsonb";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  language VARCHAR(10) DEFAULT 'en',
  kyc_verified BOOLEAN DEFAULT FALSE,
  account_status ENUM('ACTIVE', 'SUSPENDED', 'DELETED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Family Members (for Vault & Legacy Heartbeat)
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(50),
  phone VARCHAR(20),
  email VARCHAR(255),
  role ENUM('OWNER', 'EMERGENCY_CONTACT', 'BENEFICIARY', 'CAREGIVER') DEFAULT 'BENEFICIARY',
  access_level ENUM('EMERGENCY_ONLY', 'BENEFICIARY', 'FULL') DEFAULT 'BENEFICIARY',
  access_granted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- MODULE 1: SCAMSHIELD (Scam Detection)
-- ============================================================================

-- Scam Patterns Database
CREATE TABLE scam_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_type VARCHAR(100) NOT NULL,
  script_text TEXT,
  language VARCHAR(10),
  keywords TEXT[],
  variants JSONB,
  confidence_score FLOAT,
  occurrence_count INT DEFAULT 0,
  last_seen TIMESTAMP,
  geographic_distribution JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Digital Arrest Pattern Database
CREATE TABLE digital_arrest_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caller_spoofed_agency VARCHAR(50),
  call_duration_seconds INT,
  deepfake_artifacts JSONB,
  audio_patterns JSONB,
  script_phrases TEXT[],
  video_background_description TEXT,
  threat_language TEXT[],
  demanded_amount_range JSONB,
  target_profile JSONB,
  success_rate FLOAT,
  syndicate_id VARCHAR(100),
  geographic_origin VARCHAR(100),
  last_detected TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Telemarketer Registry (synced from TRAI)
CREATE TABLE telemarketer_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20),
  company_name VARCHAR(255),
  licensed BOOLEAN DEFAULT FALSE,
  license_expiry DATE,
  purpose VARCHAR(50),
  complaint_count INT DEFAULT 0,
  suspension_status VARCHAR(50) DEFAULT 'ACTIVE',
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Verified Brands (IRDAI licensed entities)
CREATE TABLE verified_brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_name VARCHAR(255) UNIQUE NOT NULL,
  official_phone VARCHAR(20),
  official_email VARCHAR(255),
  official_website VARCHAR(255),
  irdai_license_number VARCHAR(100),
  license_type VARCHAR(50),
  license_status VARCHAR(50) DEFAULT 'ACTIVE',
  last_verified TIMESTAMP DEFAULT NOW()
);

-- Scam Detection Results (Audit Trail)
CREATE TABLE scam_detections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  detection_timestamp TIMESTAMP DEFAULT NOW(),
  input_type VARCHAR(50),
  risk_level VARCHAR(50),
  confidence_score FLOAT,
  flags_detected JSONB,
  patterns_matched JSONB,
  safe_actions_provided JSONB,
  user_action_taken VARCHAR(100),
  outcome VARCHAR(50),
  consent_given BOOLEAN DEFAULT FALSE,
  encrypted BOOLEAN DEFAULT TRUE
);

-- Digital Arrest Alerts
CREATE TABLE digital_arrest_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  detected_at TIMESTAMP DEFAULT NOW(),
  confidence_score FLOAT,
  victim_name VARCHAR(255),
  emergency_contacts_notified INT,
  one_click_1930_called BOOLEAN DEFAULT FALSE,
  helpline_case_number VARCHAR(100),
  case_status VARCHAR(50),
  amount_at_risk DECIMAL,
  amount_saved DECIMAL,
  outcome_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- MODULE 2: POLICY PULSE CHECK (Policy Understanding)
-- ============================================================================

-- Policy Objects (Parsed Policies)
CREATE TABLE policy_objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  policy_document_url VARCHAR(500),
  insurer_name VARCHAR(255),
  policy_number VARCHAR(100),
  policy_type VARCHAR(50),
  extracted_data JSONB,
  coverage_summary JSONB,
  exclusions JSONB,
  waiting_periods JSONB,
  red_flags JSONB,
  confidence_score FLOAT,
  language_analyzed VARCHAR(10),
  parsed_at TIMESTAMP DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id),
  shared_with JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Coverage Ontology
CREATE TABLE coverage_ontology (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  standard_term VARCHAR(100) UNIQUE NOT NULL,
  synonyms JSONB,
  definition_en TEXT,
  definition_hi TEXT,
  definition_ta TEXT,
  unit VARCHAR(50),
  industry_benchmark JSONB,
  risk_level_if_below_benchmark VARCHAR(50)
);

-- Red Flag Rules
CREATE TABLE red_flag_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_name VARCHAR(100) NOT NULL,
  condition JSONB,
  severity VARCHAR(20),
  explanation_template TEXT,
  recommended_action TEXT,
  applicable_to JSONB
);

-- Mis-selling Reports
CREATE TABLE mis_selling_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID REFERENCES policy_objects(id),
  user_id UUID REFERENCES users(id),
  agent_name VARCHAR(255),
  claimed_vs_actual JSONB,
  filed_at TIMESTAMP DEFAULT NOW(),
  irdai_grievance_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'FILED',
  resolution_date DATE
);

-- ============================================================================
-- MODULE 3: CLAIMS DEFENDER (Claim Denial Analysis)
-- ============================================================================

-- Claim Denials
CREATE TABLE claim_denials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  policy_id UUID REFERENCES policy_objects(id),
  claim_id VARCHAR(100),
  denial_date DATE,
  denial_letter_url VARCHAR(500),
  stated_reason TEXT,
  insurer_name VARCHAR(255),
  claim_amount DECIMAL,
  denial_amount DECIMAL,
  processed_at TIMESTAMP DEFAULT NOW(),
  language_analyzed VARCHAR(10)
);

-- Denial Analysis Results
CREATE TABLE denial_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  denial_id UUID REFERENCES claim_denials(id),
  mapped_clause VARCHAR(100),
  clause_interpretation TEXT,
  regulatory_standard TEXT,
  validity_assessment JSONB,
  success_probability JSONB,
  evidence_needed JSONB,
  similar_ombudsman_cases JSONB,
  analysis_confidence FLOAT,
  analyzed_at TIMESTAMP DEFAULT NOW()
);

-- Ombudsman Precedents
CREATE TABLE ombudsman_precedents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  denial_type VARCHAR(100),
  insurer_name VARCHAR(255),
  ombudsman_decision TEXT,
  award_percentage FLOAT,
  award_date DATE,
  ombudsman_reference_number VARCHAR(100),
  policy_type VARCHAR(50),
  reasoning TEXT,
  similar_cases_success_rate FLOAT
);

-- Escalation Timeline
CREATE TABLE escalation_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  denial_id UUID REFERENCES claim_denials(id),
  tier_1_filed_date DATE,
  tier_1_deadline DATE,
  tier_2_filed_date DATE,
  tier_2_deadline DATE,
  tier_3_filed_date DATE,
  current_status VARCHAR(50),
  alerts_generated JSONB,
  case_resolved_date DATE,
  final_outcome VARCHAR(50)
);

-- ============================================================================
-- MODULE 4: SOVEREIGN VAULT (Document Repository & Legacy)
-- ============================================================================

-- Vault Documents
CREATE TABLE vault_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_owner_id UUID NOT NULL REFERENCES users(id),
  document_type VARCHAR(50),
  document_category VARCHAR(100),
  encrypted_file_s3_path VARCHAR(500),
  encryption_key_id UUID,
  extracted_metadata JSONB,
  document_expiry_date DATE,
  version_number INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id),
  consent_timestamp TIMESTAMP
);

-- Vault Policies Index
CREATE TABLE vault_policies_index (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_owner_id UUID NOT NULL REFERENCES users(id),
  policy_number VARCHAR(100),
  insurer_name VARCHAR(255),
  policy_type VARCHAR(50),
  coverage_amount DECIMAL,
  renewal_date DATE,
  nominee_registered BOOLEAN DEFAULT FALSE,
  nominee_name VARCHAR(255),
  nominee_relationship VARCHAR(50),
  policy_document_id UUID REFERENCES vault_documents(id),
  claim_history JSONB,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Legacy Heartbeat
CREATE TABLE legacy_heartbeat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_owner_id UUID NOT NULL REFERENCES users(id),
  last_checkin_timestamp TIMESTAMP,
  check_in_frequency_days INT DEFAULT 30,
  days_since_last_checkin INT,
  emergency_triggered BOOLEAN DEFAULT FALSE,
  emergency_triggered_date DATE,
  emergency_unlock_code VARCHAR(100),
  vault_unlocked_to UUID[],
  notification_sent_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Family Access Control
CREATE TABLE family_access_control (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_owner_id UUID NOT NULL REFERENCES users(id),
  family_member_id UUID NOT NULL REFERENCES family_members(id),
  relationship VARCHAR(50),
  access_level VARCHAR(50),
  granted_at TIMESTAMP DEFAULT NOW(),
  approved_by UUID REFERENCES users(id),
  documents_accessible JSONB,
  access_activated BOOLEAN DEFAULT FALSE,
  activated_reason VARCHAR(100),
  audit_log JSONB
);

-- Vault Audit Log
CREATE TABLE vault_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_owner_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100),
  action_by UUID REFERENCES users(id),
  action_timestamp TIMESTAMP DEFAULT NOW(),
  details JSONB,
  encrypted BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- MODULE 5: UNDERWRITING ENGINE (Pre-Claim Risk Scoring)
-- ============================================================================

-- Health Profiles (ABDM)
CREATE TABLE health_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  abdm_abha_number VARCHAR(100),
  consent_timestamp TIMESTAMP,
  consent_expiry_date DATE,
  pre_existing_conditions JSONB,
  medication_list JSONB,
  lab_results JSONB,
  risk_score FLOAT,
  last_updated TIMESTAMP DEFAULT NOW(),
  encrypted BOOLEAN DEFAULT TRUE
);

-- Claim Denial Predictions
CREATE TABLE claim_denial_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  policy_id UUID REFERENCES policy_objects(id),
  health_profile_id UUID REFERENCES health_profiles(id),
  overall_denial_probability FLOAT,
  by_insurer JSONB,
  factors_contributing JSONB,
  underwriting_fairness_score FLOAT,
  prediction_confidence FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Fraud Red Flags
CREATE TABLE fraud_red_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  claim_id VARCHAR(100),
  flag_type VARCHAR(100),
  severity VARCHAR(50),
  flag_description TEXT,
  evidence JSONB,
  regulatory_report_needed BOOLEAN DEFAULT FALSE,
  reported_to_cib BOOLEAN DEFAULT FALSE,
  report_date DATE
);

-- Underwriting Evidence
CREATE TABLE underwriting_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  claim_id VARCHAR(100),
  disclosure_completeness FLOAT,
  documentation_score FLOAT,
  fairness_summary TEXT,
  usable_for_appeal BOOLEAN DEFAULT TRUE,
  generated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- MODULE 6: MARKETPLACE (Aggregation & Servicing)
-- ============================================================================

-- Insurance Quotes
CREATE TABLE insurance_quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  insurance_type VARCHAR(50),
  coverage_details JSONB,
  quotes JSONB,
  comparison_enabled BOOLEAN DEFAULT TRUE,
  requested_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  selected_quote_id UUID
);

-- Policy Purchases
CREATE TABLE policy_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  quote_id UUID REFERENCES insurance_quotes(id),
  policy_number VARCHAR(100) UNIQUE,
  insurer_name VARCHAR(255),
  e_policy_url VARCHAR(500),
  premium DECIMAL,
  payment_status VARCHAR(50) DEFAULT 'PENDING',
  purchased_at TIMESTAMP DEFAULT NOW(),
  renewal_reminder_date DATE,
  sagesure_certified BOOLEAN DEFAULT FALSE
);

-- Policy Servicing
CREATE TABLE policy_servicing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_purchase_id UUID NOT NULL REFERENCES policy_purchases(id),
  user_id UUID REFERENCES users(id),
  claim_filed INT DEFAULT 0,
  claims_approved INT DEFAULT 0,
  claims_denied INT DEFAULT 0,
  last_service_request TIMESTAMP,
  support_interactions JSONB,
  renewal_status VARCHAR(50)
);

-- ============================================================================
-- COMPLIANCE & AUDIT
-- ============================================================================

-- Consent Log (DPDP compliance)
CREATE TABLE consent_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  purpose VARCHAR(100),
  consent_given BOOLEAN,
  consent_timestamp TIMESTAMP DEFAULT NOW(),
  consent_duration_days INT,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP,
  details JSONB
);

-- Compliance Audit Trail
CREATE TABLE compliance_audit_trail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100),
  action_timestamp TIMESTAMP DEFAULT NOW(),
  method VARCHAR(50),
  path VARCHAR(255),
  status_code INT,
  duration_ms INT,
  request_id VARCHAR(100),
  details JSONB
);

-- ============================================================================
-- INDEXES (for performance)
-- ============================================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_policy_objects_user_id ON policy_objects(user_id);
CREATE INDEX idx_policy_objects_policy_number ON policy_objects(policy_number);
CREATE INDEX idx_claim_denials_user_id ON claim_denials(user_id);
CREATE INDEX idx_claim_denials_claim_id ON claim_denials(claim_id);
CREATE INDEX idx_vault_documents_owner ON vault_documents(vault_owner_id);
CREATE INDEX idx_vault_documents_type ON vault_documents(document_type);
CREATE INDEX idx_scam_detections_user ON scam_detections(user_id);
CREATE INDEX idx_scam_detections_timestamp ON scam_detections(detection_timestamp);
CREATE INDEX idx_digital_arrest_alerts_user ON digital_arrest_alerts(user_id);
CREATE INDEX idx_health_profiles_user ON health_profiles(user_id);
CREATE INDEX idx_consent_log_user ON consent_log(user_id);
CREATE INDEX idx_compliance_audit_user ON compliance_audit_trail(user_id);
CREATE INDEX idx_compliance_audit_timestamp ON compliance_audit_trail(action_timestamp);

-- ============================================================================
-- VIEWS (for common queries)
-- ============================================================================

-- User Dashboard View
CREATE VIEW user_dashboard AS
SELECT 
  u.id,
  u.email,
  u.name,
  u.language,
  (SELECT COUNT(*) FROM policy_objects WHERE user_id = u.id) as total_policies,
  (SELECT COUNT(*) FROM scam_detections WHERE user_id = u.id AND risk_level = 'SCAM') as scams_detected,
  (SELECT COUNT(*) FROM claim_denials WHERE user_id = u.id) as denied_claims,
  (SELECT COUNT(*) FROM vault_documents WHERE vault_owner_id = u.id) as vault_documents
FROM users u;

-- Compliance Status View
CREATE VIEW compliance_status AS
SELECT 
  u.id,
  u.email,
  (SELECT COUNT(*) FROM consent_log WHERE user_id = u.id AND consent_given = true AND revoked = false) as active_consents,
  (SELECT COUNT(*) FROM compliance_audit_trail WHERE user_id = u.id AND action_timestamp > NOW() - INTERVAL '30 days') as recent_actions,
  (SELECT MAX(action_timestamp) FROM compliance_audit_trail WHERE user_id = u.id) as last_action
FROM users u;
