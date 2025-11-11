import { httpClient } from './httpClient'

// Listar alumnos
export const listarAlumnos = async (token) => {
  try {
    void token
    const data = await httpClient.get('/alumno/list')
    // Normalizamos distintas posibles formas de respuesta del backend
    if (Array.isArray(data?.alumnoDtos)) return data.alumnoDtos
    if (Array.isArray(data?.items)) return data.items
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error("Error al listar alumnos:", error);
    throw error;
  }
};

// Crear alumno
export const crearAlumno = async (token, alumno) => {
  try {
    void token
    const data = await httpClient.post('/alumno/create', alumno)
    return data
  } catch (error) {
    console.error("Error al crear alumno:", error);
    throw error;
  }
};

// Editar alumno
export const editarAlumno = async (token, alumno) => {
  try {
    void token
    const data = await httpClient.put('/alumno/update', alumno)
    return data
  } catch (error) {
    console.error("Error al editar alumno:", error);
    throw error;
  }
};

// Eliminar alumno
export const eliminarAlumno = async (token, id) => {
  try {
    void token
    const data = await httpClient.delete(`/alumno/delete/${id}`)
    return data
  } catch (error) {
    console.error("Error al eliminar alumno:", error);
    throw error;
  }
};

// Listar alumnos con filtros dinámicos
export const listarAlumnosConFiltros = async (token, filtros) => {
  try {
    // Limpio los filtros para sacar undefined, null y strings vacíos
    const filtrosLimpios = Object.fromEntries(
      Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    void token
    const data = await httpClient.post('/alumno/filtros', filtrosLimpios)
    return Array.isArray(data?.alumnoDtos) ? data.alumnoDtos : []
  } catch (error) {
    console.error("Error al listar alumnos con filtros:", error);
    throw error;
  }
};

export const asignarCursoAlumno = async (token, request) => {
	try {
    void token
    try {
      const data = await httpClient.post('/alumno/asignarCursoAlumno', request)
      return data
    } catch (e) {
      if (e.status === 403) {
        throw new Error('No autorizado para asignar curso (403)')
      }
      throw e
    }
	} catch (error) {
		console.error('Error al asignar curso a alumno:', error);
		throw error;
	}
};

// Listar alumnos egresados
export const listarAlumnosEgresados = async (token) => {
  try {
    void token
    const data = await httpClient.get('/alumno/egresados')
    return Array.isArray(data?.alumnoDtos) ? data.alumnoDtos : []
  } catch (error) {
    console.error('Error al listar alumnos egresados:', error)
    throw error
  }
}

// Listar alumnos excluidos
export const listarAlumnosExcluidos = async (token) => {
  try {
    void token
    const data = await httpClient.get('/alumno/excluidos')
    return Array.isArray(data?.alumnoDtos) ? data.alumnoDtos : []
  } catch (error) {
    console.error('Error al listar alumnos excluidos:', error)
    throw error
  }
}

// Buscar alumno por DNI
export const buscarAlumnoPorDni = async (token, dni) => {
  try {
    if (!dni) return null
    void token
    const data = await httpClient.get(`/alumno/dni/${dni}`)
    return data?.alumno ?? null
  } catch (error) {
    console.error('Error al buscar alumno por DNI:', error)
    throw error
  }
}

// Reactivar alumno excluido
export const reactivarAlumno = async (token, id) => {
  try {
    if (!id) throw new Error('ID de alumno requerido')
    void token
    try {
      const data = await httpClient.post(`/alumno/${id}/reactivar`)
      return data
    } catch (e) {
      if (e.status === 403) {
        throw new Error('No autorizado para reactivar alumno (403)')
      }
      throw e
    }
  } catch (error) {
    console.error('Error al reactivar alumno:', error)
    throw error
  }
}