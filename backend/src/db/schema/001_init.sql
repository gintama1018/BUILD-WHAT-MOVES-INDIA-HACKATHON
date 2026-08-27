-- ============================================================
-- RTI Jurisdiction & Authority Discovery Assistant
-- Schema: Section 12 (Knowledge Base) + Section 15 (App tables)
-- DB: SQLite (Postgres-compatible syntax used where possible)
-- ============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ── KNOWLEDGE BASE ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS government_levels (
  id TEXT PRIMARY KEY -- 'CENTRAL' | 'STATE' | 'UNION_TERRITORY' | 'LOCAL' | 'UNKNOWN'
);
INSERT OR IGNORE INTO government_levels VALUES ('CENTRAL'),('STATE'),('UNION_TERRITORY'),('LOCAL'),('UNKNOWN');

CREATE TABLE IF NOT EXISTS states (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  is_ut    INTEGER NOT NULL DEFAULT 0, -- 1 = Union Territory
  code     TEXT  -- 2-letter state code e.g. MH, DL
);

CREATE TABLE IF NOT EXISTS rti_portals (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  url             TEXT NOT NULL,
  government_level TEXT NOT NULL REFERENCES government_levels(id),
  state_id        TEXT REFERENCES states(id),
  fee_amount      INTEGER NOT NULL DEFAULT 10,
  fee_currency    TEXT NOT NULL DEFAULT 'INR',
  accepts_online  INTEGER NOT NULL DEFAULT 1,
  bpl_exemption_note TEXT,
  bpl_exemption_source_id TEXT REFERENCES source_documents(id)
);

CREATE TABLE IF NOT EXISTS subject_domains (
  id    TEXT PRIMARY KEY, -- e.g. 'roads', 'electricity', 'passport', 'education', 'police', 'pension'
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS geographic_areas (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL, -- 'NATIONAL' | 'STATE' | 'DISTRICT' | 'CITY' | 'WARD'
  name       TEXT NOT NULL,
  state_id   TEXT REFERENCES states(id),
  parent_id  TEXT REFERENCES geographic_areas(id)
);

CREATE TABLE IF NOT EXISTS source_documents (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  url             TEXT NOT NULL,
  retrieved_date  TEXT NOT NULL, -- ISO date string
  publisher_type  TEXT NOT NULL, -- 'OFFICIAL' | 'EXPERT' | 'NGO'
  confidence_tier TEXT NOT NULL  -- 'HIGH' | 'MEDIUM' | 'LOW'
);

CREATE TABLE IF NOT EXISTS public_authorities (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  short_name          TEXT,
  government_level    TEXT NOT NULL REFERENCES government_levels(id),
  state_id            TEXT REFERENCES states(id),
  rti_portal_id       TEXT REFERENCES rti_portals(id),
  filing_method       TEXT NOT NULL DEFAULT 'BOTH', -- 'ONLINE' | 'OFFLINE' | 'BOTH'
  source_document_id  TEXT REFERENCES source_documents(id),
  last_verified_date  TEXT NOT NULL,
  is_concurrent_list  INTEGER NOT NULL DEFAULT 0, -- 1 = Concurrent List subject
  pio_designation     TEXT,
  pio_contact_note    TEXT,
  notes               TEXT
);

CREATE TABLE IF NOT EXISTS authority_subject_domains (
  authority_id   TEXT NOT NULL REFERENCES public_authorities(id),
  domain_id      TEXT NOT NULL REFERENCES subject_domains(id),
  PRIMARY KEY (authority_id, domain_id)
);

CREATE TABLE IF NOT EXISTS authority_geographic_areas (
  authority_id     TEXT NOT NULL REFERENCES public_authorities(id),
  geographic_area_id TEXT NOT NULL REFERENCES geographic_areas(id),
  PRIMARY KEY (authority_id, geographic_area_id)
);

CREATE TABLE IF NOT EXISTS authority_relationships (
  id                   TEXT PRIMARY KEY,
  from_authority_id    TEXT NOT NULL REFERENCES public_authorities(id),
  to_authority_id      TEXT NOT NULL REFERENCES public_authorities(id),
  relationship_type    TEXT NOT NULL -- 'PARENT_OF' | 'SECTION_6_3_TRANSFER'
  -- SECTION_6_3_TRANSFER only valid when both are CENTRAL (enforced in Rule Engine)
);

CREATE TABLE IF NOT EXISTS data_versions (
  id                    TEXT PRIMARY KEY,
  dataset_snapshot_date TEXT NOT NULL,
  change_log            TEXT
);

-- ── APPLICATION STATE ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  started_at   TEXT NOT NULL DEFAULT (datetime('now')),
  device_type  TEXT,
  user_id      TEXT -- nullable, no forced signup
);

CREATE TABLE IF NOT EXISTS queries (
  id                TEXT PRIMARY KEY,
  session_id        TEXT REFERENCES sessions(id),
  raw_text          TEXT NOT NULL,
  location_text     TEXT,
  detected_language TEXT NOT NULL DEFAULT 'en',
  status            TEXT NOT NULL DEFAULT 'pending', -- 'pending'|'analyzed'|'confirmed'|'error'
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS intent_records (
  id                    TEXT PRIMARY KEY,
  query_id              TEXT NOT NULL REFERENCES queries(id),
  subject_domain_guess  TEXT,
  location_text         TEXT,
  government_level_hint TEXT,
  ai_confidence         REAL,
  extracted_entities    TEXT -- JSON blob
);

CREATE TABLE IF NOT EXISTS authority_candidates (
  id                  TEXT PRIMARY KEY,
  query_id            TEXT NOT NULL REFERENCES queries(id),
  public_authority_id TEXT NOT NULL REFERENCES public_authorities(id),
  rank                INTEGER NOT NULL,
  confidence_score    REAL NOT NULL,
  confidence_level    TEXT NOT NULL, -- 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
  match_reasons       TEXT NOT NULL, -- JSON array of reason strings
  rule_validation_passed INTEGER NOT NULL DEFAULT 0,
  is_concurrent_conflict INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_confirmations (
  id                     TEXT PRIMARY KEY,
  query_id               TEXT NOT NULL REFERENCES queries(id),
  authority_candidate_id TEXT NOT NULL REFERENCES authority_candidates(id),
  confirmed_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_interactions (
  id               TEXT PRIMARY KEY,
  query_id         TEXT REFERENCES queries(id),
  stage            TEXT NOT NULL, -- 'intent' | 'rank' | 'explain'
  prompt_hash      TEXT,
  response_summary TEXT,
  latency_ms       INTEGER,
  model_used       TEXT,
  tokens_used      INTEGER,
  error            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feedback (
  id         TEXT PRIMARY KEY,
  query_id   TEXT REFERENCES queries(id),
  comment    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id        TEXT PRIMARY KEY,
  actor     TEXT,
  action    TEXT NOT NULL,
  entity    TEXT,
  entity_id TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── INDEXES ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pa_gov_level ON public_authorities(government_level);
CREATE INDEX IF NOT EXISTS idx_pa_state ON public_authorities(state_id);
CREATE INDEX IF NOT EXISTS idx_asd_domain ON authority_subject_domains(domain_id);
CREATE INDEX IF NOT EXISTS idx_aga_area ON authority_geographic_areas(geographic_area_id);
CREATE INDEX IF NOT EXISTS idx_queries_session ON queries(session_id);
CREATE INDEX IF NOT EXISTS idx_candidates_query ON authority_candidates(query_id);
CREATE INDEX IF NOT EXISTS idx_ai_query ON ai_interactions(query_id);
