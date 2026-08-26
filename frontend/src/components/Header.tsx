interface HeaderProps {
  onGoHome: () => void;
  onOpenHowItWorks: () => void;
  onOpenAboutRti: () => void;
  onOpenFaq: () => void;
  currentView?: string;
}

export function Header({ onGoHome, onOpenHowItWorks, onOpenAboutRti, onOpenFaq, currentView }: HeaderProps) {
  return (
    <header className="site-header" role="banner">
      <div className="container header-inner">
        <button
          className="brand-link"
          onClick={onGoHome}
          aria-label="Nyaya RTI Jurisdiction Assistant Home"
        >
          <div className="brand-emblem" aria-hidden="true">
            न्या
          </div>
          <div className="brand-info">
            <span className="brand-name">Nyaya</span>
            <span className="brand-tagline">RTI Jurisdiction & Authority Discovery</span>
          </div>
        </button>

        <nav className="nav-group" aria-label="Main Navigation">
          <button
            className={`nav-link ${currentView === 'home' ? 'active' : ''}`}
            onClick={onGoHome}
          >
            Find Authority
          </button>
          <button
            className={`nav-link ${currentView === 'how' ? 'active' : ''}`}
            onClick={onOpenHowItWorks}
          >
            How It Works
          </button>
          <button
            className={`nav-link ${currentView === 'about' ? 'active' : ''}`}
            onClick={onOpenAboutRti}
          >
            About RTI
          </button>
          <button
            className={`nav-link ${currentView === 'faq' ? 'active' : ''}`}
            onClick={onOpenFaq}
          >
            FAQ
          </button>

          <span className="lang-badge" title="English / Hindi hybrid guidance available">
            🌐 English (EN)
          </span>
        </nav>
      </div>
    </header>
  );
}
