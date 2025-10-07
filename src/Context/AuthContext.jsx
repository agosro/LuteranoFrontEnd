import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Inicializar user sincrónicamente desde localStorage
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Simular un pequeño delay para permitir mostrar spinner (y dar tiempo a futuras validaciones de token)
  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 180); // 180ms => perceptible pero rápido
    return () => clearTimeout(id);
  }, []);

  const login = (userData) => {
    const normalizedUser = {
      ...userData,
      rol: userData.rol,   
      token: userData.token,
    };
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setUser(normalizedUser);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('ultimaRuta');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
