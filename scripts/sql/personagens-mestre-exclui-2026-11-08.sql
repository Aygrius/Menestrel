-- O MESTRE EXCLUI A FICHA DO JOGADOR DA SUA HISTÓRIA (08/11/2026).
-- Usuário: "Essa mensagem está aparecendo em Jogadores: 'Convite usado não se
-- exclui — ele some junto com o personagem.' eu quero excluir o personagem."
--
-- SELECT e UPDATE já aceitavam o Mestre da história em que o personagem é
-- protagonista (personagens_*_own_or_vinculado); o DELETE só aceitava o dono,
-- e o "Excluir ficha" do Mestre voltava sem erro e sem apagar nada. Esta
-- política dá ao DELETE a mesma condição. O convite usado vai junto (FK
-- convites_historia.personagem_id ON DELETE CASCADE).
--
-- Para desfazer: drop policy personagens_mestre_delete on public.personagens;

create policy personagens_mestre_delete on public.personagens
  for delete
  using (exists (
    select 1 from public.historias h
    where h.mestre_id = auth.uid() and personagens.id = any (h.protagonista_ids)
  ));
