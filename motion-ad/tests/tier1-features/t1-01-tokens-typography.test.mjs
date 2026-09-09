import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadHTML, loadCSS } from '../helpers/project-paths.mjs';

describe('Tier 1: Feature 1 - M3 Design Tokens & Typography', () => {
  const { doc } = loadHTML();
  const { tokens, main } = loadCSS();

  test('Outfit font family is imported via Google Fonts with complete weight range', () => {
    const fontLinks = doc.querySelectorAll('link[href*="fonts.googleapis.com"]');
    expect(fontLinks.length).toBeGreaterThan(0);
    const outfitLink = fontLinks.find(l => (l.getAttribute('href') || '').includes('Outfit'));
    expect(outfitLink).toBeDefined();
    const href = outfitLink.getAttribute('href');
    expect(href).toContain('wght@400');
    expect(href).toContain('700');
    expect(href).toContain('900');
  });

  test('Primary color token is defined in CSS design tokens', () => {
    const primary = tokens.getVariable('--md-sys-color-primary') || 
                    tokens.getVariable('--primary') ||
                    tokens.getVariable('--md-sys-color-primary-dark');
    expect(primary).toBeDefined();
    expect(primary).toMatch(/#[0-9a-fA-F]{6}/);
  });

  test('Status color tokens for Paid Green and Debt Red are defined', () => {
    const green = tokens.getVariable('--paid-green') || 
                  tokens.getVariable('--md-sys-color-success-container') ||
                  tokens.getVariable('--tertiary');
    const red = tokens.getVariable('--debt-red') || 
                tokens.getVariable('--md-sys-color-error') ||
                tokens.getVariable('--error');
    expect(green).toBeDefined();
    expect(red).toBeDefined();
  });

  test('Body element uses Outfit typography', () => {
    const bodyFont = main.getProperty('body', 'font-family');
    expect(bodyFont).toBeDefined();
    expect(bodyFont).toContain('Outfit');
  });

  test('Avatar elements (.ui-ava) have circular avatar styling', () => {
    const avaRadius = main.getProperty('.ui-ava', 'border-radius') || 
                      tokens.getVariable('--md-sys-radius-full');
    expect(avaRadius).toBeDefined();
    expect(avaRadius).toMatch(/(50%|9999px|999px)/);
  });
});
