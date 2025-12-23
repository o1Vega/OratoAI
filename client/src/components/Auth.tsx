import { useState, useContext, ChangeEvent, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerInit, loginInit, verifyCode, RegisterRequest } from '../api';
import { AuthContext } from '../AuthContext';
import { Loader2, ShieldCheck, Send, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

interface ErrorResponse {
  error: string;
}

const Auth = () => {
  const auth = useContext(AuthContext);
  const setAuth = auth?.setAuth || (() => {});
  const navigate = useNavigate();
  
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
  const strengthLabel = ['Введите пароль', 'Слабый', 'Средний', 'Нормальный', 'Хороший', 'Отличный'];

  const validateField = (name: string, value: string) => {
    let errorMsg = '';

    switch (name) {
      case 'username':
        if (!isLogin) { 
            if (/[а-яА-ЯёЁ]/.test(value)) errorMsg = 'Никнейм не должен содержать русские буквы';
            else if (value.length > 0 && value.length < 3) errorMsg = 'Минимум 3 символа';
            else if (!/^[a-zA-Z0-9_]*$/.test(value)) errorMsg = 'Только латиница, цифры и "_"';
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) errorMsg = 'Некорректный формат Email';
        break;

      case 'password':
        if (/[а-яА-ЯёЁ]/.test(value)) {
            errorMsg = 'Русские буквы в пароле запрещены';
        } else if (!isLogin) { 
            if (value.length > 0 && value.length < 8) errorMsg = 'Минимум 8 символов';
            else if (getPasswordStrength(value) < 2) errorMsg = 'Пароль слишком простой';
        } else {
            if (value.length === 0) errorMsg = ''; 
        }
        break;

      case 'telegramId':
        if (!isLogin && value.length > 0 && !/^\d+$/.test(value)) {
            errorMsg = 'ID должен состоять только из цифр';
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
            toast.success('С возвращением! 👋');
            navigate('/practice');
            return;
        }
      } else {
        await registerInit(formData);
      }
      toast.success('Код отправлен в Telegram ✈️');
      setStep('VERIFY');
    } catch (err) {
      const axiosError = err as AxiosError<ErrorResponse>;
      const msg = axiosError.response?.data?.error || 'Ошибка сервера';
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
          toast.success('Вход выполнен успешно! 🚀');
          navigate('/practice');
        }
      } else {
        toast.success('Регистрация завершена! Войдите.');
        setIsLogin(true);
        setStep('INIT');
        setOtp('');
        setFormData(prev => ({ ...prev, password: '' }));
      }
    } catch (err) {
      const axiosError = err as AxiosError<ErrorResponse>;
      const msg = axiosError.response?.data?.error || 'Неверный код';
      toast.error(msg);
    } finally {
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
          <h2 style={{ margin: 0, fontSize: '1.8rem' }}>{isLogin ? 'Вход' : 'Регистрация'}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>
            {step === 'VERIFY' ? 'Проверка безопасности' : 'Заполните данные'}
          </p>
        </div>

        {step === 'INIT' ? (
          <form onSubmit={handleInitSubmit}>
            {!isLogin && (
              <>
                <div style={{ marginBottom: '1.2rem' }}>
                  <input 
                    name="username" 
                    placeholder="Никнейм" 
                    value={formData.username}
                    onChange={handleChange} 
                    style={inputStyle(!!errors.username)}
                  />
                  {errors.username && <small style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}><AlertCircle size={12}/> {errors.username}</small>}
                </div>

                <div style={{ marginBottom: '1.2rem' }}>
                  <input 
                    name="telegramId" 
                    placeholder="Telegram Chat ID" 
                    value={formData.telegramId}
                    onChange={handleChange} 
                    style={inputStyle(!!errors.telegramId)}
                  />
                  {errors.telegramId ? (
                     <small style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}><AlertCircle size={12}/> {errors.telegramId}</small>
                  ) : (
                     <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '5px' }}>
                       Бот: <b>@oratoai_bot</b> (/start)
                     </small>
                  )}
                </div>
              </>
            )}
            
            <div style={{ marginBottom: '1.2rem' }}>
              <input 
                name="email" 
                type="email" 
                placeholder="Email адрес" 
                value={formData.email}
                onChange={handleChange} 
                style={inputStyle(!!errors.email)}
              />
              {errors.email && <small style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}><AlertCircle size={12}/> {errors.email}</small>}
            </div>
            
            {/* Блок пароля */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ position: 'relative' }}>
                <input 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Пароль" 
                  value={formData.password}
                  onChange={handleChange} 
                  style={{...inputStyle(!!errors.password), paddingRight: '45px', marginBottom: 0}}
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

              {/* Ошибки и шкала вынесены ИЗ relative контейнера, они просто идут следом в потоке */}
              {errors.password && (
                 <small style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                    <AlertCircle size={12}/> {errors.password}
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
              {loading ? <Loader2 className="spin" /> : (isLogin ? 'Войти' : 'Создать аккаунт')}
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
              placeholder="000000" 
              style={{ textAlign: 'center', fontSize: '2rem', letterSpacing: '8px', marginBottom: '1.5rem', ...inputStyle(false) }}
              maxLength={6} 
            />
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading || otp.length < 6}>
              {loading ? <Loader2 className="spin" /> : 'Подтвердить код'}
            </button>
            <p onClick={() => setStep('INIT')} style={{ textAlign: 'center', marginTop: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }}>← Назад</p>
          </form>
        )}

        {step === 'INIT' && (
          <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
            <span 
              style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }} 
              onClick={() => { setIsLogin(!isLogin); setErrors({username:'', email:'', password:'', telegramId:''}); setFormData({username:'', email:'', password:'', telegramId:''}); }}
            >
              {isLogin ? 'Регистрация' : 'Вход'}
            </span>
          </p>
        )}
      </div>
    </div>
  );
};

export default Auth;