import React from 'react';

export default function ConfirmarEliminar({ show, onClose, onConfirm, entidad, nombre }) {
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      borderRadius: '8px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(0,0,0,0.25)',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h5>Confirmar eliminación</h5>
        <p>¿Estás seguro que deseas eliminar al {entidad} <strong>{nombre}</strong>?</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}