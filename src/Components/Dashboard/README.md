# Dashboard components

- KpiCard: small numeric KPI card.
- ChartCard: container for charts with header/footer.
- LoadingSkeleton: generic loading placeholders.
- SimplePie: thin wrapper over Recharts Pie for quick pies.

Usage: import into `src/Pages/Inicio.jsx` and compose role-based sections.

Data: Use existing Services in `src/Services` and compute aggregations in the frontend. Prefer Promise.all for parallel fetch and handle errors defensively.

Notes:
- Recharts installed. You can add more charts similarly (BarChart/LineChart).
- Keep the route name `/inicio` and file name `Inicio.jsx` as requested.
