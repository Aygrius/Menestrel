/* ============================================================
   setup-fases.ts — bootstrap de globals para testar arquivos de FASE
   ============================================================
   Os arquivos de fase (src/NN-*) não são ES modules: dependem de
   window.React, hooks soltos (useState etc.) e window.supabaseClient,
   providos no app real por src/bootstrap-globals.ts + 01-core/helpers.jsx.

   Este setup reproduz o mínimo disso pra que um teste possa fazer
   `import '../12-batalha/batalha.jsx'` e ler funções do window.

   REGRA: testes UNITÁRIOS não tocam rede — o stub de supabaseClient
   explode com mensagem clara se alguma função tentar usá-lo.
   ============================================================ */
import React from 'react';
import * as ReactDOMClient from 'react-dom/client';

const g = globalThis as any;

g.React = React;
g.ReactDOM = ReactDOMClient;

// Hooks soltos — espelha a desestruturação única de 01-core/helpers.jsx
Object.assign(g, {
  useState: React.useState,
  useEffect: React.useEffect,
  useLayoutEffect: React.useLayoutEffect,
  useRef: React.useRef,
  useMemo: React.useMemo,
  useCallback: React.useCallback,
  useContext: React.useContext,
});

// Supabase: proibido em teste unitário — falha alto e cedo.
g.supabaseClient = new Proxy(
  {},
  {
    get(_t, prop) {
      throw new Error(
        `supabaseClient.${String(prop)} chamado em teste unitário — ` +
          'funções puras não devem tocar rede; se o teste é de integração, troque o stub.'
      );
    },
  }
);
