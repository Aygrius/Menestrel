# Menestrel Design System — conventions

Dark-only fantasy/TTRPG kit ("Pedra & Bronze"): warm parchment text on near-black
stone, gold (`#C9A44E`) as the primary accent, sharp (non-rounded) corners, compact
sizing. Built on `@base-ui/react` + Tailwind v4. Components import from `menestrel`
(at runtime they live on `window.MenestrelUI.*`).

## 1. Always wrap in `.menestrel-ui`

Every design token (`--primary`, `--background`, fonts, the dark `color-scheme`, the
base reset) is scoped under the **`.menestrel-ui`** class — NOT `:root`. A component
rendered outside that class falls back to browser defaults: unstyled, light, wrong
font. Wrap the screen/app root once:

```tsx
<div className="menestrel-ui" style={{ background: "var(--background)", color: "var(--foreground)", minHeight: "100vh" }}>
  {/* your screen */}
</div>
```

(An exported `MenestrelProvider` does exactly this wrap with padding — handy for
isolated snippets; for a full screen the plain `.menestrel-ui` div is cleaner.)

## 2. Styling idiom — tokens first, then the compiled utilities

The shipped stylesheet is a **frozen, pre-compiled** Tailwind build — there is **no
Tailwind JIT at design time**, so an arbitrary utility class (e.g. `bg-accent`,
`text-gold`, `gap-7`) will NOT resolve unless it was already compiled. Two reliable
ways to style:

**a) CSS variables (always resolve inside `.menestrel-ui`)** — prefer these for color
and custom layout glue:

- Surfaces: `var(--background)`, `var(--card)`, `var(--popover)`, `var(--secondary)`, `var(--muted)`
- Text: `var(--foreground)`, `var(--muted-foreground)`, `var(--card-foreground)`
- Accents: `var(--primary)` (gold), `var(--accent)`, `var(--destructive)`, `var(--border)`, `var(--input)`, `var(--ring)`
- Brand palette: `var(--gold)`, `var(--ember)` (red), `var(--orange)`, `var(--violet)`, `var(--ice)` (blue)
- Each color paired with `*-foreground` for text-on-color (e.g. `var(--primary-foreground)`).

**b) These semantic utility classes are compiled and safe to use:**
`bg-primary`, `text-primary-foreground`, `bg-secondary`, `text-secondary-foreground`,
`bg-card`, `bg-background`, `text-foreground`, `bg-muted`, `text-muted-foreground`,
`bg-destructive`, `text-destructive`, `border-border`, `border-input`. Common fl/grid
spacing utilities used by the app exist too, but when in doubt use inline styles.

**Aesthetic:** corners are square (`rounded-none`); type is small (`text-xs`, controls
~`h-8`). Don't round or enlarge the kit's controls.

## 3. Fonts

Served at runtime (Google Fonts). Body default: **Plus Jakarta Sans**. Display/headings:
**Cinzel** (serif, fantasy) — `style={{ fontFamily: "'Cinzel', serif" }}`. Prose:
**Lora**. Decorative: Pirata One, UnifrakturCook.

## 4. Where the truth lives

Read `_ds/<folder>/styles.css` (and its imports — `_ds_bundle.css` holds the full
compiled token + utility CSS) before styling, and each component's `<Name>.prompt.md`
+ `<Name>.d.ts` for its API. Compound parts are importable but uncarded: **Avatar**
(`AvatarImage`, `AvatarFallback`, `AvatarGroup`, `AvatarGroupCount`, `AvatarBadge`) and
**Table** (`TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`,
`TableCell`, `TableCaption`) — all take native element props.

## 5. Idiomatic example

```tsx
import { Button, Badge, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "menestrel";

export function PartyPanel() {
  return (
    <div className="menestrel-ui" style={{ background: "var(--background)", color: "var(--foreground)", padding: 24 }}>
      <h2 style={{ fontFamily: "'Cinzel', serif", color: "var(--primary)", margin: "0 0 16px" }}>Grupo</h2>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Input placeholder="Buscar personagem" />
        <Button>Adicionar</Button>
        <Badge variant="destructive">Envenenado</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Nome</TableHead><TableHead>Classe</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          <TableRow><TableCell>Thaddeus</TableCell><TableCell>Guerreiro</TableCell></TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
```
