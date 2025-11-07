// httpClient centraliza las llamadas fetch al backend.
// - Añade Authorization Bearer token automáticamente (lee localStorage 'user'.token)
// - Maneja JSON y errores HTTP
// - En caso de 401 limpia localStorage.user y redirige a /login

const getStoredToken = () => {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const user = JSON.parse(raw)
    return user?.token || null
  } catch {
    return null
  }
}

const baseApiUrl = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : ''

async function request(path, { method = 'GET', body = null, headers = {}, skipAuth = false, signal } = {}) {
  // path can be:
  // - absolute URL (starts with http)
  // - absolute path starting with /api (during dev the vite proxy will forward to backend)
  // - or any other relative path; in production we prefix with VITE_API_URL

  let url = path
  if (!/^https?:\/\//i.test(path)) {
    // if path starts with /api, in dev the proxy will handle it; in production prefix with baseApiUrl
    if (path.startsWith('/api')) {
      if (import.meta.env && import.meta.env.DEV) {
        // En desarrollo usamos el prefijo /api para el proxy y lo dejamos tal cual
        url = path
      } else {
        // En producción removemos el prefijo /api para mantener las rutas reales del backend
        url = `${baseApiUrl}${path.slice(4)}`
      }
    } else {
      // other relative paths: prefix with baseApiUrl if available
      url = baseApiUrl ? `${baseApiUrl}${path.startsWith('/') ? '' : '/'}${path}` : path
    }
  }

  const token = getStoredToken()
  const authHeaders = token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}

  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  const isString = typeof body === 'string'
  const shouldJson = body != null && !isForm && !isString

  const opts = {
    method,
    headers: {
      'Content-Type': shouldJson ? 'application/json' : undefined,
      ...authHeaders,
      ...headers,
    },
    signal,
  }

  if (body != null) {
    opts.body = shouldJson ? JSON.stringify(body) : body
  }

  const res = await fetch(url, opts)

  // Manejo de 401: limpiar estado local y redirigir al login
  if (res.status === 401) {
    try {
      localStorage.removeItem('user')
      localStorage.removeItem('ultimaRuta')
    } catch {
      // ignore
    }
    // redirigir a login (mantén la ruta base)
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    const err = new Error('Unauthorized')
    err.status = 401
    throw err
  }

  // No content
  if (res.status === 204) return null

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  let data
  try {
    data = isJson ? await res.json() : await res.text()
  } catch {
    data = null
  }

  if (!res.ok) {
    // Normalizar mensaje controlado para toast (evitar genéricos)
    const prefer = (obj) => {
      if (!obj) return null
      return (
        obj.mensaje || obj.message || obj.error ||
        (Array.isArray(obj.errors) && obj.errors[0]?.message) ||
        obj.detail || obj.details || null
      )
    }

    let message = prefer(data)
    if (!message) {
      // fallback específico por status
      switch (res.status) {
        case 400: message = 'Solicitud inválida'; break
        case 401: message = 'Sesión expirada o no autorizada'; break
        case 403: message = 'No tenés permisos para realizar esta acción'; break
        case 404: message = 'Recurso no encontrado'; break
        case 409: message = 'Conflicto en la operación'; break
        case 422: message = 'Datos inválidos'; break
        case 500: message = 'Error interno del servidor'; break
        default: message = `Error ${res.status}`
      }
    }

    const err = new Error(message)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

export const httpClient = {
  get: (path, opts = {}) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts = {}) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts = {}) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts = {}) => request(path, { ...opts, method: 'DELETE' }),
  request,
}

export default httpClient

/* Ejemplo de uso:
import { httpClient } from '../Services/httpClient'

// en componentes o servicios
const lista = await httpClient.get('/api/alumnos')
const nuevo = await httpClient.post('/api/alumnos', { nombre: 'Juan' })
*/
