# SageSure India: Product Module Specification
## From User Problem → Workflow → Data → Moat

---

## MODULE 1: SCAMSHIELD (120-Day MVP Wedge)

### User Problem
```
Current state:
  Elderly person gets WhatsApp/call: "Your HDFC policy #XYZ is expiring. Pay ₹5000 now."
  They:
    ❌ Don't know if it's real
    ❌ Don't know how to verify
    ❌ Fear losing policy (genuine concern in India)
    ❌ Pay without verifying
    
Result: ₹50B+ annual scam losses in India insurance alone
```

### User Journey (ScamShield MVP)

```
Step 1: User receives suspicious message/call
  Examples:
    - "Your XYZ policy expiring, pay now"
    - "We're calling from HDFC Insurance, renew today"
    - "Your claim rejected, pay ₹2000 to appeal"
    - WhatsApp forward of quote image
    - Photo of "policy" document

Step 2: User opens WhatsApp, says:
  "Hi, is this real?" + [forwards message/image]
  OR types: "Check this number: +91-8888-999-999"
  OR says (voice): "Is this HDFC calling me?"

Step 3: SageSure AI responds in <30 seconds:
  
  [SCAM RISK: HIGH 🚨]
  
  Why: This message claims to be from HDFC but:
  ✓ Sender number not in HDFC official list
  ✓ Message matches known "policy expiring" scam script (87% match)
  ✓ Payment method (UPI link) doesn't match HDFC's official process
  
  Real HDFC contact:
  - Phone: 1800-270-8888 (verify by calling official number)
  - Email: service@hdfcinsurance.com
  - Website: hdfcinsurance.com
  
  Safe action:
  👉 Ignore this message
  👉 If worried, call HDFC at 1800-270-8888 (don't use number from message)
  👉 Never click links from unsolicited messages
  
  [Report to TRAI: Forward to 7575]

Step 4: User takes safe action
  - Doesn't click link
  - Calls official HDFC number
  - Reports to TRAI
  - Shares verification with family

Step 5: Platform stores (encrypted):
  - Scam script (anonymized)
  - Detection confidence
  - User action taken
  - Outcome (help prevent future scams)
```

### Core Workflow (Technical)

```
Input → Parsing → Verification → Risk Scoring → Output

INPUT:
  ├─ Text message (WhatsApp forward)
  ├─ Screenshot of call/SMS
  ├─ Voice message ("Is this real?")
  ├─ Phone number check
  └─ Document image (fake policy, receipt)

PARSING (LLM + OCR):
  Sarvam LLM extracts:
    - Sender name/brand claimed
    - Policy number (if mentioned)
    - Requested action (pay, renew, verify)
    - Amount/payment method
    - Urgency language ("immediately," "expire today")
    - Contact info (phone, email, URL)

VERIFICATION LAYER (Rules + Registries):
  1. Brand Verification
     ├─ Is "HDFC Insurance" a real brand?
     └─ Official contact details
     
  2. Telemarketer Registry Check
     ├─ TRAI maintained list of licensed telemarketers
     ├─ Is +91-8888-999-999 licensed for insurance?
     ├─ Is it HDFC's official number?
     └─ Call recording consent status (TER - Telemarketer Exclusion Registry)
     
  3. Scam Pattern Matching
     ├─ UCC (Unsolicited Commercial Communication) rules
     ├─ Known scam scripts database
     │   - "Policy expiring" template (match score)
     │   - "Claim rejected, appeal" template
     │   - "Free health checkup" template
     │   - "KYC update required" template
     └─ Message velocity check (how often this exact script appears)
     
  4. Payment Method Validation
     ├─ Does HDFC accept UPI payment via WhatsApp links?
     ├─ No: flag as suspicious
     └─ Yes: check URL domain (abc-hdfc.com vs real hdfcinsurance.com)
     
  5. Linguistic Red Flags (LLM)
     ├─ Hinglish grammar issues ("renew your policy urgently")
     ├─ Too-good-to-be-true claims ("Free ₹50K health coverage")
     ├─ Extreme urgency language
     └─ Mismatch between stated brand and tone

RISK SCORING:
  Confidence = f(brand_match, registry_check, pattern_match, payment_check, linguistics)
  
  Output categories:
    ✓ LEGITIMATE (95%+) - Real brand, official number, normal process
    ⚠️ SUSPICIOUS (50-95%) - Multiple red flags, verify independently
    🚨 SCAM (95%+) - Clear match to known scam, don't interact

OUTPUT (User-facing):
  ├─ Risk score in local language
  ├─ Why (explanation in Hindi/regional)
  ├─ Official contact method (what REAL HDFC uses)
  ├─ Safe next action
  ├─ Report mechanism (how to report to TRAI)
  └─ Share card (family can see same info)
```

