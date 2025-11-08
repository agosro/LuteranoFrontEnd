import { httpClient } from './httpClient'

// Obtener todos los usuarios
export async function obtenerUsuarios(token) {
  void token
  return httpClient.get('/api/user')
}


// Actualizar usuario
export async function actualizarUsuario(token, datos) {
  void token
  return httpClient.put('/api/user/update', datos)
}

export const obtenerUsuarioPorEmail = async (token, email) => {
  return httpClient.post('/api/user/email', { email }, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
};

// Eliminar usuario por email
export async function eliminarUsuario(token, email) {
  void token
  return httpClient.delete('/api/user/email', { body: { email } })
}

export async function registrarUsuario(token, userData) {
  void token
  return httpClient.post('/api/api/auth/register', userData)
}

// Obtener usuarios sin asignar a Docente, Preceptor, u otro
export async function obtenerUsuariosSinAsignar(token) {
  void token
  return httpClient.get('/api/user/sin-asignar')
}

// Obtener usuarios por rol
export async function obtenerUsuariosPorRol(token, rol) {
  void token
  return httpClient.get(`/api/user/rol/${rol}`)
}

// Obtener usuarios sin asignar por rol
export async function obtenerUsuariosSinAsignarPorRol(token, rol) {
  void token
  return httpClient.get(`/api/user/sin-asignar/rol/${rol}`)
}