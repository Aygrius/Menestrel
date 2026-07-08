// translate.js — manda o delta (chaves novas/alteradas) pra API da Anthropic
// e devolve as traduções em EN, mantendo path -> texto.

const GLOSSARY = `
Termos do projeto que NÃO devem ser traduzidos ou devem seguir tradução fixa:
- "Menestrel" -> mantém "Menestrel" (nome do produto, não traduz)
- "Tagmar" -> mantém "Tagmar" (nome de sistema de RPG)
- "Mestre" (de jogo) -> "GM" ou "Game Master" (já é o padrão usado no en existente)
- "Jogador" -> "Player"
- "Ficha" (de personagem) -> "sheet" ou "character sheet"
- "Forjar minha mesa" (CTA) -> já existe como "Forge my table" no en atual, manter esse padrão de tom
- Nomes próprios de pessoas em depoimentos (ex: "Rafael", "Marina Aguiar") -> NÃO traduzir
- "R$" -> "$" (já é a convenção usada no en existente)
`;

const SYSTEM_PROMPT = `Você é tradutor de copy de marketing PT-BR -> EN para o Menestrel RPG,
uma plataforma de mesa de RPG (Mestres & Jogadores, sistema Tagmar).

Tom: direto, ligeiramente épico/fantasioso mas sem exagero, copy de vendas
(estilo landing page SaaS). Preserve esse tom em inglês — não traduza ao pé
da letra, adapte pra ler natural e persuasivo em inglês, como copywriter
nativo escreveria.

${GLOSSARY}

Você receberá uma lista de itens, cada um com um "path" (não traduzir, é só
identificador) e um "pt" (texto a traduzir). Alguns itens têm "currentEn"
(tradução anterior que ficou desatualizada porque o pt mudou) — use como
referência de tom/estilo se ajudar, mas a tradução final deve refletir o
"pt" atual.

Listas (arrays) devem manter o mesmo número de itens, na mesma ordem.
Objetos com sub-chaves (como depoimentos com q/who/role) devem manter as
mesmas sub-chaves.

Responda APENAS com um JSON válido, sem markdown, sem explicação, no formato:
{"translations": [{"path": "...", "en": <mesmo tipo do pt original>}, ...]}`;

async function translateBatch(items, { apiKey, model = 'claude-sonnet-4-6' } = {}) {
  if (items.length === 0) return [];

  const userContent = JSON.stringify(
    items.map(({ path, pt, currentEn }) => ({ path, pt, ...(currentEn ? { currentEn } : {}) })),
    null,
    2
  );

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const textBlock = data.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('Resposta da API sem bloco de texto.');

  let cleaned = textBlock.text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Falha ao parsear JSON da API: ${err.message}\nResposta crua:\n${cleaned}`);
  }

  return parsed.translations;
}

module.exports = { translateBatch };
