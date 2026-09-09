import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadCSS, loadHTML } from '../helpers/project-paths.mjs';

describe('Tier 2: Feature 1 - Tokens & Typography Boundaries', () => {
  const { tokens, main } = loadCSS();
  const { doc } = loadHTML();

  test('All defined hex color tokens strictly follow #RRGGBB format', () => {
    const vars = tokens.getAllVariables();
    for (const [key, val] of Object.entries(vars)) {
      if (key.includes('color') && val.startsWith('#')) {
        expect(val).toMatch(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
      }
    }
  });

  test('No CSS variable value contains undefined, null, or NaN', () => {
    const vars = tokens.getAllVariables();
    for (const [key, val] of Object.entries(vars)) {
      expect(val).not.toContain('undefined');
      expect(val).not.toContain('null');
      expect(val).not.toContain('NaN');
    }
  });

  test('CSS syntax validation confirms no unclosed braces in tokens or main stylesheets', () => {
    const tokensVal = tokens.validateSyntax();
    const mainVal = main.validateSyntax();
    expect(tokensVal.valid).toBe(true);
    expect(mainVal.valid).toBe(true);
  });

  test('Border radius tokens specify non-negative dimensions or full pill keyword', () => {
    const radSmall = tokens.getVariable('--md-sys-radius-small');
    const radMed = tokens.getVariable('--md-sys-radius-medium');
    const radLarge = tokens.getVariable('--md-sys-radius-large');
    const radFull = tokens.getVariable('--md-sys-radius-full');
    if (radSmall) expect(radSmall).toMatch(/^[0-9]+px$/);
    if (radMed) expect(radMed).toMatch(/^[0-9]+px$/);
    if (radLarge) expect(radLarge).toMatch(/^[0-9]+px$/);
    if (radFull) expect(radFull).toMatch(/(9999px|999px|50%)/);
  });

  test('Google Fonts stylesheet includes bold and extra-bold weights without missing intermediates', () => {
    const link = doc.querySelector('link[href*="Outfit"]');
    expect(link).toBeDefined();
    const href = link.getAttribute('href');
    // Ensure weight range spans from <=500 to >=800
    expect(href).toContain('500');
    expect(href).toContain('600');
    expect(href).toContain('700');
    expect(href).toContain('800');
  });
});
