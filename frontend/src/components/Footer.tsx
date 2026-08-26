interface FooterProps {
  onOpenHowItWorks: () => void;
  onOpenAboutRti: () => void;
  onOpenFaq: () => void;
}

export function Footer({ onOpenHowItWorks, onOpenAboutRti, onOpenFaq }: FooterProps) {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container">
        <div className="footer-top-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div className="brand-emblem" style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}>
                न्या
              </div>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Nyaya</strong>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface-variant)', maxWidth: '420px', lineHeight: 1.6 }}>
              A civic technology initiative designed to prevent RTI misfiling in India by accurately discovering jurisdiction before citizens apply.
            </p>
            <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
              Built for <strong>Build What Moves India 2026</strong>.
            </div>
          </div>

          <div>
            <h4 className="footer-heading">Civic Guidance</h4>
            <ul className="footer-links">
              <li>
                <button onClick={onOpenHowItWorks}>How Jurisdiction Matching Works</button>
              </li>
              <li>
                <button onClick={onOpenAboutRti}>About the RTI Act, 2005</button>
              </li>
              <li>
                <button onClick={onOpenFaq}>Frequently Asked Questions</button>
              </li>
              <li>
                <a href="https://rtionline.gov.in" target="_blank" rel="noopener noreferrer">
                  Central RTI Portal ↗
                </a>
              </li>
              <li>
                <a href="https://rtionline.maharashtra.gov.in" target="_blank" rel="noopener noreferrer">
                  Maharashtra RTI Portal ↗
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">Public Trust & Sources</h4>
            <ul className="footer-links">
              <li>
                <span style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  ✓ 100% Sourced from Official Portals
                </span>
              </li>
              <li>
                <span style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  ✓ Constitution Seventh Schedule Grounding
                </span>
              </li>
              <li>
                <span style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  ✓ No Hallucinated Authorities
                </span>
              </li>
              <li>
                <span style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  ✓ Free & Privacy Preserving
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            © 2026 Nyaya RTI Jurisdiction Assistant. All public authority data verified from official government sources.
          </div>
          <div>
            <strong>Legal Notice:</strong> This platform provides informational guidance, not formal legal advice.
          </div>
        </div>
      </div>
    </footer>
  );
}
