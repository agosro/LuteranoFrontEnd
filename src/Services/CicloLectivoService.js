import { httpClient } from './httpClient'

// Lista todos los ciclos lectivos
export const listarCiclosLectivos = async (token) => {
  try {
    void token
    const data = await httpClient.get('/ciclos-lectivos/list')
    const list = data.CicloLectivoDtos || data.cicloLectivoDtos || data.ciclos || []
    return Array.isArray(list) ? list : []
  } catch (err) {
    console.error('Error listar ciclos lectivos:', err);
    throw err;
  }
};

// Crear automáticamente el ciclo del año siguiente
export const crearSiguienteCicloLectivo = async (token) => {
  try {
    void token
    const data = await httpClient.post('/ciclos-lectivos/siguiente')
    return data
  } catch (err) {
    console.error('Error crear siguiente ciclo lectivo:', err);
    throw err;
  }
};

// Crear manualmente un ciclo por año
export const crearCicloLectivoManual = async (token, anio) => {
  try {
    void token
    const data = await httpClient.post(`/ciclos-lectivos/manual/${anio}`)
    return data
  } catch (err) {
    console.error('Error crear ciclo lectivo manual:', err);
    throw err;
  }
};

// Obtener ciclo lectivo por ID (opcional)
export const obtenerCicloLectivoPorId = async (token, id) => {
  try {
    void token
    const data = await httpClient.get(`/ciclos-lectivos/${id}`)
    return data
  } catch (err) {
    console.error('Error obtener ciclo lectivo por ID:', err);
    throw err;
  }
};
