// Preview/design wrapper for the Menestrel design system.
//
// Menestrel scopes its design tokens (--background, --primary, fonts, the dark
// color-scheme, the base reset) under the `.menestrel-ui` class rather than
// `:root`. Components must therefore render inside an element carrying that
// class or they fall back to browser defaults (unstyled, light, wrong font).
//
// This provider supplies that wrapper so every preview card — and the floor
// cards for unauthored components — renders on the real dark "Pedra & Bronze"
// canvas with the correct token values in scope. Any design built with this DS
// must likewise be wrapped in `.menestrel-ui` (see conventions header).
import * as React from "react";

export function MenestrelProvider({ children }: { children?: React.ReactNode }) {
  return React.createElement(
    "div",
    {
      className: "menestrel-ui",
      style: {
        background: "var(--background, #15120C)",
        color: "var(--foreground, #E8DDC6)",
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        padding: "24px",
        // 100vh (not 100%) so the dark canvas fills the card without needing a
        // sized parent — Menestrel is dark-only, so a white card would misread.
        minHeight: "100vh",
        boxSizing: "border-box",
      },
    },
    children
  );
}
