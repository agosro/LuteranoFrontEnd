import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './login.css'
import Login from './Login.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Login />
  </StrictMode>,
)
