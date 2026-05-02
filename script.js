import {createElement, StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './src/App.tsx';
import './src/index.css';

createRoot(document.getElementById('root')).render(
  createElement(StrictMode, null, createElement(App))
);
