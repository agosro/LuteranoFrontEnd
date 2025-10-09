// Usa variable de entorno si existe, con fallback a localhost
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"; // Cambiar según entorno

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

  const res = await fetch(`${API_URL}/import/alumnos`, {
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
