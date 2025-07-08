import React from 'react';

export default function BotonCrear({ texto, onClick }) {
  return (
    <button className="btn btn-primary" onClick={onClick}>
      {texto}
    </button>
  );
}