import React from 'react'

export default function KpiCard({ title, value, hint, color = '#0d6efd' }) {
  return (
    <div className="card text-center shadow-sm border-0" style={{ minHeight: '120px' }}>
      <div className="card-body">
        <h6 className="card-title text-uppercase fw-semibold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
          {title}
        </h6>
        <h3 className="fw-bold mb-0" style={{ color }}>
          {value}
        </h3>
        {hint && <div className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>{hint}</div>}
      </div>
    </div>
  )
}
