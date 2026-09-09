/**
 * Zero-dependency CSS parser for TutorSpace Motion-Ad tokens and styles.
 */

export class CSSParser {
  constructor(cssContent) {
    this.rawContent = cssContent;
    this.cleanContent = this._stripComments(cssContent);
    this.variables = new Map();
    this.rules = new Map(); // selector -> { [prop]: value }
    this.keyframes = new Map(); // name -> keyframe content
    this._parse();
  }

  _stripComments(css) {
    return css.replace(/\/\*[\s\S]*?\*\//g, '');
  }

  _parse() {
    // Extract keyframes first to avoid brace confusion
    let stripped = this.cleanContent.replace(/@keyframes\s+([a-zA-Z0-9_-]+)\s*\{([\s\S]*?\n\})/g, (m, name, content) => {
      this.keyframes.set(name, content);
      return '';
    });

    // Parse blocks: selector { declarations }
    const ruleRegex = /([^{}]+)\{([^}]+)\}/g;
    let match;
    while ((match = ruleRegex.exec(stripped)) !== null) {
      const selectorGroup = match[1].trim();
      const body = match[2].trim();

      const declarations = {};
      const declRegex = /([a-zA-Z0-9_\-]+)\s*:\s*([^;]+);?/g;
      let dMatch;
      while ((dMatch = declRegex.exec(body)) !== null) {
        const prop = dMatch[1].trim();
        const val = dMatch[2].trim();
        declarations[prop] = val;

        if (prop.startsWith('--')) {
          this.variables.set(prop, val);
        }
      }

      // Group selectors separated by comma
      const selectors = selectorGroup.split(',').map(s => s.trim()).filter(Boolean);
      for (const sel of selectors) {
        if (!this.rules.has(sel)) {
          this.rules.set(sel, {});
        }
        Object.assign(this.rules.get(sel), declarations);
      }
    }
  }

  getVariable(varName) {
    return this.variables.get(varName) || null;
  }

  hasVariable(varName) {
    return this.variables.has(varName);
  }

  getAllVariables() {
    return Object.fromEntries(this.variables);
  }

  getProperty(selector, propName) {
    const rule = this.rules.get(selector);
    if (!rule) return null;
    return rule[propName] || null;
  }

  hasRule(selector) {
    return this.rules.has(selector);
  }

  hasKeyframe(name) {
    return this.keyframes.has(name);
  }

  validateSyntax() {
    // Check balanced braces and parentheses
    const stack = [];
    const errors = [];
    const text = this.cleanContent;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '{' || char === '(') {
        stack.push({ char, pos: i });
      } else if (char === '}') {
        if (stack.length === 0 || stack[stack.length - 1].char !== '{') {
          errors.push(`Unmatched closing brace '}' at character ${i}`);
        } else {
          stack.pop();
        }
      } else if (char === ')') {
        if (stack.length === 0 || stack[stack.length - 1].char !== '(') {
          errors.push(`Unmatched closing parenthesis ')' at character ${i}`);
        } else {
          stack.pop();
        }
      }
    }

    while (stack.length > 0) {
      const unclosed = stack.pop();
      errors.push(`Unclosed '${unclosed.char}' opened at character ${unclosed.pos}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export function parseCSS(cssString) {
  return new CSSParser(cssString);
}
