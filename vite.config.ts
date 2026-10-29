import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react({ jsxRuntime: 'classic' }),   // ← só isto muda
    tailwindcss(),
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