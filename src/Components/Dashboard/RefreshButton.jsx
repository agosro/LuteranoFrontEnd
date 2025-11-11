import React from 'react'

export default function RefreshButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="btn btn-sm btn-outline-secondary">
      Refrescar
    </button>
  )
}
