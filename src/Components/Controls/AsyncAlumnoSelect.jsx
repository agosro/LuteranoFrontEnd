import React, { useCallback, useMemo, useRef, useState } from "react";
import AsyncSelect from "react-select/async";
import { InputGroup, Form, Button, Spinner } from "react-bootstrap";
import { listarAlumnosConFiltros } from "../../Services/AlumnoService";
import { listarAlumnosPorCurso } from "../../Services/HistorialCursoService";
import { useCicloLectivo } from "../../Context/CicloLectivoContext.jsx";

// Reusable alumno selector with type-ahead, limited defaults, optional DNI search, and optional course/year narrowing
export default function AsyncAlumnoSelect({
  token,
  value,
  onChange,
  cursos = [],
  cursoId = "",
  cursoAnioSel = "",
  placeholder,
  defaultLimit = 10,
  searchLimit = 50,
  showDniSearch = true,
  classNamePrefix = "select",
  disabled = false,
}) {
  const { cicloLectivo } = useCicloLectivo();
  const [dni, setDni] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [overrideOptions, setOverrideOptions] = useState(null); // Array of select options when DNI search is used

  // caches
  const alumnosCursoCache = useRef({}); // cursoId -> alumnos[]
  const alumnosYearCache = useRef({}); // anio -> alumnos[]
  const alumnosDefaultCache = useRef(null); // alumnos[]

  const buildOption = useCallback((a) => ({
    value: a.id,
    label: `${a.apellido || ''}, ${a.nombre || ''}${a.dni ? ' - ' + a.dni : ''}`.trim(),
    raw: a,
  }), []);

  const buscarEnLista = useCallback((lista, q) => {
    const s = (q || "").toLowerCase();
    if (!s) return lista;
    return (lista || []).filter(a => {
      const nom = `${a.apellido || ''} ${a.nombre || ''}`.toLowerCase();
      const dni = (a.dni || '').toString();
      return nom.includes(s) || dni.includes(s);
    });
  }, []);

  const loadOptions = useCallback(async (inputValue) => {
    const q = (inputValue || "").trim();
    try {
      // DNI override options take priority when present and no extra query
      if (Array.isArray(overrideOptions) && overrideOptions.length > 0 && q.length === 0) {
        return overrideOptions;
      }
      // Scope by curso
      if (cursoId) {
        let lista = alumnosCursoCache.current[cursoId];
        if (!lista) {
          const cicloId = cicloLectivo?.id ?? null;
          lista = await listarAlumnosPorCurso(token, Number(cursoId), cicloId);
          alumnosCursoCache.current[cursoId] = Array.isArray(lista) ? lista : [];
        }
        const limit = q.length > 0 ? searchLimit : defaultLimit;
        const filtrada = buscarEnLista(lista, q).slice(0, limit);
        return filtrada.map(buildOption);
      }
      // Scope by year (combining courses)
      if (cursoAnioSel) {
        let yearList = alumnosYearCache.current[cursoAnioSel];
        if (!yearList) {
          const cursosDelAnio = (cursos || []).filter(c => String(c.anio) === String(cursoAnioSel));
          const ids = cursosDelAnio.map(c => c.id).filter(Boolean);
          const cicloId = cicloLectivo?.id ?? null;
          const results = await Promise.all(ids.map(id => listarAlumnosPorCurso(token, Number(id), cicloId).catch(() => [])));
          const map = new Map();
          for (const arr of results) {
            for (const a of (arr || [])) {
              if (!map.has(a.id)) map.set(a.id, a);
            }
          }
          yearList = Array.from(map.values());
          alumnosYearCache.current[cursoAnioSel] = yearList;
        }
        const limit = q.length > 0 ? searchLimit : defaultLimit;
        const filtrada = buscarEnLista(yearList, q).slice(0, limit);
        return filtrada.map(buildOption);
      }
      // Default list (no query)
      if (q.length < 1) {
        if (!alumnosDefaultCache.current) {
          const lista = await listarAlumnosConFiltros(token, {});
          alumnosDefaultCache.current = Array.isArray(lista) ? lista : [];
        }
        return alumnosDefaultCache.current.slice(0, defaultLimit).map(buildOption);
      }
      // Remote query by nombre/apellido or dni
      const filtros = (() => {
        const s = q;
        if (/^\d{3,}$/.test(s)) return { dni: s };
        return { nombre: s, apellido: s };
      })();
      const lista = await listarAlumnosConFiltros(token, filtros);
      return (lista || []).slice(0, searchLimit).map(buildOption);
    } catch {
      return [];
    }
  }, [overrideOptions, cursoId, cursoAnioSel, cursos, token, defaultLimit, searchLimit, buscarEnLista, buildOption, cicloLectivo?.id]);

  const onSearchDni = useCallback(async () => {
    const q = (dni || '').trim();
    if (!q) { setOverrideOptions(null); return; }
    if (!/^\d{6,}$/.test(q)) { return; }
    try {
      setBuscando(true);
      const lista = await listarAlumnosConFiltros(token, { dni: q });
      const arr = Array.isArray(lista) ? lista : [];
      const opciones = arr.map(buildOption);
      if (opciones.length === 1) {
        onChange && onChange(opciones[0]);
        setOverrideOptions(null);
      } else if (opciones.length === 0) {
        setOverrideOptions([]);
      } else {
        setOverrideOptions(opciones);
      }
    } finally {
      setBuscando(false);
    }
  }, [dni, token, onChange, buildOption]);

  const effectivePlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    return cursoId ? "Seleccioná o escribí para filtrar dentro del curso..." : "Seleccioná un alumno o escribí para filtrar";
  }, [placeholder, cursoId]);

  return (
    <div>
      <AsyncSelect
        cacheOptions={false}
        defaultOptions={Array.isArray(overrideOptions) && overrideOptions.length > 0 ? overrideOptions : true}
        loadOptions={loadOptions}
        value={value}
        onChange={onChange}
        placeholder={effectivePlaceholder}
        isClearable
        classNamePrefix={classNamePrefix}
        isDisabled={disabled}
      />
      {showDniSearch && (
        <div className="mt-2">
          <InputGroup>
            <Form.Control
              type="number"
              placeholder="Ej: 12345678"
              value={dni}
              onChange={(e)=> setDni(e.target.value)}
              disabled={disabled}
            />
            <Button variant="outline-secondary" onClick={onSearchDni} disabled={buscando || disabled}>
              {buscando ? <Spinner size="sm" /> : 'Buscar'}
            </Button>
          </InputGroup>
          <div className="form-text">Si hay un único resultado se selecciona automáticamente.</div>
        </div>
      )}
    </div>
  );
}
