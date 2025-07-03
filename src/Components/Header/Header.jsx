import React from 'react';
import { useAuth } from '../../Context/AuthContext';
import { FaUserCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="text-white d-flex justify-content-between align-items-center p-3" style={{backgroundImage: "linear-gradient(to right, #117864, #1abc9c )"}}> 
      <h5 className="m-0">Colegio Luterano Concordia</h5>

      <div className="d-flex align-items-center gap-3">
        <FaUserCircle size={24} />
        <span>{user?.nombre}</span>
        <button className="btn btn-light btn-sm" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
