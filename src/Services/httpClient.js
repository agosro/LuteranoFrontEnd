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

// Sanitizamos la base para evitar terminar con doble /api (si alguien pone accidentalmente .../api en el .env)
const baseApiUrl = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
      .replace(/\/$/, '')        // quitar slash final simple
      .replace(/\/api$/i, '')    // si termina exactamente en /api lo quitamos
  : ''

async function request(path, { method = 'GET', body = null, headers = {}, skipAuth = false, signal, timeoutMs = 120000 } = {}) {
  // Normalización de la URL:
  // Siempre usamos la variable de entorno VITE_API_URL (dev y prod) para construir la URL base.
  // IMPORTANTE: Respetamos el path tal cual lo envían los Services (algunos empiezan con /api y otros no),
  // porque el backend mezcla prefijos (p.ej.: /api/auth/* y /user/*).
  // Casos:
  // 1. path absoluto (http/https) -> se usa tal cual.
  // 2. path que empieza con '/' -> se concatena directo a baseApiUrl.
  // 3. path relativo -> se asegura un '/'.

  let url = path
  if (!/^https?:\/\//i.test(path)) {
    let effectivePath = path
    // Ensure leading slash for joining
    if (!effectivePath.startsWith('/')) {
      effectivePath = `/${effectivePath}`
    }
    url = baseApiUrl ? `${baseApiUrl}${effectivePath}` : effectivePath
  }

  const token = getStoredToken()
  // Permitir que una cabecera Authorization explícita en headers sobrescriba la generada automáticamente
  const authHeaders = (headers && headers.Authorization) ? {} : (token && !skipAuth ? { Authorization: `Bearer ${token}` } : {})

  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  const isString = typeof body === 'string'
  const shouldJson = body != null && !isForm && !isString

  // Preparar AbortController para timeout si no se pasó uno externo
  const controller = !signal ? (typeof AbortController !== 'undefined' ? new AbortController() : null) : null
  const abortSignal = signal || controller?.signal

const baseHeaders = {
  'ngrok-skip-browser-warning': 'true',
  ...authHeaders,
  ...headers,
}

// Solo ponemos Content-Type si el body es JSON.
// Para FormData NO hay que tocarlo.
if (shouldJson) {
  baseHeaders['Content-Type'] = 'application/json'
}

const opts = {
  method,
  headers: baseHeaders,
  signal: abortSignal,
}

if (body != null) {
  opts.body = shouldJson ? JSON.stringify(body) : body
}

  if (body != null) {
    opts.body = shouldJson ? JSON.stringify(body) : body
  }

  // Iniciar timeout si aplica
  let timeoutId
  if (controller && timeoutMs && Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      try {
        controller.abort()
      } catch {
        // Ignorar fallo de abort
      }
    }, timeoutMs)
  }

  let res
  try {
    res = await fetch(url, opts)
  } catch (err) {
    if (err && (err.name === 'AbortError' || err.code === 'ABORT_ERR')) {
      const e = new Error('Tiempo de espera agotado al conectar con el servidor')
      e.status = 408
      throw e
    }
    throw err
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }

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
  const isJson = contentType.toLowerCase().includes('application/json')

  let data
  try {
    if (isJson) {
      data = await res.json()
    } else {
      const txt = await res.text()
      // Si parece JSON aunque el header no lo declare, intentar parsear
      const looksJson = txt && (txt.trim().startsWith('{') || txt.trim().startsWith('['))
      if (looksJson) {
        try { data = JSON.parse(txt) } catch { data = txt }
      } else {
        data = txt
      }
    }
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
