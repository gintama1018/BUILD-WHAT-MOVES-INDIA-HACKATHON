import { useState } from 'react';
import { ConfidenceBadge, GovBadge, StatusChip } from './Badges';

interface Props {
  candidate: any;
  index: number;
  onSelect: (candidate: any, index: number) => void;
  onConfirmDirect?: (candidate: any) => void;
  highlighted?: boolean;
}

export function AuthorityCard({ candidate, index, onSelect, onConfirmDirect, highlighted }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isRecommended = index === 0;

  return (
    <article
      className={`card ${highlighted || isRecommended ? 'card-highlight' : ''}`}
      aria-labelledby={`auth-title-${candidate.authority_id}`}
    >
      {/* Header section with badges */}
      <div className="authority-card__header">
        <div>
          <div className="authority-card__badges">
            {isRecommended && (
              <span style={{
                backgroundColor: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-display)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.02em'
              }}>
                Recommended Authority
              </span>
            )}
            <GovBadge level={candidate.government_level} isConcurrent={candidate.is_concurrent_list} />
            <ConfidenceBadge level={candidate.confidence?.level || 'MEDIUM'} />
          </div>

          <h3 id={`auth-title-${candidate.authority_id}`} className="authority-card__title">
            {candidate.name}
          </h3>
          {candidate.short_name && (
            <p className="authority-card__subtitle">
              {candidate.short_name}
            </p>
          )}
        </div>

        <div>
          <span className="fee-tag">
            ₹{candidate.fee_amount} application fee
          </span>
        </div>
      </div>

      {/* Core metadata facts strip */}
      <div className="authority-card__meta">
        <span>
          <strong>Scope:</strong> {candidate.state_id ? `${candidate.state_id} (State)` : 'National (All India)'}
        </span>
        <span>
          <strong>Filing Route:</strong> {candidate.filing_method === 'BOTH' ? 'Online + Offline (Postal)' : candidate.filing_method}
        </span>
        <span>
          <strong>Verified:</strong> {candidate.last_verified_date}
        </span>
      </div>

      {/* Match reasons */}
      {candidate.match_reasons?.length > 0 && (
        <div className="authority-card__reasons">
          <p className="authority-card__reasons-label">
            Why it matches your query:
          </p>
          <div className="authority-card__reasons-list">
            {candidate.match_reasons.map((r: string, i: number) => (
              <StatusChip key={i} label={r} />
            ))}
          </div>
        </div>
      )}

      {/* Caveat alert if any */}
      {candidate.confidence?.caveats?.length > 0 && (
        <div className="authority-card__caveat">
          <strong>Note:</strong> {candidate.confidence.caveats[0]}
        </div>
      )}

      {/* Expandable Details */}
      {expanded && (
        <div className="authority-card__details">
          {candidate.pio_designation && (
            <div className="stack-sm">
              <strong>Designated Officer:</strong> {candidate.pio_designation}
            </div>
          )}
          {candidate.pio_contact_note && (
            <div className="stack-sm" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
              {candidate.pio_contact_note}
            </div>
          )}
          <div className="stack-sm">
            <strong>Official Filing Portal:</strong>{' '}
            <a href={candidate.portal_url} target="_blank" rel="noopener noreferrer">
              {candidate.portal_url} ↗
            </a>
          </div>
          <div>
            <strong>Source Provenance:</strong>{' '}
            <a href={candidate.source_document_url} target="_blank" rel="noopener noreferrer">
              {candidate.source_document_title || candidate.source_document_url} ↗
            </a>
          </div>
        </div>
      )}

      {/* Action Buttons: 2 buttons on first view (UI_PLAN §5.1) */}
      <div className="authority-card__actions">
        <button
          className="btn btn-primary"
          onClick={() => onSelect(candidate, index)}
          id={`why-auth-btn-${index}`}
        >
          Why this authority? →
        </button>

        {isRecommended && onConfirmDirect && (
          <button
            className="btn btn-tertiary"
            onClick={() => onConfirmDirect(candidate)}
          >
            Confirm & View Filing Route
          </button>
        )}

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? 'Fewer details' : 'More authority details ▾'}
        </button>
      </div>
    </article>
  );
}
