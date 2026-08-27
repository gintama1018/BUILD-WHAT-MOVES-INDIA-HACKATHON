/**
 * Seed script — imports Phase -1 verified authority data into SQLite.
 * Run: npx ts-node src/db/seed/run_seed.ts
 */
import { getDb } from '../connection';
import { v4 as uuidv4 } from 'uuid';
import seedData from './authorities.json';

export function runSeed(): void {
  const db = getDb();

  const insertOrIgnore = db.transaction(() => {
    // States
    const stateStmt = db.prepare(
      `INSERT OR IGNORE INTO states (id, name, is_ut, code) VALUES (?, ?, ?, ?)`
    );
    for (const s of seedData.states) {
      stateStmt.run(s.id, s.name, s.is_ut, s.code);
    }

    // Source Documents (inserted first for foreign keys)
    const srcStmt = db.prepare(
      `INSERT OR REPLACE INTO source_documents (id, title, url, retrieved_date, publisher_type, confidence_tier)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const s of seedData.source_documents) {
      srcStmt.run(s.id, s.title, s.url, s.retrieved_date, s.publisher_type, s.confidence_tier);
    }

    // RTI Portals
    const portalStmt = db.prepare(
      `INSERT OR REPLACE INTO rti_portals (id, name, url, government_level, state_id, fee_amount, fee_currency, accepts_online, bpl_exemption_note, bpl_exemption_source_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const p of seedData.rti_portals) {
      portalStmt.run(
        p.id, p.name, p.url, p.government_level, p.state_id ?? null,
        p.fee_amount, p.fee_currency, p.accepts_online,
        (p as any).bpl_exemption_note ?? null,
        (p as any).bpl_exemption_source_id ?? null
      );
    }

    // Subject Domains
    const domainStmt = db.prepare(`INSERT OR REPLACE INTO subject_domains (id, label) VALUES (?, ?)`);
    for (const d of seedData.subject_domains) {
      domainStmt.run(d.id, d.label);
    }

    // Geographic Areas
    const geoStmt = db.prepare(
      `INSERT OR REPLACE INTO geographic_areas (id, type, name, state_id, parent_id) VALUES (?, ?, ?, ?, ?)`
    );
    for (const g of seedData.geographic_areas) {
      geoStmt.run(g.id, g.type, g.name, g.state_id ?? null, g.parent_id ?? null);
    }

    // Public Authorities + junction tables
    const authStmt = db.prepare(
      `INSERT OR IGNORE INTO public_authorities
       (id, name, short_name, government_level, state_id, rti_portal_id, filing_method, source_document_id, last_verified_date, is_concurrent_list, pio_designation, pio_contact_note, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const asdStmt = db.prepare(
      `INSERT OR IGNORE INTO authority_subject_domains (authority_id, domain_id) VALUES (?, ?)`
    );
    const agaStmt = db.prepare(
      `INSERT OR IGNORE INTO authority_geographic_areas (authority_id, geographic_area_id) VALUES (?, ?)`
    );

    for (const a of seedData.public_authorities) {
      authStmt.run(
        a.id, a.name, a.short_name ?? null, a.government_level,
        a.state_id ?? null, a.rti_portal_id, a.filing_method,
        a.source_document_id, a.last_verified_date, a.is_concurrent_list,
        (a as any).pio_designation ?? null, (a as any).pio_contact_note ?? null,
        a.notes ?? null
      );
      for (const did of a.subject_domain_ids) asdStmt.run(a.id, did);
      for (const gid of a.geographic_area_ids) agaStmt.run(a.id, gid);
    }

    // Initial data version
    const versionStmt = db.prepare(
      `INSERT OR IGNORE INTO data_versions (id, dataset_snapshot_date, change_log) VALUES (?, ?, ?)`
    );
    versionStmt.run(uuidv4(), '2026-08-26', 'Initial seed — Phase -1 verified records (Phase -1 data curation, PLAN.txt Section 48)');
  });

  insertOrIgnore();
  console.log(`[seed] Done — ${seedData.public_authorities.length} authorities seeded.`);
}

// Allow direct execution
if (require.main === module) {
  runSeed();
  process.exit(0);
}
