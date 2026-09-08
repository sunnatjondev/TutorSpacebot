// TutorSpace Motion Canvas Engine - 1080x1920 OBS Reels Timeline
// Complete Storyboard: Intro, Problems 1 & 2, Solution Bridge, 5 Split Feature Scenes, Outro CTA

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lucide Icons
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }

  // 2. Responsive Canvas Scaler for Desktop Viewport
  const canvas = document.getElementById('reelsCanvas');
  function scaleCanvas() {
    if (!canvas) return;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Canvas is fixed 1080 x 1920
    const scaleX = (windowWidth - 40) / 1080;
    const scaleY = (windowHeight - 80) / 1920;
    const scale = Math.min(scaleX, scaleY, 1); // Max scale 1 (native 1080x1920)

    canvas.style.transform = `scale(${scale})`;
  }

  scaleCanvas();
  window.addEventListener('resize', scaleCanvas);

  // 3. Custom M3 Easing Curves for GSAP
  let springPop = "back.out(1.7)";
  if (typeof CustomEase !== 'undefined') {
    try {
      springPop = CustomEase.create("springPop", "0.34, 1.56, 0.64, 1");
    } catch (err) {
      springPop = "back.out(1.7)";
    }
  }

  const emphasized = "power3.out";

  // Helper function to activate scene visibility cleanly
  const scenes = document.querySelectorAll('.scene');
  function showScene(sceneId) {
    scenes.forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sceneId);
    if (target) {
      target.classList.add('active');
      // Re-run lucide on newly active elements if needed
      if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
      }
    }
  }

  // Check if GSAP is loaded
  if (typeof gsap === 'undefined') {
    console.error('GSAP library not loaded!');
    return;
  }

  // 4. Master GSAP Storyboard Timeline (34.0 Seconds Total)
  const tl = gsap.timeline({
    repeat: -1,
    repeatDelay: 1.5,
    onStart: () => showScene('scene1')
  });

  // ==========================================
  // SCENE 1: 0.0s - 3.2s (Intro: Logo + Introduction)
  // ==========================================
  tl.addLabel('scene1', 0.0)
    .call(() => showScene('scene1'), null, 0.0)
    .fromTo('#scene1 .card-s1',
      { opacity: 0, scale: 0.8, y: 80 },
      { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: springPop }, 0.0)
    .fromTo('#scene1 .intro-logo-wrap',
      { scale: 0, rotate: -15 },
      { scale: 1, rotate: 0, duration: 0.75, ease: 'back.out(1.8)' }, 0.15)
    .fromTo('#scene1 .intro-chip',
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.5, ease: emphasized }, 0.4)
    .fromTo('#scene1 .headline-hero',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, ease: emphasized }, 0.55)
    .fromTo('#scene1 .intro-tagline',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: emphasized }, 0.7)
    .fromTo('#scene1 .intro-pill',
      { opacity: 0, scale: 0.85 },
      { opacity: 1, scale: 1, duration: 0.4, stagger: 0.12, ease: 'back.out(1.8)' }, 0.85)
    .to('#scene1 .card-s1',
      { opacity: 0, scale: 0.9, y: -60, duration: 0.4, ease: 'power2.in' }, 2.8);

  // ==========================================
  // SCENE 2: 3.2s - 5.8s (Muammo #1: Davomat)
  // ==========================================
  tl.addLabel('scene2', 3.2)
    .call(() => showScene('scene2'), null, 3.2)
    .fromTo('#scene2 .card-s2',
      { opacity: 0, scale: 0.8, y: 80 },
      { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: springPop }, 3.2)
    .fromTo('#scene2 .m3-chip',
      { opacity: 0, x: -60 },
      { opacity: 1, x: 0, duration: 0.5, ease: 'back.out(1.8)' }, 3.35)
    .fromTo('#scene2 .graphic-icon-wrap',
      { scale: 0, rotate: -15 },
      { scale: 1, rotate: 0, duration: 0.55, ease: 'back.out(2)' }, 3.5)
    .fromTo('#scene2 .headline-large',
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.5, ease: emphasized }, 3.65)
    .fromTo('#scene2 .headline-sub',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.4, ease: emphasized }, 3.8)
    .to('#scene2 .card-s2',
      { opacity: 0, scale: 0.9, y: -60, duration: 0.4, ease: 'power2.in' }, 5.4);

  // ==========================================
  // SCENE 3: 5.8s - 8.4s (Muammo #2: To'lovlar & Excel)
  // ==========================================
  tl.addLabel('scene3', 5.8)
    .call(() => showScene('scene3'), null, 5.8)
    .fromTo('#scene3 .card-s3',
      { opacity: 0, scale: 0.8, y: 80 },
      { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: springPop }, 5.8)
    .fromTo('#scene3 .m3-chip',
      { opacity: 0, x: -60 },
      { opacity: 1, x: 0, duration: 0.5, ease: 'back.out(1.8)' }, 5.95)
    .fromTo('#scene3 .graphic-icon-wrap',
      { scale: 0, rotate: 15 },
      { scale: 1, rotate: 0, duration: 0.55, ease: 'back.out(2)' }, 6.1)
    .fromTo('#scene3 .headline-large',
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.5, ease: emphasized }, 6.25)
    .fromTo('#scene3 .headline-sub',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.4, ease: emphasized }, 6.4)
    .to('#scene3 .card-s3',
      { opacity: 0, scale: 0.9, y: -60, duration: 0.4, ease: 'power2.in' }, 8.0);

  // ==========================================
  // SCENE 4: 8.4s - 11.0s (Mukammal Yechim: TutorSpace ni sinab ko'ring!)
  // ==========================================
  tl.addLabel('scene4', 8.4)
    .call(() => showScene('scene4'), null, 8.4)
    .fromTo('#scene4 .card-s4',
      { opacity: 0, scale: 0.8, y: 80 },
      { opacity: 1, scale: 1, y: 0, duration: 0.75, ease: springPop }, 8.4)
    .fromTo('#scene4 .m3-chip',
      { opacity: 0, x: -60 },
      { opacity: 1, x: 0, duration: 0.5, ease: 'back.out(1.8)' }, 8.55)
    .fromTo('#scene4 .graphic-icon-wrap',
      { scale: 0, rotate: -20 },
      { scale: 1.15, rotate: 0, duration: 0.6, ease: 'back.out(2.2)' }, 8.7)
    .to('#scene4 .graphic-icon-wrap',
      { scale: 1.0, duration: 0.25, ease: 'power1.out' }, 9.25)
    .fromTo('#scene4 .headline-large',
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.5, ease: emphasized }, 8.9)
    .fromTo('#scene4 .headline-sub',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.4, ease: emphasized }, 9.1)
    .fromTo('#scene4 .bridge-highlight',
      { opacity: 0, scale: 0.9, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(1.8)' }, 9.35)
    .to('#scene4 .card-s4',
      { opacity: 0, scale: 0.9, y: -60, duration: 0.4, ease: 'power2.in' }, 10.6);

  // ==========================================
  // SCENE 5: 11.0s - 14.8s (Feature 1: 1 klikda o'quvchi qo'shish)
  // Left: Text, Right: Real UI
  // ==========================================
  tl.addLabel('scene5', 11.0)
    .call(() => showScene('scene5'), null, 11.0)
    // Left side text sequence
    .fromTo('#scene5 .split-left .feat-badge',
      { opacity: 0, x: -40 },
      { opacity: 1, x: 0, duration: 0.45, ease: 'back.out(1.8)' }, 11.05)
    .fromTo('#scene5 .split-left .feat-title',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, ease: emphasized }, 11.2)
    .fromTo('#scene5 .split-left .feat-bullet',
      { opacity: 0, x: -25 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.12, ease: emphasized }, 11.35)
    .fromTo('#scene5 .split-left .feat-pill-success',
      { opacity: 0, scale: 0.85 },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.8)' }, 11.7)
    // Right side phone & UI
    .fromTo('#scene5 .phone-device',
      { opacity: 0, x: 60, scale: 0.92 },
      { opacity: 1, x: 0, scale: 1, duration: 0.65, ease: springPop }, 11.2)
    .fromTo('#scene5 .ui-invite-box',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.4, ease: emphasized }, 11.5)
    .fromTo('#scene5 .ui-toast-alert',
      { opacity: 0, scale: 0.8, y: 15 },
      { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(2)' }, 12.0)
    .fromTo('#scene5 .student-item.active-anim',
      { backgroundColor: '#151221' },
      { backgroundColor: 'rgba(34, 197, 94, 0.18)', duration: 0.4, yoyo: true, repeat: 1 }, 12.6)
    .to('#scene5 .card-s5',
      { opacity: 0, scale: 0.92, duration: 0.4, ease: 'power2.in' }, 14.4);

  // ==========================================
  // SCENE 6: 14.8s - 18.6s (Feature 2: 1 ta bosishda davomat & SMS)
  // Left: Text, Right: Real UI
  // ==========================================
  tl.addLabel('scene6', 14.8)
    .call(() => showScene('scene6'), null, 14.8)
    // Left side text sequence
    .fromTo('#scene6 .split-left .feat-badge',
      { opacity: 0, x: -40 },
      { opacity: 1, x: 0, duration: 0.45, ease: 'back.out(1.8)' }, 14.85)
    .fromTo('#scene6 .split-left .feat-title',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, ease: emphasized }, 15.0)
    .fromTo('#scene6 .split-left .feat-bullet',
      { opacity: 0, x: -25 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.12, ease: emphasized }, 15.15)
    .fromTo('#scene6 .split-left .feat-pill-success',
      { opacity: 0, scale: 0.85 },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.8)' }, 15.5)
    // Right side phone & UI
    .fromTo('#scene6 .phone-device',
      { opacity: 0, x: 60, scale: 0.92 },
      { opacity: 1, x: 0, scale: 1, duration: 0.65, ease: springPop }, 15.0)
    .fromTo('#scene6 .att-row',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.1, ease: emphasized }, 15.3)
    .fromTo('#scene6 .att-row.mark-absent .att-btn',
      { scale: 1 },
      { scale: 1.15, duration: 0.25, yoyo: true, repeat: 2 }, 15.9)
    .fromTo('#scene6 .bot-sms-card',
      { opacity: 0, scale: 0.8, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(2)' }, 16.5)
    .to('#scene6 .card-s6',
      { opacity: 0, scale: 0.92, duration: 0.4, ease: 'power2.in' }, 18.2);

  // ==========================================
  // SCENE 7: 18.6s - 22.4s (Feature 3: Moliya & Qarzdorlarga eslatma)
  // Left: Text, Right: Real UI
  // ==========================================
  tl.addLabel('scene7', 18.6)
    .call(() => showScene('scene7'), null, 18.6)
    // Left side text sequence
    .fromTo('#scene7 .split-left .feat-badge',
      { opacity: 0, x: -40 },
      { opacity: 1, x: 0, duration: 0.45, ease: 'back.out(1.8)' }, 18.65)
    .fromTo('#scene7 .split-left .feat-title',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, ease: emphasized }, 18.8)
    .fromTo('#scene7 .split-left .feat-bullet',
      { opacity: 0, x: -25 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.12, ease: emphasized }, 18.95)
    .fromTo('#scene7 .split-left .feat-pill-success',
      { opacity: 0, scale: 0.85 },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.8)' }, 19.3)
    // Right side phone & UI
    .fromTo('#scene7 .phone-device',
      { opacity: 0, x: 60, scale: 0.92 },
      { opacity: 1, x: 0, scale: 1, duration: 0.65, ease: springPop }, 18.8)
    .fromTo('#scene7 .fin-card',
      { opacity: 0, scale: 0.85 },
      { opacity: 1, scale: 1, duration: 0.4, stagger: 0.12, ease: 'back.out(1.7)' }, 19.1)
    .fromTo('#scene7 .debtor-item',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.4, ease: emphasized }, 19.4)
    .fromTo('#scene7 .btn-remind-auto',
      { scale: 1 },
      { scale: 0.94, duration: 0.2, yoyo: true, repeat: 1 }, 19.9)
    .fromTo('#scene7 .remind-sent-tag',
      { opacity: 0, scale: 0.8, y: 10 },
      { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(2)' }, 20.3)
    .to('#scene7 .card-s7',
      { opacity: 0, scale: 0.92, duration: 0.4, ease: 'power2.in' }, 22.0);

  // ==========================================
  // SCENE 8: 22.4s - 26.2s (Feature 4: Ota-onalar Shaxsiy Portali)
  // Left: Text, Right: Real UI
  // ==========================================
  tl.addLabel('scene8', 22.4)
    .call(() => showScene('scene8'), null, 22.4)
    // Left side text sequence
    .fromTo('#scene8 .split-left .feat-badge',
      { opacity: 0, x: -40 },
      { opacity: 1, x: 0, duration: 0.45, ease: 'back.out(1.8)' }, 22.45)
    .fromTo('#scene8 .split-left .feat-title',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, ease: emphasized }, 22.6)
    .fromTo('#scene8 .split-left .feat-bullet',
      { opacity: 0, x: -25 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.12, ease: emphasized }, 22.75)
    .fromTo('#scene8 .split-left .feat-pill-success',
      { opacity: 0, scale: 0.85 },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.8)' }, 23.1)
    // Right side phone & UI
    .fromTo('#scene8 .phone-device',
      { opacity: 0, x: 60, scale: 0.92 },
      { opacity: 1, x: 0, scale: 1, duration: 0.65, ease: springPop }, 22.6)
    .fromTo('#scene8 .parent-student-header',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.4, ease: emphasized }, 22.85)
    .fromTo('#scene8 .pm-box',
      { opacity: 0, scale: 0.85 },
      { opacity: 1, scale: 1, duration: 0.35, stagger: 0.1, ease: 'back.out(1.8)' }, 23.15)
    .fromTo('#scene8 .portal-lesson-card',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: emphasized }, 23.6)
    .to('#scene8 .card-s8',
      { opacity: 0, scale: 0.92, duration: 0.4, ease: 'power2.in' }, 25.8);

  // ==========================================
  // SCENE 9: 26.2s - 30.0s (Feature 5: Jadval & Vazifalar Nazorati)
  // Left: Text, Right: Real UI
  // ==========================================
  tl.addLabel('scene9', 26.2)
    .call(() => showScene('scene9'), null, 26.2)
    // Left side text sequence
    .fromTo('#scene9 .split-left .feat-badge',
      { opacity: 0, x: -40 },
      { opacity: 1, x: 0, duration: 0.45, ease: 'back.out(1.8)' }, 26.25)
    .fromTo('#scene9 .split-left .feat-title',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, ease: emphasized }, 26.4)
    .fromTo('#scene9 .split-left .feat-bullet',
      { opacity: 0, x: -25 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.12, ease: emphasized }, 26.55)
    .fromTo('#scene9 .split-left .feat-pill-success',
      { opacity: 0, scale: 0.85 },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.8)' }, 26.9)
    // Right side phone & UI
    .fromTo('#scene9 .phone-device',
      { opacity: 0, x: 60, scale: 0.92 },
      { opacity: 1, x: 0, scale: 1, duration: 0.65, ease: springPop }, 26.4)
    .fromTo('#scene9 .schedule-card',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.1, ease: emphasized }, 26.7)
    .fromTo('#scene9 .hw-card',
      { opacity: 0, scale: 0.9, y: 15 },
      { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(1.8)' }, 27.1)
    .fromTo('#scene9 .hw-progress-fill',
      { width: '0%' },
      { width: '85%', duration: 0.8, ease: 'power2.out' }, 27.6)
    .to('#scene9 .card-s9',
      { opacity: 0, scale: 0.92, duration: 0.4, ease: 'power2.in' }, 29.6);

  // ==========================================
  // SCENE 10: 30.0s - 34.0s (Outro / CTA: Izohlarda «+» qoldiring)
  // ==========================================
  tl.addLabel('scene10', 30.0)
    .call(() => showScene('scene10'), null, 30.0)
    .fromTo('#scene10 .card-s10',
      { opacity: 0, scale: 0.8, y: 80 },
      { opacity: 1, scale: 1, y: 0, duration: 0.75, ease: springPop }, 30.0)
    .fromTo('#scene10 .intro-logo-wrap',
      { scale: 0, rotate: -15 },
      { scale: 1, rotate: 0, duration: 0.7, ease: 'back.out(1.8)' }, 30.15)
    .fromTo('#scene10 .headline-hero',
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.5, ease: emphasized }, 30.35)
    .fromTo('#scene10 .intro-tagline',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.4, ease: emphasized }, 30.5)
    .fromTo('#scene10 .comment-cta-box',
      { scale: 0, rotate: -5 },
      { scale: 1, rotate: 0, duration: 0.65, ease: 'back.out(2.2)' }, 30.7)
    .fromTo('#scene10 .cta-bot-link',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'back.out(1.8)' }, 31.05)
    .to('#scene10 .card-s10',
      { opacity: 0, scale: 0.92, duration: 0.4, ease: 'power2.in' }, 33.6);

  // 5. OBS Timecode & Controller Logic
  const timecodeEl = document.getElementById('timecode');
  const btnRestart = document.getElementById('btnRestart');
  const controlBar = document.getElementById('controlBar');

  function updateTimecode() {
    if (timecodeEl && tl) {
      const total = 34.0;
      const current = Math.min(tl.time(), total);
      timecodeEl.textContent = `${current.toFixed(1)}s / ${total.toFixed(1)}s`;
    }
    requestAnimationFrame(updateTimecode);
  }
  requestAnimationFrame(updateTimecode);

  function restartTimeline() {
    tl.restart();
    showScene('scene1');
  }

  if (btnRestart) {
    btnRestart.addEventListener('click', restartTimeline);
  }

  // Hotkey listener for instant OBS recording start & UI toggle
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'KeyR') {
      e.preventDefault();
      restartTimeline();
    } else if (e.code === 'KeyH') {
      if (controlBar) controlBar.classList.toggle('hidden');
    }
  });

});
