// TutorSpace Motion Ad — Cinematic GSAP Timeline Engine
// 10 scenes, 32.0s total duration, smooth overlapping cross-fades & micro-interactions

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  // Canvas scaler for 1080x1920 vertical canvas
  const canvas = document.getElementById('reelsCanvas');
  function scale() {
    if (!canvas) return;
    const s = Math.min((innerWidth - 40) / 1080, (innerHeight - 60) / 1920, 1);
    canvas.style.transform = `scale(${s})`;
  }
  scale();
  addEventListener('resize', scale);

  // Scene switcher with SFX transition trigger
  const scenes = document.querySelectorAll('.sc');
  function show(id) {
    scenes.forEach(s => s.classList.remove('on'));
    const el = document.getElementById(id);
    if (el) el.classList.add('on');
    if (window.lucide) lucide.createIcons();
    window.TutorSpaceAudio?.playSfx?.('whoosh');
  }

  if (typeof gsap === 'undefined') return;

  const ease = 'power3.out';
  const pop = 'back.out(1.6)';
  const exit = 'power2.inOut';

  const tl = gsap.timeline({
    repeat: -1,
    repeatDelay: 1.5,
    onStart: () => {
      show('s1');
      window.TutorSpaceAudio?.playBGM?.();
    },
    onRepeat: () => {
      show('s1');
      window.TutorSpaceAudio?.restartBGM?.();
    }
  });

  // ─── S1: INTRO (0.0 — 3.2s) ───
  tl.addLabel('s1', 0)
    .call(() => show('s1'), null, 0)
    .fromTo('#intro',
      { opacity: 0, scale: 0.96 },
      { opacity: 1, scale: 1, duration: 0.45, ease }, 0)
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

  // ─── S2: MUAMMO 1 — DAVOMAT (3.2 — 5.6s) ───
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
    .to('#prob1', { opacity: 0, y: -60, duration: 0.45, ease: exit }, 5.15);

  // ─── S3: MUAMMO 2 — EXCEL (5.6 — 8.0s) ───
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
    .to('#prob2', { opacity: 0, y: -60, duration: 0.45, ease: exit }, 7.55);

  // ─── S4: BRIDGE — TUTORSPACE (8.0 — 10.2s) ───
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
    .to('#bridge', { opacity: 0, scale: 0.9, duration: 0.45, ease: exit }, 9.75);

  // ─── Helper: animate a feature scene (3.6s slot) ───
  function feat(sceneId, featId, t0) {
    const exitStart = t0 + 3.15; // 3.15 + 0.45 = 3.60s (zero gap to next scene)
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
      // Stagger app-screen children (exclude .ui-toast to avoid premature double-flash)
      .fromTo(`#${featId} .app-screen > *:not(.ui-toast)`,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.08, ease }, t0 + 0.5)
      // Exit transition (450ms smooth cross-fade, zero gap)
      .to(`#${featId}`,
        { opacity: 0, scale: 0.93, duration: 0.45, ease: exit }, exitStart);
  }

  // 5 Feature Scenes
  feat('s5', 'f1', 10.2);   // F1: Guruhlar (10.2 — 13.8s)
  feat('s6', 'f2', 13.8);   // F2: Davomat (13.8 — 17.4s)
  feat('s7', 'f3', 17.4);   // F3: Moliya (17.4 — 21.0s)
  feat('s8', 'f4', 21.0);   // F4: Ota-ona (21.0 — 24.6s)
  feat('s9', 'f5', 24.6);   // F5: Jadval (24.6 — 28.2s)

  // ═══════════════════════════════════════════════════
  // FEATURE MICRO-INTERACTIONS
  // ═══════════════════════════════════════════════════

  // --- F1: Guruhlar — Invite copy button click effect & toast ---
  tl.call(() => {
    const span = document.querySelector('#f1 .ui-btn-copy span');
    if (span) span.textContent = 'Ulashish';
    const btn = document.querySelector('#f1 .ui-btn-copy');
    if (btn) btn.style.backgroundColor = '';
  }, null, 10.2);

  tl.fromTo('#f1 .ui-btn-copy',
    { scale: 1 },
    { scale: 0.92, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 11.4);

  tl.call(() => {
    window.TutorSpaceAudio?.playSfx?.('pop');
    const span = document.querySelector('#f1 .ui-btn-copy span');
    if (span) span.textContent = 'Nusxalandi! ✓';
    const btn = document.querySelector('#f1 .ui-btn-copy');
    if (btn) btn.style.backgroundColor = '#006D36';
  }, null, 11.52);

  tl.fromTo('#f1 .ui-toast',
    { opacity: 0, y: 15 },
    { opacity: 1, y: 0, duration: 0.45, ease: pop }, 11.8);

  // --- F2: Davomat — Attendance toggle & parent alert flow ---
  tl.call(() => {
    const toast = document.querySelector('#f2 .ui-toast');
    if (toast) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-30px)';
    }
    const row = document.querySelector('#f2 .ui-att-row.absent');
    if (row) {
      const toggle = row.querySelector('.ui-toggle');
      if (toggle) {
        toggle.classList.remove('on');
        toggle.classList.add('off');
        toggle.innerHTML = '<i data-lucide="circle"></i>';
        if (window.lucide) lucide.createIcons();
      }
    }
  }, null, 13.8);

  // Absent row pulse
  tl.fromTo('#f2 .ui-att-row.absent',
    { boxShadow: '0 0 0 rgba(255,180,171,0)' },
    { boxShadow: '0 0 20px rgba(255,180,171,.25)', duration: 0.4, yoyo: true, repeat: 2 }, 14.8);

  // Toggle Malika's attendance to present with checkmark pop + SFX
  tl.fromTo('#f2 .ui-att-row.absent .ui-toggle',
    { scale: 0.8 },
    { scale: 1.15, duration: 0.18, yoyo: true, repeat: 1 }, 15.0);

  tl.call(() => {
    window.TutorSpaceAudio?.playSfx?.('check');
    const row = document.querySelector('#f2 .ui-att-row.absent');
    if (row) {
      const toggle = row.querySelector('.ui-toggle');
      if (toggle) {
        toggle.classList.remove('off');
        toggle.classList.add('on');
        toggle.innerHTML = '<i data-lucide="check-circle"></i>';
        if (window.lucide) lucide.createIcons();
      }
    }
  }, null, 15.1);

  // Parent notification toast slide-in (no premature double-flash)
  tl.fromTo('#f2 .ui-toast',
    { opacity: 0, x: -30 },
    { opacity: 1, x: 0, duration: 0.45, ease: pop }, 15.3);

  tl.call(() => {
    window.TutorSpaceAudio?.playSfx?.('pop');
  }, null, 15.3);

  // --- F3: Moliya — Number counter tween & remind CTA interaction ---
  tl.call(() => {
    const btn = document.querySelector('#f3 .ui-btn-remind span');
    if (btn) btn.textContent = 'Qarzdorlarga eslatish (2)';
    const el = document.querySelector('#f3 .ui-fin-card.green .ui-fin-val');
    if (el) el.textContent = '0';
  }, null, 17.4);

  tl.fromTo('#f3 .ui-fin-card.green .ui-fin-val',
    { opacity: 0.9 },
    {
      opacity: 1,
      duration: 1.1,
      ease: 'power2.out',
      onStart: () => {
        const el = document.querySelector('#f3 .ui-fin-card.green .ui-fin-val');
        if (el) el.textContent = '0';
      },
      onUpdate: function () {
        const p = this.progress ? this.progress() : 1;
        const cur = Math.round(p * 5850000);
        const el = document.querySelector('#f3 .ui-fin-card.green .ui-fin-val');
        if (el) el.textContent = cur.toLocaleString('ru-RU').replace(/,/g, ' ');
      }
    }, 17.6);

  tl.call(() => {
    window.TutorSpaceAudio?.playSfx?.('cash');
  }, null, 17.6);

  // Remind button press
  tl.fromTo('#f3 .ui-btn-remind',
    { scale: 1 },
    { scale: 0.95, duration: 0.15, yoyo: true, repeat: 1 }, 18.8);

  tl.call(() => {
    window.TutorSpaceAudio?.playSfx?.('chime');
    const btn = document.querySelector('#f3 .ui-btn-remind span');
    if (btn) btn.textContent = 'Eslatma yuborildi! ✓';
  }, null, 18.95);

  // --- F5: Jadval — Live ping dot & homework progress fill ---
  // Fix CSS keyframe animation conflict on .ui-ping
  tl.call(() => {
    const ping = document.querySelector('#f5 .ui-ping');
    if (ping) ping.classList.remove('animate-ping');
  }, null, 24.6);

  // Live ping pulse animation via GSAP
  tl.fromTo('#f5 .ui-ping',
    { scale: 1 },
    { scale: 1.5, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 25.0);

  // Homework progress bar fill (0% -> 85%)
  tl.fromTo('#f5 .ui-hw-fill',
    { width: '0%' },
    { width: '85%', duration: 0.8, ease: 'power2.out' }, 25.6);

  tl.call(() => {
    window.TutorSpaceAudio?.playSfx?.('chime');
  }, null, 26.4);

  // ─── S10: OUTRO CTA (28.2 — 32.0s) ───
  tl.addLabel('s10', 28.2)
    .call(() => show('s10'), null, 28.2)
    .fromTo('#outro',
      { opacity: 0, scale: 0.96 },
      { opacity: 1, scale: 1, duration: 0.45, ease }, 28.2)
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
    .to('#outro', { opacity: 0, scale: 0.92, duration: 0.45, ease: exit }, 31.55);

  // ─── OBS Timecode & Controls ───
  const tc = document.getElementById('tc');
  const obs = document.getElementById('obs');
  const btnR = document.getElementById('btnR');

  (function tick() {
    if (tc) {
      const c = Math.max(0, Math.min(tl.time(), 32)).toFixed(1);
      tc.textContent = `${c} / 32.0`;
    }
    requestAnimationFrame(tick);
  })();

  function restart() {
    tl.restart();
    show('s1');
    window.TutorSpaceAudio?.restartBGM?.();
  }

  if (btnR) {
    if (typeof btnR.addEventListener === 'function') {
      btnR.addEventListener('click', restart);
    } else {
      btnR.onclick = restart;
    }
  }

  addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'KeyR') {
      e.preventDefault();
      restart();
    }
    if (e.code === 'KeyH' && obs) {
      obs.classList.toggle('hidden');
    }
  });
});
