import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { InputGroup, Form, Button, Spinner } from "react-bootstrap";
import { listarAlumnosConFiltros } from "../../Services/AlumnoService";
import { listarAlumnosPorCurso } from "../../Services/HistorialCursoService";
import { useCicloLectivo } from "../../Context/CicloLectivoContext.jsx";

export default function AsyncAlumnoSelect({
  token,
  value,
  onChange,
  cursoId = "",
  placeholder,
  disabled = false,
  alumnosExternos = null, // Lista externa de alumnos (opcional)
}) {
  const { cicloLectivo } = useCicloLectivo();
  const [alumnos, setAlumnos] = useState([]);
  const [filteredAlumnos, setFilteredAlumnos] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);

  const alumnosCursoCache = useRef({});
  const alumnosDefaultCache = useRef(null);

  // Si hay lista externa, usarla en lugar de cargar
  useEffect(() => {
    if (alumnosExternos) {
      setAlumnos(alumnosExternos);
      setFilteredAlumnos(alumnosExternos.slice(0, 20));
      return;
    }
  }, [alumnosExternos]);

  // Cargar alumnos según el filtro (curso o todos) solo si no hay lista externa
  useEffect(() => {
    // Si hay lista externa, no cargar
    if (alumnosExternos) return;
    
    let active = true;
    async function loadAlumnos() {
      try {
        setLoading(true);
        let lista = [];
        
        if (cursoId) {
          // Si hay curso seleccionado, buscar por curso
          if (alumnosCursoCache.current[cursoId]) {
            lista = alumnosCursoCache.current[cursoId];
          } else {
            const cicloId = cicloLectivo?.id ?? null;
            lista = await listarAlumnosPorCurso(token, Number(cursoId), cicloId);
            alumnosCursoCache.current[cursoId] = Array.isArray(lista) ? lista : [];
          }
        } else {
          // Cargar todos los alumnos
          if (!alumnosDefaultCache.current) {
            lista = await listarAlumnosConFiltros(token, {});
            alumnosDefaultCache.current = Array.isArray(lista) ? lista : [];
          } else {
            lista = alumnosDefaultCache.current;
          }
        }
        
        if (active) {
          setAlumnos(Array.isArray(lista) ? lista : []);
          setFilteredAlumnos(Array.isArray(lista) ? lista : []);
        }
      } catch (error) {
        console.error("Error cargando alumnos:", error);
        if (active) {
          setAlumnos([]);
          setFilteredAlumnos([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (token) {
      loadAlumnos();
    }

    return () => { active = false; };
  }, [token, cursoId, cicloLectivo?.id, alumnosExternos]);

  // Función para normalizar texto (quitar tildes)
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  // Filtrar alumnos por texto de búsqueda
  useEffect(() => {
    const search = normalizeText(searchText.trim());
    
    if (!search) {
      // Si no hay búsqueda, mostrar solo los primeros 20
      setFilteredAlumnos(alumnos.slice(0, 20));
      return;
    }

    const filtered = alumnos.filter((a) => {
      const nombre = normalizeText(`${a.apellido || ""} ${a.nombre || ""}`);
      const dniStr = (a.dni || "").toString();
      return nombre.includes(search) || dniStr.includes(search);
    });

    setFilteredAlumnos(filtered);
  }, [searchText, alumnos]);

  const handleSelectChange = useCallback((e) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      onChange && onChange(null);
      return;
    }

    const alumno = alumnos.find((a) => String(a.id) === String(selectedId));
    if (alumno) {
      onChange && onChange({
        value: alumno.id,
        label: `${alumno.apellido || ""}, ${alumno.nombre || ""}${alumno.dni ? " - " + alumno.dni : ""}`.trim(),
        raw: alumno,
      });
    }
  }, [alumnos, onChange]);

  const effectivePlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    return cursoId
      ? "Seleccioná un alumno del curso"
      : "Seleccioná un alumno";
  }, [placeholder, cursoId]);

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
          <option value="">{loading ? "Cargando..." : effectivePlaceholder}</option>
          {filteredAlumnos.map((a) => (
            <option key={a.id} value={a.id}>
              {`${a.apellido || ""}, ${a.nombre || ""}${a.dni ? " - " + a.dni : ""}`.trim()}
            </option>
          ))}
        </Form.Select>
      </InputGroup>
    </div>
  );
}
