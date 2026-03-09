/**
 * Entry point สำหรับหน้า Claim Form
 * MPA Structure - แต่ละหน้ามี entry แยก
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { prefetchDNS, preconnect } from 'react-dom';
import App from '../App';
import '../styles/main.css';

// React 19 Resource Preloading
prefetchDNS('https://api.line.me');
prefetchDNS('https://fonts.googleapis.com');
preconnect('https://static.line-scdn.net');
preconnect('https://fonts.gstatic.com', { crossOrigin: 'anonymous' });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