### Data Dependencies

```
TIER 1: Official Registries (Maintained by regulators, free/API)
  ├─ IRDAI Licensed Insurer List
  │   └─ Brand names, official phone, official websites
  │
  ├─ TRAI Telemarketer Registry
  │   └─ Licensed telemarketers, consumer complaint records
  │
  ├─ TRAI UCC Rules (updated 2025)
  │   └─ What makes a call/SMS "commercial"
  │
  ├─ RBI Payment Gateway Rules
  │   └─ How real insurance companies process payments
  │
  └─ NCRP (National Consumer Rights Protection Portal)
      └─ Scam complaint patterns by insurer

TIER 2: Proprietary Scam Corpus (Build through MVP)
  ├─ Real scam messages (user-submitted, anonymized)
  │   Collect: 1000+ examples in 120 days
  │   Extract: Recurring scripts, templates, variations
  │
  ├─ Scam detection tuning data
  │   Label: User confirmation ("Yes, this was a scam")
  │   Train: Pattern classifier for Hinglish scams
  │
  └─ False positive feedback
      Learn: Which legitimate messages flagged incorrectly

TIER 3: Call/Message Artifacts (Optional, Phase 2)
  ├─ Call recording analysis (if user opts in)
  ├─ Link analysis (does it actually go to HDFC or phishing)
  └─ File metadata (is this document timestamp realistic?)
```

### Regulatory Alignment

```
TRAI UCC Rules (What makes communication violate rules):
  ✓ SageSure helps enforce this
    - Detects "unsolicited commercial" calls
    - Identifies calls from unregistered telemarketers
    - Provides evidence for complaint filing

IRDAI Policyholder Protection:
  ✓ SageSure supports this
    - Prevents mis-selling via impersonation
    - Helps customers verify legitimacy
    - Reduces fake policy scams

Insurance Regulation 2024:
  ✓ Distribution channel responsibility
    - We're not selling (no license needed)
    - We're detecting fraud (encouraged)
    - We're helping escalation (supports regulation)
```

### The Moat (Why It's Defensible)

```
MOAT LEVER 1: Proprietary Scam Corpus
  What competitors don't have:
    ❌ PolicyBazaar: They DON'T want to warn people (lose leads)
    ❌ Acko: Only sells own insurance (doesn't solve scam problem)
    ❌ Insurers: Can't be honest about scams (hurts brand)
    ❌ TRAI: No technology layer to help consumers
  
  What you'll have:
    ✓ 10,000+ real scam scripts (anonymized)
    ✓ Detected patterns (ML classifier trained on Indian scams)
    ✓ Success rate (did user NOT get scammed after using ScamShield?)
    ✓ Feedback loop (user tells you "Yes this was a scam")
  
  Why it compounds:
    - Every scam blocked = data point to prevent 100 future scams
    - Scammers evolve → your model evolves faster
    - Months 1-2: 60% accuracy | Months 6+: 92% accuracy

MOAT LEVER 2: Brand Verification (Regulatory Alignment)
  Why hard to copy:
    - IRDAI registry updates = automatic updates for you
    - TRAI maintains telemarketer list = you pull fresh daily
    - Takes 6+ months to build this connector properly
    - Competitors would have to build same regulatory integrations

MOAT LEVER 3: Linguistic Understanding (Language AI)
  Why hard to copy:
    - "Policy expiring" scam in Hindi is different from English version
    - Requires Hinglish understanding (mixing Hindi + English)
    - Requires regional variants (Tamil scams differ from Hindi)
    - Sarvam AI gives you this edge
    - Global LLMs don't understand Indian insurance language
```

### MVP Scope (120 Days)

```
SHIPS IN 120 DAYS:
  ✓ WhatsApp integration (Twilio or Meta API)
  ✓ Text message parsing (extract key info)
  ✓ Brand verification (check IRDAI list + official contact)
  ✓ Telemarketer registry check (TRAI list integration)
  ✓ Basic scam pattern matching (rules-based)
  ✓ Output in Hindi/English + Hinglish
  ✓ Safe next actions (official contact info + escalation)
  ✓ Audit logging (for compliance + iteration)
  
  Launch with:
    - 100-200 known scam patterns (rules)
    - IRDAI + TRAI data connectors
    - 50-100 test users (beta cohort)

SHIPS IN 6 MONTHS (Phase 2):
  ✓ ML classifier (trained on 5000+ scam examples)
  ✓ Voice message processing ("Decode that call for me")
  ✓ Screenshot analysis (extract text from image)
  ✓ Link analysis (does URL really go to HDFC?)
  ✓ Call recording transcription (with consent)
  ✓ More regional languages (Tamil, Telugu, Marathi)

SHIPS IN 12 MONTHS (Phase 3):
  ✓ Real-time protection (integration with carrier)
  ✓ Behavioral analysis (scammer pattern profiling)
  ✓ Predictive scam detection (before message reaches customer)
```

