# Menestrel — Roteiro de Regressão Manual

Rede de segurança até os testes automatizados cobrirem o app. Rodar **ao final de cada fase do plano** (e antes de qualquer deploy relevante). Tempo alvo: **10–15 min**.

**Setup:** duas contas — uma **Mestre (M)** e uma **Jogador (J)** — de preferência em dois navegadores/janelas anônimas lado a lado. Marque cada caixa; qualquer ❌ interrompe e vira investigação antes de seguir a fase.

---

## Bloco A — Entrada e shell (M)

- [ ] **A1. Login** com Google (ou e-mail+senha). Perfil carrega sem erro no console do navegador.
- [ ] **A2. Idioma:** alternar PT → EN na Topbar; os textos mudam nas telas principais. *(Preferência NÃO persiste ao recarregar — comportamento conhecido, tweaks vivem em memória. Tema claro/escuro não existe no produto; se aparecer qualquer toggle de tema, é regressão.)*
- [ ] **A3. Sidebar** colapsa e expande; seções do Mestre visíveis (incluindo **Itens da Campanha**).

## Bloco B — História e mesa (M)

- [ ] **B1. Criar história** (NovaHistoriaModal, multi-step) com data de jogo. Aparece na lista. *(Conta free: criar a 3ª deve ser bloqueado com mensagem de limite, não erro cru.)*
- [ ] **B2. Mesa ativa:** selecionar a história no CardDataJogoAtual; data/local aparecem no card; recarregar a página mantém a mesa ativa.
- [ ] **B3. Pausar/retomar** a história pelo card dela; badge de pausada aparece e some.

## Bloco C — Convite e personagem (M + J)

- [ ] **C1 (M). Gerar convite** na página de Convites da história; código aparece; copiar.
- [ ] **C2 (J). Criar personagem** pelo wizard (7 passos, incluindo grupos de armas e habilidades). PJ aparece no grid.
- [ ] **C3 (J). Aceitar convite** com o código; história aparece na aba Aventuras.
- [ ] **C4 (J). Ativar o PJ** (ficha abre — layout Tomo de Pedra, barras cheias na primeira vez).

## Bloco D — Ficha e estado (J)

- [ ] **D1. Vitalidade:** reduzir EH na barra; recarregar a página; valor persistiu (`estado_atual`).
- [ ] **D2. Condições:** subir Saúde para ~50; algum atributo/habilidade derivado reflete o ajuste.
- [ ] **D3. Teste de habilidade:** "Usar" uma habilidade → overlay do D20 abre, rola, resultado aparece — **e o evento chega na Central de Mensagens do Mestre** (Realtime).
- [ ] **D4. Retrato:** trocar avatar (galeria ou upload) sem erro.

## Bloco E — Loja e inventário (M + J)

- [ ] **E1 (M). Estocar a loja** da história (GerenciarLojaView) com 2–3 itens, um deles consumível com efeito.
- [ ] **E2 (M). Dar moedas** ao PJ (DarMoedasModal → RPC).
- [ ] **E3 (J). Comprar** um item com pagamento exato; moedas debitam certo; item entra no inventário.
- [ ] **E4 (J). Equipar** arma/armadura (slots corretos) e **usar** o consumível → barra/condição muda na hora (write-through em `estado_atual`) e evento aparece na Central de Mensagens.
- [ ] **E5 (J). Carga:** peso e capacidade recalculam ao equipar/guardar em container.

## Bloco F — Batalha (M + J, o bloco mais importante)

- [ ] **F1 (M). Criar batalha** com o PJ + 1 criatura; iniciar; ordem de iniciativa correta (VB desc, PJ antes de criatura).
- [ ] **F2 (M). Atacar o PJ** com a criatura: dano cai em cascata EH→AR→EF; PA decrementa; log registra.
- [ ] **F3 (J). Vez do jogador via ficha:** botão Batalha aparece sozinho (Realtime); agir na própria vez (ataque/teste); a ação **reflete na tela do Mestre** sem recarregar.
- [ ] **F4 (M). Status temporário:** aplicar um status com N rodadas; chip aparece; "Nova Rodada" decrementa; zera e some.
- [ ] **F5 (M). Cura:** restaurar pontos de EH/AR/EF de um participante.
- [ ] **F6 (M). Encerrar com sequelas** (restaurar = não): ficha do PJ (J) mostra a vitalidade final da batalha. *(Alternar: numa rodada futura, encerrar com restaurar = sim e conferir barras cheias.)*
- [ ] **F7. Rolagem livre:** FAB D20 e **FAB D10** abrem, rolam (1 = Falha Crítica, 10/20 = Crítico) e registram na Central de Mensagens. *(D10 é regressão direta do corte da Fase 0.2.)*

## Bloco G — Diário e lore (M + J)

- [ ] **G1 (M). GerenciarLoreView:** criar um NPC do zero **(salvar do Mestre = a chamada de 8 parâmetros consolidada na Fase 0.1 — se falhar aqui, é regressão da RPC)** e forkar um item do catálogo global (tag Mundo → editar → vira cópia sem erro).
- [ ] **G2 (M). Disponibilizar** o NPC e uma criatura para a história; testar **Liberar para personagem** restringindo a um PJ.
- [ ] **G3 (J). Diário:** o NPC liberado aparece em Disponíveis; importar; comentar; criar uma memória livre. *(Se houver 2º PJ: o item restrito no G2 NÃO aparece pra ele.)*
- [ ] **G4 (J). Lore própria:** criar entrada de lore como jogador (chamada de 9 parâmetros) e conferir que aparece marcada como sua.

## Bloco H — Itens da campanha (M)

- [ ] **H1. Criar item** em Itens da Campanha para a história ativa; editar; excluir. Sem tocar o catálogo global.

---

## Registro

| Data | Fase testada | Commit | Resultado | Observações |
|---|---|---|---|---|
| | | | | |

**Convenções:** console do navegador aberto durante todo o roteiro — warning novo é observação, erro novo é ❌. Blocos D3, F3 e F7 validam o Realtime/mesa_log; G1 valida a consolidação da RPC de lore; F6 valida o modelo `estado_atual`. Se uma fase do plano não tocar um bloco (ex.: i18n não mexe em batalha), o bloco pode ser pulado com anotação — na dúvida, roda inteiro.
