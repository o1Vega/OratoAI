import { useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const OAuthCallback = () => {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
            toast.error(`OAuth Error: ${error.replace(/_/g, ' ')}`);
            navigate('/auth', { replace: true });
            return;
        }

        if (token) {
            auth?.setAuth(token);
            toast.success('Вход выполнен успешно! 🚀');
            navigate('/practice', { replace: true });
        } else {
            toast.error('No token received');
            navigate('/auth', { replace: true });
        }
    }, [searchParams, auth, navigate]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '85vh',
            flexDirection: 'column',
            gap: '1rem'
        }}>
            <Loader2 className="spin" size={48} color="var(--primary)" />
            <p style={{ color: 'var(--text-muted)' }}>Completing sign in...</p>
        </div>
    );
};

export default OAuthCallback;
