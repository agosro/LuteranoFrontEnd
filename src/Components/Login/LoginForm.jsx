import React, { useState } from 'react';
import './LoginForm.css';
import ColegioIcon from '../../assets/logo1.png';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';

// 👇 importamos los services
import { obtenerDocentePorUserId } from '../../Services/DocenteService';
import { obtenerPreceptorPorUserId } from '../../Services/PreceptorService';
import { httpClient } from '../../Services/httpClient';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      // Usamos httpClient para unificar manejo de base URL, errores y JSON
      const data = await httpClient.post('/api/auth/login', { email, password }, { skipAuth: true });

      if (data?.token) {
        const decoded = jwtDecode(data.token);
        const role = decoded.role;
  // const correo = decoded.sub; // 👈 mail del usuario en el token (ya no se usa para pedir userId)

        // Ahora el token incluye siempre userId y, según el rol, docenteId o preceptorId
        let userId = decoded.userId || decoded.id || decoded.uid || decoded.user_id || null;
        let docenteId = decoded.docenteId ?? null;
        let preceptorId = decoded.preceptorId ?? null;

        // Fallback defensivo: si por algún motivo no vienen los IDs específicos en el token,
        // consultamos por userId para obtenerlos.
        if (role === "ROLE_DOCENTE" && !docenteId && userId) {
          try {
            const docente = await obtenerDocentePorUserId(data.token, userId);
            docenteId = docente?.id ?? null;
          } catch (e) {
            console.warn('No se pudo obtener docenteId por userId:', e?.message || e);
          }
        } else if (role === "ROLE_PRECEPTOR" && !preceptorId && userId) {
          try {
            const preceptor = await obtenerPreceptorPorUserId(data.token, userId);
            preceptorId = preceptor?.id ?? null;
          } catch (e) {
            console.warn('No se pudo obtener preceptorId por userId:', e?.message || e);
          }
        }

        // ✅ Para ADMIN/DIRECTOR no se busca nada extra
        login({
          nombre: data.mensaje.replace("hola ", ""),
          rol: role,
          token: data.token,
          userId: userId,
          docenteId,
          preceptorId,
        });

      navigate("/inicio");
      } else {
        setErrorMessage(data?.mensaje || 'Credenciales incorrectas.');
      }
    } catch (error) {
      // httpClient normaliza el mensaje cuando es posible
      setErrorMessage(error?.message || 'Error de conexión con el servidor.');
      console.error('Login error:', error);
    }

    setLoading(false);
  };

  return (
    <div className="login-page-container">
      <div className="containerr">
        <div className="login-containerr">
          <h2>Iniciar sesión</h2>
          <form id="loginForm" onSubmit={handleSubmit}>
            <input
              type="text"
              id="email"
              className="input-fieldd"
              placeholder="Usuario"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <br />
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className="input-fieldd"
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <label className="show-password-label">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={e => setShowPassword(e.target.checked)}
                />
                Mostrar contraseña
              </label>
            </div>
            <br />
            <button type="submit" className="btnn" disabled={loading}>
              {loading ? 'Validando...' : 'Entrar'}
            </button>
          </form>
          <div id="error-message" className="error-message">{errorMessage}</div>
        </div>
        <div className="icon-containerr">
          <img src={ColegioIcon} alt="Icono Colegio" />
        </div>
      </div>
    </div>
  );
}

export default Login;
