const API_URL = "http://localhost:8080";
const BASE = `${API_URL}/calificaciones`;

export async function crearCalificacion(token, payload) {
  const response = await fetch(`${BASE}/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const base = data?.mensaje || `Error ${response.status}`;
    throw new Error(base);
  }
  return data;
}

export async function actualizarCalificacion(token, payload) {
  const response = await fetch(`${BASE}/update`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const base = data?.mensaje || `Error ${response.status}`;
    throw new Error(base);
  }
  return data;
}

export async function listarCalifPorMateria(token, alumnoId, materiaId) {
  const response = await fetch(
    `${BASE}/alumno/${alumnoId}/materia/${materiaId}/all`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const base = data?.mensaje || `Error ${response.status}`;
    throw new Error(base);
  }
  return data;
}

export async function listarCalifPorAnioEtapa(token, alumnoId, anio, etapa) {
  // Backend exposes /calificaciones/alumno/{alumnoId}?anio=YYYY&etapa=E
  const url = `${BASE}/alumno/${alumnoId}?anio=${encodeURIComponent(
    anio
  )}&etapa=${encodeURIComponent(etapa)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const base = data?.mensaje || `Error ${response.status}`;
    throw new Error(base);
  }
  return data;
}

export async function eliminarCalificacion(token, alumnoId, materiaId, califId) {
  const response = await fetch(
    `${BASE}/alumno/${alumnoId}/materia/${materiaId}/${califId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const base = data?.mensaje || `Error ${response.status}`;
    throw new Error(base);
  }
  return data;
}

export async function listarCalifPorAnio(token, alumnoId, anio) {
  const url = `${BASE}/alumno/${alumnoId}?anio=${encodeURIComponent(anio)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const base = data?.mensaje || `Error ${response.status}`;
    throw new Error(base);
  }
  return data;
}
