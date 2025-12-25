import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Instagram, Mail, Heart } from 'lucide-react';
import BrandLogo from './BrandLogo';

const Footer = () => {
    const { t } = useTranslation();

    return (
        <footer style={{
            marginTop: 'auto',
            padding: '4rem 2rem 2rem',
            background: 'linear-gradient(to top, rgba(15, 23, 42, 0.8), transparent)',
            borderTop: '1px solid var(--glass-border)',
            position: 'relative',
            zIndex: 10
        }}>
            <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '3rem',
                    marginBottom: '3rem'
                }}>
                    {/* Brand Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BrandLogo size={32} />
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '-0.5px' }}>
                                Orato <span style={{ color: 'var(--primary)' }}>AI</span>
                            </span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                            {t('footer.description', 'Ваш персональный ИИ-тренер по ораторскому искусству. Развивайте уверенность и чистоту речи с передовыми технологиями.')}
                        </p>
                    </div>

                    {/* Links Column */}
                    <div>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: '600' }}>{t('footer.links', 'Навигация')}</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <li><Link to="/" className="footer-link">{t('nav.home', 'Главная')}</Link></li>
                            <li><Link to="/practice" className="footer-link">{t('nav.practice', 'Тренировка')}</Link></li>
                            <li><Link to="/history" className="footer-link">{t('nav.history', 'История')}</Link></li>
                            <li><Link to="/profile" className="footer-link">{t('nav.profile', 'Профиль')}</Link></li>
                        </ul>
                    </div>

                    {/* Contact/Social Column */}
                    <div>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: '600' }}>{t('footer.contact', 'Контакты')}</h4>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <a href="https://instagram.com/oratoai_dev" target="_blank" rel="noopener noreferrer" className="social-icon"><Instagram size={20} /></a>
                            <a href="mailto:oratoai@bk.ru" className="social-icon"><Mail size={20} /></a>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            oratoai@bk.ru
                        </p>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingTop: '2rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem'
                }}>
                    <div>
                        © 2026 Orato AI. {t('footer.rights', 'Все права защищены.')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>Made with</span>
                        <Heart size={14} color="#f43f5e" fill="#f43f5e" />
                        <span>for AITUCAP 2026</span>
                    </div>
                </div>
            </div>

            <style>{`
        .footer-link {
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-link:hover {
          color: var(--primary);
        }
        .social-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.3s;
          border: 1px solid transparent;
        }
        .social-icon:hover {
          background: rgba(var(--primary-rgb), 0.1);
          color: var(--primary);
          border-color: rgba(var(--primary-rgb), 0.3);
          transform: translateY(-2px);
        }
      `}</style>
        </footer>
    );
};

export default Footer;
