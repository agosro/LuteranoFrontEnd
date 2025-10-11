// Utilidades para normalización de encabezados CSV

export function normalizeKey(h) {
  return (h || "")
    .replace("\uFEFF", "")
    .normalize("NFD").replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lee el primer renglón del CSV y reemplaza encabezados según alias.
 * Devuelve un nuevo File si hubo cambios.
 * Siempre usa UTF-8.
 * @param {File} file
 * @param {Record<string,string>} aliasMap clave normalizada -> encabezado backend
 * @returns {Promise<{ file: File, headerPreview: string, normalized: boolean, delimiter: string }>}
 */
export function normalizeCsvHeaders(file, aliasMap) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result || "";
        const lines = String(text).split(/\r?\n/);
        const firstLine = (lines[0] || "").trim();
        const delimiter = firstLine.includes(";") ? ";" : ",";
        const cols = firstLine.split(delimiter).map((c) => c.trim());
        const replaced = cols.map((col) => aliasMap[normalizeKey(col)] || col);
        const changed = JSON.stringify(cols) !== JSON.stringify(replaced);
        if (changed) {
          const rest = lines.slice(1).join("\n");
          const newContent = replaced.join(delimiter) + "\n" + rest;
          const newFile = new File([newContent], file.name, { type: file.type || "text/csv" });
          resolve({ file: newFile, headerPreview: replaced.join(delimiter), normalized: true, delimiter });
        } else {
          resolve({ file, headerPreview: firstLine, normalized: false, delimiter });
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, "UTF-8");
    } catch (e) {
      reject(e);
    }
  });
}