### Success Metrics (120 Days)

```
ADOPTION:
  - Target: 50K WhatsApp "hi" messages in first 60 days
  - Retention: 35%+ week-4 return rate (high for utility)
  - Viral: 30% of users share with family/friends

QUALITY:
  - Precision: 90%+ (if we say "scam," it's actually scam)
  - False positive rate: <5% (we don't warn on legitimate calls)
  - Response time: <30 seconds

IMPACT:
  - Scams prevented: Users report "didn't click link" in 60%+ of cases
  - Escalations: 10%+ of high-risk cases result in TRAI complaint filing
  - Data collected: 1000+ anonymized scam examples

BUSINESS:
  - Zero CAC (organic, viral through distress)
  - 100% free (build trust first)
  - Build brand: "SageSure = I trust you more than my bank"
```

---

## MODULE 2: POLICY PULSE CHECK (120-Day MVP + Phase 2)

### User Problem
```
Current state:
  Customer receives policy document (10-15 pages, legal language)
  They:
    ❌ Don't understand what they're actually buying
    ❌ Don't know about waiting periods, exclusions, caps
    ❌ Discover coverage gaps only at claim time
    ❌ Don't know if agent lied about what's covered
    
Result: Claims rejected for "undisclosed pre-existing conditions" (70% of rejections)
```

### User Journey

```
Step 1: User receives policy document or quote
  Examples:
    - HDFC health insurance policy PDF
    - ICICI motor insurance quote screenshot
    - Agent's WhatsApp message: "Your plan covers ₹5L health"
    - Policy renewal notice

Step 2: User uploads to SageSure
  "I bought this policy but don't understand it"
  OR sends image of policy

Step 3: SageSure extracts + explains:

  [POLICY PULSE CHECK ✓]
  
  Your HDFC Health Insurance Policy
  ─────────────────────────────
  
  Coverage Summary (What you actually get):
    ✓ Hospital bills: Up to ₹5,00,000/year
    ✓ Room rent cap: ₹5,000/day max
    ✓ Pharmacy outside hospital: ₹20,000/year
    ✓ Pre-hospitalization: 30 days before admission
    
  Waiting Periods (When coverage starts):
    ⚠️ General illness: 30 days (you can't claim in first month)
    ⚠️ Pre-existing conditions: 4 years (must wait 4 years from policy start)
    ✓ Accident: No waiting period (covered immediately)
  
  Major Exclusions (What's NOT covered):
    ❌ Dental treatment (except emergencies)
    ❌ Cosmetic surgery
    ❌ Fertility treatment
    ❌ Admitted before policy started date
  
  Red Flags from Your Policy:
    🚨 Room rent cap is BELOW most good hospitals in Mumbai
       Typical Lilavati ward: ₹8,000+/day but policy pays only ₹5,000
       You pay remaining ₹3,000+ out of pocket
    
    🚨 Pre-existing condition waiting period is 4 years
       If you have diabetes/hypertension, not covered for 4 years
       Most competitors offer 2-year or even 0-year
    
    ℹ️  Pre-hospitalization covered for 30 days
       Good: Better than industry standard (usually 14 days)
  
  Agent's Claim vs Reality:
    Agent said:        "Covers all hospital bills"
    Reality:           Covers up to ₹5L/year, room capped at ₹5K/day
    Mismatch score:    60% (agent oversold)
  
  Better Alternative (Optional, Phase 2):
    Compare to 3 policies with same premium
    SBI Health Insurance: Same premium, ₹7K room cap, 2-year PED
    
  What to do NOW:
    📝 Ask HDFC in writing:
       "For my pre-existing diabetes, what's the exact waiting period?"
       (Get written confirmation BEFORE claim)
    
    📝 Ask about room rent cap:
       "What hospitals are in-network and respect ₹5K cap?"
       (Prevents bill shock)

Step 4: User saves this report
  - Stores in SageSure vault
  - Can share with family/doctor
  - Reference at claim time ("Policy says X, but you're denying Y")
```

### Core Workflow

