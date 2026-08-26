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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
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

          <h3 id={`auth-title-${candidate.authority_id}`} style={{ fontSize: '1.25rem', marginBottom: '4px' }}>
            {candidate.name}
          </h3>
          {candidate.short_name && (
            <p style={{ fontSize: '0.88rem', color: 'var(--md-sys-color-on-surface-variant)', margin: 0 }}>
              {candidate.short_name}
            </p>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          <span className="fee-tag">
            ₹{candidate.fee_amount} application fee
          </span>
        </div>
      </div>

      {/* Core metadata facts */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px', padding: '10px 14px', backgroundColor: 'var(--md-sys-color-surface-container-low)', borderRadius: 'var(--radius-md)' }}>
        <span style={{ fontSize: '0.88rem', color: 'var(--md-sys-color-on-surface)' }}>
          <strong>Location Scope:</strong> {candidate.state_id ? `${candidate.state_id} (State)` : 'National (All India)'}
        </span>
        <span style={{ fontSize: '0.88rem', color: 'var(--md-sys-color-on-surface)' }}>
          <strong>Filing Route:</strong> {candidate.filing_method === 'BOTH' ? 'Online + Offline (Postal)' : candidate.filing_method}
        </span>
        <span style={{ fontSize: '0.88rem', color: 'var(--md-sys-color-on-surface)' }}>
          <strong>Verification:</strong> {candidate.last_verified_date}
        </span>
      </div>

      {/* Match reasons */}
      {candidate.match_reasons?.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>
            Why it matches your query:
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {candidate.match_reasons.map((r: string, i: number) => (
              <StatusChip key={i} label={r} />
            ))}
          </div>
        </div>
      )}

      {/* Caveat alert if any */}
      {candidate.confidence?.caveats?.length > 0 && (
        <div style={{
          backgroundColor: '#feefe3',
          border: '1px solid #fcdfc8',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          marginBottom: '16px',
          fontSize: '0.85rem',
          color: '#7a3500'
        }}>
          <strong>Note:</strong> {candidate.confidence.caveats[0]}
        </div>
      )}

      {/* Expandable Details */}
      {expanded && (
        <div style={{
          backgroundColor: 'var(--md-sys-color-surface-container-low)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
          marginBottom: '16px',
          fontSize: '0.9rem'
        }}>
          {candidate.pio_designation && (
            <div style={{ marginBottom: '8px' }}>
              <strong>Designated Officer:</strong> {candidate.pio_designation}
            </div>
          )}
          {candidate.pio_contact_note && (
            <div style={{ marginBottom: '8px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              {candidate.pio_contact_note}
            </div>
          )}
          <div style={{ marginBottom: '8px' }}>
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

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '8px' }}>
        <button
          className="btn btn-primary"
          onClick={() => onSelect(candidate, index)}
          id={`why-auth-btn-${index}`}
        >
          Why this authority? →
        </button>

        {onConfirmDirect && (
          <button
            className="btn btn-tertiary"
            onClick={() => onConfirmDirect(candidate)}
          >
            Confirm & View Filing Route
          </button>
        )}

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? 'Fewer details' : 'More authority details'}
        </button>
      </div>
    </article>
  );
}
