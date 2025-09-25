// src/Components/BackButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

export default function BackButton() {
  const navigate = useNavigate();

  return (
    <button 
      onClick={() => navigate(-1)} 
      className="btn-back d-flex align-items-center gap-2"
    >
      <FaArrowLeft /> Volver
    </button>
  );
}
