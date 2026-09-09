/**
 * Headless browser runtime simulator for GSAP Motion & Audio evaluation.
 * Executes JavaScript files in a mock DOM & Audio environment without browser dependencies.
 */

import vm from 'node:vm';
import { parseHTML } from './dom-parser.mjs';

export class MockGSAPTimeline {
  constructor(vars = {}) {
    this.vars = vars;
    this.labels = new Map(); // labelName -> time
    this.tweens = []; // { target, from, to, pos, duration, ease }
    this.calls = []; // { fn, pos }
    this.currentTime = 0;
    this.totalDuration = 0;
    this._listeners = new Map();
  }

  addLabel(name, position) {
    const pos = typeof position === 'number' ? position : this.totalDuration;
    this.labels.set(name, pos);
    if (pos > this.totalDuration) this.totalDuration = pos;
    return this;
  }

  call(fn, params, position) {
    const pos = typeof position === 'number' ? position : this.totalDuration;
    this.calls.push({ fn, params, pos });
    if (pos > this.totalDuration) this.totalDuration = pos;
    return this;
  }

  fromTo(target, fromVars, toVars, position) {
    const duration = toVars.duration || 0.5;
    const pos = typeof position === 'number' ? position : this.totalDuration;
    const end = pos + duration;
    this.tweens.push({
      type: 'fromTo',
      target,
      from: fromVars,
      to: toVars,
      pos,
      duration,
      end,
      ease: toVars.ease || 'power1.out',
    });
    if (end > this.totalDuration) this.totalDuration = end;
    return this;
  }

  to(target, vars, position) {
    const duration = vars.duration || 0.5;
    const pos = typeof position === 'number' ? position : this.totalDuration;
    const end = pos + duration;
    this.tweens.push({
      type: 'to',
      target,
      to: vars,
      pos,
      duration,
      end,
      ease: vars.ease || 'power1.out',
    });
    if (end > this.totalDuration) this.totalDuration = end;
    return this;
  }

  set(target, vars, position) {
    const pos = typeof position === 'number' ? position : this.totalDuration;
    this.tweens.push({
      type: 'set',
      target,
      to: vars,
      pos,
      duration: 0,
      end: pos,
    });
    return this;
  }

  time(val) {
    if (typeof val === 'number') {
      this.currentTime = val;
      return this;
    }
    return this.currentTime;
  }

  seek(time, suppressEvents = false) {
    this.currentTime = time;
    if (!suppressEvents) {
      for (const call of this.calls) {
        if (Math.abs(call.pos - time) < 0.05) {
          try {
            call.fn.apply(null, call.params || []);
          } catch (e) {
            // caught
          }
        }
      }
    }
    return this;
  }

  restart() {
    this.currentTime = 0;
    if (this.vars.onStart) {
      try {
        this.vars.onStart();
      } catch (e) {}
    }
    return this;
  }

  duration() {
    return this.totalDuration;
  }
}

export class MockAudioElement {
  constructor(src = '') {
    this.src = src;
    this.currentTime = 0;
    this.paused = true;
    this.loop = false;
    this.volume = 1.0;
    this.muted = false;
    this.playCallCount = 0;
    this.pauseCallCount = 0;
    this.simulatedRejection = false;
  }

  play() {
    this.playCallCount++;
    if (this.simulatedRejection) {
      return Promise.reject(new Error('NotAllowedError: Autoplay policy prevented playback'));
    }
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.pauseCallCount++;
    this.paused = true;
  }

  addEventListener(event, fn) {}
  removeEventListener(event, fn) {}
}

export class MockAudioContext {
  constructor() {
    this.state = 'suspended';
    this.destination = {};
    this.resumeCallCount = 0;
  }

  createOscillator() {
    return {
      type: 'sine',
      frequency: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
      },
      connect: () => {},
      start: () => {},
      stop: () => {},
    };
  }

  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
      },
      connect: () => {},
    };
  }

  resume() {
    this.resumeCallCount++;
    this.state = 'running';
    return Promise.resolve();
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}

export function createSimulatorEnvironment(htmlSource) {
  const doc = parseHTML(htmlSource);
  const eventListeners = new Map();
  const timelines = [];
  let rafId = 0;
  const rafCallbacks = new Map();

  const windowMock = {
    innerWidth: 1080,
    innerHeight: 1920,
    addEventListener: (evt, fn) => {
      if (!eventListeners.has(evt)) eventListeners.set(evt, []);
      eventListeners.get(evt).push(fn);
    },
    removeEventListener: (evt, fn) => {
      if (eventListeners.has(evt)) {
        const fns = eventListeners.get(evt).filter(f => f !== fn);
        eventListeners.set(evt, fns);
      }
    },
    requestAnimationFrame: (cb) => {
      rafId++;
      rafCallbacks.set(rafId, cb);
      return rafId;
    },
    cancelAnimationFrame: (id) => {
      rafCallbacks.delete(id);
    },
    lucide: {
      createIcons: () => {},
    },
    Audio: MockAudioElement,
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    TutorSpaceAudio: null,
  };

  const documentMock = {
    addEventListener: (evt, fn) => {
      windowMock.addEventListener(evt, fn);
    },
    removeEventListener: (evt, fn) => {
      windowMock.removeEventListener(evt, fn);
    },
    getElementById: (id) => doc.getElementById(id),
    querySelector: (sel) => doc.querySelector(sel),
    querySelectorAll: (sel) => doc.querySelectorAll(sel),
    createElement: (tag) => {
      if (tag.toLowerCase() === 'audio') return new MockAudioElement();
      return doc.createElement ? doc.createElement(tag) : {};
    },
    body: doc.body,
    documentElement: doc,
  };

  const gsapMock = {
    timeline: (vars) => {
      const tl = new MockGSAPTimeline(vars);
      timelines.push(tl);
      return tl;
    },
    to: () => {},
    fromTo: () => {},
    set: () => {},
  };

  const context = {
    window: windowMock,
    document: documentMock,
    addEventListener: windowMock.addEventListener,
    removeEventListener: windowMock.removeEventListener,
    innerWidth: windowMock.innerWidth,
    innerHeight: windowMock.innerHeight,
    requestAnimationFrame: windowMock.requestAnimationFrame,
    cancelAnimationFrame: windowMock.cancelAnimationFrame,
    gsap: gsapMock,
    lucide: windowMock.lucide,
    Audio: windowMock.Audio,
    AudioContext: windowMock.AudioContext,
    console: {
      log: () => {},
      warn: () => {},
      error: () => {},
      info: () => {},
    },
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
  };

  vm.createContext(context);

  return {
    context,
    doc,
    windowMock,
    documentMock,
    gsapMock,
    timelines,
    eventListeners,
    fireEvent(eventName, eventObj = {}) {
      const listeners = eventListeners.get(eventName) || [];
      for (const fn of listeners) {
        fn(eventObj);
      }
    },
    runScript(code, filename = 'script.js') {
      const script = new vm.Script(code, { filename });
      return script.runInContext(context);
    },
  };
}
