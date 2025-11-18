import { useActionState, useState, use } from 'react';
import { useFormStatus } from 'react-dom';
import { useNavigate } from 'react-router-dom'; // <-- Добавлен импорт
import { loginUser, registerUser } from '../api';
import { AuthContext } from '../AuthContext';

function SubmitButton({ isLogin }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={pending}>
      {pending ? 'Обработка...' : (isLogin ? 'Войти' : 'Регистрация')}
    </button>
  );
}

const Auth = () => {
  const { setAuth } = use(AuthContext);
  const navigate = useNavigate(); // <-- Хук навигации
  const [isLogin, setIsLogin] = useState(true);

  const formAction = async (prevState, formData) => {
    const data = Object.fromEntries(formData);
    try {
      if (isLogin) {
        const res = await loginUser(data);
        setAuth(res.data.token);
        navigate('/'); // <-- МОМЕНТАЛЬНЫЙ ПЕРЕХОД ПОСЛЕ ВХОДА
        return { success: true };
      } else {
        await registerUser(data);
        setIsLogin(true);
        return { message: 'Аккаунт создан! Теперь войдите.' };
      }
    } catch (err) {
      // Показываем понятную ошибку
      return { error: err.response?.data?.error || 'Ошибка сервера. Попробуйте позже.' };
    }
  };

  const [state, action] = useActionState(formAction, null);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }} className="fade-in">
      <div className="card" style={{ width: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {isLogin ? 'Добро пожаловать' : 'Создать аккаунт'}
        </h2>
        
        {state?.error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#fda4af', padding: '10px', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
            {state.error}
          </div>
        )}
        {state?.message && (
          <div style={{ background: 'rgba(74, 222, 128, 0.2)', color: '#4ade80', padding: '10px', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
            {state.message}
          </div>
        )}
        
        <form action={action}>
          {!isLogin && <input name="username" type="text" placeholder="Ваше имя" required />}
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Пароль" required />
          <div style={{ marginTop: '1rem' }}>
             <SubmitButton isLogin={isLogin} />
          </div>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
          <span 
            style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }} 
            onClick={() => { setIsLogin(!isLogin); }}
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Auth;