```
Input → Document Parse → Extract Structure → Truth Translate → Red Flag → Output

INPUT:
  ├─ Policy PDF (any insurer, any line)
  ├─ Quote screenshot (before purchase)
  ├─ Policy renewal notice
  └─ Agent's WhatsApp message ("You're covered for...")

DOCUMENT PARSING:
  OCR + LLM extracts:
    - Policy name + ID
    - Coverage amounts (hospital, doctor, medicine)
    - Waiting periods (general, PED, specific illnesses)
    - Exclusions (dental, cosmetic, fertility, etc.)
    - Room rent cap
    - Pre-auth process
    - Claim procedure
    - Agent contact
    - Policy dates

POLICY ONTOLOGY (India-Specific Coverage Terms):
  SageSure maintains dictionary of:
    "Room rent cap" → In-patient daily limit
    "PED" → Pre-existing disease (4-year typical waiting period)
    "Day-care" → Procedures where you don't stay overnight
    "Pre-hospitalization" → Treatment 30 days before admission
    "Co-pay" → Amount customer pays, insurer pays rest
    "Sub-limit" → Separate cap within total coverage
    
  Maps HDFC terminology → ICICI → SBI → Standard Indian insurance language

EXTRACTION INTO STRUCTURED FORM:
  {
    "coverage": {
      "hospital_bill": "₹5,00,000",
      "room_rent_cap": "₹5,000/day",
      "pharmacy": "₹20,000/year",
      "pre_hosp_days": 30
    },
    "waiting_periods": {
      "general": "30 days",
      "pre_existing": "4 years",
      "specific_illnesses": [
        {"illness": "heart disease", "days": 2*365},
        {"illness": "cancer", "days": 2*365}
      ]
    },
    "exclusions": [
      "Dental treatment",
      "Cosmetic surgery",
      "Fertility treatment"
    ],
    "claim_process": "Submit within 30 days with receipts"
  }

TRUTH TRANSLATION (Hindi/Regional + Plain Language):
  "₹5,000 room rent cap" in plain language:
    "In Hindi: 'अगर आप अस्पताल में भर्ती हो तो कमरे का खर्च ₹5,000 तक दैनिक बीमा कंपनी देगी'"
    
    In Hinglish:
    "Agar aap hospital mein admit ho to kamre ka kharch ₹5,000 tak daily insurance company
    degi. Agar actual bill ₹8,000 hai to ₹3,000 aap ko pay karna padega.'"
    
    Why this matters:
    "अगर आप महंगे अस्पताल में जाएं तो बाकी खर्च आपको देना पड़ेगा (You'll pay extra)"

RED FLAG EXTRACTION:
  Sarvam LLM identifies risks:
    1. Room rent cap is LOW
       (Compare to average hospital rates in user's city)
    
    2. Pre-existing condition waiting period is HIGH
       (Compare to competitor policies)
    
    3. Exclusions are BROAD
       (What's not covered vs industry standard?)
    
    4. Pre-auth required
       (Will slow down your claim)
    
    5. Claim procedure is UNCLEAR
       (Takes time to figure out)

AGENT CLAIM VS REALITY:
  If agent said:     "Full coverage for heart disease"
  Extract from policy: "Heart disease has 2-year waiting period"
  
  Mismatch detected:
    Score: 85% mismatch (agent clearly lied)
    Evidence: Clause 4.2.3 clearly states "Pre-existing disease, 2-year waiting"
    
  Mark as: "Potential mis-selling - get written confirmation from insurer"

OUTPUT (User-facing):
  ├─ Plain language summary (2-3 min read)
  ├─ Red flags specific to policy
  ├─ Comparison (if in Phase 2)
  ├─ Action items (what to confirm before claim)
  ├─ Saveable report
  └─ Share with family / doctor
```

### Data Dependencies

