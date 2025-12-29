import { useState, useEffect, useContext, ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Footer from './components/Footer';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import OAuthCallback from './components/OAuthCallback';
import Recorder from './components/Recorder';
import History from './components/History';
import Home from './components/Home';
import IntroLoader from './components/IntroLoader';
import LiveTrainer from './components/LiveTrainer';
import Profile from './components/Profile';
import { AuthProvider, AuthContext } from './AuthContext';
import './App.css';

interface RouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: RouteProps) => {
  const auth = useContext(AuthContext);

  if (!auth?.token) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
};

const GuestRoute = ({ children }: RouteProps) => {
  const auth = useContext(AuthContext);

  if (auth?.token) {
    return <Navigate to="/practice" replace />;
  }
  return <>{children}</>;
};

const MainLayout = () => {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const isAuth = location.pathname.startsWith('/auth');

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {isLoading && <IntroLoader />}

      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: 'rgba(30, 41, 59, 0.95)',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '0.95rem',
            fontFamily: "'Outfit', sans-serif",
            boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
            zIndex: 99999,
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
            style: { borderLeft: '4px solid #10b981' }
          },
          error: {
            iconTheme: { primary: '#f43f5e', secondary: '#fff' },
            style: { borderLeft: '4px solid #f43f5e' }
          },
        }}
      />

      <div className={`app-content ${isLoading ? 'hidden-content' : 'visible-content'}`}>
        <Navbar />
        <div className="container main-container" style={{ minHeight: 'calc(100vh - 80px - 300px)' }}> {/* Adjust min-height for footer sticky */}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/practice" element={<ProtectedRoute><Recorder /></ProtectedRoute>} />

            <Route path="/live" element={<ProtectedRoute><LiveTrainer /></ProtectedRoute>} />

            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/auth" element={<GuestRoute><Auth /></GuestRoute>} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        {!isAuth && <Footer />}
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