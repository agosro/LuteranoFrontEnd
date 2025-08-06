const API_URL = 'http://localhost:8080'; // Cambialo si usás otro host/puerto

// Crear una nueva materia
export const crearMateria = async (materia) => {
  const response = await fetch(`${API_URL}/materias/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(materia),
  });
  return await response.json();
};

// Actualizar una materia existente
export const actualizarMateria = async (materia) => {
  const response = await fetch(`${API_URL}/materias/update`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(materia),
  });
  return await response.json();
};

// Obtener todas las materias
export const listarMaterias = async () => {
  const response = await fetch(`${API_URL}/materias/list`);
  return await response.json();
};

// Eliminar una materia por ID
export const eliminarMateria = async (id) => {
  const response = await fetch(`${API_URL}/materias/delete/${id}`, {
    method: "DELETE",
  });
  return await response.json();
};