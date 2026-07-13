// src/data/schemas.ts
// ─────────────────────────────────────────────────────────────────────────────
// Schemas Zod escritos à mão (sem CLI do Supabase, como decidido).
// Cada schema descreve só os campos que o app realmente lê hoje — inferidos de
// historias.jsx e personagens.jsx. Campos extras vindos do banco não quebram:
// usamos .passthrough() pra preservar o que não tipamos ainda.
//
// Os tipos TS saem de graça via z.infer (ver no fim do arquivo).
// Quando uma tela precisar de um campo novo, adiciona aqui — fonte única.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

// ── historias ────────────────────────────────────────────────────────────────
// Lido em: historias.jsx (titulo, reino, introducao, estoque_loja,
// protagonista_ids, mestre_id, created_at, data_inicio, data_jogo, criatura_ids).
export const HistoriaSchema = z
  .object({
    id: z.union([z.number(), z.string()]), // bigint pode vir como number; tolerante
    mestre_id: z.string().nullable().optional(),
    titulo: z.string().nullable().optional(),
    reino: z.string().nullable().optional(),
    introducao: z.string().nullable().optional(),
    data_inicio: z.string().nullable().optional(),
    data_jogo: z.unknown().optional(),
    protagonista_ids: z.array(z.union([z.number(), z.string()])).nullable().optional(),
    criatura_ids: z.array(z.union([z.number(), z.string()])).nullable().optional(),
    estoque_loja: z.union([z.array(z.unknown()), z.object({ comercios: z.array(z.unknown()) }).passthrough()]).nullable().optional(),
    created_at: z.string().nullable().optional(),
    // Lidos em historias.jsx / shell.jsx:
    pausada: z.boolean().nullable().optional(),
    // Lidos em diario.jsx (GerenciarLoreView/DiarioView) — disponibilização de
    // lore por história. reino/cidade/npc por SLUG (migrations 014/015);
    // item/magia/habilidade/tecnica por NOME (migration 019, Fase 2).
    reino_ids: z.array(z.string()).nullable().optional(),
    cidade_ids: z.array(z.string()).nullable().optional(),
    npc_ids: z.array(z.string()).nullable().optional(),
    item_ids: z.array(z.string()).nullable().optional(),
    magia_ids: z.array(z.string()).nullable().optional(),
    habilidade_ids: z.array(z.string()).nullable().optional(),
    tecnica_ids: z.array(z.string()).nullable().optional(),
    // Liberação de lore por PJ (migration 017): { "tipo:ref_id": [pj_id, ...] }
    lore_acesso_pj: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough()

// ── personagens (resumo p/ listagem) ─────────────────────────────────────────
// O HistoriasList seleciona um subconjunto: id,nome,sobrenome,raca,profissao,user_id.
// O PersonagensList faz select('*'); os campos abaixo são os garantidos da lista.
export const PersonagemResumoSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    nome: z.string().nullable().optional(),
    sobrenome: z.string().nullable().optional(),
    raca: z.string().nullable().optional(),
    profissao: z.string().nullable().optional(),
    user_id: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
  })
  .passthrough() // select('*') traz muito mais (atributos, inventario JSONB, etc.)

// ── criaturas (resumo p/ vincular à história) ────────────────────────────────
// Lido em historias.jsx: id,nome,tipo,estagio.
export const CriaturaResumoSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    nome: z.string().nullable().optional(),
    tipo: z.string().nullable().optional(),
    estagio: z.union([z.number(), z.string()]).nullable().optional(),
  })
  .passthrough()

// ── public_profiles (enriquecimento de nomes) ────────────────────────────────
export const PublicProfileSchema = z
  .object({
    id: z.string(),
    full_name: z.string().nullable().optional(),
  })
  .passthrough()

// Helper: valida uma lista, tolerando linhas individuais inválidas sem derrubar
// a tela inteira. Linha inválida é logada e descartada (defensivo na Fase 1;
// na Fase 4, com strict, podemos endurecer).
export function parseList<T>(schema: z.ZodType<T>, rows: unknown): T[] {
  if (!Array.isArray(rows)) return []
  const out: T[] = []
  for (const row of rows) {
    const r = schema.safeParse(row)
    if (r.success) out.push(r.data)
    else console.warn('[schemas] linha inválida descartada:', r.error.issues)
  }
  return out
}

// ── Tipos inferidos (use estes no resto do código) ───────────────────────────
export type Historia = z.infer<typeof HistoriaSchema>
export type PersonagemResumo = z.infer<typeof PersonagemResumoSchema>
export type CriaturaResumo = z.infer<typeof CriaturaResumoSchema>
export type PublicProfile = z.infer<typeof PublicProfileSchema>
