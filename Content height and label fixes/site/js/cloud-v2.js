/* <needt-cloud-v2 variant="calm|hello" size="200"></needt-cloud-v2>
   Eyes follow the cursor, blink, jelly wobble; hover = splash; click = change mood. */
(() => {
  if (customElements.get('needt-cloud-v2')) return;
  const INK = '#1a1c1e', BODY = '#C68DFF', RAIN = '#3AAEFF', RED = '#FF4B45';
  const CSS = `
  :host{display:inline-block;width:var(--size,200px);height:var(--size,200px);line-height:0;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}
  svg{width:100%;height:100%;overflow:visible;display:block}
  svg *{transform-box:view-box}
  .floater{animation:float 3.2s ease-in-out infinite}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  .shadow{transform-origin:80px 150px;animation:shadow 3.2s ease-in-out infinite}
  @keyframes shadow{0%,100%{transform:scale(1);opacity:.1}50%{transform:scale(.8);opacity:.06}}
  .puff{transform-origin:80px 124px;animation:breathe 3.2s ease-in-out infinite}
  @keyframes breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.03,.97)}}
  .splashing .puff{animation:squish .6s cubic-bezier(.3,.7,.4,1)}
  @keyframes squish{0%{transform:none}25%{transform:scale(1.14,.86)}55%{transform:scale(.94,1.08)}80%{transform:scale(1.03,.97)}100%{transform:none}}
  .p1,.p2,.p3,.p4{transform-origin:center;transform-box:fill-box;animation:bulge 2.4s ease-in-out infinite}
  .p2{animation-delay:.6s}.p3{animation-delay:1.2s}.p4{animation-delay:1.8s}
  @keyframes bulge{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
  .armL{transform-origin:30px 104px;animation:armL 3.2s ease-in-out infinite}
  .armR{transform-origin:130px 104px;animation:armR 3.2s ease-in-out infinite}
  @keyframes armL{0%,100%{transform:rotate(0)}50%{transform:rotate(18deg)}}
  @keyframes armR{0%,100%{transform:rotate(0)}50%{transform:rotate(-18deg)}}
  .rain .armL,.rain .armR{animation:none}
  .lobe{transform-origin:center;transform-box:fill-box;animation:bulge 2.4s ease-in-out infinite}
  .spinner{transform-origin:80px 88px}
  .bloom .spinner{animation:rock 4.4s ease-in-out infinite}
  @keyframes rock{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
  .drop{opacity:0;animation:fall 1.1s linear infinite}
  .drop:nth-child(2){animation-delay:.37s}.drop:nth-child(3){animation-delay:.73s}.drop:nth-child(4){animation-delay:.2s}.drop:nth-child(5){animation-delay:.9s}
  @keyframes fall{0%{opacity:0;transform:translateY(0)}15%{opacity:1}100%{opacity:0;transform:translateY(34px)}}
  .look{transition:transform .22s cubic-bezier(.3,.7,.4,1)}
  .eyes{transform-box:fill-box;transform-origin:center;transition:transform .08s ease}
  .blink .eyes{transform:scaleY(.08)}
  .cheeks{transition:opacity .2s}
  .splashing .cheeks{opacity:.8}
  .bit{opacity:0}
  .splashing .bit{animation:fly .7s ease-out}
  .splashing .b1{--x:-40px;--y:-18px}.splashing .b2{--x:0px;--y:-36px}.splashing .b3{--x:40px;--y:-18px}
  @keyframes fly{0%{opacity:0;transform:translate(0,0) scale(.4)}20%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y)) scale(1)}}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
  
  :host([seated]) svg:not(.jumping):not(.hop):not(.splashing) .body,
  :host([seated]) svg:not(.jumping):not(.hop):not(.splashing) .floater,
  :host([seated]) svg:not(.jumping):not(.hop):not(.splashing) .puff,
  :host([seated]) .shadow { animation: none; }`;
  const EYES = {
    sleep: [-17, 17].map(x => `<path d="M${x - 8} -5 Q${x} 4 ${x + 8} -5" stroke="${INK}" stroke-width="6.4" fill="none" stroke-linecap="round"/>`).join(''),
    open: `<circle cx="-17" cy="-4" r="7.4" fill="${INK}"/><circle cx="17" cy="-4" r="7.4" fill="${INK}"/>`,
    happy: [-17, 17].map(x => `<path d="M${x - 8} -3 Q${x} -13 ${x + 8} -3" stroke="${INK}" stroke-width="6.4" fill="none" stroke-linecap="round"/>`).join(''),
    wide: `<circle cx="-17" cy="-4" r="7.4" fill="${INK}"/><circle cx="17" cy="-4" r="7.4" fill="${INK}"/><path d="M-22 -17.4 Q-17 -21.4 -12 -17.4" stroke="${INK}" stroke-width="4.6" fill="none" stroke-linecap="round"/><path d="M12 -17.4 Q17 -21.4 22 -17.4" stroke="${INK}" stroke-width="4.6" fill="none" stroke-linecap="round"/>`,
    wink: `<circle cx="-17" cy="-4" r="7.4" fill="${INK}"/><path d="M9 -3 Q17 -13 25 -3" stroke="${INK}" stroke-width="6.4" fill="none" stroke-linecap="round"/>`,
  };
  const MOUTH = {
    smile: `<path d="M-8 9 Q0 19 8 9" stroke="${INK}" stroke-width="6.4" fill="none" stroke-linecap="round"/>`,
    open: `<path d="M-10 8 Q0 24 10 8 Z" fill="${INK}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
    small: `<path d="M-10 10 Q-5 16 0 11.5 Q5 16 10 10" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    o: `<ellipse cx="0" cy="10" rx="4" ry="4.8" fill="${INK}"/>`,
  };
  const MOODS = { float: ['open', 'smile'], calm: ['sleep', 'small'], hello: ['open', 'smile'], happy: ['happy', 'open'], wink: ['wink', 'smile'], surprised: ['wide', 'o'] };
  const CYCLE = ['happy', 'wink', 'surprised'];
  const PUFF = '<circle class="p1" cx="52" cy="94" r="28"/><circle class="p2" cx="82" cy="74" r="34"/><circle class="p3" cx="112" cy="92" r="26"/><rect class="p4" x="24" y="88" width="112" height="40" rx="20"/>';
  const mini = (cls, x, y, c = BODY) => `<circle class="bit ${cls}" cx="${x}" cy="${y}" r="7" fill="${c}" style="transform-box:fill-box;transform-origin:center"/>`;
  const svg = (variant, mood) => {
    const [e, m] = MOODS[mood] || MOODS[variant];
    const rain = variant === 'rain';
    {
      const lobes = Array.from({ length: 6 }, (_, i) => { const a = (-90 + i * 60) * Math.PI / 180; return `<circle class="lobe" style="animation-delay:${(i * .4).toFixed(1)}s" cx="${(80 + 30 * Math.cos(a)).toFixed(1)}" cy="${(88 + 30 * Math.sin(a)).toFixed(1)}" r="28"/>`; }).join('');
      return `<svg viewBox="0 0 160 160" class="bloom ${variant}" aria-hidden="true">
        <ellipse class="shadow" cx="80" cy="154" rx="38" ry="5" fill="${INK}"/>
        <g class="floater">
          <g class="splash">${mini('b1', 44, 60, RED)}${mini('b2', 80, 40, RED)}${mini('b3', 116, 60, RED)}</g>
          <g class="puff"><g class="spinner">
            <g fill="${RED}">${lobes}<circle cx="80" cy="88" r="36"/></g>
            <g transform="translate(80 90)"><g class="look">
              <g class="cheeks" fill="#fff" opacity=".45"><circle cx="-33" cy="10" r="8.5"/><circle cx="33" cy="10" r="8.5"/></g>
              <g class="eyes">${EYES[e]}</g>${MOUTH[m]}
            </g></g>
          </g></g>
        </g>
      </svg>`;
    }
    const arm = (cls, d) => `<path class="${cls}" d="${d}" stroke="${BODY}" stroke-width="14" stroke-linecap="round" fill="none"/>`;
    return `<svg viewBox="0 0 160 160" class="${variant}" aria-hidden="true">
      ${rain ? '' : `<ellipse class="shadow" cx="80" cy="150" rx="40" ry="5" fill="${INK}"/>`}
      <g class="floater">
        <g class="splash">${mini('b1', 50, 70)}${mini('b2', 82, 50)}${mini('b3', 112, 70)}</g>
        ${rain ? `<g>${[[48, 132], [70, 138], [92, 132], [114, 136], [60, 146]].map(([x, y]) => `<path class="drop" d="M${x} ${y} q-4 6 0 8 q4 -2 0 -8Z" fill="${RAIN}" stroke="${RAIN}" stroke-width="3" stroke-linejoin="round"/>`).join('')}</g>` : ''}
        <g class="puff">
          ${arm('armL', rain ? 'M30 110 L20 122' : 'M30 104 L14 96')}
          ${arm('armR', rain ? 'M130 110 L140 122' : 'M130 104 L146 96')}
          <g fill="${BODY}">${PUFF}</g>
          <path d="M60 60 C66 50 76 44 86 44" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".45"/>
          <g transform="translate(80 102)"><g class="look">
            <g class="cheeks" fill="#fff" opacity=".45"><circle cx="-33" cy="9" r="8.5"/><circle cx="33" cy="9" r="8.5"/></g>
            <g class="eyes">${EYES[e]}</g>${MOUTH[m]}
          </g></g>
        </g>
      </g>
    </svg>`;
  };

  const live = new Set(); let lastMove = 0, mx = 0, my = 0;
  const aim = (el, dx, dy) => el._look && (el._look.style.transform = `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px)`);
  const track = () => live.forEach(el => {
    if (el._closed()) return aim(el, 0, 0);
    const r = el.getBoundingClientRect(); if (!r.width) return;
    const vx = mx - (r.left + r.width / 2), vy = my - (r.top + r.height * .6), d = Math.hypot(vx, vy) || 1, k = Math.min(6, d / 30);
    aim(el, vx / d * k, vy / d * k * .7);
  });
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; lastMove = Date.now(); track(); }, { passive: true });

  class NeedtCloudV2 extends HTMLElement {
    static get observedAttributes() { return ['variant', 'size']; }
    constructor() { super(); this.attachShadow({ mode: 'open' }); this._mood = null; this._ci = 0; }
    attributeChangedCallback() { this.isConnected && this.render(); }
    _v() { const v = this.getAttribute('variant'); return v === 'hello' ? v : 'calm'; }
    _closed() { if (!this._mood) return false; return /happy|sleep/.test((MOODS[this._mood] || MOODS[this._v()])[0]); }
    connectedCallback() {
      this.render(); live.add(this);
      this.addEventListener('pointerenter', this._h = () => this.splash());
      this.addEventListener('click', this._c = () => {
        this._mood = CYCLE[this._ci++ % CYCLE.length]; this.render(); this.splash();
        clearTimeout(this._mt); this._mt = setTimeout(() => { this._mood = null; this.render(); }, 1600);
      });
      const blink = () => { this._bt = setTimeout(() => { if (!this._closed() && this._svg) { this._svg.classList.add('blink'); setTimeout(() => this._svg && this._svg.classList.remove('blink'), 130); } blink(); }, 1600 + Math.random() * 3000); };
      const idle = () => { this._it = setTimeout(() => { if (Date.now() - lastMove > 2500 && !this._closed()) Math.random() < .3 ? aim(this, 0, 0) : aim(this, (Math.random() * 2 - 1) * 5, (Math.random() * 2 - 1) * 3); idle(); }, 900 + Math.random() * 1600); };
      blink(); idle();
    }
    disconnectedCallback() { live.delete(this); [this._bt, this._it, this._mt].forEach(clearTimeout); this.removeEventListener('pointerenter', this._h); this.removeEventListener('click', this._c); }
    splash() { const s = this._svg; if (!s || s.classList.contains('splashing')) return; s.classList.add('splashing'); setTimeout(() => s.classList.remove('splashing'), 720); }
    render() {
      const size = this.getAttribute('size'); if (size) this.style.setProperty('--size', /^\d+$/.test(size) ? size + 'px' : size);
      this.shadowRoot.innerHTML = `<style>${CSS}</style>${svg(this._v(), this._mood)}`;
      this._svg = this.shadowRoot.querySelector('svg'); this._look = this.shadowRoot.querySelector('.look');
    }
  }
  customElements.define('needt-cloud-v2', NeedtCloudV2);
})();
