const API_URL = 'http://localhost:8080';

// Lista todos los ciclos lectivos
export const listarCiclosLectivos = async (token) => {
  try {
    const resp = await fetch(`${API_URL}/ciclos-lectivos/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.mensaje || 'Error al listar ciclos lectivos');

    // Backend puede devolver CicloLectivoDtos o cicloLectivoDtos
    const list = data.CicloLectivoDtos || data.cicloLectivoDtos || data.ciclos || [];
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Error listar ciclos lectivos:', err);
    throw err;
  }
};

// Crear automáticamente el ciclo del año siguiente
export const crearSiguienteCicloLectivo = async (token) => {
  try {
    const resp = await fetch(`${API_URL}/ciclos-lectivos/siguiente`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.mensaje || 'Error al crear el siguiente ciclo lectivo');
    return data;
  } catch (err) {
    console.error('Error crear siguiente ciclo lectivo:', err);
    throw err;
  }
};

// Crear manualmente un ciclo por año
export const crearCicloLectivoManual = async (token, anio) => {
  try {
    const resp = await fetch(`${API_URL}/ciclos-lectivos/manual/${anio}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.mensaje || 'Error al crear ciclo lectivo manual');
    return data;
  } catch (err) {
    console.error('Error crear ciclo lectivo manual:', err);
    throw err;
  }
};

// Obtener ciclo lectivo por ID (opcional)
export const obtenerCicloLectivoPorId = async (token, id) => {
  try {
    const resp = await fetch(`${API_URL}/ciclos-lectivos/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.mensaje || 'Error al obtener ciclo lectivo');
    return data;
  } catch (err) {
    console.error('Error obtener ciclo lectivo por ID:', err);
    throw err;
  }
};
