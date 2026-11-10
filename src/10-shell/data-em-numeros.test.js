/* data-em-numeros.test.js — a data do rodapé em números (10/11/2026)
   Usuário: "No calendário do rodapé, vamos mostrar a data assim: 'Calcato,
   3/3/1499'... ao abrir o calendário poderá ser visto o nome do mês." */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const shell = fs.readFileSync(path.resolve(__dirname, 'shell.jsx'), 'utf8');

describe('a data do rodapé', () => {
  it('dia da semana, dia/mês/ano', () => {
    expect(shell).toMatch(/cdj-data-longa">\{`\$\{diaSemanaCap\}, \$\{dataAtual\.dia\}\/\$\{dataAtual\.mes\}\/\$\{dataAtual\.ano\}`\}/);
  });
  it('o nome do mês segue no calendário aberto', () => {
    expect(shell).toMatch(/const nomeMes = mesAtual\?\.nome/);
  });
});
