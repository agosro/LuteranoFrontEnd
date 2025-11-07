import { httpClient } from './httpClient'

// Crear una nueva materia
export const crearMateria = async (token, materia) => {
  void token
  return httpClient.post('/api/materias/create', materia)
};


// Actualizar una materia existente
export const actualizarMateria = async (token, materia) => {
  void token
  return httpClient.put('/api/materias/update', materia)
};

// Obtener todas las materias
export const listarMaterias = async (token) => {
  void token
  const data = await httpClient.get('/api/materias/list')
  return data.materiasDto || []
};

// Eliminar una materia por ID
export const eliminarMateria = async (token, id) => {
  void token
  return httpClient.delete(`/api/materias/delete/${id}`)
};