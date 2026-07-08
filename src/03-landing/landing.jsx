/* ============================================================
   LANDING — Repaginação glassy (Fase 3, v3)
   ============================================================
   Cards glassy (translúcido + blur + filete de gradiente) via componente
   <Card>, glows ambiente por seção, hero com glows em camadas, corpo em
   Plus Jakarta Sans, títulos em Cinzel. Estilos críticos inline (sempre
   renderizam). Cores via var(--token) do .menestrel-ui.
   Lógica preservada: objeto `t`, Icon, shaders, onSignup, FAQ, romanize.
   REQUER: Plus Jakarta Sans carregada no index.html.
   ============================================================ */

const C = { grad: 'linear-gradient(90deg,#B8472F,#B8702E,#C9A44E,#B8862E,#7A5E2A)', gold: '#C9A44E', goldText: '#1C1407' };
const FD = "'Cinzel',serif";
const FB = "'Plus Jakarta Sans',system-ui,sans-serif";

const S = {
  section: { padding: 'clamp(72px,10vw,140px) 24px', background: 'var(--background)', position: 'relative', overflow: 'hidden' },
  page: (max = 1200) => ({ maxWidth: max, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }),
  eyebrow: { fontFamily: FD, fontSize: 22, fontWeight: 700, textTransform: 'uppercase', backgroundImage: C.grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', display: 'inline-block' },
  h2: { fontFamily: FD, fontWeight: 700, lineHeight: 1.1, color: 'var(--foreground)', fontSize: 'clamp(32px,4.6vw,56px)', margin: 0 },
  lead: { fontFamily: FB, fontSize: 18, lineHeight: 1.75, color: 'var(--muted-foreground)', margin: 0 },
  // btnPrimary/btnGhost migraram para classes CSS .lp-btn-primary/.lp-btn-ghost (index.css) —
  // parte da padronização geral do sistema de botões do projeto.
  tag: { display: 'inline-flex', alignItems: 'center', gap: 7, background: '#2C2417', border: '1px solid #5A4422', borderRadius: 999, padding: '6px 13px', fontSize: 18, color: 'var(--gold)', fontFamily: FB },
};

const Glow = ({ style }) => (
  <div aria-hidden="true" style={{ position: 'absolute', pointerEvents: 'none', borderRadius: 6, filter: 'blur(60px)', ...style }} />
);

const Card = ({ children, style, filete = true }) => (
  <div style={{ position: 'relative', overflow: 'hidden', background: 'rgba(34,29,21,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 26, boxShadow: '0 24px 60px -30px rgba(0,0,0,.7)', ...style }}>
    {filete && <div aria-hidden="true" style={{ position: 'absolute', inset: '0 0 auto 0', height: 2, background: C.grad }} />}
    {children}
  </div>
);

const CheckDot = ({ size = 20, bg = C.gold, color = C.goldText, style }) => (
  <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', width: size, height: size, borderRadius: 6, background: bg, color, ...style }}>
    <Icon.Check style={{ width: Math.round(size * 0.58), height: Math.round(size * 0.58) }} />
  </span>
);

const SectionGlow = ({ tint = '#B8862E40' }) => (
  <Glow style={{ width: 740, height: 400, left: '50%', top: '58%', transform: 'translate(-50%,-50%)', background: `radial-gradient(closest-side,${tint},transparent)` }} />
);

const HOrnament = () => null;

function romanize(num) {
  const map = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return map[num - 1] || num;
}

// ---------- Hero ----------
function Hero({ t, onSignup, shader, shaderKind, mode }) {
  return (
    <section className="menestrel-ui" id="top" style={{ ...S.section, padding: 'clamp(150px,16vw,230px) 24px clamp(90px,11vw,150px)' }}>
      {shader && shaderKind === 'mesh' && <MeshGradientShader opacity={0.85} dots={true} />}
      {shader && shaderKind !== 'mesh' && (
        <ShaderAnimation tint={mode === 'modern' ? 'cool' : 'blood'} opacity={mode === 'modern' ? 0.45 : 0.5} blend="screen" />
      )}
      <Glow style={{ width: 460, height: 240, left: '50%', top: '42%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(closest-side,#C9A44E30,transparent)', filter: 'blur(50px)' }} />
      <Glow style={{ width: 380, height: 380, left: -80, top: -40, background: 'radial-gradient(closest-side,#B8862E45,transparent)', filter: 'blur(60px)' }} />
      <Glow style={{ width: 380, height: 380, right: -80, bottom: -40, background: 'radial-gradient(closest-side,#7A5E2A33,transparent)', filter: 'blur(60px)' }} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(24,18,8,.35) 0%, transparent 22%, transparent 70%, #15120C 100%)' }} />
      <div style={{ ...S.page(1200), zIndex: 2, textAlign: 'center' }}>
        <span style={S.eyebrow}>{t.hero.eyebrow}</span>
        <h1 style={{ fontFamily: FD, fontWeight: 700, lineHeight: 1.08, color: 'var(--foreground)', fontSize: 'clamp(46px,8vw,88px)', margin: '18px 0 0' }}>
          <span style={{ display: 'block' }}>{t.hero.h1_pre}</span>
          {t.hero.h1_accent && (
            <span style={{ display: 'block', backgroundImage: C.grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', paddingBottom: '0.08em' }}>{t.hero.h1_accent}</span>
          )}
          {t.hero.h1_post && <span style={{ display: 'block' }}>{t.hero.h1_post}</span>}
        </h1>
        <p style={{ ...S.lead, maxWidth: 560, margin: '26px auto 0', fontSize: 18 }}>{t.hero.sub}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginTop: 40 }}>
          <button className="lp-btn-primary" onClick={onSignup}>{t.cta_main}</button>
          <a href="#planos" className="lp-btn-ghost">{t.cta_ghost}</a>
        </div>
        {Array.isArray(t.hero.micro) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 24px', justifyContent: 'center', marginTop: 28 }}>
            {t.hero.micro.map((m) => (
              <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: FB, fontSize: 14.5, color: 'var(--muted-foreground)' }}>
                <CheckDot size={17} bg="rgba(201,164,78,0.16)" color={C.gold} />{m}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Opening ----------
function Opening({ t }) {
  return (
    <section className="menestrel-ui" id="cap1" style={S.section}>
      <div style={{ ...S.page(), display: 'grid', gap: 'clamp(32px,5vw,72px)', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
        <div>
          <span style={S.eyebrow}>{t.opening.eyebrow}</span>
          <h2 style={{ ...S.h2, marginTop: 14 }}>{t.opening.h}</h2>
        </div>
        <div>
          <p style={{ ...S.lead, marginBottom: 18 }}>{t.opening.p1}</p>
          <p style={{ ...S.lead, marginBottom: 18 }}>{t.opening.p2}</p>
          <p style={{ fontFamily: FD, fontSize: 22, lineHeight: 1.4, color: 'var(--foreground)', margin: '24px 0 0' }}>{t.opening.p3}</p>
        </div>
      </div>
    </section>
  );
}

// ---------- Pain ----------
function Pain({ t }) {
  return (
    <section className="menestrel-ui" style={S.section}>
      <SectionGlow tint="#B8702E30" />
      <div style={S.page()}>
        <div style={{ textAlign: 'center' }}>
          <span style={S.eyebrow}>{t.pain.eyebrow}</span>
          <h2 style={{ ...S.h2, marginTop: 14 }}>
            <span style={{ backgroundImage: C.grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{t.pain.h1_accent}</span>{t.pain.h}
          </h2>
        </div>
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit,minmax(350px,1fr))', marginTop: 56 }}>
          {t.pain.list.map((p, i) => (
            <Card key={i}>
              <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>{romanize(i + 1)}</div>
              <p style={{ ...S.lead, fontSize: 18, marginTop: 12 }}>{p}</p>
            </Card>
          ))}
        </div>
        <p style={{ fontFamily: FD, fontSize: 22, lineHeight: 1.4, color: 'var(--foreground)', textAlign: 'center', maxWidth: 800, margin: '56px auto 0', position: 'relative', zIndex: 1 }}>{t.pain.quote}</p>
      </div>
    </section>
  );
}

// ---------- Solution (seção "pergaminho" — clara) ----------
function Solution({ t }) {
  const INK = '#2A1C08';
  const INK_MUT = '#6E5E3C';
  const tree = t.solution.tree || [];
  const pill = (extra) => ({ display: 'inline-flex', alignItems: 'center', gap: 9, borderRadius: 999, background: '#FFFFFF', border: '1px solid rgba(42,28,8,0.08)', boxShadow: '0 14px 34px -20px rgba(42,28,8,0.45)', fontFamily: FD, fontWeight: 700, color: INK, ...extra });
  return (
    <section className="menestrel-ui" id="recursos" style={{ ...S.section, background: '#F4EEE2' }}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.9), transparent 55%), radial-gradient(80% 60% at 88% 100%, rgba(184,112,46,0.10), transparent 60%), radial-gradient(80% 60% at 10% 100%, rgba(106,85,48,0.10), transparent 60%)' }} />
      <div style={S.page(1240)}>
        <div style={{ textAlign: 'center', maxWidth: 820, margin: '0 auto' }}>
          <span style={pill({ padding: '9px 18px', fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.04em' })}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 6, background: C.grad, flex: '0 0 auto' }} />
            {t.solution.eyebrow}
          </span>
          <h2 style={{ ...S.h2, color: INK, marginTop: 22 }}>{t.solution.h}</h2>
          <p style={{ ...S.lead, color: INK_MUT, marginTop: 18 }}>{t.solution.p1}</p>
        </div>

        {tree.length > 0 && (
          <div style={{ display: 'grid', gap: '32px 24px', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginTop: 'clamp(48px,6vw,84px)', alignItems: 'start' }}>
            {tree.map((col, i) => {
              const off = tree.length - 1 - i;
              return (
                <div key={i} style={{ marginTop: `min(${off * 36}px, ${off * 3}vw)` }}>
                  <span style={pill({ padding: '11px 19px', fontSize: 18 })}>
                    <span aria-hidden="true" style={{ width: 13, height: 13, borderRadius: 6, flex: '0 0 auto', border: '3px solid transparent', background: `linear-gradient(#fff,#fff) padding-box, ${C.grad} border-box` }} />
                    {col.label}
                  </span>
                  <div style={{ position: 'relative', margin: '20px 0 0 18px', paddingLeft: 26 }}>
                    <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 2, background: 'linear-gradient(180deg,#B8702E,#C9A44E,#B8862E,#7A5E2A)', opacity: 0.75 }} />
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 17 }}>
                      {(col.items || []).map((it, j) => (
                        <li key={j} style={{ fontFamily: FB, fontSize: 16.5, color: INK_MUT }}>{it}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 'clamp(48px,6vw,84px)', position: 'relative' }}>
          <p style={{ fontFamily: FD, fontSize: 22, lineHeight: 1.4, color: INK, maxWidth: 720, margin: '0 auto' }}>{t.solution.p2}</p>
          <p style={{ ...S.lead, color: INK_MUT, fontSize: 16, maxWidth: 640, margin: '14px auto 24px' }}>{t.solution.card_p}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {t.solution.systems.map((s) => (
              <span key={s} style={{ borderRadius: 999, border: '1px solid rgba(42,28,8,0.12)', background: '#FFFFFF', boxShadow: '0 8px 22px -16px rgba(42,28,8,0.4)', padding: '8px 16px', fontSize: 15, fontFamily: FB, fontWeight: 500, color: INK }}>{s}</span>
            ))}
            <span style={{ borderRadius: 999, padding: '8px 16px', fontSize: 15, fontWeight: 700, fontFamily: FB, color: C.goldText, background: C.gold, boxShadow: '0 10px 24px -14px rgba(201,164,78,0.8)' }}>+ {t.solution.custom}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Benefits (stage cards) ----------
function Benefits({ t, onSignup }) {
  const stages = t.benefits.stages || [];
  return (
    <section className="menestrel-ui" style={S.section}>
      <SectionGlow tint="#B8862E40" />
      <div style={S.page(1280)}>
        <div style={{ textAlign: 'center', maxWidth: 780, margin: '0 auto' }}>
          <span style={S.eyebrow}>{t.benefits.eyebrow}</span>
          <h2 style={{ ...S.h2, marginTop: 14 }}>{t.benefits.h}</h2>
          {t.benefits.sub && <p style={{ ...S.lead, marginTop: 18 }}>{t.benefits.sub}</p>}
        </div>
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', marginTop: 64, alignItems: 'stretch' }}>
          {stages.map((st, i) => {
            const featured = !!st.featured;
            return (
              <Card key={i} filete={!featured} style={{
                display: 'flex', flexDirection: 'column', minHeight: 380, padding: 28,
                ...(featured ? { border: '1px solid rgba(201,164,78,0.45)', background: 'linear-gradient(165deg, rgba(106,85,48,0.42), rgba(34,29,21,0.62) 45%, rgba(24,18,8,0.72))' } : {}),
              }}>
                {featured && <div aria-hidden="true" style={{ position: 'absolute', left: '-15%', right: '-15%', top: '-35%', height: '65%', background: 'radial-gradient(closest-side, rgba(201,164,78,0.20), rgba(106,85,48,0.18) 55%, transparent)', filter: 'blur(28px)', pointerEvents: 'none' }} />}
                <div style={{ position: 'relative' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, borderRadius: 999, padding: '8px 15px', background: featured ? 'rgba(24,18,8,0.55)' : 'rgba(44,36,23,0.7)', border: '1px solid rgba(255,255,255,0.10)', fontFamily: FB, fontSize: 14.5, fontWeight: 600, color: 'var(--foreground)' }}>
                    <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 6, flex: '0 0 auto', background: featured ? C.gold : '#A07A3A', boxShadow: featured ? '0 0 9px rgba(201,164,78,0.9)' : '0 0 9px rgba(106,85,48,0.9)' }} />
                    {st.badge}
                  </span>
                </div>
                <h3 style={{ fontFamily: FD, fontSize: 'clamp(22px,1.9vw,26px)', fontWeight: 700, lineHeight: 1.25, color: 'var(--foreground)', margin: 'auto 0 18px', paddingTop: 30, position: 'relative' }}>{st.h}</h3>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 11, position: 'relative' }}>
                  {(st.checks || []).map((c, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontFamily: FB, fontSize: 15.5, lineHeight: 1.5, color: featured ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                      <CheckDot size={20} bg={featured ? C.gold : 'rgba(106,85,48,0.85)'} color={featured ? C.goldText : '#FFFFFF'} style={{ marginTop: 2 }} />
                      {c}
                    </li>
                  ))}
                </ul>
                {featured && (
                  <button className="lp-btn-primary" style={{ width: '100%', marginTop: 26, padding: '15px 0', position: 'relative' }} onClick={onSignup}>{st.cta || t.cta_main}</button>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------- Social ----------
function Social({ t }) {
  return (
    <section className="menestrel-ui" style={S.section}>
      <SectionGlow tint="#C9A44E26" />
      <div style={S.page()}>
        <div style={{ textAlign: 'center' }}>
          <span style={S.eyebrow}>{t.social.eyebrow}</span>
          <h2 style={{ ...S.h2, marginTop: 14 }}>{t.social.h}</h2>
        </div>
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', marginTop: 56 }}>
          {t.social.stats.map((s, i) => (
            <Card key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: FD, fontSize: 42, fontWeight: 700, backgroundImage: C.grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{s.n}</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--foreground)', marginTop: 4, fontFamily: FB }}>{s.l}</div>
              <div style={{ fontSize: 18, color: 'var(--muted-foreground)', marginTop: 4, fontFamily: FB }}>{s.note}</div>
            </Card>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', marginTop: 20 }}>
          {t.social.testimonials.map((t2, i) => (
            <Card key={i}>
              <p style={{ fontFamily: FB, fontSize: 18, lineHeight: 1.7, color: 'var(--foreground)', margin: 0 }}>{t2.q}</p>
              <div style={{ fontSize: 18, color: 'var(--muted-foreground)', marginTop: 16, fontFamily: FB }}><strong style={{ color: 'var(--gold)' }}>{t2.who}</strong> — {t2.role}</div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Plans ----------
function Plans({ t, onSignup }) {
  const PlanCard = ({ plan, featured, cta }) => (
    <Card style={featured ? { border: `2px solid ${C.gold}` } : {}}>
      <div style={{ ...S.tag, color: featured ? C.gold : 'var(--muted-foreground)' }}><Icon.Scroll style={{ width: 12, height: 12 }} /> {plan.tag}</div>
      <h3 style={{ fontFamily: FD, fontSize: 22, fontWeight: 600, color: 'var(--foreground)', margin: '16px 0 0' }}>{plan.name}</h3>
      <div style={{ marginTop: 8 }}><span style={{ fontFamily: FD, fontSize: 42, fontWeight: 700, color: 'var(--foreground)' }}>{plan.price}</span><span style={{ color: 'var(--muted-foreground)', fontFamily: FB }}> {plan.unit}</span></div>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '20px 0 0', padding: 0, listStyle: 'none' }}>
        {plan.features.map((f, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 18, color: 'var(--muted-foreground)', fontFamily: FB }}><span style={{ color: 'var(--gold)', marginTop: 2 }}><Icon.Check style={{ width: 16, height: 16 }} /></span>{f}</li>
        ))}
      </ul>
      <button className={featured ? 'lp-btn-primary' : 'lp-btn-ghost'} style={{ width: '100%', marginTop: 28, padding: '13px 0' }} onClick={onSignup}>{cta}</button>
    </Card>
  );
  return (
    <section className="menestrel-ui" id="planos" style={S.section}>
      <SectionGlow tint="#B8862E40" />
      <div style={S.page(1200)}>
        <div style={{ textAlign: 'center' }}>
          <span style={S.eyebrow}>{t.plans.eyebrow}</span>
          <h2 style={{ ...S.h2, marginTop: 14 }}>{t.plans.h}</h2>
        </div>
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', marginTop: 56 }}>
          <PlanCard plan={t.plans.free} cta={t.plans.free.cta} />
          <PlanCard plan={t.plans.pro} featured cta={t.plans.pro.cta} />
        </div>
      </div>
    </section>
  );
}

// ---------- Guarantee ----------
function Guarantee({ t }) {
  return (
    <section className="menestrel-ui" style={S.section}>
      <div style={{ ...S.page(1200), textAlign: 'center' }}>
        <span style={S.eyebrow}>{t.guarantee.eyebrow}</span>
        <h2 style={{ ...S.h2, marginTop: 14 }}>{t.guarantee.h}</h2>
        <p style={{ ...S.lead, maxWidth: 620, margin: '24px auto 0' }}>{t.guarantee.p}</p>
      </div>
    </section>
  );
}

// ---------- Scarcity ----------
function Scarcity({ t, onSignup, lang }) {
  const pct = Math.round((t.scarcity.filled / t.scarcity.total) * 100);
  const remainingLabel = lang === 'en' ? 'left' : 'restantes';
  return (
    <section className="menestrel-ui" id="fundadores" style={S.section}>
      <SectionGlow tint="#C9A44E26" />
      <div style={{ ...S.page(1200), textAlign: 'center' }}>
        <span style={S.eyebrow}>{t.scarcity.eyebrow}</span>
        <h2 style={{ ...S.h2, marginTop: 14, fontSize: 'clamp(32px,4.6vw,52px)' }}>{t.scarcity.h}</h2>
        <p style={{ ...S.lead, maxWidth: 580, margin: '18px auto 0', fontSize: 18 }}>{t.scarcity.p}</p>
        <div style={{ height: 10, maxWidth: 520, margin: '32px auto 0', borderRadius: 6, overflow: 'hidden', background: '#2C2417' }}>
          <div style={{ width: pct + '%', height: '100%', background: C.grad }} />
        </div>
        <div style={{ fontSize: 18, color: 'var(--muted-foreground)', marginTop: 12, fontFamily: FB }}>
          <strong style={{ color: 'var(--foreground)' }}>{t.scarcity.filled}</strong> / {t.scarcity.total} • {t.scarcity.total - t.scarcity.filled} {remainingLabel}
        </div>
        <div style={{ marginTop: 28 }}><button className="lp-btn-primary" onClick={onSignup}>{t.cta_main}</button></div>
        {t.scarcity.warn && <p style={{ marginTop: 16, fontSize: 18, color: 'var(--ember)', fontFamily: FB }}>{t.scarcity.warn}</p>}
      </div>
    </section>
  );
}

// ---------- Objections ----------
function Objections({ t }) {
  return (
    <section className="menestrel-ui" style={S.section}>
      <SectionGlow tint="#B8862E38" />
      <div style={S.page()}>
        <div style={{ textAlign: 'center' }}>
          <span style={S.eyebrow}>{t.objections.eyebrow}</span>
          <h2 style={{ ...S.h2, marginTop: 14 }}>{t.objections.h}</h2>
        </div>
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit,minmax(500px,1fr))', marginTop: 56 }}>
          {t.objections.list.map((o, i) => (
            <Card key={i}>
              <p style={{ fontFamily: FD, fontSize: 22, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>{o.q}</p>
              <p style={{ ...S.lead, fontSize: 18, marginTop: 10 }}>{o.a}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- FAQ ----------
function FAQ({ t }) {
  const [open, setOpen] = useState(0);
  return (
    <section className="menestrel-ui" id="faq" style={S.section}>
      <div style={S.page(1200)}>
        <div style={{ textAlign: 'center' }}>
          <span style={S.eyebrow}>{t.faq.eyebrow}</span>
          <h2 style={{ ...S.h2, marginTop: 14 }}>{t.faq.h}</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 48 }}>
          {t.faq.list.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{ borderRadius: 6, overflow: 'hidden', background: 'rgba(34,29,21,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: `1px solid ${isOpen ? C.gold : 'rgba(255,255,255,0.08)'}` }}>
                <button onClick={() => setOpen(isOpen ? -1 : i)} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: 'transparent', border: 'none', padding: '18px 20px', textAlign: 'left', fontFamily: FD, fontSize: 22, fontWeight: 600, color: 'var(--foreground)', cursor: 'pointer' }}>
                  <span>{f.q}</span>
                  <span style={{ fontSize: 22, color: 'var(--gold)', transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }}>+</span>
                </button>
                {isOpen && <div style={{ padding: '0 56px 20px 20px', fontFamily: FB, fontSize: 18, lineHeight: 1.7, color: 'var(--muted-foreground)' }}>{f.a}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------- Final ----------
function FinalCTA({ t, onSignup }) {
  return (
    <section className="menestrel-ui" style={S.section}>
      <Glow style={{ width: 520, height: 280, left: '50%', top: '40%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(closest-side,#C9A44E33,transparent)' }} />
      <div style={{ ...S.page(1200), textAlign: 'center' }}>
        <span style={S.eyebrow}>{t.final.eyebrow}</span>
        <h2 style={{ ...S.h2, fontSize: 'clamp(44px,6.5vw,84px)', marginTop: 16 }}>
          {t.final.h_a}<br />
          <span style={{ backgroundImage: C.grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{t.final.h_b}</span>
        </h2>
        <p style={{ ...S.lead, maxWidth: 800, margin: '24px auto 36px' }}>{t.final.p}</p>
        <button className="lp-btn-primary" onClick={onSignup}>{t.final.cta}</button>
        <div style={{ marginTop: 20, fontSize: 18, color: 'var(--muted-foreground)', fontFamily: FB }}>{t.final.micro}</div>
        <p style={{ fontSize: 18, color: 'var(--muted-foreground)', fontFamily: FB, maxWidth: 800, margin: '24px auto 0' }}>{t.final.ps}</p>
        <p style={{ fontSize: 18, color: 'var(--muted-foreground)', fontFamily: FB, maxWidth: 800, margin: '8px auto 0' }}>{t.final.pps}</p>
      </div>
    </section>
  );
}

// ---------- Footer ----------
function Foot({ t }) {
  return (
    <footer className="menestrel-ui" style={{ borderTop: '1px solid #4A3C26', background: 'var(--background)', padding: '56px 24px' }}>
      <div style={{ ...S.page(), display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 6, border: '1px solid #4A3C26', background: '#2C2417', color: 'var(--gold)' }}><Icon.Skull style={{ width: 22, height: 22 }} /></div>
            <div>
              <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, color: 'var(--foreground)' }}>Menestrel</div>
              <div style={{ fontSize: 18, color: 'var(--muted-foreground)', fontFamily: FB }}>RPG · {t.footer.tag}</div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontFamily: FB, fontSize: 18, color: 'var(--muted-foreground)' }}>{t.footer.copy}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28 }}>
          {t.footer.links.map((l) => <a key={l} href="#" style={{ fontSize: 18, color: 'var(--muted-foreground)', textDecoration: 'none', fontFamily: FB }}>{l}</a>)}
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, {
  HOrnament,
  Hero, Opening, Pain, Solution, Benefits, Social, Plans,
  Guarantee, Scarcity, Objections, FAQ, FinalCTA, Foot,
});
