/**
 * Shared project paths and file loaders for TutorSpace Motion Ad tests.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from './dom-parser.mjs';
import { parseCSS } from './css-parser.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const MOTION_AD_ROOT = path.resolve(__dirname, '../../');
export const HTML_PATH = path.join(MOTION_AD_ROOT, 'index.html');
export const TOKENS_CSS_PATH = path.join(MOTION_AD_ROOT, 'css', 'md3-tokens.css');
export const MAIN_CSS_PATH = path.join(MOTION_AD_ROOT, 'css', 'main.css');
export const MOTION_JS_PATH = path.join(MOTION_AD_ROOT, 'js', 'motion.js');
export const AUDIO_JS_PATH = path.join(MOTION_AD_ROOT, 'js', 'audio.js');
export const SERVER_MJS_PATH = path.join(MOTION_AD_ROOT, 'server.mjs');
export const ASSETS_DIR = path.join(MOTION_AD_ROOT, 'assets');
export const LOGO_PATH = path.join(ASSETS_DIR, 'logo.jpg');
export const BGM_PATH = path.join(ASSETS_DIR, 'bg-music.mp3');

export function loadHTML() {
  const content = fs.readFileSync(HTML_PATH, 'utf-8');
  return {
    raw: content,
    doc: parseHTML(content),
  };
}

export function loadCSS() {
  const tokensRaw = fs.existsSync(TOKENS_CSS_PATH) ? fs.readFileSync(TOKENS_CSS_PATH, 'utf-8') : '';
  const mainRaw = fs.existsSync(MAIN_CSS_PATH) ? fs.readFileSync(MAIN_CSS_PATH, 'utf-8') : '';
  return {
    tokensRaw,
    tokens: parseCSS(tokensRaw),
    mainRaw,
    main: parseCSS(mainRaw),
  };
}

export function loadJS() {
  const motionRaw = fs.existsSync(MOTION_JS_PATH) ? fs.readFileSync(MOTION_JS_PATH, 'utf-8') : '';
  const audioRaw = fs.existsSync(AUDIO_JS_PATH) ? fs.readFileSync(AUDIO_JS_PATH, 'utf-8') : '';
  return {
    motionRaw,
    audioRaw,
  };
}
