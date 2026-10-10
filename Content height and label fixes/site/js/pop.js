/* <needt-pop variant="cheer|dance" size="200"></needt-pop>
   Eyes follow the cursor, blink; hover = jump; click = change mood. */
(() => {
  if (customElements.get('needt-pop')) return;
  const INK = '#1a1c1e', BODY = '#3AAEFF', SPARK = '#FFCC5C';
  const CSS = `
  :host{display:inline-block;width:var(--size,200px);height:var(--size,200px);line-height:0;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}
  svg{width:100%;height:100%;overflow:visible;display:block}
  svg *{transform-box:view-box}
  .body{transform-origin:80px 150px}
  .cheer .body{animation:jump 1.1s cubic-bezier(.3,.7,.4,1) infinite}
  @keyframes jump{0%,100%{transform:scale(1.03,.97)}20%{transform:scale(.98,1.03)}50%{transform:translateY(-8px)}80%{transform:translateY(0) scale(1.04,.96)}}
  .dance .body{animation:step 1.2s ease-in-out infinite}
  @keyframes step{0%,100%{transform:translateX(-5px) rotate(-7deg)}25%,75%{transform:translateY(-4px)}50%{transform:translateX(5px) rotate(7deg)}}
  .jumping .body{animation:big .7s cubic-bezier(.3,.7,.4,1)}
  @keyframes big{0%{transform:none}20%{transform:scale(1.12,.88)}50%{transform:translateY(-26px) scale(.93,1.08)}80%{transform:scale(1.06,.94)}100%{transform:none}}
  .armL{transform-origin:44px 88px}.armR{transform-origin:116px 88px}
  .cheer .armL{animation:wl .45s ease-in-out infinite alternate}
  .cheer .armR{animation:wr .45s ease-in-out infinite alternate}
  @keyframes wl{from{transform:rotate(-8deg)}to{transform:rotate(10deg)}}
  @keyframes wr{from{transform:rotate(8deg)}to{transform:rotate(-10deg)}}
  .dance .armL{animation:dl 1.2s ease-in-out infinite}
  .dance .armR{animation:dr 1.2s ease-in-out infinite}
  @keyframes dl{0%,100%{transform:rotate(0)}50%{transform:rotate(-70deg)}}
  @keyframes dr{0%,100%{transform:rotate(70deg)}50%{transform:rotate(0)}}
  .legL{transform-origin:64px 116px}.legR{transform-origin:96px 116px}
  .cheer .legL{animation:kl .9s ease-in-out infinite}
  .cheer .legR{animation:kr .9s ease-in-out infinite}
  @keyframes kl{0%,100%{transform:rotate(0)}50%{transform:rotate(8deg)}}
  @keyframes kr{0%,100%{transform:rotate(0)}50%{transform:rotate(-8deg)}}
  .dance .legL{animation:dlg 1.2s ease-in-out infinite}
  .dance .legR{animation:dlg 1.2s ease-in-out infinite reverse}
  @keyframes dlg{0%,100%{transform:rotate(-10deg)}25%{transform:rotate(18deg)}50%{transform:rotate(-10deg)}}
  .spark{transform-box:fill-box;transform-origin:center;animation:twinkle 1.4s ease-in-out infinite}
  g:nth-child(2)>.spark{animation-delay:.45s}g:nth-child(3)>.spark{animation-delay:.9s}
  @keyframes twinkle{0%,100%{opacity:.15;transform:scale(.5) rotate(0)}50%{opacity:1;transform:scale(1) rotate(20deg)}}
  .note{opacity:0;animation:rise 2.4s ease-out infinite}
  .note:nth-child(2){animation-delay:1.2s}
  @keyframes rise{0%{opacity:0;transform:translate(0,6px)}25%{opacity:1}100%{opacity:0;transform:translate(6px,-22px)}}
  .look{transition:transform .22s cubic-bezier(.3,.7,.4,1)}
  .eyes{transform-box:fill-box;transform-origin:center;transition:transform .08s ease}
  .blink .eyes{transform:scaleY(.08)}
  .cheeks{transition:opacity .2s}
  .jumping .cheeks{opacity:.8}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.spark{opacity:1}}
  
  :host([seated]) svg:not(.jumping):not(.hop):not(.splashing) .body,
  :host([seated]) svg:not(.jumping):not(.hop):not(.splashing) .floater,
  :host([seated]) svg:not(.jumping):not(.hop):not(.splashing) .puff,
  :host([seated]) .shadow { animation: none; }`;
  const arc = (x, up) => `<path d="M${x - 7} ${up ? -2 : -5} Q${x} ${up ? -11 : 3} ${x + 7} ${up ? -2 : -5}" stroke="${INK}" stroke-width="5.4" fill="none" stroke-linecap="round"/>`;
  const EYES = {
    calm: arc(-17) + arc(17), happy: arc(-17, 1) + arc(17, 1),
    open: `<circle cx="-17" cy="-4" r="7.4" fill="${INK}"/><circle cx="17" cy="-4" r="7.4" fill="${INK}"/>`,
    wide: `<circle cx="-17" cy="-4" r="7.4" fill="${INK}"/><circle cx="17" cy="-4" r="7.4" fill="${INK}"/><path d="M-22 -17.4 Q-17 -21.4 -12 -17.4" stroke="${INK}" stroke-width="4.6" fill="none" stroke-linecap="round"/><path d="M12 -17.4 Q17 -21.4 22 -17.4" stroke="${INK}" stroke-width="4.6" fill="none" stroke-linecap="round"/>`,
  };
  const MOUTH = {
    smile: `<path d="M-7 7 Q0 16 7 7" stroke="${INK}" stroke-width="5.4" fill="none" stroke-linecap="round"/>`,
    open: `<path d="M-10 8 Q0 24 10 8 Z" fill="${INK}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
    o: `<ellipse cx="0" cy="10" rx="4" ry="4.8" fill="${INK}"/>`,
  };
  const MOODS = { cheer: ['calm', 'smile'], dance: ['open', 'open'], happy: ['happy', 'open'], surprised: ['wide', 'o'] };
  const CYCLE = ['happy', 'surprised'];
  const star = (x, y, s, c = SPARK) => `<g transform="translate(${x} ${y}) scale(${s})"><path class="spark" d="M0 -10 Q2 -2 10 0 Q2 2 0 10 Q-2 2 -10 0 Q-2 -2 0 -10Z" fill="${c}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/></g>`;

  const svg = (variant, mood) => {
    const [e, m] = MOODS[mood] || MOODS[variant];
    const limb = (cls, d) => `<path class="${cls}" d="${d}" stroke="${BODY}" stroke-width="21" stroke-linecap="round" fill="none"/>`;
    const cheer = variant === 'cheer';
    return `<svg viewBox="0 0 160 160" class="${variant}" aria-hidden="true">
      ${cheer ? `<g>${star(134, 30, 1.3)}${star(148, 64, .75)}${star(24, 34, .7, '#8FD0FF')}</g>` : `<g font-size="18" fill="${INK}" font-family="Inter,system-ui,sans-serif"><text class="note" x="126" y="40">♪&#xFE0E;</text><text class="note" x="18" y="44">♫&#xFE0E;</text></g>`}
      <g class="body">
        ${limb('legL', 'M64 112 L56 136')}${limb('legR', 'M96 112 L104 136')}
        ${limb('armL', cheer ? 'M44 88 L28 66' : 'M44 92 L28 104')}${limb('armR', cheer ? 'M116 88 L132 66' : 'M116 92 L132 104')}
        <path d="M80 30 C106 30 124 50 125 78 C126 106 106 124 80 124 C54 124 34 106 35 78 C36 50 54 30 80 30Z" fill="${BODY}"/>
        <g transform="translate(80 76)"><g class="look">
          <g class="cheeks" fill="#fff" opacity=".35"><circle cx="-27" cy="9" r="7.5"/><circle cx="27" cy="9" r="7.5"/></g>
          <g class="eyes">${EYES[e]}</g>${MOUTH[m]}
        </g></g>
      </g>
    </svg>`;
  };

  const live = new Set(); let lastMove = 0, mx = 0, my = 0;
  const aim = (el, dx, dy) => el._look && (el._look.style.transform = `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px)`);
  const track = () => live.forEach(el => {
    const r = el.getBoundingClientRect(); if (!r.width) return;
    const vx = mx - (r.left + r.width / 2), vy = my - (r.top + r.height * .5), d = Math.hypot(vx, vy) || 1, k = Math.min(6, d / 30);
    aim(el, vx / d * k, vy / d * k * .7);
  });
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; lastMove = Date.now(); track(); }, { passive: true });

  class NeedtPop extends HTMLElement {
    static get observedAttributes() { return ['variant', 'size']; }
    constructor() { super(); this.attachShadow({ mode: 'open' }); this._mood = null; this._ci = 0; }
    attributeChangedCallback() { this.isConnected && this.render(); }
    _v() { return this.getAttribute('variant') === 'dance' ? 'dance' : 'cheer'; }
    _open() { return /open|wide/.test((MOODS[this._mood] || MOODS[this._v()])[0]); }
    connectedCallback() {
      this.render(); live.add(this);
      this.addEventListener('pointerenter', this._h = () => this.jump());
      this.addEventListener('click', this._c = () => {
        this._mood = CYCLE[this._ci++ % CYCLE.length]; this.render(); this.jump();
        clearTimeout(this._mt); this._mt = setTimeout(() => { this._mood = null; this.render(); }, 1600);
      });
      const blink = () => { this._bt = setTimeout(() => { if (this._open() && this._svg) { this._svg.classList.add('blink'); setTimeout(() => this._svg && this._svg.classList.remove('blink'), 130); } blink(); }, 1600 + Math.random() * 3000); };
      const idle = () => { this._it = setTimeout(() => { if (Date.now() - lastMove > 2500) Math.random() < .3 ? aim(this, 0, 0) : aim(this, (Math.random() * 2 - 1) * 5, (Math.random() * 2 - 1) * 3); idle(); }, 900 + Math.random() * 1600); };
      blink(); idle();
    }
    disconnectedCallback() { live.delete(this); [this._bt, this._it, this._mt].forEach(clearTimeout); this.removeEventListener('pointerenter', this._h); this.removeEventListener('click', this._c); }
    jump() { const s = this._svg; if (!s || s.classList.contains('jumping')) return; s.classList.add('jumping'); setTimeout(() => s.classList.remove('jumping'), 720); }
    render() {
      const size = this.getAttribute('size'); if (size) this.style.setProperty('--size', /^\d+$/.test(size) ? size + 'px' : size);
      this.shadowRoot.innerHTML = `<style>${CSS}</style>${svg(this._v(), this._mood)}`;
      this._svg = this.shadowRoot.querySelector('svg'); this._look = this.shadowRoot.querySelector('.look');
    }
  }
  customElements.define('needt-pop', NeedtPop);
})();
