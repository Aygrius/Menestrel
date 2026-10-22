/* magias-chaves.test.js — a chave interna segue o nome (22/10/2026)
   Nictoataque (era "Ataque Infernal") e Sobrevivente (era "Abrigo") foram
   renomeadas e guardavam a chave antiga; o usuário pediu para arrumar. A
   chave deriva do nome (scripts/sql/magias-key-alinha-nome.sql), e o
   registro de efeitos é indexado por ela. */
import { describe, it, expect } from 'vitest';
import './magias-efeito.jsx';

describe('registro de efeitos com as chaves novas', () => {
  it('nictoataque e sobrevivente existem; as antigas não', () => {
    expect(window.magiaEfeitoDe('nictoataque')).toBeTruthy();
    expect(window.magiaEfeitoDe('ataque_infernal')).toBeFalsy();
    expect(window.MAGIA_FORA_DO_REGISTRO.sobrevivente).toBeTruthy();
    expect(window.MAGIA_FORA_DO_REGISTRO.abrigo).toBeUndefined();
  });
});
