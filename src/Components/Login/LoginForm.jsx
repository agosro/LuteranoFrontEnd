import React, { useState } from 'react'
import './LoginForm.css'
import ColegioIcon from '../../assets/logo1.png';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setLoading(true)

    try {
    const response = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const data = await response.json();

  if (response.ok && data.token) {
    // Guardar token en localStorage
    localStorage.setItem('token', data.token);
    // Decodificar token para obtener rol
    const decoded = jwtDecode(data.token);
    const role = decoded.role;

    login({ nombre: decoded.sub || decoded.email, rol: role, token: data.token });

    navigate('/inicio');

  } else {
    // Aquí chequeamos el código HTTP
    if (response.status === 422) {
      setErrorMessage('Credenciales incorrectas.');
    } else {
      setErrorMessage(data.mensaje || 'Error inesperado.');
    }
  }
} catch (error) {
  setErrorMessage('Error de conexión con el servidor.');
}

    setLoading(false);
  };
  return (
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
  )
}

export default Login
