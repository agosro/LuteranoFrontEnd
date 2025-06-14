import React, { useState } from 'react'
import './LoginForm.css'
import ColegioIcon from '../../assets/logo1.png';

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:8080/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (response.ok) {
        alert('Has ingresado correctamente.')
        // Aquí podés guardar token o redirigir
      } else {
        setErrorMessage(data.message || 'Credenciales incorrectas.')
      }
    } catch (error) {
      setErrorMessage('Error de conexión con el servidor.')
    }

    setLoading(false)
  }

  return (
    <div className="container">
      <div className="login-container">
        <h2>Iniciar sesión</h2>
        <form id="loginForm" onSubmit={handleSubmit}>
          <input
            type="text"
            id="username"
            className="input-field"
            placeholder="Usuario"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <br />
          <div className="password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              className="input-field"
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
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Validando...' : 'Entrar'}
          </button>
        </form>
        <div id="error-message" className="error-message">{errorMessage}</div>
      </div>
      <div className="icon-container">
        <img src={ColegioIcon} alt="Icono Colegio" />
      </div>
    </div>
  )
}

export default Login
