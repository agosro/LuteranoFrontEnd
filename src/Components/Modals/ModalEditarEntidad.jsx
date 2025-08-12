import React from "react";
import { Modal, Button, Form } from "react-bootstrap";
import Select from "react-select";

export default function ModalEditarEntidad({
  show,
  onClose,
  campos,
  onSubmit,
  formData,
  onInputChange,
  onUsuarioChange,
}) {
  if (!show) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onInputChange(name, type === "checkbox" ? checked : value);
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
  };

  return (
    <Modal show={show} onHide={onClose} size="md" centered>
      <Modal.Header closeButton>
        <Modal.Title>Editar</Modal.Title>
      </Modal.Header>
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(formData);
        }}
      >
        {/* Input oculto para enviar id si existe */}
        {formData.id && (
          <input type="hidden" name="id" value={formData.id} />
        )}

        <Modal.Body>
          {campos.map(({ name, label, type, opciones, disabled, required }) => {
            if (type === "checkbox") {
              return (
                <Form.Group key={name} className="mb-3" controlId={name}>
                  <Form.Check
                    type="checkbox"
                    label={label}
                    name={name}
                    checked={!!formData[name]}
                    onChange={handleChange}
                    disabled={disabled}
                  />
                </Form.Group>
              );
            }
            if (type === "multiselect") {
              return (
                <Form.Group key={name} className="mb-3" controlId={name}>
                  <Form.Label>
                    {label}
                    {required && <span style={{ color: 'red' }}> *</span>}
                    </Form.Label>
                  <Select
                    isMulti
                    options={opciones}
                    value={opciones.filter((opt) =>
                      formData[name]?.includes(opt.value)
                    )}
                    onChange={(selected) => handleSelectChange(selected, name)}
                    classNamePrefix="react-select"
                    placeholder={`Seleccione ${label.toLowerCase()}...`}
                    isDisabled={disabled}
                  />
                </Form.Group>
              );
            }
            if (type === "select") {
              return (
                <Form.Group key={name} className="mb-3" controlId={name}>
                  <Form.Label>{label}</Form.Label>
                  <Select
                    options={opciones}
                    value={opciones.find((opt) => opt.value === formData[name]) || null}
                    onChange={(selected) => handleSelectChange(selected, name)}
                    classNamePrefix="react-select"
                    placeholder={`Seleccione ${label.toLowerCase()}...`}
                    isDisabled={disabled}
                  />
                </Form.Group>
              );
            }
            return (
              <Form.Group key={name} className="mb-3" controlId={name}>
                <Form.Label>{label}</Form.Label>
                <Form.Control
                  type={type || "text"}
                  name={name}
                  value={formData[name] || ""}
                  onChange={handleChange}
                  required={required && name !== "password"}
                  disabled={disabled}
                />
              </Form.Group>
            );
          })}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit">
            Guardar
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}