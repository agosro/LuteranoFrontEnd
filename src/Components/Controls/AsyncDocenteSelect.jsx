import React, { useCallback, useMemo, useState } from "react";
import AsyncSelect from "react-select/async";
import { InputGroup, Form, Button, Spinner } from "react-bootstrap";
import { listarDocentes } from "../../Services/DocenteService";

export default function AsyncDocenteSelect({
  token,
  value,
  onChange,
  placeholder = "Seleccioná o escribí para filtrar",
  defaultLimit = 10,
  searchLimit = 50,
  showDniSearch = true,
  classNamePrefix = "select",
  disabled = false,
}) {
  const [dni, setDni] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [overrideOptions, setOverrideOptions] = useState(null);

  const buildOption = useCallback((d) => ({
    value: d.id,
    label: `${d.apellido || ''}, ${d.nombre || ''}${d.dni ? ' - ' + d.dni : ''}`.trim(),
    raw: d,
  }), []);

  const loadOptions = useCallback(async (inputValue) => {
    const q = (inputValue || '').toLowerCase().trim();
    try {
      if (Array.isArray(overrideOptions) && overrideOptions.length > 0 && q.length === 0) {
        return overrideOptions;
      }
      const lista = await listarDocentes(token);
      const filtered = (lista || []).filter(d => {
        const n = `${d.apellido || ''} ${d.nombre || ''}`.toLowerCase();
        const dniS = String(d.dni || '');
        return !q || n.includes(q) || dniS.includes(q);
      });
      const limit = q.length > 0 ? searchLimit : defaultLimit;
      return filtered.slice(0, limit).map(buildOption);
    } catch {
      return [];
    }
  }, [token, overrideOptions, buildOption, defaultLimit, searchLimit]);

  const onSearchDni = useCallback(async () => {
    const q = (dni || '').trim();
    if (!q) { setOverrideOptions(null); return; }
    if (!/^\d{6,}$/.test(q)) { return; }
    try {
      setBuscando(true);
      const lista = await listarDocentes(token);
      const coincidencias = (lista || []).filter(d => String(d.dni || '') === q);
      const opciones = coincidencias.map(buildOption);
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

  const effectivePlaceholder = useMemo(() => placeholder, [placeholder]);

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
