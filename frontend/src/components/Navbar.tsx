import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';

const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
  ];

  return (
    <header className="header" style={{ background: 'var(--bg-header)', color: 'var(--n-0)', position: 'sticky', top: 0, zIndex: 20 }}>
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', minHeight: '56px' }}>
        <Link className="brand" to="/map" aria-label="SC Loan Sahayak home" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', textDecoration: 'none', color: 'inherit', minWidth: 0, flex: 1 }}>
          <span className="brand-mark" aria-hidden="true" style={{ width: '36px', height: '36px', borderRadius: 'var(--r-md)', background: 'var(--n-0)', color: 'var(--primary-600)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
              <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/>
            </svg>
          </span>
          <span className="brand-text" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span className="brand-name" style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              SC Loan Sahayak
            </span>
            <span className="brand-sub" style={{ fontSize: '12px', lineHeight: 1.2, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Government-backed loan assistance
            </span>
          </span>
        </Link>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flex: 'none' }}>
          <div className="lang" style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '44px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ position: 'absolute', left: '10px', width: '20px', height: '20px', pointerEvents: 'none' }}>
              <circle cx="12" cy="12" r="9"/>
              <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>
            </svg>
            <label htmlFor="lang" className="visually-hidden">Language</label>
            <select
              id="lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                height: '44px',
                borderRadius: 'var(--r-md)',
                border: '1px solid rgba(255,255,255,.4)',
                background: 'var(--primary-700)',
                color: 'var(--n-0)',
                padding: '0 32px 0 36px',
                fontWeight: 500,
                cursor: 'pointer',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'none\' stroke=\'white\' stroke-width=\'2\'%3E%3Cpath d=\'M4 6l4 4 4-4\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center'
              }}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
            <span style={{ fontSize: '14px', opacity: 0.9 }}>
              {user?.phone_number}
            </span>
            <button
              onClick={handleLogout}
              className="help-btn"
              style={{
                height: '44px',
                minWidth: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 var(--s3)',
                borderRadius: 'var(--r-md)',
                border: '1px solid rgba(255,255,255,.4)',
                background: 'transparent',
                color: 'var(--n-0)',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
