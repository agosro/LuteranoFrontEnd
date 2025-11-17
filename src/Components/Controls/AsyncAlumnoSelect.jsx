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
  cursoAnio = null,
  cursoDivision = null,
  placeholder,
  disabled = false,
  alumnosExternos = null, // Lista externa de alumnos (opcional)
}) {
  const { cicloLectivo } = useCicloLectivo();
  const [alumnos, setAlumnos] = useState([]);
  const [filteredAlumnos, setFilteredAlumnos] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastSearchText, setLastSearchText] = useState(""); // Para evitar búsquedas repetidas
  const searchTimeoutRef = useRef(null);

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

  // Buscar alumnos solo cuando el usuario presiona Enter o hace focus en el select
  useEffect(() => {
    if (alumnosExternos) return;
    if (!token) return;

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
    // No buscar automáticamente por texto
    setAlumnos([]);
    setFilteredAlumnos([]);
    setLoading(false);
  }, [token, cursoId, cicloLectivo?.id, alumnosExternos]);

  // Handler para buscar alumnos manualmente
  const buscarAlumnos = useCallback(async () => {
    if (alumnosExternos || !token) return;
    const texto = searchText.trim();
    
    // Si no hay texto ni filtros de curso, no buscar
    if (!texto && !cursoAnio) {
      setAlumnos([]);
      setFilteredAlumnos([]);
      setLoading(false);
      return;
    }
    
    // Crear clave de caché que incluya todos los filtros
    const cacheKey = `${cursoAnio || ''}_${cursoDivision || ''}_${texto}`;
    
    // No buscar si ya se buscó exactamente esto
    if (cacheKey === lastSearchText && alumnos.length > 0) {
      return;
    }
    
    setLoading(true);
    setLastSearchText(cacheKey);
    
    try {
      let allAlumnos = [];
      
      // Filtros comunes (año y división del curso)
      const filtrosBase = {};
      if (cursoAnio) {
        filtrosBase.anio = Number(cursoAnio);
      }
      if (cursoDivision) {
        filtrosBase.division = cursoDivision;
      }
      
      if (!texto) {
        // Solo filtros de año/división, sin texto de búsqueda
        const lista = await listarAlumnosConFiltros(token, filtrosBase);
        allAlumnos = Array.isArray(lista) ? lista : [];
      } else if (/^\d+$/.test(texto)) {
        // Si es número, filtrar solo por DNI
        const lista = await listarAlumnosConFiltros(token, { ...filtrosBase, dni: texto });
        allAlumnos = Array.isArray(lista) ? lista : [];
      } else {
        // Si es texto, hacer dos búsquedas: una por nombre y otra por apellido
        // y combinar los resultados (evitando duplicados)
        const [listaNombre, listaApellido] = await Promise.all([
          listarAlumnosConFiltros(token, { ...filtrosBase, nombre: texto }),
          listarAlumnosConFiltros(token, { ...filtrosBase, apellido: texto })
        ]);
        
        const alumnosNombre = Array.isArray(listaNombre) ? listaNombre : [];
        const alumnosApellido = Array.isArray(listaApellido) ? listaApellido : [];
        
        // Combinar y eliminar duplicados por ID
        const idsVistos = new Set();
        allAlumnos = [...alumnosNombre, ...alumnosApellido].filter(a => {
          if (idsVistos.has(a.id)) return false;
          idsVistos.add(a.id);
          return true;
        });
      }
      
      setAlumnos(allAlumnos);
      setFilteredAlumnos(allAlumnos);
    } catch {
      setAlumnos([]);
      setFilteredAlumnos([]);
    } finally {
      setLoading(false);
    }
  }, [searchText, token, alumnosExternos, cursoAnio, cursoDivision, lastSearchText, alumnos.length]);

  // Buscar automáticamente después de escribir (con delay)
  useEffect(() => {
    if (alumnosExternos || !token) return;
    
    const texto = searchText.trim();
    
    // Si hay año seleccionado (con o sin división), buscar aunque no haya texto
    if (cursoAnio && !texto) {
      // Limpiar timeout anterior
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        buscarAlumnos();
      }, 300);
      
      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    }
    
    if (!texto) {
      setAlumnos([]);
      setFilteredAlumnos([]);
      return;
    }
    
    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Buscar después de 500ms de dejar de escribir
    searchTimeoutRef.current = setTimeout(() => {
      buscarAlumnos();
    }, 500);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, token, alumnosExternos, cursoAnio, cursoDivision, buscarAlumnos]);

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
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              buscarAlumnos();
            }
          }}
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