```
TIER 1: Policy Document Corpus (Build immediately)
  ├─ HDFC Health Policy (current version + 5 past versions)
  ├─ ICICI Health Policy
  ├─ SBI Health Policy
  ├─ Reliance Bajaj Policy
  ├─ Orient Insurance Policy
  ├─ Star Insurance Policy
  ├─ Magma Insurance Policy
  ├─ National Insurance (govt)
  └─ Similar for Motor (Comprehensive), Travel Insurance
  
  Source: Download from insurer websites, get from customer uploads
  Versioning: Policy wordings change quarterly

TIER 2: India Insurance Coverage Ontology (Build Tier 1)
  ├─ Standard terms dictionary
  │   - "Room rent cap"
  │   - "Pre-existing disease (PED)"
  │   - "Day-care procedure"
  │   - "Co-pay"
  │   - "Sub-limit"
  │
  ├─ Industry benchmarks
  │   - Average room rent cap by city (Delhi, Mumbai, Bangalore)
  │   - Standard waiting periods (PED 2-year vs 4-year)
  │   - Average exclusions (dental, cosmetic)
  │
  └─ Regulatory expectations
      - IRDAI min coverage standards per line
      - Mandatory disclosures (what must be in policy)

TIER 3: Claim Denial Patterns (Build through Phase 2)
  ├─ "Policy says covers ₹5L, claim denied as ₹2L hit cap first"
  ├─ "Pre-existing condition, 4-year waiting, only 2 years passed"
  ├─ "Room rent cap breached, hospital charges ₹8K, policy pays ₹5K"
  ├─ "Day-care procedure excluded from this sub-policy"
  └─ "Pre-auth not obtained, claim denied"
  
  This tier feeds into Claims Defender (Module 3)
```

### Regulatory Alignment

```
IRDAI Master Circular on Policyholder Protection:
  ✓ SageSure supports these requirements
    - Transparency in policy terms
    - Disclosure of exclusions
    - Plain language explanation (not legal jargon)
    - Documentation of policy details

Insurance Regulation 2024:
  ✓ Distribution channel responsibility
    - Agents must disclose exclusions
    - SageSure helps verify disclosures happened
    - Protects customer if agent mis-sold

  ✓ Policy servicing
    - Customer has right to understand coverage
    - SageSure delivers this right
```

### The Moat

```
MOAT LEVER 1: Clause-Level Policy Parser
  Why hard to copy:
    - Each insurer formats policies differently
    - HDFC says "Room rent cap: ₹5,000 per day"
    - ICICI says "In-patient daily limit: ₹5,000"
    - SBI says "Ward charges: ₹5,000"
    
    Takes 6+ months to build parser for 10 major insurers
    You'll have it in Month 4
    
    Competitors would need to:
      ✓ Get 100+ policy PDFs
      ✓ Hire domain expert to label
      ✓ Train extraction model
      ✓ Handle edge cases
      
    By the time they catch up, you have 50+ policy versions

MOAT LEVER 2: India-Specific Coverage Ontology
  Why hard to copy:
    - "Room rent cap" doesn't exist in US insurance
    - "PED waiting period" is India-specific concept
    - PolicyBazaar has this internally, but not exposed
    - No global tool understands Indian insurance language
    
    You'll have:
      ✓ Dictionary of 500+ India insurance terms
      ✓ Mapped to plain Hindi/regional
      ✓ Benchmarked to industry standards
      ✓ Linked to IRDAI regulations

MOAT LEVER 3: Red Flag Extraction (Data + Model)
  Why hard to copy:
    - Requires understanding of 10,000+ claims to know what causes disputes
    - You'll build this by Month 6 (Claims Defender feedback loop)
    - Competitors don't have this data
    
    Example:
      You know: "Room rent cap <₹7K in metros = 40% claim disputes"
      You flag: "Your policy has ₹5K cap, you're in Mumbai (avg ₹8K), red flag"
      
      Competitors without data = can't flag this
```

### MVP Scope (120 Days)

```
SHIPS IN 120 DAYS:
  ✓ PDF parsing (extract key coverage, waiting periods, exclusions)
  ✓ Plain language translation (Hindi + Hinglish)
  ✓ Coverage summary (what you actually get)
  ✓ Red flag extraction (room rent cap, PED waiting period)
  ✓ Agent claim vs reality (detect mis-selling)
  ✓ Support for 5 major health insurers
  
  Launch with:
    - 20 standard policies (parsed + verified)
    - 500-term coverage ontology
    - Rules-based red flag detection

SHIPS IN 6 MONTHS (Phase 2):
  ✓ Motor insurance support
  ✓ Travel insurance support
  ✓ Comparison feature (this policy vs 3 alternatives)
  ✓ Regional language support (Tamil, Telugu, Marathi)
  ✓ ML-based policy understanding (not just rules)

SHIPS IN 12 MONTHS (Phase 3):
  ✓ Real-time comparison (buy through SageSure, compare before you buy)
  ✓ Integrated with underwriting (feeds into Module 5)
```

### Success Metrics (120 Days)

