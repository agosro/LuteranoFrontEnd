import { httpClient } from './httpClient'

// Obtener todos los usuarios
export async function obtenerUsuarios(token) {
  void token
  const data = await httpClient.get('/user')
  // Aceptar tanto un array directo como un wrapper { usuarios: [...] }
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.usuarios)) return data.usuarios
  if (data && Array.isArray(data.content)) return data.content // por si es paginado tipo Spring
  if (data && Array.isArray(data.data)) return data.data // por si viene en 'data'
  return []
}


// Actualizar usuario
export async function actualizarUsuario(token, datos) {
  void token
  return httpClient.put('/user/update', datos)
}

export const obtenerUsuarioPorEmail = async (token, email) => {
  return httpClient.post('/user/email', { email }, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
};

// Eliminar usuario por email
export async function eliminarUsuario(token, email) {
  void token
  return httpClient.delete('/user/email', { body: { email } })
}

export async function registrarUsuario(token, userData) {
  void token
  // Ruta correcta: una sola vez /api/auth/register (compatibilidad con stripping en httpClient)
  return httpClient.post('/api/auth/register', userData)
}

// Obtener usuarios sin asignar a Docente, Preceptor, u otro
export async function obtenerUsuariosSinAsignar(token) {
  void token
  return httpClient.get('/user/sin-asignar')
}

// Obtener usuarios por rol
export async function obtenerUsuariosPorRol(token, rol) {
  void token
  return httpClient.get(`/user/rol/${rol}`)
}

// Obtener usuarios sin asignar por rol
export async function obtenerUsuariosSinAsignarPorRol(token, rol) {
  void token
  return httpClient.get(`/user/sin-asignar/rol/${rol}`)
}