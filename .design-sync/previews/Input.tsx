import { Input } from "menestrel";

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label style={{ display: "grid", gap: 6, maxWidth: 280 }}>
    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{label}</span>
    {children}
  </label>
);

const Stack = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "grid", gap: 16 }}>{children}</div>
);

export const Default = () => (
  <Stack>
    <Field label="Nome do personagem">
      <Input placeholder="Ex.: Thaddeus, o Bravo" />
    </Field>
  </Stack>
);

export const Types = () => (
  <Stack>
    <Field label="Texto">
      <Input type="text" defaultValue="Guerreiro" />
    </Field>
    <Field label="Nível">
      <Input type="number" defaultValue={12} />
    </Field>
    <Field label="Senha do mestre">
      <Input type="password" defaultValue="segredo" />
    </Field>
  </Stack>
);

export const States = () => (
  <Stack>
    <Field label="Desabilitado">
      <Input placeholder="Bloqueado" disabled />
    </Field>
    <Field label="Inválido">
      <Input defaultValue="??" aria-invalid />
    </Field>
  </Stack>
);
