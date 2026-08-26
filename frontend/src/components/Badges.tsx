interface ConfidenceProps {
  level: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  showLabel?: boolean;
}

const confLabels: Record<string, { label: string; icon: string; description: string }> = {
  HIGH: {
    label: 'High Confidence',
    icon: '✓',
    description: 'We found an exact match based on your topic and jurisdiction rules.'
  },
  MEDIUM: {
    label: 'Medium Confidence',
    icon: '•',
    description: 'This authority is likely relevant, but another authority may also apply.'
  },
  LOW: {
    label: 'Needs More Info / Concurrent',
    icon: '!',
    description: 'Multiple jurisdictions may apply or more details are needed.'
  },
  NONE: {
    label: 'No Confident Match',
    icon: '?',
    description: 'No verified authority record found for this specific query.'
  }
};

export function ConfidenceBadge({ level, showLabel = true }: ConfidenceProps) {
  const data = confLabels[level] || confLabels.MEDIUM;
  return (
    <span
      className={`confidence-badge confidence-badge--${level}`}
      role="status"
      aria-label={data.label}
      title={data.description}
    >
      <span aria-hidden="true">{data.icon}</span>
      <span>{showLabel ? data.label : level}</span>
      <span className="sr-only"> — {data.description}</span>
    </span>
  );
}

interface GovBadgeProps {
  level: string;
  isConcurrent?: boolean;
}

const govLabels: Record<string, string> = {
  CENTRAL: 'Central Government',
  STATE: 'State Government',
  LOCAL: 'Local / Municipal Body',
  UNION_TERRITORY: 'Union Territory',
};

export function GovBadge({ level, isConcurrent }: GovBadgeProps) {
  if (isConcurrent) {
    return (
      <span className="gov-badge gov-badge--CONCURRENT">
        ⚖ Concurrent List (Central & State)
      </span>
    );
  }

  const label = govLabels[level] || level;
  return (
    <span className={`gov-badge gov-badge--${level}`}>
      🏛 {label}
    </span>
  );
}

export function StatusChip({ label, variant = 'neutral' }: { label: string; variant?: 'neutral' | 'verified' | 'accent' }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      fontSize: '0.75rem',
      fontWeight: 600,
      backgroundColor: variant === 'verified' ? 'var(--conf-high-bg)' : 'var(--md-sys-color-surface-container-high)',
      color: variant === 'verified' ? 'var(--conf-high-fg)' : 'var(--md-sys-color-on-surface-variant)',
      border: `1px solid ${variant === 'verified' ? 'var(--conf-high-border)' : 'var(--md-sys-color-outline-variant)'}`
    }}>
      {variant === 'verified' && '✓ '}
      {label}
    </span>
  );
}
