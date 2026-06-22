import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  Badge,
} from "menestrel";

export const Party = () => (
  <Table>
    <TableCaption>Membros da campanha atual</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead>Personagem</TableHead>
        <TableHead>Classe</TableHead>
        <TableHead>Nível</TableHead>
        <TableHead style={{ textAlign: "right" }}>PV</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>Thaddeus</TableCell>
        <TableCell>Guerreiro</TableCell>
        <TableCell>12</TableCell>
        <TableCell style={{ textAlign: "right" }}>84 / 84</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Lyra</TableCell>
        <TableCell>Maga</TableCell>
        <TableCell>11</TableCell>
        <TableCell style={{ textAlign: "right" }}>52 / 60</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Borin</TableCell>
        <TableCell>Clérigo</TableCell>
        <TableCell>12</TableCell>
        <TableCell style={{ textAlign: "right" }}>70 / 72</TableCell>
      </TableRow>
    </TableBody>
    <TableFooter>
      <TableRow>
        <TableCell>Total</TableCell>
        <TableCell />
        <TableCell />
        <TableCell style={{ textAlign: "right" }}>206 / 216</TableCell>
      </TableRow>
    </TableFooter>
  </Table>
);

export const Inventory = () => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Item</TableHead>
        <TableHead>Raridade</TableHead>
        <TableHead style={{ textAlign: "right" }}>Peso</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>Espada longa</TableCell>
        <TableCell>
          <Badge variant="outline">Comum</Badge>
        </TableCell>
        <TableCell style={{ textAlign: "right" }}>1,5 kg</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Amuleto de Yendor</TableCell>
        <TableCell>
          <Badge>Lendário</Badge>
        </TableCell>
        <TableCell style={{ textAlign: "right" }}>0,2 kg</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Poção de veneno</TableCell>
        <TableCell>
          <Badge variant="destructive">Amaldiçoado</Badge>
        </TableCell>
        <TableCell style={{ textAlign: "right" }}>0,3 kg</TableCell>
      </TableRow>
    </TableBody>
  </Table>
);
