import React, { useState, useEffect } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export default function CampoPassword({ valor, show }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(false); // Siempre que se abra el modal, oculta la contraseña
    }
  }, [show]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input
        type={visible ? 'text' : 'password'}
        value={valor}
        readOnly
        style={{ border: 'none', background: 'transparent', width: '150px' }}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {visible ? <FaEyeSlash /> : <FaEye />}
      </button>
    </div>
  );
}