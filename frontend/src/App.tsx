import { useState, useRef, useEffect } from 'react';
import { useRtiFlow } from './hooks/useRtiFlow';
import { AuthorityCard } from './components/AuthorityCard';
import { ConfidenceBadge, GovBadge } from './components/Badges';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FAQAccordion } from './components/FAQAccordion';
import { HowItWorksView, AboutRtiView } from './components/InfoModals';
import { api } from './api-client';
import './index.css';

// ── Stepper Component ────────────────────────────────────────
const STEP_LABELS = ['Query', 'Review', 'Results', 'Reasoning', 'File'];
const STEP_INDEX_MAP: Record<string, number> = {
  search: 0, loading: 0, understanding: 1, results: 2,
  why: 3, confirm: 3, filing: 4,
};

function Stepper({ currentStep }: { currentStep: string }) {
  const activeIdx = STEP_INDEX_MAP[currentStep] ?? 0;

  return (
    <div className="stepper-container" role="progressbar" aria-valuenow={activeIdx + 1} aria-valuemin={1} aria-valuemax={5}>
      <div className="stepper-track">
        {STEP_LABELS.map((label, idx) => {
          const isDone = idx < activeIdx;
          const isActive = idx === activeIdx;

          return (
            <div key={label} style={{ display: 'contents' }}>
              <div className={`stepper-node ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                <div className="stepper-circle">
                  {isDone ? '✓' : idx + 1}
                </div>
                <span className="stepper-label">{label}</span>
              </div>
              {idx < STEP_LABELS.length - 1 && (
                <div className={`stepper-line ${isDone ? 'done' : ''}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Available Subject Domains for Clarify / Quick Pick ────────
const QUICK_DOMAINS = [
  { id: 'roads', label: '🚧 Roads & Civic Works' },
  { id: 'water', label: '💧 Water Supply' },
  { id: 'electricity', label: '⚡ Electricity (MSEDCL)' },
  { id: 'passport', label: '📘 Passport & Consular' },
  { id: 'education', label: '🏫 Schools & Education' },
  { id: 'police', label: '👮 Police & Complaints' },
  { id: 'pension', label: '🏦 Central Govt Pension' },
  { id: 'property', label: '🏠 Property Tax' },
];

// ── Main App Component ────────────────────────────────────────
export default function App() {
  const flow = useRtiFlow();
  const [activeInfoView, setActiveInfoView] = useState<'none' | 'how' | 'about' | 'faq'>('none');
  const [queryText, setQueryText] = useState(flow.state.raw_text);
  const [locationText, setLocationText] = useState(flow.state.location_text);
  const searchInputRef = useRef<HTMLTextAreaElement>(null);

  // Sync state if flow resets
  useEffect(() => {
    setQueryText(flow.state.raw_text);
    setLocationText(flow.state.location_text);
  }, [flow.state.raw_text, flow.state.location_text]);

  const handleGoHome = () => {
    flow.reset();
    setActiveInfoView('none');
  };

  const handleStartSearch = () => {
    setActiveInfoView('none');
    if (queryText.trim().length >= 5) {
      flow.submitQuery(queryText, locationText);
    } else {
      searchInputRef.current?.focus();
    }
  };

  const applyExampleChip = (text: string, loc: string) => {
    setQueryText(text);
    setLocationText(loc);
    flow.submitQuery(text, loc);
  };

  const handleClarifyDomain = (domainId: string) => {
    const enrichedQuery = `${queryText} (${domainId})`;
    setQueryText(enrichedQuery);
    flow.submitQuery(enrichedQuery, locationText);
  };

  const isHomeSearch = flow.state.step === 'search' && activeInfoView === 'none';

  return (
    <div className="app-shell">
      <Header
        onGoHome={handleGoHome}
        onOpenHowItWorks={() => setActiveInfoView('how')}
        onOpenAboutRti={() => setActiveInfoView('about')}
        onOpenFaq={() => setActiveInfoView('faq')}
        currentView={activeInfoView !== 'none' ? activeInfoView : flow.state.step === 'search' ? 'home' : undefined}
      />

      <main id="main-content" tabIndex={-1} style={{ flex: 1 }}>
        {/* ── Informational Modal Views ── */}
        {activeInfoView === 'how' && (
          <HowItWorksView onBack={() => setActiveInfoView('none')} />
        )}

        {activeInfoView === 'about' && (
          <AboutRtiView onBack={() => setActiveInfoView('none')} />
        )}

        {activeInfoView === 'faq' && (
          <section className="section-padding">
            <div className="container-narrow">
              <button className="btn btn-ghost btn-sm stack-md" onClick={() => setActiveInfoView('none')}>
                ← Back to Assistant
              </button>
              <div className="section-header" style={{ textAlign: 'left', marginBottom: '24px' }}>
                <div className="section-eyebrow">Civic Support</div>
                <h2>Frequently Asked Questions</h2>
                <p>Understand how RTI jurisdiction, application fees, and authority routing operate in India.</p>
              </div>
              <FAQAccordion />
            </div>
          </section>
        )}

        {/* ── Main Landing & Search Flow (Clean & Focused per UI_PLAN §4.1) ── */}
        {activeInfoView === 'none' && isHomeSearch && (
          <section className="hero-section">
            <div className="container-narrow">
              <div className="hero-eyebrow">
                🏛 India RTI Jurisdiction Assistant
              </div>
              <h1 className="hero-title">
                File RTI to the Right Authority.
              </h1>
              <p className="hero-lead">
                Tell us what information you need. We help you find whether your issue belongs to Central, State, or Local government—and guide you to the official filing route.
              </p>

              {/* Main Query Card */}
              <div className="search-card">
                <label htmlFor="main-query-input" className="field-label">
                  What information do you seek?
                </label>
                <textarea
                  id="main-query-input"
                  ref={searchInputRef}
                  className="query-textarea"
                  placeholder="Describe your issue in simple words (e.g., Why hasn't my street in Pune been repaired? / Electricity bill discrepancy from MSEDCL / Passport renewal delayed)."
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  rows={3}
                  maxLength={3000}
                  aria-describedby="char-count"
                />

                <div className="input-divider" />

                <div className="search-controls">
                  <input
                    id="location-input-field"
                    type="text"
                    className="location-input-field"
                    placeholder="📍 City or State (e.g. Pune, Maharashtra)"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    aria-label="Your city or state"
                  />

                  <button
                    className="btn btn-primary"
                    onClick={handleStartSearch}
                    disabled={queryText.trim().length < 5}
                    id="find-authority-submit-btn"
                  >
                    Find Authority →
                  </button>
                </div>

                <div id="char-count" className="char-counter">
                  {queryText.length}/3000 characters
                </div>

                {/* Suggestion Chips */}
                <div className="suggestions-block">
                  <span className="suggestion-label">Try an example:</span>
                  <button
                    type="button"
                    className="example-chip"
                    onClick={() => applyExampleChip("Why hasn't my street in Pune been repaired for 6 months?", "Pune, Maharashtra")}
                  >
                    🚧 Pune road repair
                  </button>
                  <button
                    type="button"
                    className="example-chip"
                    onClick={() => applyExampleChip("My electricity bill from MSEDCL is incorrect", "Maharashtra")}
                  >
                    ⚡ MSEDCL electricity bill
                  </button>
                  <button
                    type="button"
                    className="example-chip"
                    onClick={() => applyExampleChip("My passport renewal application is delayed for 4 months", "")}
                  >
                    📘 Passport renewal delay
                  </button>
                  <button
                    type="button"
                    className="example-chip"
                    onClick={() => applyExampleChip("I want information about school funding in my area", "Maharashtra")}
                  >
                    🏫 School funding
                  </button>
                </div>
              </div>

              {/* 3-Item Compact Trust Strip (UI_PLAN §4.1) */}
              <div className="trust-strip-compact">
                <div className="trust-strip-item">
                  <span className="icon">✓</span> 100% Free & Open
                </div>
                <div className="trust-strip-item">
                  <span className="icon">🔒</span> No Login Required
                </div>
                <div className="trust-strip-item">
                  <span className="icon">⚖</span> Sourced from Official Portals
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Step: Loading / Processing ── */}
        {activeInfoView === 'none' && flow.state.step === 'loading' && (
          <section className="section-padding">
            <div className="container-focused">
              <Stepper currentStep="loading" />
              <div className="loading-box card">
                <div className="civic-spinner" role="status" aria-label="Analyzing query" />
                <h3 style={{ fontSize: '1.2rem', marginTop: '8px' }}>
                  Analyzing Your Information Request…
                </h3>
                <p style={{ fontSize: '0.92rem' }}>
                  Checking jurisdiction rules, verified government portals, and public authority scopes.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── Step: Understanding / Review ── */}
        {activeInfoView === 'none' && flow.state.step === 'understanding' && (
          <section className="section-padding">
            <div className="container-focused">
              <Stepper currentStep="understanding" />

              <div className="card">
                <div className="stack-md">
                  <div className="hero-eyebrow" style={{ marginBottom: '6px' }}>Step 2 · Review</div>
                  <h2>Here's What We Understood</h2>
                  <p>Please check our understanding before viewing matching authorities.</p>
                </div>

                <div className="summary-table">
                  <div className="summary-row">
                    <span className="summary-key">Your Query</span>
                    <span className="summary-val" style={{ fontStyle: 'italic' }}>
                      "{flow.state.raw_text}"
                    </span>
                  </div>

                  <div className="summary-row">
                    <span className="summary-key">Identified Topic</span>
                    <span className="summary-val">
                      {/* Honesty fix per UI_PLAN §4.3: plain message if domain is null */}
                      {flow.state.analysis?.intent?.subject_domain ? (
                        <strong>{flow.state.analysis.intent.subject_domain}</strong>
                      ) : (
                        <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                          Topic — Not identified yet
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="summary-row">
                    <span className="summary-key">Target Location</span>
                    <span className="summary-val">
                      {flow.state.analysis?.intent?.location_city || flow.state.analysis?.intent?.location_state_id || flow.state.location_text || 'National (All India)'}
                    </span>
                  </div>

                  {flow.state.analysis?.intent?.government_level_hint && (
                    <div className="summary-row">
                      <span className="summary-key">Likely Level</span>
                      <span className="summary-val">
                        <GovBadge level={flow.state.analysis.intent.government_level_hint} />
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    onClick={flow.proceedToResults}
                    id="confirm-understanding-btn"
                  >
                    Looks Right — Show Authorities →
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => flow.goBack('search')}
                  >
                    ← Edit Query
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Step: Results Screen (Ranked Candidates OR Clarify Variant) ── */}
        {activeInfoView === 'none' && flow.state.step === 'results' && (
          <section className="section-padding">
            <div className="container-narrow">
              <Stepper currentStep="results" />

              {/* ── Zero Candidates Clarify Variant (UI_PLAN §3.1) ── */}
              {(!flow.state.analysis?.candidates || flow.state.analysis.candidates.length === 0) ? (
                <div className="clarify-card">
                  <div className="stack-md">
                    <div className="hero-eyebrow" style={{ marginBottom: '6px' }}>Clarify Topic</div>
                    <h2>We Couldn't Confidently Match an Authority</h2>
                    <p>
                      We couldn't confidently match that to an authority in our current dataset. Select your topic below or add your city/state to find the right department.
                    </p>
                  </div>

                  {/* Summary of what was parsed so far */}
                  <div className="summary-table stack-md">
                    <div className="summary-row">
                      <span className="summary-key">Your Query</span>
                      <span className="summary-val" style={{ fontStyle: 'italic' }}>"{flow.state.raw_text}"</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-key">Topic</span>
                      <span className="summary-val">Not identified yet</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-key">Location</span>
                      <span className="summary-val">{flow.state.location_text || 'Not specified'}</span>
                    </div>
                  </div>

                  {/* Quick Domain Pick Buttons */}
                  <div className="stack-md">
                    <p className="field-label">Select the topic of your request:</p>
                    <div className="clarify-chips-grid">
                      {QUICK_DOMAINS.map(d => (
                        <button
                          key={d.id}
                          className="clarify-chip-btn"
                          onClick={() => handleClarifyDomain(d.id)}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Inline Location Refinement */}
                  <div className="stack-lg">
                    <label htmlFor="clarify-location-input" className="field-label">Add your City or State:</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        id="clarify-location-input"
                        type="text"
                        className="location-input-field"
                        placeholder="e.g. Pune, Maharashtra"
                        value={locationText}
                        onChange={(e) => setLocationText(e.target.value)}
                        style={{ minWidth: '220px' }}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => flow.submitQuery(queryText, locationText)}
                      >
                        Retry Search →
                      </button>
                    </div>
                  </div>

                  <div>
                    <button className="btn btn-ghost btn-sm" onClick={() => flow.goBack('search')}>
                      ← Edit original query
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Standard Ranked Results Screen ── */
                <>
                  <div className="stack-md">
                    <div className="hero-eyebrow" style={{ marginBottom: '6px' }}>Step 3 · Authority Results</div>
                    <h2>
                      {flow.state.analysis.candidates.length === 1
                        ? '1 Matching Public Authority'
                        : `${flow.state.analysis.candidates.length} Matching Public Authorities`}
                    </h2>
                    <p>Select an authority to inspect why it matches and view official filing instructions.</p>
                  </div>

                  {/* Concurrent List Alert (Shortened copy per UI_PLAN §4.4) */}
                  {flow.state.analysis?.concurrent_conflict && (
                    <div className="alert-banner concurrent">
                      <span className="alert-icon">⚖</span>
                      <div>
                        <strong>Shared between Central & State Governments:</strong>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: 'inherit' }}>
                          Both Central and State authorities hold relevant records for this subject. The Central authority handles national policies; the State authority handles local administration.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Candidate Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {flow.state.analysis.candidates.map((c: any, idx: number) => (
                      <AuthorityCard
                        key={c.authority_id || idx}
                        candidate={c}
                        index={idx}
                        onSelect={flow.selectCandidate}
                        onConfirmDirect={(cand) => {
                          flow.selectCandidate(cand, idx).then(() => flow.confirmAuthority(cand.authority_id));
                        }}
                      />
                    ))}
                  </div>

                  <div style={{ marginTop: '24px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => flow.goBack('search')}>
                      ← Start a new search
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* ── Step: Why This Authority (Reasoning & Grounding) ── */}
        {activeInfoView === 'none' && flow.state.step === 'why' && flow.state.selectedCandidate && (
          <section className="section-padding">
            <div className="container-narrow">
              <Stepper currentStep="why" />

              <div className="stack-md">
                <div className="hero-eyebrow" style={{ marginBottom: '6px' }}>Step 4 · Reasoning</div>
                <h2>Why This Authority?</h2>
                <p>Review the legal grounding and jurisdiction scope before confirming your selection.</p>
              </div>

              <div className="card card-highlight">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <GovBadge
                    level={flow.state.selectedCandidate.government_level}
                    isConcurrent={flow.state.selectedCandidate.is_concurrent_list}
                  />
                  <ConfidenceBadge
                    level={flow.state.selectedCandidate.confidence?.level || 'MEDIUM'}
                  />
                </div>

                <h3 style={{ fontSize: '1.35rem', marginBottom: '4px' }}>
                  {flow.state.selectedCandidate.name}
                </h3>
                {flow.state.selectedCandidate.short_name && (
                  <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
                    {flow.state.selectedCandidate.short_name}
                  </p>
                )}

                <div className="why-container">
                  <div className="why-header">
                    <span>⚖</span> Verified Jurisdiction Rationale
                  </div>
                  <div className="why-body">
                    {flow.state.explanation || (
                      `${flow.state.selectedCandidate.name} is the verified public authority responsible for this domain under applicable municipal, state, or central laws.`
                    )}
                  </div>

                  <div className="source-stamp">
                    <span>📎 <strong>Official Source:</strong></span>
                    <a
                      href={flow.state.selectedCandidate.source_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {flow.state.selectedCandidate.source_document_url} ↗
                    </a>
                    <span>·</span>
                    <span>Verified {flow.state.selectedCandidate.last_verified_date}</span>
                  </div>
                </div>

                {/* Section 6(3) Context Note (Clean single line per UI_PLAN §4.5) */}
                {flow.state.selectedCandidate.government_level !== 'CENTRAL' && (
                  <div className="alert-banner info" style={{ marginTop: '16px', marginBottom: 0 }}>
                    <span className="alert-icon">💡</span>
                    <div style={{ fontSize: '0.86rem' }}>
                      <strong>Why filing directly matters:</strong> Government rules treat cross-jurisdiction transfers between Central and State as discretionary. Filing directly here ensures immediate processing without risk of return.
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => flow.confirmAuthority(flow.state.selectedCandidate.authority_id)}
                    id="confirm-auth-selection-btn"
                  >
                    Confirm Authority & View Route →
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => flow.goBack('results')}
                  >
                    ← View Other Authorities
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Step: Filing Route Guide (Clean Payoff per UI_PLAN §4.7) ── */}
        {activeInfoView === 'none' && flow.state.step === 'filing' && flow.state.selectedCandidate && (
          <FilingRouteView
            candidate={flow.state.selectedCandidate}
            queryId={flow.state.query_id}
            onReset={flow.reset}
          />
        )}
      </main>

      <Footer
        onOpenHowItWorks={() => setActiveInfoView('how')}
        onOpenAboutRti={() => setActiveInfoView('about')}
        onOpenFaq={() => setActiveInfoView('faq')}
      />
    </div>
  );
}

// ── Filing Route View Sub-component (Clean Payoff per UI_PLAN §4.7) ──
function FilingRouteView({
  candidate,
  queryId,
  onReset
}: {
  candidate: any;
  queryId: string | null;
  onReset: () => void;
}) {
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');

  const submitFeedback = async () => {
    if (feedbackComment.trim()) {
      await api.submitFeedback(queryId, feedbackComment);
      setFeedbackSent(true);
    }
  };

  return (
    <section className="section-padding">
      <div className="container-narrow">
        <Stepper currentStep="filing" />

        <div className="filing-route-wrapper">
          <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="gov-badge gov-badge--STATE">✓ Authority Confirmed</span>
              <GovBadge level={candidate.government_level} isConcurrent={candidate.is_concurrent_list} />
            </div>
            <h2>{candidate.name}</h2>
            <p style={{ margin: 0 }}>Follow these step-by-step instructions to file your RTI application.</p>
          </div>

          {/* Step 1: Open Portal */}
          <div className="filing-step-item">
            <div className="step-badge-num">1</div>
            <div className="step-content">
              <h4>Open the Verified Official Portal</h4>
              <p>
                Applications for {candidate.name} must be submitted on the official portal below:
              </p>
              <a
                href={candidate.portal_url}
                target="_blank"
                rel="noopener noreferrer"
                className="portal-cta-btn"
                id="open-official-portal-btn"
              >
                Open Official Portal ({candidate.portal_url.replace('https://', '')}) ↗
              </a>
              <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                *Nyaya is an informational guide. You will complete your filing directly on the government portal.
              </div>
            </div>
          </div>

          {/* Step 2: Pay Fee */}
          <div className="filing-step-item">
            <div className="step-badge-num">2</div>
            <div className="step-content">
              <h4>Pay the Application Fee</h4>
              <p>
                Standard Fee: <span className="fee-tag">₹{candidate.fee_amount}</span>. Payable online via Net Banking, UPI, or Credit/Debit Card on the portal.
              </p>
              {candidate.bpl_exemption_note && (
                <div style={{ marginTop: '6px', fontSize: '0.86rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  <span>🏷 <strong>Fee Exemption:</strong> {candidate.bpl_exemption_note}</span>{' '}
                  {candidate.bpl_exemption_source_url && (
                    <a
                      href={candidate.bpl_exemption_source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--md-sys-color-primary)', fontWeight: 600 }}
                    >
                      ({candidate.bpl_exemption_source_title || 'RTI Act 2005, §7(5) Proviso'} ↗)
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Address PIO */}
          <div className="filing-step-item">
            <div className="step-badge-num">3</div>
            <div className="step-content">
              <h4>Address Application to the Public Information Officer</h4>
              <p style={{ fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                {candidate.pio_designation || `Public Information Officer, ${candidate.name}`}
              </p>
              {candidate.pio_contact_note && (
                <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '4px' }}>
                  {candidate.pio_contact_note}
                </p>
              )}
            </div>
          </div>

          {/* Step 4: 30-day tracking */}
          <div className="filing-step-item">
            <div className="step-badge-num">4</div>
            <div className="step-content">
              <h4>Track Your 30-Day Response Timeline</h4>
              <p>
                Under Section 7(1) of the RTI Act, the PIO must furnish the information within <strong>30 days</strong>. If you do not receive a reply or are dissatisfied, you can file a First Appeal within 30 days of the deadline.
              </p>
            </div>
          </div>
        </div>

        {/* Single Merged Callout Box per UI_PLAN §4.7 */}
        <div className="callout-box">
          <h4>
            <span>ℹ</span> Before You File
          </h4>
          <ul>
            <li>Details were verified from official gazettes & portal directories on {candidate.last_verified_date}. Always double-check current fees on the official government website prior to payment.</li>
            <li>Government rules treat cross-jurisdiction transfers between Central and State as discretionary. Filing directly on the portal listed above ensures timely processing.</li>
          </ul>
        </div>

        {/* Feedback Card (Visual separation per UI_PLAN §4.7) */}
        <div className="card" style={{ marginTop: '24px', padding: '20px' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Did this guide help you?</h4>
          {feedbackSent ? (
            <p style={{ color: 'var(--conf-high-fg)', fontSize: '0.9rem', fontWeight: 600 }}>
              ✓ Thank you for your feedback! It helps improve civic routing accuracy.
            </p>
          ) : (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="location-input-field"
                placeholder="Optional comments or corrections..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                maxLength={400}
                style={{ minWidth: '240px' }}
              />
              <button className="btn btn-secondary btn-sm" onClick={submitFeedback}>
                Submit Feedback
              </button>
            </div>
          )}
        </div>

        <div style={{ marginTop: '24px' }}>
          <button className="btn btn-ghost" onClick={onReset}>
            ← Start a new query
          </button>
        </div>
      </div>
    </section>
  );
}
