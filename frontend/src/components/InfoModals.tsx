export function HowItWorksView({ onBack }: { onBack: () => void }) {
  return (
    <section className="section-padding">
      <div className="container-narrow">
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: '24px' }}>
          ← Back to Assistant
        </button>

        <div className="section-header" style={{ textAlign: 'left', marginBottom: '32px' }}>
          <div className="section-eyebrow">Architecture & Safety</div>
          <h2>How Nyaya Discovers Jurisdiction</h2>
          <p>
            Unlike generic AI chat tools that make up convincing but non-existent department names, Nyaya uses a safety-first, 4-step verification architecture.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div className="step-badge-num">1</div>
              <div>
                <h4>Query Intent & Entity Extraction</h4>
                <p>
                  When you type your issue, our language model only extracts structured metadata: subject matter (e.g. roads, water, electricity), geographic location (e.g. Pune, Maharashtra), and administrative level clues. User input is treated strictly as data.
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div className="step-badge-num">2</div>
              <div>
                <h4>Knowledge Base Retrieval</h4>
                <p>
                  The system queries a curated database of verified Indian public authorities. Every authority record includes official portal links, application fees, designated officer ranks, and source citations.
                </p>
              </div>
            </div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--md-sys-color-primary)' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div className="step-badge-num">3</div>
              <div>
                <h4>Deterministic Rule Engine (The Safety Veto)</h4>
                <p>
                  Before any recommendation reaches your screen, it must pass 5 hard-coded code rules:
                </p>
                <ul style={{ paddingLeft: '20px', marginTop: '8px', fontSize: '0.92rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  <li><strong>Geographic Containment:</strong> Authority jurisdiction must contain your location.</li>
                  <li><strong>Subject Domain Matching:</strong> Authority must hold legal responsibility for the subject.</li>
                  <li><strong>Data Consistency:</strong> Central authorities cannot have state restrictions, and State authorities must have state codes.</li>
                  <li><strong>Concurrent List Conflict Detection:</strong> If both Central and State apply (e.g., Education), the system admits ambiguity instead of guessing.</li>
                  <li><strong>Section 6(3) Transfer Check:</strong> Warns when cross-jurisdiction transfer is unlikely.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div className="step-badge-num">4</div>
              <div>
                <h4>Grounded Explanation & Official Filing Route</h4>
                <p>
                  Nyaya presents the verified authority along with a plain-language explanation citing official acts (e.g. Municipal Acts, Constitution Schedules), the exact application fee, and a direct link to the official government portal.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <button className="btn btn-primary btn-lg" onClick={onBack}>
            Try Query Now →
          </button>
        </div>
      </div>
    </section>
  );
}

export function AboutRtiView({ onBack }: { onBack: () => void }) {
  return (
    <section className="section-padding">
      <div className="container-narrow">
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: '24px' }}>
          ← Back to Assistant
        </button>

        <div className="section-header" style={{ textAlign: 'left', marginBottom: '32px' }}>
          <div className="section-eyebrow">Civic Rights</div>
          <h2>About the Right to Information Act, 2005</h2>
          <p>
            The Right to Information (RTI) Act is a landmark Indian law that empowers citizens to request information from public authorities to promote transparency and accountability in governance.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <h3>Who is covered under RTI?</h3>
            <p style={{ marginTop: '8px' }}>
              All Central, State, and Local Government bodies, ministries, departments, municipal corporations, panchayats, and government-owned corporations (like MSEDCL or Indian Railways) are covered as "public authorities" under Section 2(h) of the Act.
            </p>
          </div>

          <div className="card">
            <h3>Key Timelines Every Citizen Should Know</h3>
            <ul style={{ paddingLeft: '20px', marginTop: '12px', fontSize: '0.95rem', color: 'var(--md-sys-color-on-surface-variant)', lineHeight: 1.8 }}>
              <li><strong>Standard Response:</strong> Within 30 days of receipt of application.</li>
              <li><strong>Life and Liberty Matters:</strong> Within 48 hours.</li>
              <li><strong>First Appeal:</strong> If no reply is received within 30 days, or if you are dissatisfied, you can file a First Appeal with the First Appellate Authority (FAA) within 30 days.</li>
              <li><strong>Second Appeal:</strong> Can be filed with the Central or State Information Commission within 90 days of the First Appeal decision.</li>
            </ul>
          </div>

          <div className="card">
            <h3>Application Fees & Exemptions</h3>
            <p style={{ marginTop: '8px', lineHeight: 1.6 }}>
              The standard application fee is ₹10 for Central Government authorities (via rtionline.gov.in) and ₹10 for State/UT portals (such as Maharashtra and Delhi).
            </p>
            <div className="callout-box" style={{ marginTop: '12px' }}>
              <h4><span>⚖</span> Statutory BPL Exemption</h4>
              <p style={{ margin: 0, fontSize: '0.88rem' }}>
                Under the <strong>Section 7(5) proviso of the Right to Information Act, 2005</strong>, citizens living Below the Poverty Line (BPL) are completely exempt from all application and document copying fees upon submitting proof of BPL status (such as a BPL card or certificate).
              </p>
              <div style={{ marginTop: '8px', fontSize: '0.82rem' }}>
                <a href="https://www.indiacode.nic.in/handle/123456789/2065" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--md-sys-color-primary)', fontWeight: 600 }}>
                  View RTI Act 2005, §7(5) on India Code (Official Portal) ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <button className="btn btn-primary btn-lg" onClick={onBack}>
            Find Your RTI Authority →
          </button>
        </div>
      </div>
    </section>
  );
}
