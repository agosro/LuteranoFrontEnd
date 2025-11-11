import React, { useState } from "react";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import { isoToInputLocal } from "../../utils/fechas";

export default function ModalCrearEntidad({
  show,
  onClose,
  onSubmit,
  campos = [], // default para evitar undefined
  titulo = "Crear",
  formData = {}, // default para evitar undefined
  onInputChange,
  onUsuarioChange,
}) {
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onInputChange(name, type === "checkbox" ? checked : value);
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (selectedOptions, name) => {
    if (name === "usuarioId" && onUsuarioChange) {
      const usuarioId = selectedOptions ? selectedOptions.value : "";
      onUsuarioChange(usuarioId);
    } else {
      onInputChange(
        name,
        selectedOptions
          ? Array.isArray(selectedOptions)
            ? selectedOptions.map((o) => o.value)
            : selectedOptions.value
          : ""
      );
    }
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const nuevosErrores = {};
    (Array.isArray(campos) ? campos : []).forEach(({ name, label, type, required }) => {
      if (!required) return;
      const val = formData[name];
      let invalido = false;
      if (type === "multiselect") {
        invalido = !Array.isArray(val) || val.length === 0;
      } else {
        invalido = val === undefined || val === null || val === "";
      }
      if (invalido) {
        const baseLabel = label || name;
        nuevosErrores[name] = `${baseLabel} es requerido`;
      }
    });
    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.3)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1050,
        padding: "1rem",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "8px",
          boxShadow: "0 0 10px rgba(0,0,0,0.25)",
          maxWidth: "500px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h5 className="mb-3">{titulo}</h5>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!validate()) return;
            onSubmit(formData);
          }}
        >
          {Array.isArray(campos) && campos.filter(Boolean).map(({ name, label, type, opciones, disabled, required, loadOptions, onChangeSelected, selectedOptions }) => (
            <div className="mb-3" key={name}>
              <label htmlFor={name} className="form-label">
                {label}
                 {required && <span style={{ color: 'red' }}> *</span>}
              </label>

              {type === "multiselect" ? (
                <Select
                  isMulti
                  options={opciones || []}
                  value={opciones ? opciones.filter((opt) =>
                    formData[name]?.includes(opt.value)
                  ) : []}
                  onChange={(selected) => handleSelectChange(selected, name)}
                  classNamePrefix="react-select"
                  placeholder={`Seleccione ${label.toLowerCase()}...`}
                  isDisabled={disabled}
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderColor: errors[name] ? '#dc3545' : base.borderColor,
                      boxShadow: errors[name] ? '0 0 0 0.25rem rgba(220,53,69,.25)' : base.boxShadow,
                    }),
                  }}
                />
              ) : type === 'async-multiselect' ? (
                <AsyncSelect
                  cacheOptions
                  defaultOptions={[]}
                  isMulti
                  loadOptions={loadOptions || (() => Promise.resolve([]))}
                  onChange={(selected) => {
                    const valores = Array.isArray(selected) ? selected.map(s => s.value) : [];
                    onInputChange(name, valores);
                    if (onChangeSelected) {
                      const objetosTutor = Array.isArray(selected)
                        ? selected.map(s => s.data || { id: s.value, nombre: s.label })
                        : [];
                      onChangeSelected(objetosTutor);
                    }
                  }}
                  value={selectedOptions || []}
                  classNamePrefix="react-select"
                  placeholder={`Buscar y seleccionar ${label.toLowerCase()}...`}
                  isDisabled={disabled}
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderColor: errors[name] ? '#dc3545' : base.borderColor,
                      boxShadow: errors[name] ? '0 0 0 0.25rem rgba(220,53,69,.25)' : base.boxShadow,
                    }),
                  }}
                  noOptionsMessage={() => 'Escribe al menos 2 caracteres'}
                />
              ) : type === "select" ? (
                <Select
                  options={opciones || []}
                  value={opciones ? opciones.find((opt) => opt.value === formData[name]) || null : null}
                  onChange={(selected) => handleSelectChange(selected, name)}
                  classNamePrefix="react-select"
                  placeholder={`Seleccione ${label.toLowerCase()}...`}
                  isDisabled={disabled}
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderColor: errors[name] ? '#dc3545' : base.borderColor,
                      boxShadow: errors[name] ? '0 0 0 0.25rem rgba(220,53,69,.25)' : base.boxShadow,
                    }),
                  }}
                />
              ) : type === "date" ? (
                <input
                  id={name}
                  name={name}
                  type="date"
                  className={`form-control ${errors[name] ? 'is-invalid' : ''}`}
                  value={isoToInputLocal(formData[name])}
                  onChange={handleChange}
                  required={required}
                  disabled={disabled}
                />
              ) : (
                <input
                  id={name}
                  name={name}
                  type={type || "text"}
                  className={`form-control ${errors[name] ? 'is-invalid' : ''}`}
                  value={formData[name] || ""}
                  onChange={handleChange}
                  required={required}
                  disabled={disabled}
                />
              )}
              {errors[name] && (
                <div className="invalid-feedback d-block">{errors[name]}</div>
              )}
            </div>
          ))}

          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}