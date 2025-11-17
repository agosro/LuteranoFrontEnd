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
  const [searchTimeout, setSearchTimeout] = useState(null);

  const alumnosCursoCache = useRef({});

  // Si hay lista externa, usarla en lugar de cargar
  useEffect(() => {
    if (alumnosExternos) {
      setAlumnos(alumnosExternos);
      setFilteredAlumnos(alumnosExternos.slice(0, 20));
      return;
    } else {
      setAlumnos([]);
      setFilteredAlumnos([]);
    }
  }, [alumnosExternos]);

  // Buscar alumnos solo cuando el usuario escribe al menos 2 caracteres
  useEffect(() => {
    if (alumnosExternos) return;
    if (!token) return;

    // Si hay cursoId, buscar por curso (comportamiento anterior)
    if (cursoId) {
      let active = true;
      async function loadAlumnosCurso() {
        try {
          setLoading(true);
          let lista = [];
          if (alumnosCursoCache.current[cursoId]) {
            lista = alumnosCursoCache.current[cursoId];
          } else {
            const cicloId = cicloLectivo?.id ?? null;
            lista = await listarAlumnosPorCurso(token, Number(cursoId), cicloId);
            alumnosCursoCache.current[cursoId] = Array.isArray(lista) ? lista : [];
          }
          if (active) {
            setAlumnos(Array.isArray(lista) ? lista : []);
            setFilteredAlumnos(Array.isArray(lista) ? lista : []);
          }
        } catch {
          if (active) {
            setAlumnos([]);
            setFilteredAlumnos([]);
          }
        } finally {
          if (active) setLoading(false);
        }
      }
      loadAlumnosCurso();
      return () => { active = false; };
    }

    // Si no hay texto suficiente, limpiar lista
    if (!searchText || searchText.trim().length < 2) {
      setAlumnos([]);
      setFilteredAlumnos([]);
      setLoading(false);
      return;
    }

    // Debounce la búsqueda
    if (searchTimeout) clearTimeout(searchTimeout);
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const filtros = {
          nombre: searchText,
          apellido: searchText,
          dni: searchText,
        };
        const lista = await listarAlumnosConFiltros(token, filtros);
        setAlumnos(Array.isArray(lista) ? lista : []);
        setFilteredAlumnos(Array.isArray(lista) ? lista : []);
      } catch {
        setAlumnos([]);
        setFilteredAlumnos([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    setSearchTimeout(timeout);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, token, cursoId, cicloLectivo?.id, alumnosExternos]);


  // Ya no se filtra en frontend, solo se muestra lo que devuelve el backend

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
