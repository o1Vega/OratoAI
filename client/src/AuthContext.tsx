import { createContext, useState, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  setAuth: (newToken: string | null) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {

  const [token, setTokenState] = useState<string | null>(localStorage.getItem('token'));

  const setAuth = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
    setTokenState(newToken);
  };

  return (
    <AuthContext.Provider value={{ token, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
};