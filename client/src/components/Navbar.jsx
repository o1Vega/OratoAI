import { use } from 'react';
import { Link } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { AuthContext } from '../AuthContext';

const Navbar = () => {
  const { token, setAuth } = use(AuthContext);

  return (
    <nav className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Mic color="#6366f1" />
        <h2 style={{ margin: 0 }}>Orato AI</h2>
      </div>
      <div className="nav-links">
        {token ? (
          <>
            <Link to="/">Тренировка</Link>
            <Link to="/history">История</Link>
            <button onClick={() => setAuth(null)} className="btn" style={{ background: 'transparent', color: '#94a3b8' }}>
              Выход
            </button>
          </>
        ) : (
          <span>Ваш ИИ-коуч</span>
        )}
      </div>
    </nav>
  );
};

export default Navbar;