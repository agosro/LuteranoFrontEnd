import React from 'react'

export default function ChartCard({ title, right, children, footer }) {
  return (
    <div className="card shadow-sm border-0" style={{ minHeight: '260px' }}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <span className="fw-semibold">{title}</span>
        <div>{right}</div>
      </div>
      <div className="card-body">
        {children}
      </div>
      {footer && (
        <div className="card-footer text-muted" style={{ fontSize: '0.85rem' }}>
          {footer}
        </div>
      )}
    </div>
  )
}