```
ADOPTION:
  - Target: 5K policies uploaded in first 60 days
  - Retention: 50%+ come back to reference before claim
  - Referral: 20% share report with family/doctor

QUALITY:
  - Parse accuracy: 95%+ (correctly identify coverage amounts)
  - Red flag precision: 85%+ (flags we raise are actually issues)
  - User clarity: 90%+ say "now I understand what I bought"

IMPACT:
  - Mis-selling prevention: Users discover agent lied before claim
  - Claim preparation: Users know what docs to collect
  - Dispute prevention: Users know about caps/exclusions beforehand

BUSINESS:
  - Zero CAC (organic discovery through scams + vault)
  - Foundation for Claims Defender (feeds dispute data)
```

---

## MODULE 3: CLAIMS DEFENDER (Ship Month 6-9)

### User Problem
```
Current state:
  Customer gets claim rejection email:
  "Claim denied: Pre-existing condition not disclosed, Clause 4.2(b)"
  
  They:
    ❌ Don't understand what clause 4.2(b) says
    ❌ Don't know if rejection is valid
    ❌ Don't know how to appeal
    ❌ Fear losing ₹5L permanently
    ❌ Don't know Ombudsman exists
    
Result: 80% of rejectable claims are never appealed (customers give up)
```

### User Journey

```
Step 1: Customer receives rejection email
  "Claim #ABC-2024-9872 DENIED
   Reason: Pre-existing condition, not declared
   Clause: 4.2(b) - Exclusion of pre-existing conditions
   Amount: ₹5,00,000"

Step 2: Customer forwards to SageSure
  "My claim was rejected. What do I do?"

Step 3: SageSure analyzes

  [CLAIMS DEFENDER ANALYSIS ✓]
  
  Your Rejection: POTENTIALLY INVALID
  Risk of claim validity: MEDIUM (45% chance you can appeal successfully)
  
  What insurer claims:
    Clause: 4.2(b) - "Pre-existing conditions excluded for 4 years"
    Their logic: You didn't disclose diabetes in proposal form
  
  What your policy ACTUALLY says:
    "Clause 4.2(b) Pre-existing disease, 4 years from policy start date"
    Your policy started: Jan 2024
    Your diabetes diagnosis: Dec 2023 (one month BEFORE policy)
    Timeline: 4-year waiting ends Jan 2028
    Your claim: March 2024 (within 4-year period)
    
    ✓ Insurer is technically correct
    ❌ BUT WAIT - here's the issue...
  
  WHERE THEY MIGHT BE WRONG:
    You DID disclose diabetes in:
      ✓ Medical form (page 3, question 12)
      ✓ Proposal form (page 5, you checked "Yes" to pre-existing)
      ✓ Your GP letter submitted at proposal
      
    Insurer's claim "not disclosed" doesn't match your documents.
    This is a DOCUMENTATION MISMATCH.
  
  Regulatory Standard (IRDAI):
    "Insurer must prove material misrepresentation.
     Proof = claimant actively concealed/lied.
     Mere silence ≠ misrepresentation if form asked.
     You answered truthfully → disclosure ✓"
  
  Chance of Appeal Success:
    - You have proofs of disclosure: 70% success
    - Insurer may have lost/misplaced your medical form: 50% success
    - Documentation mismatch case law: Favorable
  
  Your Action Plan:

    IMMEDIATE (Next 7 days):
    
    Step 1: Get all your documents
      ☐ Original proposal form (you signed)
      ☐ Medical form (with your "Yes" to pre-existing)
      ☐ Doctor's letter you submitted
      ☐ Original policy document (proof of starting date)
      ☐ Claim rejection email
      ☐ Hospital discharge summary
      ☐ Medical reports from time of claim
    
    Step 2: Create evidence packet
      [SageSure creates this for you]
      
      Page 1: Timeline
        Jan 2024: Your policy starts
        Mar 2024: You're hospitalized for diabetes complications
        Mar 15: You file claim
        Apr 1: Insurer rejects
        Today: You appeal
      
      Page 2: Your disclosure proof
        Proposal form page 5: "Have you had any pre-existing condition?"
        Your answer: "Yes, diabetes diagnosed Dec 2023"
        Date signed: Jan 5, 2024
        
        Medical form page 3: "List all pre-existing diseases"
        Your answer: "Diabetes mellitus, controlled"
        Doctor letter attached: "Patient diabetic for 1 year, well-controlled"
      
      Page 3: Policy terms (from Module 2 - Policy Pulse)
        Clause 4.2(b) says: Exclusion for 4 years from date of policy
        But insurer's rejection claims: "Not disclosed"
        Mismatch: You clearly disclosed
      
      Page 4: Regulatory standard (IRDAI)
        IRDAI circular XYZ: "Disclosure = answered truthfully in form"
        "Concealment = actively hid when asked"
        Your case: You answered "Yes" → no concealment
    
    Step 3: File IRDAI Complaint (Tier 1)
      
      Use SageSure template:
      
      "Grievance against: [Insurer name]
       Policy #: ABC-2024-5432
       Claim #: ABC-2024-9872
       
       Ground of complaint:
       1. Insurer rejected claim citing 'pre-existing condition not disclosed'
       2. I DID declare pre-existing condition in proposal form page 5
       3. I submitted doctor's letter at proposal
       4. Insurer's rejection is based on 'not disclosed' which is factually wrong
       
       Evidence attached: [8-page packet you created in Step 2]
       
       Requested remedy: Approve claim for ₹5,00,000
       or Pay on appeal: ₹3,50,000 (reduced by co-morbidity)
       
       Requested timeline: Within 30 days (IRDAI standard)"
      
      SageSure fills in automatically from your policy pulse + rejection letter
      You submit via IRDAI complaint portal
    
    IF IRDAI REJECTS (30 days, rarely):
    
    Step 4: File Insurance Ombudsman Complaint (Tier 2)
      Eligibility: ✓ (Amount <₹50L, complaint <1 year old)
      
      Ombudsman will:
        ✓ Review your evidence packet
        ✓ Ask insurer for their proof of "not disclosed"
        ✓ If insurer can't prove → award in your favor
        ✓ Award is binding on insurer
      
      Success rate: 65% in documentation mismatch cases
    
    IF OMBUDSMAN DECLINES (rare):
    
    Step 5: Legal action (consumer forum)
      Cost: ₹5-10K (filing fee)
      Timeline: 6-12 months
      Success rate: 50% (high stakes, high effort)
      
      Consider: If claim is ₹5L, and you have 60% success rate,
      expected value = ₹3L, legal cost = ₹10K → worth it
  
  Key Insight (Why SageSure helps):
    Without SageSure:
      Customer sees "pre-existing not disclosed"
      Thinks: "Insurance company always wins, I give up"
      Result: Insurer keeps ₹5L
    
    With SageSure:
      Customer sees "Actually, you DID disclose it. Here's proof."
      Thinks: "I have a real case, let's escalate"
      Result: 70% chance claim approved

Step 4: Customer chooses action
  ☐ File IRDAI complaint (SageSure provides template)
  ☐ File Ombudsman complaint
  ☐ Hire lawyer + file consumer forum case
  ☐ Accept rejection (though SageSure recommends against)

Step 5: SageSure tracks timeline
  "IRDAI complaint filed: April 15
   IRDAI must respond by: May 15 (30 days)
   
   If no response by May 15:
   → File Ombudsman escalation
   
   Ombudsman deadline: 3 months from filing
   Expected outcome: June 15"
```

