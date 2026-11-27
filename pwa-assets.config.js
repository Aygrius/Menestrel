// Ícones do app instalado (PWA, 27/11/2026), gerados do selo em favicon.svg:
//   npx @vite-pwa/assets-generator
// O fundo dos ícones que o sistema recorta (Android "maskable" e o do
// iPhone) é o couro escuro da tela de carga (#120D08), não o branco padrão.
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

const couro = { background: '#120D08' }

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: couro },
    apple: { ...minimal2023Preset.apple, resizeOptions: couro },
  },
  images: ['public/favicon.svg'],
})
