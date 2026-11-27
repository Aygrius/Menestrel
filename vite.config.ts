import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react({ jsxRuntime: 'classic' }),   // ← só isto muda
    tailwindcss(),
    /* O MENESTREL INSTALÁVEL (PWA, 27/11/2026) ───────────────────────────────
       Chrome e Edge oferecem "Instalar Menestrel": ícone na área de trabalho e
       no menu Iniciar, janela própria sem barra de navegador. Ícones gerados
       do selo por `npx pwa-assets-generator` (pwa-assets.config.js).

       O service worker guarda o código (JS, CSS, HTML) para abrir rápido e se
       atualiza sozinho a cada deploy (`autoUpdate`). A arte (webp, jpg, png e
       os SVGs do mapa) não vai toda de uma vez — são ~190 imagens: cada uma
       fica guardada na primeira vez que aparece. O Supabase nunca passa pelo cache: dado de
       mesa é sempre o do banco. O bundle principal passa de 3 MB, daí o teto
       de 6 MB. */
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Menestrel',
        short_name: 'Menestrel',
        description: 'A mesa de Tagmar: o Mestre conduz a história, o Jogador vive a ficha.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#120D08',
        theme_color: '#120D08',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,ttf,woff2}'],
        globIgnores: ['mapa/**'],   // o mapa infernal sozinho passa de 6 MB
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Arte de public/ não tem hash no nome: mostra a guardada e busca a
            // nova por trás, para uma pintura trocada não ficar velha de vez.
            urlPattern: ({ sameOrigin, url }) => sameOrigin && /\.(webp|jpe?g|png|svg)$/i.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'menestrel-arte', expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
          {
            urlPattern: ({ url }) => ['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'].includes(url.origin),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'menestrel-fontes', expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  /* A PORTA DO DEV É FIXA, E É SÓ DO MENESTREL (27/10/2026) ─────────────────
     Sem porta fixa o Vite pega 5173 e, se estiver ocupada, ESCORREGA para
     5174, 5175… O login manda `redirectTo: window.location.origin`
     (04-auth/auth.jsx), e o Supabase só aceita origem que esteja na lista de
     Redirect URLs do projeto: a que não está ele troca pela Site URL — que é
     a da Vercel. Era isso que mandava quem entrava em :5175 para produção no
     meio do desenvolvimento.

     `strictPort` faz o servidor FALHAR em vez de escorregar: melhor um erro
     ao subir do que um login que termina em outro ambiente.

     5273, e não 5173: a 5173 é o padrão do Vite, e por isso é disputada com
     todo outro projeto aberto na mesma máquina (foi o CGAFAE que a tomou, e
     o `npm run dev` daqui passou a falhar). Porta própria não disputa com
     ninguém — o preço é uma linha no painel do Supabase, em Authentication →
     URL Configuration → Redirect URLs: `http://localhost:5273`. Sem essa
     linha o login daqui vai parar na Vercel.

     A 5174 fica para a prévia sem login (`npx vite --port 5174`, ver
     CLAUDE.md), que não faz login e por isso não precisa estar na lista. */
  server: { port: 5273, strictPort: true },
})