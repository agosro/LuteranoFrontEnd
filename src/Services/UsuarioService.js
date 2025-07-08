const API_URL = 'http://localhost:8080'; // Cambiá si usás otro host/puerto

// Header con token para autorizar
const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});

// Obtener todos los usuarios
export async function obtenerUsuarios(token) {
  const res = await fetch(`${API_URL}/user`, {
    method: 'GET',
    headers: getHeaders(token)
  });
  if (!res.ok) throw new Error('Error al obtener usuarios');
  return await res.json();
}

// Obtener usuarios filtrados por estado
export async function obtenerUsuariosPorEstado(token, status) {
  const res = await fetch(`${API_URL}/user/${status}`, {
    method: 'GET',
    headers: getHeaders(token)
  });
  if (!res.ok) throw new Error('Error al obtener usuarios por estado');
  return await res.json();
}

// Activar usuario por email
export async function activarUsuario(token, email) {
  const res = await fetch(`${API_URL}/user/activar`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ email })
  });
  if (!res.ok) throw new Error('Error al activar usuario');
  return await res.json();
}

// Actualizar usuario
export async function actualizarUsuario(token, userData) {
  const res = await fetch(`${API_URL}/user/update`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(userData)
  });
  if (!res.ok) throw new Error('Error al actualizar usuario');
  return await res.json();
}

// Buscar usuario por email (ojo, este endpoint usa GET con body, poco común)
export async function obtenerUsuarioPorEmail(token, email) {
  const res = await fetch(`${API_URL}/user/email`, {
    method: 'GET',
    headers: getHeaders(token),
    body: JSON.stringify({ email })  // según tu backend
  });
  if (!res.ok) throw new Error('Error al buscar usuario');
  return await res.json();
}

// Eliminar usuario por email
export async function eliminarUsuario(token, email) {
  const res = await fetch(`${API_URL}/user/email`, {
    method: 'DELETE',
    headers: getHeaders(token),
    body: JSON.stringify({ email })
  });
  if (!res.ok) throw new Error('Error al eliminar usuario');
  return await res.json();
}

// Registrar usuario (auth)
export async function registrarUsuario(userData) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  if (!res.ok) throw new Error('Error al registrar usuario');
  return await res.json();
}
