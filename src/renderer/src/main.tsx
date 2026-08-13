import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.js'
import './styles/globals.css'

const el = document.getElementById('root')
if (el === null) throw new Error('renderer: missing #root')
void createRoot(el).render(React.createElement(React.StrictMode, null, React.createElement(App)))