import { createContext, useState } from 'react';


export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {

  const [token, setTokenState] = useState(localStorage.getItem('token'));

  const setAuth = (newToken) => {
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