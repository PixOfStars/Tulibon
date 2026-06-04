import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

// Expose React globals for plugin scripts loaded via <script> tags
(window as any).React = React;
(window as any).ReactDOM = ReactDOM;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
