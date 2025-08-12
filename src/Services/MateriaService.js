const API_URL = 'http://localhost:8080'; // Cambialo si usás otro host/puerto

// Crear una nueva materia
export const crearMateria = async (token, materia) => {
  const response = await fetch(`${API_URL}/materias/create`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(materia),
  });
  return await response.json();
};

// Actualizar una materia existente
export const actualizarMateria = async (token, materia) => {
  const response = await fetch(`${API_URL}/materias/update`, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(materia),
  });
  return await response.json();
};

// Obtener todas las materias
export const listarMaterias = async (token) => {
  const response = await fetch(`${API_URL}/materias/list`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Error al obtener materias");
  }

  const data = await response.json();

  // ⚠️ Asegurate de devolver solo el array
  return data.materiasDto || [];
};

// Eliminar una materia por ID
export const eliminarMateria = async (token, id) => {
  const response = await fetch(`${API_URL}/materias/delete/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  return await response.json();
};