### Core Workflow

```
Input → Analysis → Evidence Packet → Escalation Path → Timeline Tracker

INPUT:
  ├─ Claim rejection email/letter
  ├─ Original policy document (from vault)
  ├─ Claim documents (receipts, discharge summary)
  └─ Policy Pulse analysis (from Module 2)

DENIAL ANALYSIS:
  Parse rejection for:
    - Exact reason (pre-existing condition, exclusion, documentation, etc.)
    - Policy clause cited (4.2(b))
    - Amount denied
    - Insurer's logic
  
  Map to "Denial Reason Ontology":
    - Pre-existing condition not disclosed (50% of rejections)
    - Exceeds sub-limit (30%)
    - Not in-network hospital (10%)
    - Documentation incomplete (5%)
    - Exclusion clause (5%)

VALIDITY CHECK (Against Policy + Regulation):
  1. Is clause interpretation correct?
     Compare: What insurer cites vs what clause actually says
  
  2. Is regulation on your side?
     IRDAI stance on "disclosure" vs "concealment"
  
  3. Do you have evidence?
     Proposal form, medical letter, doctor notes
  
  4. What's your success probability?
     Based on similar cases + ombudsman precedents

EVIDENCE PACKET GENERATION:
  Auto-create 8-10 page document:
    - Timeline (policy start → claim → rejection → today)
    - Your disclosure proof (scanned documents)
    - Policy terms (extracted from Policy Pulse)
    - Regulatory standard (IRDAI quote + link)
    - Insurer's claim vs reality (mismatch analysis)
    - Recommended action (appeal path)

ESCALATION PATH DETERMINATION:
  Tier 1: IRDAI Complaint (Fastest, free)
    - Eligibility check
    - Template pre-fill
    - Submission steps
  
  Tier 2: Insurance Ombudsman (<₹50L claims)
    - Eligibility check
    - Evidence checklist
    - Expected timeline
  
  Tier 3: Consumer Forum (Legal)
    - Cost estimate
    - Timeline estimate
    - Lawyer referral (Phase 2)

TIMELINE TRACKER:
  Auto-set calendar alerts:
    - Day 30: IRDAI must respond (alert if silent)
    - Day 60: Escalate to Ombudsman if needed
    - Day 90: Ombudsman deadline
    - Day 365: Claim too old (limits options)
```

