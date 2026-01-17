import { useState, useContext, ChangeEvent, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerInit, loginInit, verifyCode, RegisterRequest, getGoogleAuthUrl } from '../api';
import { AuthContext } from '../AuthContext';
import { Loader2, ShieldCheck, Send, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';

interface ErrorResponse {
  error: string;
}

const Auth = () => {
  const auth = useContext(AuthContext);
  const setAuth = auth?.setAuth || (() => { });
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<'INIT' | 'VERIFY'>('INIT');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<RegisterRequest>({
    username: '',
    email: '',
    password: '',
    telegramId: ''
  });

  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    telegramId: ''
  });

  const [otp, setOtp] = useState('');

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score += 1;
    if (pass.length > 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = getPasswordStrength(formData.password);
  const strengthColor = ['#cbd5e1', '#ef4444', '#f97316', '#eab308', '#84cc16', '#10b981'];

  const strengthLabel = [
    t('auth.strength.label', 'Введите пароль'),
    t('auth.strength.weak', 'Слабый'),
    t('auth.strength.medium', 'Средний'),
    t('auth.strength.normal', 'Нормальный'),
    t('auth.strength.good', 'Хороший'),
    t('auth.strength.excellent', 'Отличный')
  ];

  const validateField = (name: string, value: string) => {
    let errorMsg = '';

    switch (name) {
      case 'username':
        if (!isLogin) {
          if (/[а-яА-ЯёЁ]/.test(value)) errorMsg = t('auth.errors.username_cyrillic', 'Никнейм не должен содержать русские буквы');
          else if (value.length > 0 && value.length < 3) errorMsg = t('auth.errors.username_length', 'Минимум 3 символа');
          else if (!/^[a-zA-Z0-9_]*$/.test(value)) errorMsg = t('auth.errors.username_format', 'Только латиница, цифры и "_"');
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) errorMsg = t('auth.errors.email_format', 'Некорректный формат Email');
        break;

      case 'password':
        if (/[а-яА-ЯёЁ]/.test(value)) {
          errorMsg = t('auth.errors.password_cyrillic', 'Русские буквы в пароле запрещены');
        } else if (!isLogin) {
          if (value.length > 0 && value.length < 8) errorMsg = t('auth.errors.password_length', 'Минимум 8 символов');
          else if (getPasswordStrength(value) < 2) errorMsg = t('auth.errors.password_simple', 'Пароль слишком простой');
        } else {
          if (value.length === 0) errorMsg = '';
        }
        break;

      case 'telegramId':
        if (!isLogin && value.length > 0 && !/^\d+$/.test(value)) {
          errorMsg = t('auth.errors.telegram_digits', 'ID должен состоять только из цифр');
        }
        break;
    }

    setErrors(prev => ({ ...prev, [name]: errorMsg }));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'telegramId' && !/^\d*$/.test(value)) return;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const isFormValid = () => {
    if (Object.values(errors).some(msg => msg !== '')) return false;
    if (!formData.email || !formData.password) return false;
    if (!isLogin) {
      if (!formData.username || !formData.telegramId) return false;
      if (strength < 2) return false;
    }
    return true;
  };

  const handleInitSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    setLoading(true);

    try {
      if (isLogin) {
        const res = await loginInit({ email: formData.email, password: formData.password });
        if (res.data.token) {
          setAuth(res.data.token);
          toast.success(t('auth.messages.welcome', 'С возвращением! 👋'));
          navigate('/practice');
          return;
        }
      } else {
        await registerInit(formData);
      }
      toast.success(t('auth.messages.code_sent', 'Код отправлен в Telegram ✈️'));
      setStep('VERIFY');
    } catch (err) {
      const axiosError = err as AxiosError<ErrorResponse>;
      const msg = axiosError.response?.data?.error || t('auth.messages.error_server', 'Ошибка сервера');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await verifyCode({ email: formData.email, code: otp });
      if (isLogin) {
        if (res.data.token) {
          setAuth(res.data.token);
          toast.success(t('auth.messages.login_success', 'Вход выполнен успешно! 🚀'));
          navigate('/practice');
        }
      } else {
        toast.success(t('auth.messages.register_success', 'Регистрация завершена! Войдите.'));
        setIsLogin(true);
        setStep('INIT');
        setOtp('');
        setFormData(prev => ({ ...prev, password: '' }));
      }
    } catch (err) {
      const axiosError = err as AxiosError<ErrorResponse>;
      const msg = axiosError.response?.data?.error || t('auth.messages.error_code', 'Неверный код');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const res = await getGoogleAuthUrl();
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      toast.error(t('auth.messages.oauth_error', 'OAuth not available'));
      setLoading(false);
    }
  };

  useEffect(() => {
    setErrors({ username: '', email: '', password: '', telegramId: '' });
  }, [isLogin]);

  const inputStyle = (hasError: boolean) => ({
    width: '100%',
    padding: '12px',
    paddingRight: '12px',
    border: `1px solid ${hasError ? '#ef4444' : 'var(--border-color, #e2e8f0)'}`,
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    display: 'block'
  });

  return (
    <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '85vh' }}>
      <div className="card" style={{ width: '400px', padding: '2.5rem' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <ShieldCheck size={50} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ margin: 0, fontSize: '1.8rem' }}>{isLogin ? t('auth.login', 'Вход') : t('auth.register', 'Регистрация')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>
            {step === 'VERIFY' ? t('auth.security_check', 'Проверка безопасности') : t('auth.fill_data', 'Заполните данные')}
          </p>
        </div>

        {step === 'INIT' ? (
          <form onSubmit={handleInitSubmit}>
            {!isLogin && (
              <>
                <div style={{ marginBottom: '1.2rem' }}>
                  <input
                    name="username"
                    placeholder={t('auth.placeholders.username', 'Никнейм')}
                    value={formData.username}
                    onChange={handleChange}
                    style={inputStyle(!!errors.username)}
                  />
                  {errors.username && <small style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}><AlertCircle size={12} /> {errors.username}</small>}
                </div>

                <div style={{ marginBottom: '1.2rem' }}>
                  <input
                    name="telegramId"
                    placeholder={t('auth.placeholders.telegram', 'Telegram Chat ID')}
                    value={formData.telegramId}
                    onChange={handleChange}
                    style={inputStyle(!!errors.telegramId)}
                  />
                  {errors.telegramId ? (
                    <small style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}><AlertCircle size={12} /> {errors.telegramId}</small>
                  ) : (
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '5px' }}>
                      {t('auth.messages.bot_info', 'Бот: ')} <b>@oratoai_bot</b> (/start)
                    </small>
                  )}
                </div>
              </>
            )}

            <div style={{ marginBottom: '1.2rem' }}>
              <input
                name="email"
                type="email"
                placeholder={t('auth.placeholders.email', 'Email адрес')}
                value={formData.email}
                onChange={handleChange}
                style={inputStyle(!!errors.email)}
              />
              {errors.email && <small style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}><AlertCircle size={12} /> {errors.email}</small>}
            </div>

            {/* Блок пароля */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ position: 'relative' }}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('auth.placeholders.password', 'Пароль')}
                  value={formData.password}
                  onChange={handleChange}
                  style={{ ...inputStyle(!!errors.password), paddingRight: '45px', marginBottom: 0 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {errors.password && (
                <small style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                  <AlertCircle size={12} /> {errors.password}
                </small>
              )}

              {!isLogin && formData.password && !errors.password && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: strengthColor[strength] }}>{strengthLabel[strength]}</span>
                  </div>
                  <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(strength / 5) * 100}%`, background: strengthColor[strength], transition: 'all 0.3s' }}></div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                opacity: isFormValid() ? 1 : 0.6,
                cursor: isFormValid() ? 'pointer' : 'not-allowed',
                marginTop: '1rem'
              }}
              disabled={loading || !isFormValid()}
            >
              {loading ? <Loader2 className="spin" /> : (isLogin ? t('auth.buttons.login', 'Войти') : t('auth.buttons.create', 'Создать аккаунт'))}
            </button>

            {/* OAuth Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0 1rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color, #e2e8f0)' }}></div>
              <span style={{ padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {t('auth.or', 'или')}
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color, #e2e8f0)' }}></div>
            </div>

            {/* OAuth Buttons */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '8px',
                background: 'white',
                color: '#333',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: '0.95rem',
                fontWeight: 500,
                transition: 'all 0.2s',
                marginBottom: '0.75rem'
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#f8fafc')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'white')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t('auth.buttons.google', 'Войти через Google')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifySubmit} className="fade-in">
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <Send color="var(--primary)" size={32} />
              </div>
            </div>

            <input
              name="otp"
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder={t('auth.placeholders.code', '000000')}
              style={{ textAlign: 'center', fontSize: '2rem', letterSpacing: '8px', marginBottom: '1.5rem', ...inputStyle(false) }}
              maxLength={6}
            />

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading || otp.length < 6}>
              {loading ? <Loader2 className="spin" /> : t('auth.buttons.verify', 'Подтвердить код')}
            </button>
            <p onClick={() => setStep('INIT')} style={{ textAlign: 'center', marginTop: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }}>← {t('auth.buttons.back', 'Назад')}</p>
          </form>
        )}

        {step === 'INIT' && (
          <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isLogin ? t('auth.no_account', 'Нет аккаунта? ') : t('auth.have_account', 'Уже есть аккаунт? ')}
            <span
              style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => { setIsLogin(!isLogin); setErrors({ username: '', email: '', password: '', telegramId: '' }); setFormData({ username: '', email: '', password: '', telegramId: '' }); }}
            >
              {isLogin ? t('auth.register', 'Регистрация') : t('auth.login', 'Вход')}
            </span>
          </p>
        )}
      </div>
    </div>
  );
};

export default Auth;