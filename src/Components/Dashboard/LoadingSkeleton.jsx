import React from 'react'

export default function LoadingSkeleton({ blocks = 3, tall = false }) {
  return (
    <div className="row g-4 mb-4">
      {Array.from({ length: blocks }).map((_, i) => (
        <div key={i} className="col-md-3">
          <div className="card shadow-sm border-0" style={{ minHeight: tall ? '260px' : '120px' }}>
            <div className="card-body d-flex flex-column justify-content-center align-items-center">
              <div className="placeholder-glow w-100">
                <span className="placeholder col-6" style={{ height: '18px' }}></span>
              </div>
              <div className="placeholder-glow w-75 mt-3">
                <span className="placeholder col-8" style={{ height: tall ? '48px' : '32px' }}></span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
