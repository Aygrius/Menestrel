-- ============================================================
-- 17/11/2026 — Personagem que muda de conta sai do "ativo" da conta antiga.
-- Usuário: "O personagem 'Aygrius' mudou de conta, porque ainda aparece para
-- a conta richardnanet?" Causa: profiles.pj_ativo_id da conta antiga seguia
-- apontando para ele (95), e essa conta é Mestre da mesa 33, onde Aygrius é
-- protagonista — então a RLS ainda deixa ler a ficha e o shell a carregava
-- como o personagem dela.
-- ============================================================
create or replace function public._menestrel_pj_trocou_de_conta()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.user_id is distinct from old.user_id then
    update public.profiles set pj_ativo_id = null
     where id = old.user_id and pj_ativo_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists personagens_trocou_de_conta on public.personagens;
create trigger personagens_trocou_de_conta
  after update of user_id on public.personagens
  for each row execute function public._menestrel_pj_trocou_de_conta();

-- O que já ficou para trás: ativo apontando para personagem de outra conta.
update public.profiles pr set pj_ativo_id = null
  from public.personagens p
 where p.id = pr.pj_ativo_id and p.user_id <> pr.id;
