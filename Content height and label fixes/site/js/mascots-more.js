/* Three more of the cast, drawn to Pop's rules: a 160 viewBox, one rounded body
   in a flat saturated colour, ink-dark dot eyes that follow the cursor, pale
   cheeks at 35%, a short mouth, and a single prop that says who they are.
     <needt-sun variant="shine|nap">     yellow, rays that turn slowly
     <needt-sprout variant="grow|wave">   green, a leaf on top
     <needt-ember variant="spark|calm">   orange drop, a flicker on top
   Same behaviour as the others: blink, idle glances, hover = hop, click = beam. */
(() => {
  const INK = '#1a1c1e';
  const CSS = `
  :host{display:inline-block;width:var(--size,200px);height:var(--size,200px);line-height:0;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}
  svg{width:100%;height:100%;overflow:visible;display:block}
  svg *{transform-box:view-box}
  .body{transform-origin:80px 140px;animation:bob 2.8s ease-in-out infinite}
  @keyframes bob{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-5px) scale(.98,1.02)}}
  .hop .body{animation:hop .7s cubic-bezier(.3,.7,.4,1)}
  @keyframes hop{0%{transform:none}20%{transform:scale(1.12,.88)}50%{transform:translateY(-22px) scale(.94,1.07)}80%{transform:scale(1.05,.95)}100%{transform:none}}
  .rays{transform-origin:80px 80px;animation:spin 14s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .leaf{transform-origin:80px 40px;animation:sway 2.4s ease-in-out infinite alternate}
  @keyframes sway{from{transform:rotate(-9deg)}to{transform:rotate(9deg)}}
  .flick{transform-origin:80px 34px;animation:flick .9s ease-in-out infinite alternate}
  @keyframes flick{from{transform:scale(1,1) rotate(-4deg)}to{transform:scale(.86,1.12) rotate(4deg)}}
  .look{transition:transform .25s ease-out}
  .blink .eye{transform:scaleY(.12)}
  .eye{transform-box:fill-box;transform-origin:center;transition:transform .08s}
  @media (prefers-reduced-motion:reduce){.body,.rays,.leaf,.flick{animation:none}}
  :host([seated]) svg:not(.jumping):not(.hop):not(.splashing) .body,
  :host([seated]) svg:not(.jumping):not(.hop):not(.splashing) .floater,
  :host([seated]) svg:not(.jumping):not(.hop):not(.splashing) .puff,
  :host([seated]) .shadow { animation: none; }`;

  const eyes = (sleepy) => sleepy
    ? `<path d="M-24 0 q8 7 16 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M8 0 q8 7 16 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`
    : `<ellipse class="eye" cx="-16" cy="0" rx="6.5" ry="8" fill="${INK}"/><ellipse class="eye" cx="16" cy="0" rx="6.5" ry="8" fill="${INK}"/>
       <circle cx="-14" cy="-3" r="2.2" fill="#fff"/><circle cx="18" cy="-3" r="2.2" fill="#fff"/>`;
  const mouth = (beam) => beam
    ? `<path d="M-11 15 Q0 28 11 15 Z" fill="${INK}"/><path d="M-6 21 Q0 26 6 21" fill="#FF6B6B"/>`
    : `<path d="M-8 16 Q0 23 8 16" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  const face = (sleepy, beam, y) => `<g transform="translate(80 ${y})"><g class="look">
      <g fill="#fff" opacity=".35"><circle cx="-29" cy="11" r="7.5"/><circle cx="29" cy="11" r="7.5"/></g>
      <g>${eyes(sleepy)}</g>${mouth(beam)}</g></g>`;

  const SHAPES = {
    'needt-sun': {
      variants: ['shine', 'nap'],
      draw: (v, beam) => {
        let rays = '';
        for (let i = 0; i < 10; i++) {
          const a = i * 36;
          rays += `<rect x="76" y="6" width="8" height="22" rx="4" fill="#FFB020" transform="rotate(${a} 80 80)"/>`;
        }
        return `<g class="rays">${rays}</g>
          <g class="body"><circle cx="80" cy="80" r="46" fill="#FFC53D"/>${face(v === 'nap', beam, 78)}</g>`;
      }
    },
    'needt-sprout': {
      variants: ['grow', 'wave'],
      draw: (v, beam) => `<g class="body">
          <g class="leaf"><path d="M80 44 C78 30 84 20 96 16 C98 30 92 40 80 44Z" fill="#1FA85F"/><path d="M80 44 L80 32" stroke="#1FA85F" stroke-width="4" stroke-linecap="round"/></g>
          ${v === 'wave' ? `<path d="M118 92 L138 74" stroke="#2FD08A" stroke-width="12" stroke-linecap="round"/>` : ''}
          <path d="M80 44 C108 44 124 64 124 90 C124 116 104 132 80 132 C56 132 36 116 36 90 C36 64 52 44 80 44Z" fill="#2FD08A"/>
          ${face(false, beam || v === 'wave', 90)}</g>`
    },
    'needt-ember': {
      variants: ['spark', 'calm'],
      draw: (v, beam) => `<g class="body">
          <g class="flick"><path d="M80 18 C90 30 92 40 80 48 C68 40 70 30 80 18Z" fill="#FFD23F"/></g>
          <path d="M80 34 C98 56 124 74 124 98 C124 120 104 136 80 136 C56 136 36 120 36 98 C36 74 62 56 80 34Z" fill="#FF7A45"/>
          ${face(v === 'calm', beam, 100)}</g>`
    }
  };

  const live = new Set(); let lastMove = 0, mx = 0, my = 0;
  const aim = (el, dx, dy) => el._look && (el._look.style.transform = `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px)`);
  addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY; lastMove = Date.now();
    live.forEach(el => {
      const r = el.getBoundingClientRect(); if (!r.width) return;
      const vx = mx - (r.left + r.width / 2), vy = my - (r.top + r.height / 2), d = Math.hypot(vx, vy) || 1, k = Math.min(6, d / 30);
      aim(el, vx / d * k, vy / d * k * .7);
    });
  }, { passive: true });

  Object.keys(SHAPES).forEach(tag => {
    if (customElements.get(tag)) return;
    const spec = SHAPES[tag];
    class M extends HTMLElement {
      static get observedAttributes() { return ['variant', 'size']; }
      constructor() { super(); this.attachShadow({ mode: 'open' }); this._beam = false; }
      attributeChangedCallback() { this.isConnected && this.render(); }
      _v() { const v = this.getAttribute('variant'); return spec.variants.includes(v) ? v : spec.variants[0]; }
      connectedCallback() {
        this.render(); live.add(this);
        this.addEventListener('pointerenter', this._h = () => this.hop());
        this.addEventListener('click', this._c = () => { this._beam = true; this.render(); this.hop(); clearTimeout(this._mt); this._mt = setTimeout(() => { this._beam = false; this.render(); }, 1400); });
        const blink = () => { this._bt = setTimeout(() => { const s = this._svg; if (s) { s.classList.add('blink'); setTimeout(() => s.classList.remove('blink'), 130); } blink(); }, 1600 + Math.random() * 3000); };
        const idle = () => { this._it = setTimeout(() => { if (Date.now() - lastMove > 2500) aim(this, (Math.random() * 2 - 1) * 5, (Math.random() * 2 - 1) * 3); idle(); }, 900 + Math.random() * 1600); };
        blink(); idle();
      }
      disconnectedCallback() { live.delete(this); [this._bt, this._it, this._mt].forEach(clearTimeout); this.removeEventListener('pointerenter', this._h); this.removeEventListener('click', this._c); }
      hop() { const s = this._svg; if (!s || s.classList.contains('hop')) return; s.classList.add('hop'); setTimeout(() => s.classList.remove('hop'), 720); }
      render() {
        const size = this.getAttribute('size'); if (size) this.style.setProperty('--size', /^\d+$/.test(size) ? size + 'px' : size);
        this.shadowRoot.innerHTML = `<style>${CSS}</style><svg viewBox="0 0 160 160" aria-hidden="true">${spec.draw(this._v(), this._beam)}</svg>`;
        this._svg = this.shadowRoot.querySelector('svg'); this._look = this.shadowRoot.querySelector('.look');
      }
    }
    customElements.define(tag, M);
  });
})();
