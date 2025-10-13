import React from 'react';

export default function ConfirmarAccion({
  show,
  title = 'Confirmar',
  message = '',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmBtnClass = 'btn-primary',
  onConfirm,
  onClose,
  loading = false,
}) {
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
      borderRadius: '8px',
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(0,0,0,0.25)',
        maxWidth: '480px',
        width: '100%',
      }}>
        <h5 className="mb-3">{title}</h5>
        {typeof message === 'string' ? <p className="mb-0">{message}</p> : message}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>{cancelText}</button>
          <button className={`btn ${confirmBtnClass}`} onClick={onConfirm} disabled={loading}>
            {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