### Data Dependencies

```
TIER 1: IRDAI Regulatory Corpus
  ├─ Master Circular on Policyholder Protection
  ├─ Grievance Redressal Procedure
  ├─ Ombudsman Rules + Precedents
  ├─ Master Circular on Fraud
  └─ Specific circulars per insurance line (health, motor, life)

TIER 2: Ombudsman Decision Database (Build through usage)
  ├─ Published ombudsman awards (public domain)
  ├─ Categorized by denial reason
  ├─ Success rate by denial type
  └─ "Similar to your case, success rate is 70%"
  
  Public source: Insurance Ombudsman portal publishes decisions

TIER 3: Denial Reason ↔ Clause ↔ Remedy Mapping
  Example:
    Denial: "Pre-existing condition not disclosed"
    Clause: Policy 4.2(b)
    Regulation: IRDAI Master Circular section 3.5
    Remedy: "Prove disclosure in proposal form"
    Success rate: 70% (from ombudsman precedents)
    
  This becomes your "knowledge graph"
```

### The Moat

```
MOAT LEVER 1: Denial Reason ↔ Clause ↔ Remedy Knowledge Graph
  Why hard to copy:
    - Requires 500+ hours of ombudsman decision analysis
    - Requires understanding of 50+ policy wordings
    - Requires mapping IRDAI regulations to practical cases
    - Updates as ombudsman makes new decisions
    
    You'll have:
      ✓ Database of 1000+ denial patterns
      ✓ Success rate by denial type
      ✓ Regulatory citation for each
      
    Competitors:
      - InsuranceSamadhan: Manual case work only
      - Legal apps: Generic contract language, not insurance-specific
      - Insurers: Don't want to expose this (kills denials)

MOAT LEVER 2: Ombudsman Precedent Dataset
  Why hard to copy:
    - Ombudsman decisions are public but scattered
    - Takes months to normalize/categorize them
    - You automate this
    - Every new decision = your model gets smarter
    
    Network effect:
      - You help 10 customers → 10 similar cases will come
      - Your precedent database grows
      - Next customer with same issue gets 95% success prediction
      - Insurers see pattern → settle to avoid ombudsman

MOAT LEVER 3: Evidence Packet Generation
  Why hard to copy:
    - Requires understanding of claim documents
    - Requires knowing what regulators need to see
    - Requires legal/compliance expertise
    - Takes months to build templates
    
    You'll have:
      ✓ Auto-fill templates for 20+ denial types
      ✓ Document checklist based on ombudsman requirements
      ✓ Regulatory citation ready-to-use
```

### MVP Scope (Ship Month 6-9)

```
SHIPS IN MONTHS 6-9:
  ✓ Denial analysis (parse rejection, map to clause)
  ✓ Validity check (is insurer's interpretation correct?)
  ✓ Evidence packet generation (auto-create document)
  ✓ IRDAI complaint template (pre-fill + guidance)
  ✓ Ombudsman eligibility check
  ✓ Timeline tracker (alert on deadlines)
  ✓ Success probability (based on initial cases)
  
  Launch with:
    - 20 common denial types analyzed
    - IRDAI rules corpus
    - 100+ ombudsman precedents (from public database)

SHIPS IN MONTHS 12-18:
  ✓ Ombudsman filing automation (pre-fill form)
  ✓ Consumer forum cost/timeline calculator
  ✓ Lawyer referral network
  ✓ Regional language support
  ✓ Real-time update on IRDAI decisions

SHIPS IN MONTHS 18-24:
  ✓ Predictive model (claim denial risk scoring at purchase)
  ✓ Feeds into Module 5 (Underwriting Engine)
```

---

## MODULE 4: SOVEREIGN VAULT (Ship Month 6-9)

[DETAILED SPECIFICATION CONTINUES...]

---

## SUMMARY TABLE: MVP SEQUENCING

```
120 Days (Phase 1):     ScamShield (WhatsApp wedge) + Policy Pulse (basic)
Months 6-9 (Phase 2):   Claims Defender + Vault launch + B2B APIs
Months 12-24 (Phase 3): Underwriting Engine + ABDM + Marketplace
```

