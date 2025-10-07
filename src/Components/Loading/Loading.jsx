import './Loading.css';

export default function Loading({ text = 'Cargando...' }) {
  return (
    <div className="app-loading-overlay" role="status" aria-live="polite">
      <div className="app-loading-spinner" />
      <p className="app-loading-text">{text}</p>
    </div>
  );
}
