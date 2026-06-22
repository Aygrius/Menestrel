import { Button } from "menestrel";

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
    {children}
  </div>
);

export const Variants = () => (
  <Row>
    <Button>Rolar dados</Button>
    <Button variant="secondary">Salvar ficha</Button>
    <Button variant="outline">Ver inventário</Button>
    <Button variant="ghost">Cancelar</Button>
    <Button variant="destructive">Excluir personagem</Button>
    <Button variant="link">Saiba mais</Button>
  </Row>
);

export const Sizes = () => (
  <Row>
    <Button size="xs">Extra pequeno</Button>
    <Button size="sm">Pequeno</Button>
    <Button size="default">Padrão</Button>
    <Button size="lg">Grande</Button>
  </Row>
);

export const IconSizes = () => (
  <Row>
    <Button size="icon-xs" aria-label="adicionar">+</Button>
    <Button size="icon-sm" variant="outline" aria-label="adicionar">+</Button>
    <Button size="icon" variant="secondary" aria-label="adicionar">+</Button>
    <Button size="icon-lg" variant="ghost" aria-label="adicionar">+</Button>
  </Row>
);

export const Disabled = () => (
  <Row>
    <Button disabled>Atacar</Button>
    <Button variant="outline" disabled>Defender</Button>
    <Button variant="destructive" disabled>Fugir</Button>
  </Row>
);
