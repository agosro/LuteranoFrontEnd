import React, { useCallback, useState, useEffect } from "react";
import { InputGroup, Form, Button, Spinner } from "react-bootstrap";
import { listarDocentes } from "../../Services/DocenteService";

export default function AsyncDocenteSelect({
  token,
  value,
  onChange,
  placeholder = "Seleccioná un docente",
  disabled = false,
}) {
  const [docentes, setDocentes] = useState([]);
  const [filteredDocentes, setFilteredDocentes] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);

  // Cargar todos los docentes al inicio
  useEffect(() => {
    let active = true;
    async function loadDocentes() {
      try {
        setLoading(true);
        const lista = await listarDocentes(token);
        if (active) {
          setDocentes(Array.isArray(lista) ? lista : []);
          setFilteredDocentes(Array.isArray(lista) ? lista.slice(0, 20) : []);
        }
      } catch (error) {
        console.error("Error cargando docentes:", error);
        if (active) {
          setDocentes([]);
          setFilteredDocentes([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (token) {
      loadDocentes();
    }

    return () => { active = false; };
  }, [token]);

  // Función para normalizar texto (quitar tildes)
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  // Filtrar docentes por texto de búsqueda
  useEffect(() => {
    const search = normalizeText(searchText.trim());
    
    if (!search) {
      // Si no hay búsqueda, mostrar solo los primeros 20
      setFilteredDocentes(docentes.slice(0, 20));
      return;
    }

    const filtered = docentes.filter((d) => {
      const nombre = normalizeText(`${d.apellido || ""} ${d.nombre || ""}`);
      const dniStr = (d.dni || "").toString();
      return nombre.includes(search) || dniStr.includes(search);
    });

    setFilteredDocentes(filtered);
  }, [searchText, docentes]);

  const handleSelectChange = useCallback((e) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      onChange && onChange(null);
      return;
    }

    const docente = docentes.find((d) => String(d.id) === String(selectedId));
    if (docente) {
      onChange && onChange({
        value: docente.id,
        label: `${docente.apellido || ""}, ${docente.nombre || ""}${docente.dni ? " - " + docente.dni : ""}`.trim(),
        raw: docente,
      });
    }
  }, [docentes, onChange]);

  return (
    <div style={{ width: "100%", maxWidth: "100%" }}>
      <InputGroup>
        <Form.Control
          type="text"
          placeholder="Buscar por nombre o DNI..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          disabled={disabled || loading}
        />
        <Form.Select
          value={value?.value || ""}
          onChange={handleSelectChange}
          disabled={disabled || loading}
        >
          <option value="">{loading ? "Cargando..." : placeholder}</option>
          {filteredDocentes.map((d) => (
            <option key={d.id} value={d.id}>
              {`${d.apellido || ""}, ${d.nombre || ""}${d.dni ? " - " + d.dni : ""}`.trim()}
            </option>
          ))}
        </Form.Select>
      </InputGroup>
    </div>
  );
}
