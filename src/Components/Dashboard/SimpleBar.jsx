import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function SimpleBar({ data = [], valueKey = 'value', labelKey = 'name' }) {
  if (!Array.isArray(data) || data.length === 0) return <div className="text-muted">Sin datos</div>
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={labelKey} interval={0} angle={-25} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={valueKey} fill="#0d6efd" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
