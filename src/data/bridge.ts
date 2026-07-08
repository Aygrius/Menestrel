// src/data/bridge.ts
// ─────────────────────────────────────────────────────────────────────────────
// HOOK-PONTE (Fase 1).
// Expõe no window hooks de leitura prontos, que internamente usam React Query
// + validam com Zod. As telas antigas (global) chamam quase igual ao que já
// faziam, sem precisar virar ESM agora — isso é trabalho da Fase 3.
//
// Regra de uso: estes hooks SÓ podem ser chamados DENTRO da árvore React que
// está sob o <QueryClientProvider> (ver main.tsx). As telas antigas renderizam
// dentro do <App/>, então estão cobertas.
//
// Importante: a lógica de cada query replica EXATAMENTE o carregar() de hoje
// (mesmos selects, filtros e ordenação), só que com cache, loading e erro
// gerenciados pelo React Query. Comportamento de dados idêntico ao atual.
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  HistoriaSchema,
  PersonagemResumoSchema,
  CriaturaResumoSchema,
  PublicProfileSchema,
  parseList,
  type Historia,
  type PersonagemResumo,
  type CriaturaResumo,
} from './schemas'

// supabaseClient é global (src/01-core/supabase.jsx). Tipamos como any aqui —
// a tipagem fina do cliente Supabase é trabalho de fase posterior.
declare const supabaseClient: any

// ─────────────────────────────────────────────────────────────────────────────
// HISTÓRIAS — replica HistoriasList.carregar(): 3 queries em paralelo.
// (historias do mestre + personagens resumidos + criaturas)
// ─────────────────────────────────────────────────────────────────────────────
type HistoriasData = {
  historias: Historia[]
  personagens: PersonagemResumo[]
  criaturas: CriaturaResumo[]
}

function useHistoriasData(currentUserId: string | null | undefined) {
  return useQuery<HistoriasData>({
    queryKey: ['historias', currentUserId],
    enabled: !!currentUserId, // não dispara sem usuário (como o if (currentUserId) atual)
    queryFn: async () => {
      const [hRes, pRes, cRes] = await Promise.all([
        supabaseClient
          .from('historias')
          .select('*')
          .eq('mestre_id', currentUserId)
          .order('created_at', { ascending: false }),
        supabaseClient
          .from('personagens')
          .select('id,nome,sobrenome,raca,profissao,user_id'),
        supabaseClient
          .from('criaturas')
          .select('id,nome,tipo,estagio')
          .order('nome', { ascending: true }),
      ])
      // historias: erro aqui é fatal pra tela (como o setError + setHistorias([]))
      if (hRes.error) throw new Error(hRes.error.message)
      return {
        historias: parseList(HistoriaSchema, hRes.data),
        // personagens/criaturas: erro era silencioso (mantinha []), preservamos
        personagens: pRes.error ? [] : parseList(PersonagemResumoSchema, pRes.data),
        criaturas: cRes.error ? [] : parseList(CriaturaResumoSchema, cRes.data),
      }
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONAGENS — replica PersonagensList.carregar() nos DOIS modos.
//   master: protagonista_ids das histórias do mestre → personagens desses ids
//   player: os próprios PJs + RPC listar_minhas_mesas (selo "sem mesa")
// Ambos enriquecem com public_profiles (id → full_name).
// ─────────────────────────────────────────────────────────────────────────────
type PersonagensData = {
  personagens: PersonagemResumo[]
  profilesMap: Record<string, string | null | undefined>
  idsComMesa: string[] // Set vira array p/ serializar; a tela reconstrói o Set
  // Modo master: a que história (id) cada personagem pertence — permite a
  // tela filtrar pela mesa ativa (seletor do canto). Vazio no modo player.
  historiaIdPorPersonagem: Record<string, number | string>
}

async function enriquecerProfiles(
  rows: PersonagemResumo[],
): Promise<Record<string, string | null | undefined>> {
  const userIds = [...new Set(rows.map((p) => p.user_id).filter(Boolean))] as string[]
  if (userIds.length === 0) return {}
  const { data } = await supabaseClient
    .from('public_profiles')
    .select('id, full_name')
    .in('id', userIds)
  const map: Record<string, string | null | undefined> = {}
  parseList(PublicProfileSchema, data).forEach((pr) => {
    map[pr.id] = pr.full_name
  })
  return map
}

function usePersonagensData(
  profile: 'master' | 'player',
  currentUserId: string | null | undefined,
) {
  return useQuery<PersonagensData>({
    queryKey: ['personagens', profile, currentUserId],
    queryFn: async () => {
      const isMaster = profile === 'master'

      if (isMaster) {
        const { data: hist, error: errH } = await supabaseClient
          .from('historias')
          .select('id, protagonista_ids')
          .eq('mestre_id', currentUserId)
        if (errH) throw new Error(errH.message)
        const historiaIdPorPersonagem: Record<string, number | string> = {}
        ;(hist || []).forEach((h: any) => {
          (h.protagonista_ids || []).forEach((pid: string) => {
            historiaIdPorPersonagem[pid] = h.id
          })
        })
        const ids = [
          ...new Set((hist || []).flatMap((h: any) => h.protagonista_ids || [])),
        ]
        if (ids.length === 0) {
          return { personagens: [], profilesMap: {}, idsComMesa: [], historiaIdPorPersonagem: {} }
        }
        const { data, error } = await supabaseClient
          .from('personagens')
          .select('*')
          .in('id', ids)
          .order('created_at', { ascending: false })
        if (error) throw new Error(error.message)
        const personagens = parseList(PersonagemResumoSchema, data)
        return {
          personagens,
          profilesMap: await enriquecerProfiles(personagens),
          idsComMesa: [], // selo "sem mesa" é só do modo jogador
          historiaIdPorPersonagem,
        }
      }

      // JOGADOR
      let q = supabaseClient
        .from('personagens')
        .select('*')
        .order('created_at', { ascending: false })
      if (currentUserId) q = q.eq('user_id', currentUserId)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      const personagens = parseList(PersonagemResumoSchema, data)
      const profilesMap = await enriquecerProfiles(personagens)

      // RPC do selo "sem mesa" — cosmética; falha silenciosa como no original.
      let idsComMesa: string[] = []
      try {
        const { data: mesas } = await supabaseClient.rpc('listar_minhas_mesas')
        const arr = Array.isArray(mesas) ? mesas : mesas ? JSON.parse(mesas) : []
        const vinc = new Set<string>()
        arr.forEach((m: any) =>
          (m.meus_pjs || []).forEach((p: any) => vinc.add(p.id)),
        )
        idsComMesa = [...vinc]
      } catch {
        /* selo é cosmético */
      }

      return { personagens, profilesMap, idsComMesa, historiaIdPorPersonagem: {} }
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook utilitário pra invalidar (usar após insert/update/delete nas telas).
// Ex.: window.invalidarMenestrel(['historias']) força recarregar a lista.
// ─────────────────────────────────────────────────────────────────────────────
function useInvalidar() {
  const qc = useQueryClient()
  return (key: unknown[]) => qc.invalidateQueries({ queryKey: key })
}

// ── Exposição no window (a ponte) ────────────────────────────────────────────
Object.assign(window, {
  useHistoriasData,
  usePersonagensData,
  useInvalidar,
})
