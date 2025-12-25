import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { Mic, LogOut, User, History, Activity } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../AuthContext';
import BrandLogo from './BrandLogo';

export default function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const ctx = useContext(AuthContext);
  const isAuthPage = location.pathname.startsWith('/auth');
  const isLoggedIn = !!ctx?.token;

  const handleLogout = () => {
    ctx?.setAuth(null);
    navigate('/auth');
  };

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1.2rem 2rem',
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <BrandLogo size={36} />
        <span style={{
          fontSize: '1.4rem',
          fontWeight: '700',
          background: 'linear-gradient(to right, #fff, #cbd5e1)',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          letterSpacing: '-0.5px'
        }}>
          Orato AI
        </span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        {!isAuthPage && isLoggedIn && (
          <div className="nav-links" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <Link to="/practice" className="nav-link">
              <Mic size={18} /> <span>{t('nav.practice', 'Тренировка')}</span>
            </Link>
            <Link to="/live" className="nav-link">
              <Activity size={18} /> <span>{t('nav.live', 'Live')}</span>
            </Link>
            <Link to="/history" className="nav-link">
              <History size={18} /> <span>{t('nav.history', 'История')}</span>
            </Link>
            <Link to="/profile" className="nav-link">
              <User size={18} /> <span>{t('nav.profile', 'Профиль')}</span>
            </Link>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <LanguageSwitcher />

          {!isAuthPage && isLoggedIn && (
            <button onClick={handleLogout} className="btn-icon" title={t('auth.logout', 'Выйти')}>
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>

      <style>{`
        .nav-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s;
        }
        .nav-link:hover, .nav-link.active {
          color: var(--primary);
        }
        .btn-icon {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          color: var(--text-muted);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0;
          line-height: 1;
        }
        .btn-icon:hover {
          background: rgba(244, 63, 94, 0.1);
          color: #f43f5e;
          border-color: rgba(244, 63, 94, 0.3);
        }
      `}</style>
    </nav>
  );
}
