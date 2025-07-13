import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import EmbedScreen from './EmbedScreen';

console.log("🚀 main-embed.jsx loaded");

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <EmbedScreen />
  </React.StrictMode>
);
