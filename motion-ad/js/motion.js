// TutorSpace Motion Ad — GSAP Timeline Engine
// 10 scenes, 32s total, cinematic transitions

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  // Canvas scaler
  const canvas = document.getElementById('reelsCanvas');
  function scale() {
    if (!canvas) return;
    const s = Math.min((innerWidth - 40) / 1080, (innerHeight - 60) / 1920, 1);
    canvas.style.transform = `scale(${s})`;
  }
  scale();
  addEventListener('resize', scale);

  // Scene switcher
  const scenes = document.querySelectorAll('.sc');
  function show(id) {
    scenes.forEach(s => s.classList.remove('on'));
    const el = document.getElementById(id);
    if (el) el.classList.add('on');
    if (window.lucide) lucide.createIcons();
  }

  if (typeof gsap === 'undefined') return;

  const ease = 'power3.out';
  const pop = 'back.out(1.6)';
  const exit = 'power2.in';

  const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.5, onStart: () => show('s1') });

  // ─── S1: INTRO (0 — 3.2s) ───
  tl.addLabel('s1', 0)
    .call(() => show('s1'), null, 0)
    .fromTo('#intro', { opacity: 0 }, { opacity: 1, duration: 0.01 }, 0)
    .fromTo('#intro .intro-logo',
      { scale: 0, rotate: -20 },
      { scale: 1, rotate: 0, duration: 0.7, ease: 'back.out(2)' }, 0.1)
    .fromTo('#intro .intro-name',
      { opacity: 0, y: 40, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: pop }, 0.4)
    .fromTo('#intro .intro-tag',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease }, 0.6)
    .fromTo('#intro .intro-pills span',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.1, ease }, 0.8)
    .to('#intro', { opacity: 0, scale: 0.92, duration: 0.35, ease: exit }, 2.85);

  // ─── S2: MUAMMO 1 (3.2 — 5.6s) ───
  tl.addLabel('s2', 3.2)
    .call(() => show('s2'), null, 3.2)
    .fromTo('#prob1',
      { opacity: 0, y: 80, scale: 0.85, rotate: -2 },
      { opacity: 1, y: 0, scale: 1, rotate: 0, duration: 0.65, ease: pop }, 3.2)
    .fromTo('#prob1 .prob-ico',
      { scale: 0 },
      { scale: 1, duration: 0.5, ease: 'back.out(2.5)' }, 3.45)
    .fromTo('#prob1 h1',
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.45, ease }, 3.6)
    .to('#prob1', { opacity: 0, y: -60, duration: 0.35, ease: exit }, 5.25);

  // ─── S3: MUAMMO 2 (5.6 — 8.0s) ───
  tl.addLabel('s3', 5.6)
    .call(() => show('s3'), null, 5.6)
    .fromTo('#prob2',
      { opacity: 0, y: 80, scale: 0.85, rotate: 2 },
      { opacity: 1, y: 0, scale: 1, rotate: 0, duration: 0.65, ease: pop }, 5.6)
    .fromTo('#prob2 .prob-ico',
      { scale: 0 },
      { scale: 1, duration: 0.5, ease: 'back.out(2.5)' }, 5.85)
    .fromTo('#prob2 h1',
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.45, ease }, 6.0)
    .to('#prob2', { opacity: 0, y: -60, duration: 0.35, ease: exit }, 7.65);

  // ─── S4: BRIDGE (8.0 — 10.2s) ───
  tl.addLabel('s4', 8.0)
    .call(() => show('s4'), null, 8.0)
    .fromTo('#bridge',
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.7, ease: pop }, 8.0)
    .fromTo('#bridge .bridge-ico',
      { scale: 0, rotate: -30 },
      { scale: 1.1, rotate: 0, duration: 0.55, ease: 'back.out(2.5)' }, 8.2)
    .to('#bridge .bridge-ico', { scale: 1, duration: 0.2 }, 8.7)
    .fromTo('#bridge h1',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.45, ease }, 8.4)
    .fromTo('#bridge p',
      { opacity: 0 },
      { opacity: 1, duration: 0.35, ease }, 8.6)
    .to('#bridge', { opacity: 0, scale: 0.9, duration: 0.35, ease: exit }, 9.85);

  // ─── Helper: animate a feature scene ───
  function feat(sceneId, featId, t0) {
    const t1 = t0 + 3.2; // exit time
    tl.addLabel(sceneId, t0)
      .call(() => show(sceneId), null, t0)
      // Left: text
      .fromTo(`#${featId} .feat-num`,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.4, ease }, t0 + 0.05)
      .fromTo(`#${featId} .feat-label`,
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, duration: 0.4, ease: pop }, t0 + 0.1)
      .fromTo(`#${featId} h2`,
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.45, ease }, t0 + 0.2)
      .fromTo(`#${featId} .feat-text > p`,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.35, ease }, t0 + 0.35)
      // Right: app screen
      .fromTo(`#${featId} .app-screen`,
        { opacity: 0, y: 50, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: pop }, t0 + 0.25)
      // Stagger app-screen children
      .fromTo(`#${featId} .app-screen > *`,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.08, ease }, t0 + 0.5)
      // Exit
      .to(`#${featId}`,
        { opacity: 0, scale: 0.93, duration: 0.35, ease: exit }, t1);
  }

  feat('s5', 'f1', 10.2);   // Guruhlar
  feat('s6', 'f2', 13.8);   // Davomat
  feat('s7', 'f3', 17.4);   // Moliya
  feat('s8', 'f4', 21.0);   // Ota-ona
  feat('s9', 'f5', 24.6);   // Jadval

  // Feature-specific micro-animations
  // F2: absent row pulse
  tl.fromTo('#f2 .ui-att-row.absent',
    { boxShadow: '0 0 0 rgba(255,180,171,0)' },
    { boxShadow: '0 0 20px rgba(255,180,171,.25)', duration: 0.4, yoyo: true, repeat: 2 }, 14.8);
  // F2: toast slide
  tl.fromTo('#f2 .ui-toast',
    { opacity: 0, x: -30 },
    { opacity: 1, x: 0, duration: 0.45, ease: pop }, 15.3);
  // F3: remind button press
  tl.fromTo('#f3 .ui-btn-remind',
    { scale: 1 },
    { scale: 0.95, duration: 0.15, yoyo: true, repeat: 1 }, 18.8);
  // F5: homework progress fill
  tl.fromTo('#f5 .ui-hw-fill',
    { width: '0%' },
    { width: '85%', duration: 0.7, ease: 'power2.out' }, 25.8);
  // F5: ping dot
  tl.fromTo('#f5 .ui-ping',
    { scale: 1 },
    { scale: 1.5, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 25.5);

  // ─── S10: OUTRO CTA (28.2 — 32.0s) ───
  tl.addLabel('s10', 28.2)
    .call(() => show('s10'), null, 28.2)
    .fromTo('#outro', { opacity: 0 }, { opacity: 1, duration: 0.01 }, 28.2)
    .fromTo('#outro .intro-logo',
      { scale: 0, rotate: -15 },
      { scale: 1, rotate: 0, duration: 0.65, ease: 'back.out(2)' }, 28.25)
    .fromTo('#outro .intro-name',
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.5, ease }, 28.45)
    .fromTo('#outro .intro-tag',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.4, ease }, 28.6)
    .fromTo('#outro .cta-box',
      { scale: 0, rotate: -3 },
      { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2.2)' }, 28.8)
    .fromTo('#outro .cta-handle',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.4, ease }, 29.1)
    .to('#outro', { opacity: 0, scale: 0.92, duration: 0.35, ease: exit }, 31.65);

  // ─── OBS Timecode & Controls ───
  const tc = document.getElementById('tc');
  const obs = document.getElementById('obs');
  const btnR = document.getElementById('btnR');

  (function tick() {
    if (tc) {
      const c = Math.min(tl.time(), 32).toFixed(1);
      tc.textContent = `${c} / 32.0`;
    }
    requestAnimationFrame(tick);
  })();

  function restart() { tl.restart(); show('s1'); }
  if (btnR) btnR.addEventListener('click', restart);

  addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'KeyR') { e.preventDefault(); restart(); }
    if (e.code === 'KeyH' && obs) obs.classList.toggle('hidden');
  });
});
