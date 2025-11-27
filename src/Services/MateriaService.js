import { httpClient } from './httpClient'

// Crear una nueva materia
export const crearMateria = async (token, materia) => {
  void token
  return httpClient.post('/materias/create', materia)
};


// Actualizar una materia existente
export const actualizarMateria = async (token, materia) => {
  void token
  return httpClient.put('/materias/update', materia)
};

// Obtener todas las materias
export const listarMaterias = async (token) => {
  void token
  const data = await httpClient.get('/materias/list')
  return data.materiasDto || []
};

// Obtener una materia por ID
export const obtenerMateriaPorId = async (token, id) => {
  void token
  const data = await httpClient.get(`/materias/${id}`)
  return data.materia || null
};

// Eliminar una materia por ID
export const eliminarMateria = async (token, id) => {
  void token
  return httpClient.delete(`/materias/delete/${id}`)
};