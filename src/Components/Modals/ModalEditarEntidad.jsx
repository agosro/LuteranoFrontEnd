import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import Select from 'react-select';

export default function ModalEditarEntidad({ show, onClose, datosIniciales, campos, onSubmit }) {
  const [formData, setFormData] = useState({});

  // Función para procesar los datos iniciales y "aplanar" objetos para selects
  const procesarDatosIniciales = (datos) => {
    if (!datos) return {};

    const datosProcesados = { ...datos };
  
    // Ejemplo: si role es objeto, extraigo el name
    if (datos.role && typeof datos.role === 'object') {
      datosProcesados.role = datos.role.name || '';
    }

    // Agrega aquí otros campos que necesiten similar tratamiento, por ej:
    // if (datos.categoria && typeof datos.categoria === 'object') {
    //   datosProcesados.categoria = datos.categoria.id || '';
    // }

    return datosProcesados;
  };

  const formatearFecha = (fechaISO) => {
  if (!fechaISO) return '';
  return fechaISO.split('T')[0];
}

  useEffect(() => {
    if (show) {
      const datosParaForm = procesarDatosIniciales(datosIniciales);
      setFormData(datosParaForm);
    }
  }, [show, datosIniciales]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      fechaNacimiento: formatearFecha(datosIniciales.fechaNacimiento),
    }));
  };
  
  const handleReactSelectChange = (selectedOptions, name) => {
    setFormData(prev => ({
      ...prev,
      [name]: selectedOptions ? selectedOptions.map(opt => opt.value) : []
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal show={show} onHide={onClose} size="md">
      <Modal.Header closeButton>
        <Modal.Title>Editar Usuario</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {campos.map(({ name, label, type, opciones }) => {
            if (type === 'checkbox') {
              return (
                <Form.Group key={name} className="mb-3" controlId={name}>
                  <Form.Check
                    type="checkbox"
                    label={label}
                    name={name}
                    checked={!!formData[name]}
                    onChange={handleChange}
                  />
                </Form.Group>
              );
            }
            if (type === 'multiselect') {
              return (
                <Form.Group key={name} className="mb-3" controlId={name}>
                  <Form.Label>{label}</Form.Label>
                  <Select
                    isMulti
                    options={opciones}
                    value={opciones.filter(opt => formData[name]?.includes(opt.value))}
                    onChange={(selected) => handleReactSelectChange(selected, name)}
                    classNamePrefix="react-select"
                    placeholder={`Seleccione ${label.toLowerCase()}...`}
                  />
                </Form.Group>
              );
            }
            if (type === 'select') {
              return (
                <Form.Group key={name} className="mb-3" controlId={name}>
                  <Form.Label>{label}</Form.Label>
                  <Form.Select
                    name={name}
                    value={formData[name] || ''}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {opciones.map((opt) =>
                      typeof opt === 'object' ? (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ) : (
                        <option key={opt} value={opt}>{opt}</option>
                      )
                    )}
                  </Form.Select>
                </Form.Group>
              );
            }
            // Por defecto input tipo texto, email, password, number, etc.
            return (
              <Form.Group key={name} className="mb-3" controlId={name}>
                <Form.Label>{label}</Form.Label>
                <Form.Control
                  type={type || 'text'}
                  name={name}
                  value={formData[name] || ''}
                  onChange={handleChange}
                  required={name !== 'password'}
                />
              </Form.Group>
            );
          })}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit">Guardar</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}