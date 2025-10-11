// Usa variable de entorno si existe, con fallback a localhost
const API_URL = "http://localhost:8080"; // Cambiar según entorno
const BASE = `${API_URL}/import`;
/**
 * Importa alumnos vía CSV.
 * @param {File} file Archivo CSV
 * @param {boolean} dryRun Si true, no persiste (prueba)
 * @param {string} token JWT
 */
export async function importarAlumnos(file, dryRun, token) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("dryRun", dryRun ? "true" : "false");
  formData.append("charset", "utf-8"); // forzado

  const res = await fetch(`${BASE}/alumnos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    let message = "Error al importar alumnos";
    try {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const data = await res.json();
        if (data?.message) message = data.message;
        else if (data?.errors && Array.isArray(data.errors) && data.errors.length) {
          message = data.errors.join("; ");
        }
      } else {
        const text = await res.text();
        if (text) message = text.slice(0, 500);
      }
    } catch {
      // Ignorar errores al leer cuerpo
    }
    throw new Error(message);
  }
  return res.json();
}

export async function importarNotas(file, dryRun, token) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("dryRun", String(dryRun));

  const response = await fetch(`${BASE}/notas`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  });

  if (!response.ok) {
    let message = "Error al importar notas";
    try {
      const ct = response.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const data = await response.json();
        if (data?.message) message = data.message;
        else if (data?.errors && Array.isArray(data.errors) && data.errors.length) {
          message = data.errors.join("; ");
        }
      } else {
        const text = await response.text();
        if (text) message = text.slice(0, 500);
      }
    } catch {
      // Ignorar errores al leer cuerpo
    }
    throw new Error(message);
  }
  return response.json();
}

// Compat: versión con firma anterior (token primero)
export async function importarNotasCidi(token, file, { dryRun = true /*, charset*/ } = {}) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("dryRun", String(dryRun));
  // Siempre UTF-8: no enviamos charset

  const response = await fetch(`${BASE}/notas`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  });

  if (!response.ok) {
    let message = "Error al importar notas";
    try {
      const ct = response.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const data = await response.json();
        if (data?.message) message = data.message;
        else if (data?.errors && Array.isArray(data.errors) && data.errors.length) {
          message = data.errors.join("; ");
        }
      } else {
        const text = await response.text();
        if (text) message = text.slice(0, 500);
      }
    } catch {
      // Ignorar errores al leer cuerpo
    }
    throw new Error(message);
  }
  return response.json();
}