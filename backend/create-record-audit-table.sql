-- =====================================================
-- PashuVision Tamper-Evident Record Verification Migration
-- Table: record_audit_log
-- Description: Immutable cryptographic audit chain for livestock records
-- =====================================================

CREATE TABLE IF NOT EXISTS record_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'FLAG'
  record_hash TEXT NOT NULL, -- SHA-256 of canonical animal record attributes
  previous_hash TEXT, -- SHA-256 chain hash of previous audit record
  chain_hash TEXT NOT NULL, -- SHA-256(record_hash + previous_hash + operation + timestamp + actor_id)
  actor_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  canonical_snapshot JSONB NOT NULL, -- Deterministic canonical snapshot of hashed attributes
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Performance and query indexes
CREATE INDEX IF NOT EXISTS idx_audit_animal_id ON record_audit_log(animal_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON record_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_chain_hash ON record_audit_log(chain_hash);
CREATE INDEX IF NOT EXISTS idx_audit_operation ON record_audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON record_audit_log(actor_id);

-- Enable Row Level Security
ALTER TABLE record_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. All authenticated users can read audit logs for verification
CREATE POLICY "Authenticated users can read audit logs"
  ON record_audit_log
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Public can read audit logs for public verification (QR certificate scan)
CREATE POLICY "Public can read audit logs for verification"
  ON record_audit_log
  FOR SELECT
  TO anon
  USING (true);

-- 3. Inserts restricted to authenticated users or service role
CREATE POLICY "Authenticated users can insert audit records"
  ON record_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Documentation comments
COMMENT ON TABLE record_audit_log IS 'Tamper-evident cryptographic audit chain for animal records';
COMMENT ON COLUMN record_audit_log.record_hash IS 'SHA-256 hash of deterministic canonical animal record attributes';
COMMENT ON COLUMN record_audit_log.chain_hash IS 'Cryptographic block link: SHA-256(record_hash + previous_hash + operation + timestamp + actor_id)';
COMMENT ON COLUMN record_audit_log.canonical_snapshot IS 'Normalized JSON snapshot used to generate record_hash';
