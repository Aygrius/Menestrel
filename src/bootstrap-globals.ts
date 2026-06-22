// src/bootstrap-globals.ts
// ─────────────────────────────────────────────────────────────────────────────
// PONTE de compatibilidade (Fase 0).
// Repõe os globais que os <script> de CDN forneciam no setup buildless:
// React, ReactDOM, THREE, os hooks "crus" (useState/...), a factory `supabase`
// e a config SUPABASE_URL/ANON_KEY (que antes vinham de um <script> no index.html).
//
// DEVE ser o 1º import do main.tsx: módulos ES avaliam na ordem de origem, então
// isto roda ANTES dos arquivos de fase — que dependem destes globais existirem.
// Removido na Fase 4, conforme cada arquivo passa a importar o que usa.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import * as ReactDOMClient from 'react-dom/client'
import * as ReactDOMMain from 'react-dom'
import * as THREE from 'three'
import * as supabaseJs from '@supabase/supabase-js'

const w = window as unknown as Record<string, unknown>

// React + hooks usados sem prefixo pelos arquivos de fase
w.React = React
const { useState, useEffect, useMemo, useRef } = React
Object.assign(w, { useState, useEffect, useMemo, useRef })

// ReactDOM como o UMD entregava: createRoot (client) + createPortal/flushSync (main).
// Cobre modais que eventualmente usem ReactDOM.createPortal.
w.ReactDOM = Object.assign({}, ReactDOMMain, ReactDOMClient)

// Three.js (hero/shaders) — pinado em r150 via package.json
w.THREE = THREE

// Factory global usada por src/01-core/supabase.jsx: `supabase.createClient(...)`
w.supabase = supabaseJs

// Config do Supabase — antes vinha de <script> no index.html, agora do .env.local
w.SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
w.SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
