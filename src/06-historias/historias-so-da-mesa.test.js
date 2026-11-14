/* ============================================================
   historias-so-da-mesa.test.js — auditoria 13/11/2026, item 5
   ============================================================
   `historias` tinha SELECT `true` para todo logado. Agora lê o Mestre da
   mesa ou o dono de um protagonista — os dois caminhos que o app usa.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const sql = fs.readFileSync(path.resolve(__dirname, '../../scripts/sql/historias-so-da-mesa-2026-11-14.sql'), 'utf8');

describe('a leitura de historias', () => {
  it('derruba o SELECT aberto e exige Mestre ou protagonista', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS historias_select_authenticated ON public.historias;');
    expect(sql).toMatch(/mestre_id = \(SELECT auth\.uid\(\)\)\s*\r?\n\s*OR protagonista_ids && \(SELECT public\._menestrel_meus_pjs\(\)\)/);
  });
  it('a lista dos meus PJs não fica com anon', () => {
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public._menestrel_meus_pjs() FROM PUBLIC, anon;');
  });
});
