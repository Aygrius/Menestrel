/* ============================================================
   assinatura.jsx — [Assinatura] o Pix das contas, por QR estático
   ============================================================
   Pedido do usuário em 17/11/2026: "Vamos criar o QR estático, com uma chave
   aleatória, a mensagem é 5,99 para conta simples, ou pagamento único de
   199,00 para conta de fundador." Conta simples = Nobre (mensal); conta de
   fundador = Conselheiro (vitalícia) — os tipos de 10-shell/contas.jsx.

   QR ESTÁTICO, SEM INTERMEDIÁRIO: o código é o BR Code do Banco Central
   (EMV, "Pix copia e cola") montado aqui mesmo, sem API e sem taxa. Ele não
   avisa o pagamento: quem confere é o Imperador, no extrato, e promove a
   conta em Configurações → Contas. O identificador (txid) leva o tipo e o
   começo do id da conta, para o extrato dizer quem pagou.

   A chave, o nome e a cidade do recebedor vêm do ambiente (.env.local e
   Vercel), fora do git: VITE_PIX_CHAVE, VITE_PIX_NOME, VITE_PIX_CIDADE. Sem
   eles, a janela diz que o Pix ainda não foi configurado.
   ============================================================ */
import QRCode from 'qrcode';

const { useState: useStateAss, useEffect: useEffectAss } = React;

const PLANOS_PIX = [
  { id: 'nobre', valor: 5.99,
    pt: 'Conta simples', en: 'Simple account', tipoPt: 'Nobre', tipoEn: 'Noble',
    quandoPt: 'por mês', quandoEn: 'a month' },
  { id: 'conselheiro', valor: 199,
    pt: 'Conta de fundador', en: 'Founder account', tipoPt: 'Conselheiro', tipoEn: 'Counselor',
    quandoPt: 'pagamento único', quandoEn: 'one-time payment' },
];

/* ── O BR Code (Manual do BR Code, Banco Central) ─────────────────────── */
const campoPix = (id, valor) => id + String(valor.length).padStart(2, '0') + valor;

// CRC16-CCITT (polinômio 0x1021, início 0xFFFF), sobre o texto com "6304".
function crc16Pix(texto) {
  let crc = 0xFFFF;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Nome e cidade: sem acento, só o que o padrão aceita, no tamanho do campo.
const textoPix = (s, max) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9 ]/g, '').trim().slice(0, max);
// txid: só letras e números, até 25; vazio vira "***" (o padrão para "sem").
const txidPix = (s) => String(s || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';

function payloadPix({ chave, nome, cidade, valor = null, txid = '' }) {
  const conta = campoPix('00', 'br.gov.bcb.pix') + campoPix('01', String(chave).trim());
  const corpo = campoPix('00', '01')
    + campoPix('26', conta)
    + campoPix('52', '0000')
    + campoPix('53', '986')
    + (valor != null ? campoPix('54', Number(valor).toFixed(2)) : '')
    + campoPix('58', 'BR')
    + campoPix('59', textoPix(nome, 25))
    + campoPix('60', textoPix(cidade, 15))
    + campoPix('62', campoPix('05', txidPix(txid)))
    + '6304';
  return corpo + crc16Pix(corpo);
}

function configPix() {
  const env = (import.meta && import.meta.env) || {};
  const chave = String(env.VITE_PIX_CHAVE || '').trim();
  const nome = String(env.VITE_PIX_NOME || '').trim();
  const cidade = String(env.VITE_PIX_CIDADE || '').trim();
  return chave && nome && cidade ? { chave, nome, cidade } : null;
}

const precoPix = (valor, en) => 'R$ ' + valor.toLocaleString(en ? 'en-US' : 'pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function AssinaturaModal({ lang = 'pt', userId = '', onClose }) {
  const en = lang === 'en';
  const Janela = (typeof ModalShell === 'function' ? ModalShell : window.ModalShell);
  const [plano, setPlano] = useStateAss('nobre');
  const [svg, setSvg] = useStateAss('');
  const [copiado, setCopiado] = useStateAss(false);
  const cfg = configPix();
  const escolhido = PLANOS_PIX.find((p) => p.id === plano) || PLANOS_PIX[0];
  const codigo = cfg ? payloadPix({
    ...cfg, valor: escolhido.valor,
    txid: (escolhido.id === 'nobre' ? 'NOBRE' : 'FUNDADOR') + String(userId).replace(/-/g, '').slice(0, 12),
  }) : '';

  useEffectAss(() => {
    let vivo = true;
    setCopiado(false);
    if (!codigo) { setSvg(''); return undefined; }
    QRCode.toString(codigo, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#17110A', light: '#FFFFFF' } })
      .then((s) => { if (vivo) setSvg(s); })
      .catch((e) => { console.error('[assinatura] QR não gerou:', e); if (vivo) setSvg(''); });
    return () => { vivo = false; };
  }, [codigo]);

  const copiar = async () => {
    try { await navigator.clipboard.writeText(codigo); setCopiado(true); }
    catch (e) { console.error('[assinatura] não copiou:', e); }
  };

  return (
    <Janela title={en ? 'Subscription' : 'Assinatura'} lang={lang} size="lg" extraClass="ass-modal" onClose={onClose}
      onConfirm={cfg ? copiar : undefined}
      confirmLabel={copiado ? (en ? 'Copied' : 'Copiado') : (en ? 'Copy Pix code' : 'Copiar código Pix')}>
      <div className="mn-passe mn-passe--igual ass-planos" role="radiogroup" aria-label={en ? 'Account' : 'Conta'}>
        {PLANOS_PIX.map((p) => {
          const marcado = p.id === plano;
          return (
            <button key={p.id} type="button" role="radio" aria-checked={marcado}
              className={'mn-celula ass-plano' + (marcado ? ' is-on' : '')}
              onClick={() => setPlano(p.id)}>
              <span className="mn-rotulo">{en ? p.en : p.pt} · {en ? p.tipoEn : p.tipoPt}</span>
              <span className={'mn-celula-valor' + (marcado ? ' mn-celula-valor--vivo' : '')}>
                {precoPix(p.valor, en)} <small>{en ? p.quandoEn : p.quandoPt}</small>
              </span>
            </button>
          );
        })}
      </div>

      {!cfg ? (
        <p className="ass-aviso" role="status">
          {en ? 'Pix is not set up yet. The key, name and city of the receiver are missing.'
              : 'O Pix ainda não foi configurado: faltam a chave, o nome e a cidade de quem recebe.'}
        </p>
      ) : (
        <div className="ass-pix">
          <div className="ass-qr" role="img" aria-label={(en ? 'Pix QR code, ' : 'QR Code Pix, ') + precoPix(escolhido.valor, en)}
            dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="ass-pix-txt">
            <span className="mn-rotulo">{en ? 'Pix copy and paste' : 'Pix copia e cola'}</span>
            <code className="ass-codigo">{codigo}</code>
            <p className="ass-frase">
              {en ? 'Pay in your bank app, by scanning the code or pasting it. Your account changes once the payment is confirmed.'
                  : 'Pague no app do seu banco, lendo o código ou colando o texto. A conta muda assim que o pagamento for conferido.'}
            </p>
          </div>
        </div>
      )}
    </Janela>
  );
}

Object.assign(window, { AssinaturaModal, payloadPix, crc16Pix, PLANOS_PIX });
