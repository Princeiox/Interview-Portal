import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
          height: '100vh', width: '100%', padding: '20px', textAlign: 'center',
          backgroundColor: 'var(--color-bg)', color: 'var(--color-text-primary)'
        }}>
          <AlertTriangle size={64} style={{ color: 'var(--color-error)', marginBottom: '20px' }} />
          <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Something went wrong</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '30px', maxWidth: '500px', lineHeight: '1.6' }}>
            The application encountered an unexpected error. This often happens if the server is unreachable or there is no internet connection.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 24px', backgroundColor: 'var(--color-primary)', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold'
            }}
          >
            <RefreshCw size={18} /> Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
