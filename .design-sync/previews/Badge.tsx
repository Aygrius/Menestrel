import { Badge } from "menestrel";

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
    {children}
  </div>
);

export const Variants = () => (
  <Row>
    <Badge>Nível 12</Badge>
    <Badge variant="secondary">Raro</Badge>
    <Badge variant="outline">Comum</Badge>
    <Badge variant="ghost">Rascunho</Badge>
    <Badge variant="destructive">Envenenado</Badge>
    <Badge variant="link">Ver detalhes</Badge>
  </Row>
);

export const Statuses = () => (
  <Row>
    <Badge variant="default">Lendário</Badge>
    <Badge variant="secondary">Épico</Badge>
    <Badge variant="outline">Incomum</Badge>
    <Badge variant="destructive">Amaldiçoado</Badge>
  </Row>
);

export const Counts = () => (
  <Row>
    <Badge>1</Badge>
    <Badge variant="secondary">8</Badge>
    <Badge variant="destructive">99+</Badge>
    <Badge variant="outline">XP 2350</Badge>
  </Row>
);
