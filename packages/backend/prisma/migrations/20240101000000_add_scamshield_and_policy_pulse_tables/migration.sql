-- CreateTable
CREATE TABLE "scam_patterns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pattern_text" TEXT NOT NULL,
    "pattern_category" VARCHAR(100) NOT NULL,
    "risk_level" VARCHAR(20) NOT NULL,
    "keywords" TEXT[],
    "regex_pattern" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scam_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_arrest_incidents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "video_url" TEXT,
    "is_deepfake" BOOLEAN,
    "confidence_score" DECIMAL(5,2),
    "anomalies" JSONB,
    "scammer_contact" VARCHAR(255),
    "amount_involved" DECIMAL(15,2),
    "reported_to_1930" BOOLEAN NOT NULL DEFAULT false,
    "report_reference" VARCHAR(100),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_arrest_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemarketer_registry" (
    "phone_number" VARCHAR(20) NOT NULL,
    "brand_name" VARCHAR(255),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_scammer" BOOLEAN NOT NULL DEFAULT false,
    "is_dnd" BOOLEAN NOT NULL DEFAULT false,
    "report_count" INTEGER NOT NULL DEFAULT 0,
    "last_verified" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemarketer_registry_pkey" PRIMARY KEY ("phone_number")
);

-- CreateTable
CREATE TABLE "verified_brands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brand_name" VARCHAR(255) NOT NULL,
    "official_contacts" JSONB NOT NULL,
    "verification_status" VARCHAR(50) NOT NULL,
    "verified_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verified_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scam_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "scam_type" VARCHAR(100) NOT NULL,
    "scammer_contact" VARCHAR(255),
    "amount_involved" DECIMAL(15,2),
    "description" TEXT,
    "evidence_urls" TEXT[],
    "reported_to_1930" BOOLEAN NOT NULL DEFAULT false,
    "report_reference" VARCHAR(100),
    "status" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scam_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "family_member_id" UUID NOT NULL,
    "alert_type" VARCHAR(100) NOT NULL,
    "alert_message" TEXT NOT NULL,
    "sent_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "family_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "insurer_name" VARCHAR(255) NOT NULL,
    "policy_number" VARCHAR(100) NOT NULL,
    "policy_type" VARCHAR(100) NOT NULL,
    "issue_date" DATE,
    "expiry_date" DATE,
    "sum_assured" DECIMAL(15,2),
    "premium" DECIMAL(15,2),
    "original_pdf_url" TEXT,
    "parsed_data" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_ontology" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "policy_id" UUID NOT NULL,
    "coverage_features" JSONB NOT NULL,
    "exclusions" TEXT[],
    "waiting_periods" JSONB NOT NULL,
    "sub_limits" JSONB NOT NULL,
    "co_payment" DECIMAL(5,2),
    "room_rent_limit" DECIMAL(10,2),
    "normalized_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_ontology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "policy_id" UUID NOT NULL,
    "language" VARCHAR(10) NOT NULL,
    "summary" TEXT,
    "key_points" TEXT[],
    "exclusions_highlight" TEXT[],
    "simplified_terms" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "red_flags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "policy_id" UUID NOT NULL,
    "flag_type" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "policy_clause" TEXT,
    "recommendation" TEXT,
    "detected_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "red_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coverage_comparisons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_policy_id" UUID NOT NULL,
    "compared_policies" JSONB NOT NULL,
    "comparison_data" JSONB NOT NULL,
    "recommendation" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coverage_comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scam_patterns_pattern_category_idx" ON "scam_patterns"("pattern_category");

-- CreateIndex
CREATE INDEX "scam_patterns_pattern_text_idx" ON "scam_patterns" USING GIN (to_tsvector('english', "pattern_text"));

-- CreateIndex
CREATE UNIQUE INDEX "verified_brands_brand_name_key" ON "verified_brands"("brand_name");

-- CreateIndex
CREATE INDEX "policies_user_id_idx" ON "policies"("user_id");

-- CreateIndex
CREATE INDEX "policies_expiry_date_idx" ON "policies"("expiry_date");

-- AddForeignKey
ALTER TABLE "policy_ontology" ADD CONSTRAINT "policy_ontology_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_translations" ADD CONSTRAINT "policy_translations_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "red_flags" ADD CONSTRAINT "red_flags_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_comparisons" ADD CONSTRAINT "coverage_comparisons_user_policy_id_fkey" FOREIGN KEY ("user_policy_id") REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
