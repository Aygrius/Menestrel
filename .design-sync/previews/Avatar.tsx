import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
} from "menestrel";

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>{children}</div>
);

// Deterministic offline portrait (no network) — a crest-like data URI.
const crest =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'>
       <rect width='80' height='80' fill='#7A5E2A'/>
       <circle cx='40' cy='32' r='15' fill='#E8DDC6'/>
       <rect x='18' y='52' width='44' height='26' rx='13' fill='#E8DDC6'/>
     </svg>`
  );

export const Sizes = () => (
  <Row>
    <Avatar size="sm">
      <AvatarFallback>AR</AvatarFallback>
    </Avatar>
    <Avatar size="default">
      <AvatarFallback>KV</AvatarFallback>
    </Avatar>
    <Avatar size="lg">
      <AvatarFallback>TH</AvatarFallback>
    </Avatar>
  </Row>
);

export const WithImage = () => (
  <Row>
    <Avatar size="lg">
      <AvatarImage src={crest} alt="Aragorn" />
      <AvatarFallback>AR</AvatarFallback>
    </Avatar>
    <Avatar size="default">
      <AvatarImage src={crest} alt="Kvothe" />
      <AvatarFallback>KV</AvatarFallback>
    </Avatar>
  </Row>
);

export const Group = () => (
  <AvatarGroup>
    <Avatar>
      <AvatarFallback>AR</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>KV</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>TH</AvatarFallback>
    </Avatar>
    <AvatarGroupCount>+5</AvatarGroupCount>
  </AvatarGroup>
);

export const WithBadge = () => (
  <Row>
    <Avatar size="lg">
      <AvatarFallback>AR</AvatarFallback>
      <AvatarBadge />
    </Avatar>
    <Avatar size="lg">
      <AvatarFallback>KV</AvatarFallback>
      <AvatarBadge style={{ background: "var(--destructive)" }} />
    </Avatar>
  </Row>
);
