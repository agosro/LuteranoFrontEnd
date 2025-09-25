import React from 'react';
import ColegioIcon from '../../assets/logo1.png';

export default function Header() {
  return (
    <header 
      className="text-white d-flex align-items-center gap-2 p-3" 
      style={{ backgroundImage: "linear-gradient(to right, #0b5345, #117864)" }}
    >
      <img 
        src={ColegioIcon} 
        alt="Logo Colegio" 
        width="" 
        height="32" 
        className="me-2"
      />
      <h5 className="m-0">Colegio Luterano Concordia</h5>
    </header>
  );
}
