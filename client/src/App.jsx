import { useState, useEffect, use } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import Recorder from './components/Recorder';
import History from './components/History';
import IntroLoader from './components/IntroLoader';
import { AuthProvider, AuthContext } from './AuthContext';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { token } = use(AuthContext);
  return token ? children : <Navigate to="/auth" />;
};

const MainLayout = () => {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Показываем лоадер только при первой загрузке или при обновлении страницы
    // (можно добавить условие, чтобы не показывать при переходах внутри меню)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2200); // Время анимации

    return () => clearTimeout(timer);
  }, []); // Пустой массив = только при старте приложения

  return (
    <>
      {/* Лоадер живет отдельно, поверх всего */}
      {isLoading && <IntroLoader />}

      {/* Основной контент приложения */}
      <div className={`app-content ${isLoading ? 'hidden-content' : 'visible-content'}`}>
        <Navbar />
        <div className="container main-container">
          <Routes>
            <Route path="/" element={
              <ProtectedRoute>
                <Recorder />
              </ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            } />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </div>
      </div>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;