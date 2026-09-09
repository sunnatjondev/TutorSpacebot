/**
 * Zero-dependency HTML parser and DOM traversal engine for TutorSpace Motion Ad.
 */

export class DOMElement {
  constructor(tagName, attributes = {}, parent = null) {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attributes };
    this.parent = parent;
    this.children = [];
    this.childNodes = []; // strings or DOMElement
    this.style = {};

    if (this.attributes.style) {
      this._parseStyle(this.attributes.style);
    }
  }

  _parseStyle(styleStr) {
    const parts = styleStr.split(';');
    for (const part of parts) {
      const idx = part.indexOf(':');
      if (idx !== -1) {
        const key = part.slice(0, idx).trim();
        const val = part.slice(idx + 1).trim();
        if (key) this.style[key] = val;
      }
    }
  }

  get id() {
    return this.attributes.id || '';
  }

  set id(val) {
    this.attributes.id = val;
  }

  get className() {
    return this.attributes.class || '';
  }

  set className(val) {
    this.attributes.class = val;
  }

  get classList() {
    const self = this;
    const getClasses = () => (self.className ? self.className.trim().split(/\s+/) : []);
    return {
      contains(cls) {
        return getClasses().includes(cls);
      },
      add(cls) {
        const classes = getClasses();
        if (!classes.includes(cls)) {
          classes.push(cls);
          self.className = classes.join(' ');
        }
      },
      remove(cls) {
        const classes = getClasses().filter(c => c !== cls);
        self.className = classes.join(' ');
      },
      toggle(cls) {
        if (this.contains(cls)) {
          this.remove(cls);
          return false;
        } else {
          this.add(cls);
          return true;
        }
      },
      toString() {
        return self.className;
      }
    };
  }

  getAttribute(name) {
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }

  hasAttribute(name) {
    return this.attributes[name] !== undefined;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'style') {
      this._parseStyle(String(value));
    }
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  get textContent() {
    let text = '';
    for (const node of this.childNodes) {
      if (typeof node === 'string') {
        text += node;
      } else if (node instanceof DOMElement) {
        text += node.textContent;
      }
    }
    return text;
  }

  get innerHTML() {
    return this.childNodes.map(node => (typeof node === 'string' ? node : node.outerHTML)).join('');
  }

  get outerHTML() {
    const attrs = Object.entries(this.attributes)
      .map(([k, v]) => (v !== '' ? `${k}="${v}"` : k))
      .join(' ');
    const attrStr = attrs ? ' ' + attrs : '';
    const selfClosing = ['IMG', 'INPUT', 'BR', 'HR', 'META', 'LINK'].includes(this.tagName);
    if (selfClosing) {
      return `<${this.tagName.toLowerCase()}${attrStr}>`;
    }
    return `<${this.tagName.toLowerCase()}${attrStr}>${this.innerHTML}</${this.tagName.toLowerCase()}>`;
  }

  getElementById(id) {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.getElementById(id);
      if (found) return found;
    }
    return null;
  }

  getElementsByTagName(tagName) {
    const target = tagName.toUpperCase();
    const result = [];
    if (target === '*' || this.tagName === target) {
      result.push(this);
    }
    for (const child of this.children) {
      result.push(...child.getElementsByTagName(target));
    }
    return result;
  }

  getElementsByClassName(className) {
    const result = [];
    if (this.classList.contains(className)) {
      result.push(this);
    }
    for (const child of this.children) {
      result.push(...child.getElementsByClassName(className));
    }
    return result;
  }

  _matchesSimpleSelector(part) {
    // Examples: div, #id, .class, tag.class, [attr="val"], [attr]
    if (part === '*') return true;

    // Attribute match [attr="val"], [attr*="val"], or [attr]
    const attrMatch = part.match(/\[([a-zA-Z0-9_-]+)(?:([\*\~\|\^\$]?=)([\"\']?)(.*?)\3)?\]/);
    if (attrMatch) {
      const attrName = attrMatch[1];
      const operator = attrMatch[2] || '=';
      const attrVal = attrMatch[4];
      if (!this.hasAttribute(attrName)) return false;
      if (attrVal !== undefined) {
        const actualVal = this.getAttribute(attrName) || '';
        if (operator === '*=' && !actualVal.includes(attrVal)) return false;
        if (operator === '=' && actualVal !== attrVal) return false;
        if (operator === '^=' && !actualVal.startsWith(attrVal)) return false;
        if (operator === '$=' && !actualVal.endsWith(attrVal)) return false;
      }
      // Strip out the attribute selector for tag/class checks
      part = part.replace(attrMatch[0], '');
      if (!part) return true;
    }

    // ID match
    if (part.startsWith('#')) {
      return this.id === part.slice(1);
    }

    // Class matches
    if (part.startsWith('.')) {
      const classes = part.split('.').filter(Boolean);
      return classes.every(cls => this.classList.contains(cls));
    }

    // Tag with classes or id (e.g., div.intro or img#logo)
    const tagMatch = part.match(/^([a-zA-Z0-9_-]+)(.*)$/);
    if (tagMatch) {
      const tag = tagMatch[1].toUpperCase();
      const rest = tagMatch[2];
      if (this.tagName !== tag) return false;
      if (!rest) return true;

      if (rest.startsWith('#')) {
        return this.id === rest.slice(1);
      }
      if (rest.startsWith('.')) {
        const classes = rest.split('.').filter(Boolean);
        return classes.every(cls => this.classList.contains(cls));
      }
    }

    return false;
  }

  matches(selector) {
    const sel = selector.trim();
    if (sel.includes(',')) {
      return sel.split(',').some(s => this.matches(s));
    }

    // Handle single token
    if (!sel.includes(' ') && !sel.includes('>')) {
      return this._matchesSimpleSelector(sel);
    }

    // Handle compound: e.g. "#s1 .intro-logo" or ".sc.on"
    const tokens = sel.split(/\s+/);
    let currentElem = this;
    for (let i = tokens.length - 1; i >= 0; i--) {
      const tok = tokens[i];
      if (tok === '>') {
        i--;
        const parentTok = tokens[i];
        if (!currentElem.parent || !currentElem.parent._matchesSimpleSelector(parentTok)) {
          return false;
        }
        currentElem = currentElem.parent;
      } else {
        if (!currentElem._matchesSimpleSelector(tok)) {
          return false;
        }
        if (i > 0) {
          // Look up ancestor tree
          let ancestor = currentElem.parent;
          let matched = false;
          const prevTok = tokens[i - 1];
          if (prevTok === '>') {
            // direct parent handled in next loop step
            currentElem = ancestor;
          } else {
            while (ancestor) {
              if (ancestor._matchesSimpleSelector(prevTok)) {
                matched = true;
                currentElem = ancestor;
                // do NOT decrement i here since loop decrements i
                break;
              }
              ancestor = ancestor.parent;
            }
            if (!matched) return false;
          }
        }
      }
    }
    return true;
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(selector) {
    const results = [];
    const checkNode = (node) => {
      if (node !== this && node.matches(selector)) {
        results.push(node);
      }
      for (const child of node.children) {
        checkNode(child);
      }
    };
    checkNode(this);
    return results;
  }
}

export class HTMLDocument extends DOMElement {
  constructor() {
    super('#DOCUMENT');
    this.head = null;
    this.body = null;
  }

  getElementById(id) {
    return super.getElementById(id);
  }

  querySelector(selector) {
    return super.querySelector(selector);
  }

  querySelectorAll(selector) {
    return super.querySelectorAll(selector);
  }
}

/**
 * Fast regex-based parser for HTML5 documents.
 */
export function parseHTML(htmlString) {
  const doc = new HTMLDocument();
  let currentParent = doc;
  const tagRegex = /<!--[\s\S]*?-->|<(?:\/([a-zA-Z0-9_-]+)|([a-zA-Z0-9_-]+)((?:\s+[^>]*?)?)\s*(\/)?)\s*>|([^<]+)/g;
  let match;

  const selfClosingTags = new Set([
    'IMG', 'INPUT', 'BR', 'HR', 'META', 'LINK', 'AREA', 'BASE', 'COL', 'PARAM'
  ]);

  while ((match = tagRegex.exec(htmlString)) !== null) {
    const [full, closeTag, openTag, attrStr, selfCloseSlash, textContent] = match;

    if (full.startsWith('<!--')) {
      // Comment, skip
      continue;
    }

    if (closeTag) {
      const upper = closeTag.toUpperCase();
      let p = currentParent;
      while (p && p !== doc && p.tagName !== upper) {
        p = p.parent;
      }
      if (p && p.parent) {
        currentParent = p.parent;
      }
    } else if (openTag) {
      const upper = openTag.toUpperCase();
      const attributes = {};

      if (attrStr) {
        const attrRegex = /([a-zA-Z0-9_\-:]+)(?:=(?:["']([^"']*)["']|([^\s>]+)))?/g;
        let aMatch;
        while ((aMatch = attrRegex.exec(attrStr)) !== null) {
          const attrName = aMatch[1].toLowerCase();
          const attrVal = aMatch[2] !== undefined ? aMatch[2] : aMatch[3] !== undefined ? aMatch[3] : '';
          attributes[attrName] = attrVal;
        }
      }

      const element = new DOMElement(upper, attributes, currentParent);
      currentParent.children.push(element);
      currentParent.childNodes.push(element);

      if (upper === 'HEAD') doc.head = element;
      if (upper === 'BODY') doc.body = element;

      const isSelfClosing = selfCloseSlash || selfClosingTags.has(upper);
      if (!isSelfClosing) {
        currentParent = element;
      }
    } else if (textContent) {
      const text = textContent;
      if (currentParent) {
        currentParent.childNodes.push(text);
      }
    }
  }

  return doc;
}
