const API_URL = 'http://localhost:8080'; // Cambiá si usás otro host/puerto

// Header con token para autorizar
const getHeaders = (token, contentType = true) => {
  const headers = {
    Authorization: `Bearer ${token}`,
  };
  if (contentType) headers['Content-Type'] = 'application/json';
  return headers;
};

// Obtener todos los usuarios
export async function obtenerUsuarios(token) {
  const res = await fetch(`${API_URL}/user`, {
    method: 'GET',
    headers: getHeaders(token, false)
  });
  if (!res.ok) throw new Error('Error al obtener usuarios');
  return await res.json();
}


// Actualizar usuario
export async function actualizarUsuario(token, userData) {
  const res = await fetch(`${API_URL}/user/update`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(userData)
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.mensaje || data.message || 'Error al actualizar usuario');
  }

  return data;
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

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.mensaje || data.message || 'Error al eliminar usuario');
  }

  return data;
}

export async function registrarUsuario(token, userData) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });

  if (!res.ok) {
    let errorMessage = 'Error al registrar usuario';
    try {
      const errorData = await res.json();
      if (errorData.mensaje) errorMessage = errorData.mensaje; 
    } catch {
      // si no pudo parsear el json, se queda con mensaje genérico
    }
    throw new Error(errorMessage);
  }

  return await res.json();
}
