
import React from "react";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import "./index.css";
createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(StrictMode, null, /*#__PURE__*/React.createElement(App, null)));