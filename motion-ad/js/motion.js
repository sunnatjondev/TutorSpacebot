// TutorSpace Motion Canvas Engine - M3 Expressive GSAP Timeline

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lucide Icons
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }

  // 2. Responsive Canvas Scaler for Desktop Monitoring
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
    if (target) target.classList.add('active');
  }

  // Check if GSAP is loaded
  if (typeof gsap === 'undefined') {
    console.error('GSAP library not loaded!');
    return;
  }

  // 4. Master GSAP Storyboard Timeline (23.0 Seconds Total)
  const tl = gsap.timeline({
    repeat: -1,
    repeatDelay: 1.5,
    onStart: () => showScene('scene1')
  });

  // ==========================================
  // SCENE 1: 0.0s - 3.0s (Muammo #1)
  // ==========================================
  tl.addLabel('scene1', 0.0)
    .call(() => showScene('scene1'), null, 0.0)
    .fromTo('#scene1 .card-s1', 
      { opacity: 0, scale: 0.75, y: 100 }, 
      { opacity: 1, scale: 1, y: 0, duration: 0.75, ease: springPop }, 0.0)
    .fromTo('#scene1 .m3-chip',
      { opacity: 0, x: -90 },
      { opacity: 1, x: 0, duration: 0.6, ease: 'back.out(1.8)' }, 0.15)
    .fromTo('#scene1 .graphic-icon-wrap',
      { scale: 0, rotate: -15 },
      { scale: 1, rotate: 0, duration: 0.55, ease: 'back.out(2)' }, 0.3)
    .to('#scene1 .card-s1', 
      { opacity: 0, scale: 0.92, y: -90, duration: 0.45, ease: 'power2.in' }, 2.55);

  // ==========================================
  // SCENE 2: 3.0s - 5.5s (Muammo #2)
  // ==========================================
  tl.addLabel('scene2', 3.0)
    .call(() => showScene('scene2'), null, 3.0)
    .fromTo('#scene2 .card-s2',
      { opacity: 0, scale: 0.75, y: 100 },
      { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: springPop }, 3.0)
    .fromTo('#scene2 .m3-chip',
      { opacity: 0, x: -90 },
      { opacity: 1, x: 0, duration: 0.6, ease: 'back.out(1.8)' }, 3.15)
    .fromTo('#scene2 .graphic-icon-wrap',
      { scale: 0, rotate: 15 },
      { scale: 1, rotate: 0, duration: 0.55, ease: 'back.out(2)' }, 3.3)
    .to('#scene2 .card-s2',
      { opacity: 0, scale: 0.92, y: -90, duration: 0.45, ease: 'power2.in' }, 5.05);

  // ==========================================
  // SCENE 3: 5.5s - 8.0s (Perfect Solution)
  // ==========================================
  tl.addLabel('scene3', 5.5)
    .call(() => showScene('scene3'), null, 5.5)
    .fromTo('#scene3 .card-s3',
      { opacity: 0, scale: 0.75, y: 100 },
      { opacity: 1, scale: 1, y: 0, duration: 0.75, ease: springPop }, 5.5)
    .fromTo('#scene3 .m3-chip',
      { opacity: 0, x: -90 },
      { opacity: 1, x: 0, duration: 0.6, ease: 'back.out(1.8)' }, 5.65)
    .fromTo('#scene3 .graphic-icon-wrap',
      { scale: 0, rotate: -20 },
      { scale: 1.1, rotate: 0, duration: 0.6, ease: 'back.out(2.2)' }, 5.8)
    .to('#scene3 .graphic-icon-wrap',
      { scale: 1.0, duration: 0.3, ease: 'power1.out' }, 6.4)
    .to('#scene3 .card-s3',
      { opacity: 0, scale: 0.92, y: -90, duration: 0.45, ease: 'power2.in' }, 7.55);

  // ==========================================
  // SCENE 4: 8.0s - 11.0s (TutorSpace Demo)
  // ==========================================
  tl.addLabel('scene4', 8.0)
    .call(() => showScene('scene4'), null, 8.0)
    .fromTo('#scene4 .card-s4',
      { opacity: 0, scale: 0.8, y: 100 },
      { opacity: 1, scale: 1, y: 0, duration: 0.75, ease: emphasized }, 8.0)
    .fromTo('#scene4 .brand-icon',
      { scale: 0, rotate: -30 },
      { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2)' }, 8.2)
    .fromTo('#scene4 .m3-chip',
      { opacity: 0, x: -90 },
      { opacity: 1, x: 0, duration: 0.5, ease: 'back.out(1.8)' }, 8.45)
    .to('#scene4 .card-s4',
      { opacity: 0, scale: 0.92, y: -90, duration: 0.45, ease: 'power2.in' }, 10.55);

  // ==========================================
  // SCENE 5: 11.0s - 19.0s (Live Product Demo Showcase - 8.0s Duration)
  // ==========================================
  tl.addLabel('scene5', 11.0)
    .call(() => showScene('scene5'), null, 11.0)
    .fromTo('#scene5 .m3-chip',
      { opacity: 0, x: -90 },
      { opacity: 1, x: 0, duration: 0.6, ease: 'back.out(1.8)' }, 11.0)
    .fromTo('#scene5 h1',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, ease: emphasized }, 11.15)
    
    // Feature Card 1: One-Click Student Add (Pops at 11.4s)
    .fromTo('#scene5 .feat-1',
      { opacity: 0, x: -80, scale: 0.9 },
      { opacity: 1, x: 0, scale: 1, duration: 0.7, ease: 'back.out(1.6)' }, 11.4)
    .fromTo('#scene5 .feat-1 .mini-status-chip',
      { scale: 0 },
      { scale: 1, duration: 0.5, ease: 'back.out(2)' }, 11.85)

    // Feature Card 2: Auto Attendance (Pops at 13.1s)
    .fromTo('#scene5 .feat-2',
      { opacity: 0, x: 80, scale: 0.9 },
      { opacity: 1, x: 0, scale: 1, duration: 0.7, ease: 'back.out(1.6)' }, 13.1)
    .fromTo('#scene5 .feat-2 .att-item',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.2, ease: 'power2.out' }, 13.5)

    // Feature Card 3: Payments & Debt Control (Pops at 14.8s)
    .fromTo('#scene5 .feat-3',
      { opacity: 0, x: -80, scale: 0.9 },
      { opacity: 1, x: 0, scale: 1, duration: 0.7, ease: 'back.out(1.6)' }, 14.8)
    .fromTo('#scene5 .feat-3 .fin-box',
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.45, stagger: 0.2, ease: 'back.out(1.7)' }, 15.2)

    // Feature Card 4: Schedule (Pops at 16.5s)
    .fromTo('#scene5 .feat-4',
      { opacity: 0, x: 80, scale: 0.9 },
      { opacity: 1, x: 0, scale: 1, duration: 0.7, ease: 'back.out(1.6)' }, 16.5)
    .fromTo('#scene5 .feat-4 .sched-live-pill',
      { scale: 0 },
      { scale: 1, duration: 0.5, ease: 'back.out(2)' }, 16.95)

    // Exit Scene 5 at 18.55s
    .to('#scene5 .card-s5',
      { opacity: 0, scale: 0.92, y: -90, duration: 0.45, ease: 'power2.in' }, 18.55);

  // ==========================================
  // SCENE 6: 19.0s - 23.0s (Call To Action "+")
  // ==========================================
  tl.addLabel('scene6', 19.0)
    .call(() => showScene('scene6'), null, 19.0)
    .fromTo('#scene6 .card-s6',
      { opacity: 0, scale: 0.75, y: 120 },
      { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'back.out(1.8)' }, 19.0)
    .fromTo('#scene6 .cta-plus-container',
      { scale: 0, rotate: -45 },
      { scale: 1, rotate: 0, duration: 0.7, ease: 'back.out(2.2)' }, 19.25)
    .fromTo('#scene6 .comment-badge',
      { opacity: 0, x: -90 },
      { opacity: 1, x: 0, duration: 0.55, ease: 'back.out(1.8)' }, 19.65)
    .to('#scene6 .card-s6',
      { opacity: 0, scale: 0.92, y: -90, duration: 0.45, ease: 'power2.in' }, 22.55);

  // 5. OBS Timecode & Controller Logic
  const timecodeEl = document.getElementById('timecode');
  const btnRestart = document.getElementById('btnRestart');
  const controlBar = document.getElementById('controlBar');

  function updateTimecode() {
    if (timecodeEl && tl) {
      const total = 23.0;
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
