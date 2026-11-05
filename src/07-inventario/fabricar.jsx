/* ============================================================
   [07] FABRICAR — a bancada do personagem
   ============================================================
   Pedido do usuário (06/10/2026):
     "Teremos um novo menu 'Fabricar', com todos os possíveis itens a serem
      fabricados, com sua 'receita' e itens necessários para o preparo."
     "Teste falho consome os materiais."

   A tela é a LOJA virada do avesso (31/10/2026: "A página de fabricar está
   toda fora do padrão"): a mesma grade de casas com a pintura do item, o
   mesmo leque, o mesmo painel à direita e a busca no trilho único da ficha.
   É o mesmo gesto — procurar numa lista e abrir —, e duas telas que fazem o
   mesmo gesto não devem ter desenhos diferentes. O que muda é a moeda: aqui
   não se paga em latão, paga-se em material e num teste de habilidade.

   SÓ O QUE O PERSONAGEM APRENDEU (31/10/2026): a bancada é o caderno dele,
   não o catálogo. A casa apagada é a receita que ele sabe mas não consegue
   fazer agora (falta material ou habilidade); o PAINEL diz o porquê, com
   tem/precisa em cada material, o teste e as horas de construção (pelo grupo
   do item — ver horasDeFabricacao).

   QUEM ESCREVE: esta tela não grava nada. Devolve a intenção pelo
   `onFabricar(receita)` e a ficha é quem rola o d20 (RolagemD20Overlay, que já
   mora lá), paga os materiais e grava o inventário por salvarItensFicha. Um
   escritor só do inventário — a razão é a mesma de sempre: a cópia da ficha
   pode estar velha, e dois escritores se atropelam.

   As regras puras — o que a receita pede, o que o personagem tem, o custo da
   tentativa e o prazo — moram em 01-core/fabricacao.jsx.
   A PÁGINA SAIU (02/11/2026, usuário: "Não precisamos de uma página
   fabricar, pois ao clicar na atividade fabricar, ao lado deve aparecer as
   receitas que o personagem sabe"). A escolha da receita mora na atividade
   Fabricar (PaginaAtividades, 11-ficha/paginas-ficha.jsx); daqui fica o
   corpo da receita, que o painel dela desenha.
   ============================================================ */

/* O CORPO DA RECEITA — o mesmo no painel da tela larga e na janela da
   estreita: o teste, o prazo, o rende e uma linha por material com
   tem/precisa. */
function ReceitaCorpo({
  receita, cat, estado, itens, catalogoBySlug, nomeDaHab, nomeDoMaterial,
  difLabel, motivoLabel, lang, emPainel = false,
}) {
  const en = lang === 'en';
  const mats = (window.materiaisDaReceita || (() => []))(receita);
  // Com as alternativas ("5 Ossos quaisquer", 31/10/2026).
  const disp = window.disponivelDoMaterial || ((its, m) => (window.materialDisponivel || (() => 0))(its, m.slug));
  const rende = (window.rendeDaReceita || (() => 1))(receita);
  const Icone = window.ItemIcone || null;
  const icone = (c) => (window.invItemIcon || (() => 'ti-box'))(c);
  return (
    <>
      {!emPainel && cat.descricao && <div className="det-desc">{cat.descricao}</div>}
      <div className="fab-receita">
        <dl className="loja-painel-dados fab-dados">
          <div><dt>{en ? 'Test' : 'Teste'}</dt><dd>{nomeDaHab(receita.habilidade_key)} · {difLabel(receita.dificuldade)}</dd></div>
          <div><dt>{en ? 'Time' : 'Tempo'}</dt><dd>{(window.horasDeFabricacao || (() => 0))(cat)} {en ? 'hours' : 'horas'}</dd></div>
          {rende > 1 && <div><dt>{en ? 'Makes' : 'Rende'}</dt><dd>{rende}</dd></div>}
        </dl>

        <ul className="fab-mats">
          {mats.map((m) => {
            const tem = disp(itens, m);
            const falta = tem < m.qtd;
            const cm = catalogoBySlug[m.slug];
            return (
              <li key={m.slug} className={'fab-mat' + (falta ? ' is-falta' : '')}>
                <span className="fab-mat-ic">
                  {Icone && cm ? <Icone cat={cm} icon={icone(cm)} /> : <i className={'ti ' + icone(cm)} aria-hidden="true" />}
                </span>
                <span className="fab-mat-nome">
                  {m.nome || nomeDoMaterial(m.slug)}
                  {m.ferramenta && <span className="fab-mat-ferramenta">{en ? ' · tool, 1 use' : ' · ferramenta, gasta 1 uso'}</span>}
                </span>
                <span className="fab-mat-conta">
                  <strong>{tem}</strong>
                  <span className="fab-mat-barra">/</span>
                  {m.qtd}
                </span>
              </li>
            );
          })}
        </ul>

        {/* A regra do custo, à vista e sempre — é a que surpreende. */}
        <p className="fab-receita-nota">
          {en
            ? 'The materials are spent on the attempt: if the roll fails, they are lost anyway.'
            : 'O material é gasto na tentativa: se o teste falhar, ele se perde do mesmo jeito.'}
        </p>

        {!estado.ok && (
          <div className="err-msg" role="alert">{motivoLabel(estado, cat)}</div>
        )}
      </div>
    </>
  );
}

Object.assign(window, { ReceitaCorpo });
