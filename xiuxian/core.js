(function() {
  const S = {
    v: 1,
    name: '云瑶',
    root: 'shuang',
    realm: 1,
    stage: 1,
    qi: 0,
    lastTick: Date.now(),
    techniques: {},
    artifacts: [],
    artEquip: { sword: null, seal: null, bell: null },
    pills: {},
    herbs: {},
    equipped: {},
    cleared: {},
    missions: { date: new Date().toDateString(), list: [] },
    signin: { last: null, day: 0 },
    gachaPity: 0,
    settings: { sound: true },
    created: false
  };

  const G = {
    realms: [
      { name: '练气', stages: 9 },
      { name: '筑基', stages: 9 },
      { name: '金丹', stages: 9 },
      { name: '元婴', stages: 9 },
      { name: '化神', stages: 9 },
      { name: '炼虚', stages: 9 },
      { name: '合体', stages: 9 },
      { name: '大乘', stages: 9 },
      { name: '渡劫', stages: 1 }
    ],
    roots: [
      { id: 'tian', name: '天灵根', mult: 3, color: '#FFD700', weight: 10 },
      { id: 'lei', name: '变异雷灵根', mult: 2.5, color: '#00BFFF', weight: 20 },
      { id: 'shuang', name: '双灵根', mult: 1.8, color: '#FF69B4', weight: 30 },
      { id: 'san', name: '三灵根', mult: 1.3, color: '#32CD32', weight: 30 },
      { id: 'wei', name: '伪灵根', mult: 1, color: '#A9A9A9', weight: 10 }
    ],
    techniques: [
      { id: 'tai_chi', name: '太极功', minRealm: 0, maxLv: 10, cost: (lv) => lv * 100, qiMult: (lv) => 1 + lv * 0.05, atk: (lv) => lv * 2 },
      { id: 'sword_qi', name: '剑气决', minRealm: 1, maxLv: 10, cost: (lv) => lv * 150, qiMult: (lv) => 1 + lv * 0.08, atk: (lv) => lv * 3 },
      { id: 'thunder', name: '雷法', minRealm: 2, maxLv: 10, cost: (lv) => lv * 200, qiMult: (lv) => 1 + lv * 0.1, atk: (lv) => lv * 4 },
      { id: 'flame', name: '炎阳诀', minRealm: 2, maxLv: 10, cost: (lv) => lv * 200, qiMult: (lv) => 1 + lv * 0.1, atk: (lv) => lv * 4 },
      { id: 'frost', name: '冰心咒', minRealm: 3, maxLv: 10, cost: (lv) => lv * 250, qiMult: (lv) => 1 + lv * 0.12, atk: (lv) => lv * 5 },
      { id: 'wind', name: '风行诀', minRealm: 3, maxLv: 10, cost: (lv) => lv * 250, qiMult: (lv) => 1 + lv * 0.12, atk: (lv) => lv * 5 },
      { id: 'spatial', name: '空间之力', minRealm: 5, maxLv: 10, cost: (lv) => lv * 500, qiMult: (lv) => 1 + lv * 0.15, atk: (lv) => lv * 6 }
    ],
    pills: [
      { id: 'juqi', name: '聚气丹', icon: '💊', desc: '+15% 灵气吸收', recipe: { 灵草: 2, 灵果: 1 }, effect: 'qi_boost' },
      { id: 'zhuji', name: '筑基丹', icon: '🔴', desc: '+15% 突破成功率', recipe: { 铁皮草: 3, 月光花: 1 }, effect: 'breakthrough_boost' },
      { id: 'peiyuan', name: '培元丹', icon: '❤️', desc: '+10% 血量', recipe: { 玉灵草: 2, 千年人参: 1 }, effect: 'hp_buff' },
      { id: 'duojie', name: '渡劫丹', icon: '⚡', desc: '+20% 渡劫防御', recipe: { 九阳草: 2, 龙血果: 1 }, effect: 'tribulation_def' }
    ],
    herbs: [
      { id: '灵草', name: '灵草', icon: '🌿' },
      { id: '灵果', name: '灵果', icon: '🫐' },
      { id: '铁皮草', name: '铁皮草', icon: '🍃' },
      { id: '月光花', name: '月光花', icon: '🌙' },
      { id: '玉灵草', name: '玉灵草', icon: '💚' },
      { id: '千年人参', name: '千年人参', icon: '👴' }
    ],
    artifacts: [
      { id: 'celestial_sword', name: '天阙剑', slot: 'sword', icon: '⚔️', rarity: 'SSR', base: { atk: 50, def: 10, hp: 0 } },
      { id: 'spirit_seal', name: '灵符', slot: 'seal', icon: '🔱', rarity: 'SSR', base: { atk: 10, def: 50, hp: 0 } },
      { id: 'bronze_bell', name: '铜铃', slot: 'bell', icon: '🔔', rarity: 'SR', base: { atk: 0, def: 20, hp: 30 } },
      { id: 'jade_ring', name: '玉指环', slot: 'sword', icon: '💎', rarity: 'SR', base: { atk: 20, def: 15, hp: 20 } },
      { id: 'moonlight_pendant', name: '月光坠子', slot: 'seal', icon: '🌙', rarity: 'SR', base: { atk: 15, def: 25, hp: 15 } },
      { id: 'thunder_chain', name: '雷鸣链', slot: 'bell', icon: '⛓️', rarity: 'R', base: { atk: 10, def: 10, hp: 20 } },
      { id: 'forest_bow', name: '森林弓', slot: 'sword', icon: '🏹', rarity: 'R', base: { atk: 15, def: 5, hp: 10 } },
      { id: 'ancient_mirror', name: '古镜', slot: 'seal', icon: '🪞', rarity: 'R', base: { atk: 5, def: 15, hp: 10 } },
      { id: 'pearl_ornament', name: '珍珠饰品', slot: 'bell', icon: '⭐', rarity: 'N', base: { atk: 5, def: 5, hp: 10 } },
      { id: 'silk_rope', name: '丝绸绳', slot: 'sword', icon: '🧵', rarity: 'N', base: { atk: 8, def: 2, hp: 5 } },
      { id: 'stone_tablet', name: '石碑', slot: 'seal', icon: '📜', rarity: 'N', base: { atk: 2, def: 8, hp: 5 } },
      { id: 'cloud_cap', name: '云冠', slot: 'bell', icon: '👑', rarity: 'N', base: { atk: 3, def: 3, hp: 8 } }
    ],
    dungeons: [
      { name: '灵兽林', scene: 'forest', icon: '🐅', minRealm: 0, x: 30, y: 30, waves: [[{ name: '灵兽', hp: 50, atk: 10 }], [{ name: '灵兽', hp: 50, atk: 10 }, { name: '灵兽', hp: 40, atk: 8 }]], boss: { name: '林中王者', icon: '👑', hp: 150, atk: 20 }, drops: { lingshi: 500, gems: 5 } },
      { name: '赤炎洞', scene: 'volcano', icon: '🔥', minRealm: 2, x: 70, y: 50, waves: [[{ name: '炎魔', hp: 80, atk: 15 }], [{ name: '炎魔', hp: 80, atk: 15 }, { name: '烈火精', hp: 60, atk: 12 }]], boss: { name: '火焰之王', icon: '🔥', hp: 250, atk: 30 }, drops: { lingshi: 1000, gems: 10 } },
      { name: '寒冰宫', scene: 'ice', icon: '❄️', minRealm: 4, x: 50, y: 70, waves: [[{ name: '冰妖', hp: 100, atk: 18 }], [{ name: '冰妖', hp: 100, atk: 18 }, { name: '冰灵', hp: 80, atk: 14 }]], boss: { name: '冰雪女皇', icon: '👸', hp: 300, atk: 35 }, drops: { lingshi: 1500, gems: 15 } },
      { name: '上古遗迹', scene: 'ruins', icon: '🏛️', minRealm: 6, x: 40, y: 55, waves: [[{ name: '古妖', hp: 150, atk: 25 }], [{ name: '古妖', hp: 150, atk: 25 }, { name: '幽灵', hp: 100, atk: 20 }]], boss: { name: '遗迹守护者', icon: '💀', hp: 400, atk: 40 }, drops: { lingshi: 2000, gems: 20 } },
      { name: '天外云海', scene: 'title', icon: '☁️', minRealm: 8, x: 60, y: 40, waves: [[{ name: '天魔', hp: 200, atk: 35 }], [{ name: '天魔', hp: 200, atk: 35 }, { name: '灾厄', hp: 150, atk: 30 }]], boss: { name: '天阙之主', icon: '✨', hp: 500, atk: 50 }, drops: { lingshi: 3000, gems: 30 } }
    ],
    missionsPool: [
      { id: 'meditate_10min', type: 'meditate', name: '冥想修炼', desc: '进行修炼10分钟', reward: { lingshi: 100 }, target: 600 },
      { id: 'meditate_30min', type: 'meditate', name: '深度冥想', desc: '进行修炼30分钟', reward: { lingshi: 300 }, target: 1800 },
      { id: 'battle_1', type: 'battle', name: '挑战一次', desc: '完成1场战斗', reward: { lingshi: 200 }, target: 1 },
      { id: 'battle_3', type: 'battle', name: '挑战三次', desc: '完成3场战斗', reward: { gems: 10 }, target: 3 },
      { id: 'alchemy_1', type: 'alchemy', name: '炼丹一次', desc: '炼制1次丹药', reward: { lingshi: 150 }, target: 1 },
      { id: 'gacha_1', type: 'gacha', name: '祈愿一次', desc: '进行1次祈愿', reward: { lingshi: 100 }, target: 1 }
    ]
  };

  const audioCtx = (() => {
    let ctx = null;
    let initialized = false;
    const init = () => {
      if (!initialized && typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined') {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        initialized = true;
      }
    };
    document.addEventListener('pointerdown', init, { once: true });
    return { get: () => { init(); return ctx; }, init };
  })();

  const X = window.X = {
    S,
    G,

    save() {
      localStorage.setItem('xiuxian-v1', JSON.stringify(S));
    },

    load() {
      try {
        const data = localStorage.getItem('xiuxian-v1');
        if (data) Object.assign(S, JSON.parse(data));
      } catch (e) {}
      S.lastTick = Date.now();
    },

    reset() {
      Object.assign(S, {
        v: 1,
        name: '云瑶',
        root: 'shuang',
        realm: 1,
        stage: 1,
        qi: 0,
        lastTick: Date.now(),
        techniques: {},
        artifacts: [],
        artEquip: { sword: null, seal: null, bell: null },
        pills: {},
        herbs: {},
        equipped: {},
        cleared: {},
        missions: { date: new Date().toDateString(), list: [] },
        signin: { last: null, day: 0 },
        gachaPity: 0,
        settings: { sound: true },
        created: false
      });
      this.save();
    },

    screens: {},

    show(name, params = {}) {
      const current = document.querySelector('.screen.active');
      let next = document.getElementById(`scr-${name}`);
      const def = X.screens[name];
      if (!next && def) {
        next = def.el || document.createElement('section');
        next.id = `scr-${name}`; next.classList.add('screen');
        document.getElementById('screens').appendChild(next); def.el = next;
        if (def.init) { try { def.init(); } catch (e) { console.warn(e); } }
      }
      if (!next) return;
      if (next === current) { def && def.enter && def.enter(params); return; }

      if (current) {
        current.classList.remove('active');
        if (X.screens[current.id.replace('scr-', '')]?.leave) {
          X.screens[current.id.replace('scr-', '')].leave();
        }
      }

      next.classList.add('active');
      if (X.screens[name]?.enter) {
        X.screens[name].enter(params);
      }
    },

    back() {
      this.show('lobby');
    },

    h(html) {
      const div = document.createElement('div');
      div.innerHTML = html;
      return div.firstElementChild || div;
    },

    toast(text, type = 'info') {
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: #fff;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 1000;
        max-width: 80%;
        text-align: center;
        font-size: 14px;
      `;
      toast.textContent = text;
      document.getElementById('toasts').appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    },

    modal(html, opts = {}) {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.6);
        z-index: 2000;
      `;
      const content = document.createElement('div');
      content.innerHTML = html;
      content.style.cssText = `
        background: linear-gradient(135deg, rgba(240,255,240,0.95) 0%, rgba(230,245,250,0.95) 100%);
        border: 2px solid #DAA520;
        border-radius: 12px;
        padding: 20px;
        max-width: 90%;
        max-height: 80%;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      `;
      modal.appendChild(content);
      document.getElementById('modalRoot').appendChild(modal);

      const close = () => modal.remove();
      return { el: content, close };
    },

    fmt(n) {
      if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
      if (n >= 10000) return (n / 10000).toFixed(1) + '万';
      return n.toString();
    },

    topBar(title) {
      return `
        <div style="display: flex; align-items: center; padding: 12px; background: linear-gradient(90deg, rgba(218,165,32,0.2), rgba(240,255,240,0.1)); border-bottom: 1px solid #DAA520;">
          <button onclick="X.back()" style="background: none; border: none; font-size: 20px; cursor: pointer; margin-right: 12px;">←</button>
          <span style="flex: 1; font-size: 16px; font-weight: bold; color: #333;">${title}</span>
          <span class="bal-lingshi" style="margin: 0 8px; font-size: 12px;">💠 ${X.fmt(X.S ? window.XianEconomy.balance('lingshi') : 0)}</span>
          <span class="bal-gem" style="font-size: 12px;">💎 ${X.fmt(X.S ? window.XianEconomy.balance('gem') : 0)}</span>
        </div>
      `;
    },

    refreshBalances() {
      document.querySelectorAll('.bal-lingshi').forEach(el => {
        el.textContent = `💠 ${X.fmt(window.XianEconomy.balance('lingshi'))}`;
      });
      document.querySelectorAll('.bal-gem').forEach(el => {
        el.textContent = `💎 ${X.fmt(window.XianEconomy.balance('gem'))}`;
      });
    },

    sfx(name) {
      if (!S.settings.sound) return;
      const ctx = audioCtx.get();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const freqs = {
          click: 800,
          chime: 2000,
          thunder: 100,
          sword: 1200,
          break: 600,
          fail: 200,
          coin: 1600
        };

        osc.frequency.value = freqs[name] || 800;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } catch (e) {}
    },

    fx: {
      burst(x, y, color, n = 8) {
        const canvas = document.getElementById('fxCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        for (let i = 0; i < n; i++) {
          const angle = (i / n) * Math.PI * 2;
          const vx = Math.cos(angle) * 2;
          const vy = Math.sin(angle) * 2;
          const lifetime = 500;
          const start = Date.now();
          const draw = () => {
            const elapsed = Date.now() - start;
            if (elapsed > lifetime) return;
            const px = x + vx * elapsed / 20;
            const py = y + vy * elapsed / 20;
            const alpha = 1 - elapsed / lifetime;
            ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.fillRect(px * dpr, py * dpr, 4 * dpr, 4 * dpr);
            requestAnimationFrame(draw);
          };
          draw();
        }
      },

      ring(x, y) {
        const canvas = document.getElementById('fxCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        let r = 10;
        const maxR = 100;
        const start = Date.now();
        const draw = () => {
          const elapsed = Date.now() - start;
          const progress = elapsed / 300;
          if (progress > 1) return;
          r = 10 + progress * (maxR - 10);
          const alpha = 1 - progress;
          ctx.strokeStyle = `rgba(218,165,32,${alpha})`;
          ctx.lineWidth = 2 * dpr;
          ctx.beginPath();
          ctx.arc(x * dpr, y * dpr, r * dpr, 0, Math.PI * 2);
          ctx.stroke();
          requestAnimationFrame(draw);
        };
        draw();
      },

      floatText(x, y, text, color) {
        const el = document.createElement('div');
        el.textContent = text;
        el.style.cssText = `
          position: fixed;
          left: ${x}px;
          top: ${y}px;
          color: ${color};
          font-weight: bold;
          pointer-events: none;
          z-index: 100;
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        `;
        document.body.appendChild(el);
        const start = Date.now();
        const animate = () => {
          const elapsed = Date.now() - start;
          if (elapsed > 1000) {
            el.remove();
            return;
          }
          const progress = elapsed / 1000;
          el.style.opacity = 1 - progress;
          el.style.transform = `translateY(${-progress * 30}px)`;
          requestAnimationFrame(animate);
        };
        animate();
      },

      flash(color = '#fff') {
        const div = document.createElement('div');
        div.style.cssText = `
          position: fixed;
          inset: 0;
          background: ${color};
          z-index: 500;
          opacity: 0.5;
        `;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 200);
      },

      shake(ms = 300) {
        const app = document.getElementById('app');
        const start = Date.now();
        const shake = () => {
          const elapsed = Date.now() - start;
          if (elapsed > ms) {
            app.style.transform = '';
            return;
          }
          const x = (Math.random() - 0.5) * 10;
          const y = (Math.random() - 0.5) * 10;
          app.style.transform = `translate(${x}px, ${y}px)`;
          requestAnimationFrame(shake);
        };
        shake();
      },

      rays(container) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid');
        svg.style.cssText = `
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        `;
        for (let i = 0; i < 8; i++) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          const angle = (i / 8) * Math.PI * 2;
          const x2 = 50 + Math.cos(angle) * 50;
          const y2 = 50 + Math.sin(angle) * 50;
          line.setAttribute('x1', '50');
          line.setAttribute('y1', '50');
          line.setAttribute('x2', x2);
          line.setAttribute('y2', y2);
          line.setAttribute('stroke', '#DAA520');
          line.setAttribute('stroke-width', '1.5');
          line.setAttribute('opacity', '0.6');
          svg.appendChild(line);
        }
        if (container.firstChild) {
          container.insertBefore(svg, container.firstChild);
        } else {
          container.appendChild(svg);
        }
      }
    },

    qiNeed() {
      const realm = G.realms[S.realm];
      return (S.stage || 1) * 1000 * Math.pow(2, S.realm);
    },

    qiRate() {
      const realm = G.realms[S.realm];
      const root = G.roots.find(r => r.id === S.root) || G.roots[4];
      let mult = 2 * Math.pow(1.6, S.realm) * root.mult;

      Object.entries(S.techniques).forEach(([id, lv]) => {
        const tech = G.techniques.find(t => t.id === id);
        if (tech) mult *= tech.qiMult(lv);
      });

      let outfitQi = 0;
      if (window.XianData) {
        Object.values(S.equipped).forEach(itemId => {
          const item = window.XianData.items.find(it => it.id === itemId);
          if (item?.stats?.qi) outfitQi += item.stats.qi;
        });
      }
      mult *= (1 + outfitQi / 100);

      return mult;
    },

    stats() {
      let atk = 0, def = 0, hp = 100, qi = 0, power = 0;

      const realm = G.realms[S.realm];
      const root = G.roots.find(r => r.id === S.root) || G.roots[4];

      hp = 100 + S.realm * 20;

      Object.entries(S.techniques).forEach(([id, lv]) => {
        const tech = G.techniques.find(t => t.id === id);
        if (tech) {
          atk += tech.atk(lv);
          qi += lv * 10;
        }
      });

      S.artEquip.sword && S.artifacts.forEach(art => {
        if (art.uid && art.uid.toString() === S.artEquip.sword?.toString()) {
          const artDef = G.artifacts.find(a => a.id === art.id);
          if (artDef) {
            const lvMult = 1 + art.lv * 0.05;
            atk += artDef.base.atk * lvMult;
            hp += artDef.base.hp * lvMult;
          }
        }
      });

      S.artEquip.seal && S.artifacts.forEach(art => {
        if (art.uid && art.uid.toString() === S.artEquip.seal?.toString()) {
          const artDef = G.artifacts.find(a => a.id === art.id);
          if (artDef) {
            const lvMult = 1 + art.lv * 0.05;
            def += artDef.base.def * lvMult;
            hp += artDef.base.hp * lvMult;
          }
        }
      });

      S.artEquip.bell && S.artifacts.forEach(art => {
        if (art.uid && art.uid.toString() === S.artEquip.bell?.toString()) {
          const artDef = G.artifacts.find(a => a.id === art.id);
          if (artDef) {
            const lvMult = 1 + art.lv * 0.05;
            def += artDef.base.def * lvMult;
            hp += artDef.base.hp * lvMult;
          }
        }
      });

      if (window.XianData) {
        Object.values(S.equipped).forEach(itemId => {
          const item = window.XianData.items.find(it => it.id === itemId);
          if (item?.stats) {
            if (item.stats.atk) atk += item.stats.atk;
            if (item.stats.def) def += item.stats.def;
            if (item.stats.hp) hp += item.stats.hp;
            if (item.stats.qi) qi += item.stats.qi;
          }
        });
      }

      power = atk * 2 + def + hp / 10 + qi;

      return { atk, def, hp, qi, power: Math.floor(power) };
    },

    setBonuses() {
      const bonuses = [];
      if (!window.XianData) return bonuses;

      const setCounts = {};
      Object.values(S.equipped).forEach(itemId => {
        const item = window.XianData.items.find(it => it.id === itemId);
        if (item?.set) {
          setCounts[item.set] = (setCounts[item.set] || 0) + 1;
        }
      });

      Object.entries(setCounts).forEach(([setId, count]) => {
        const setDef = window.XianData.sets.find(s => s.id === setId);
        if (setDef) {
          const active = [];
          if (count >= 2 && setDef.bonus.n2) active.push(2);
          if (count >= 4 && setDef.bonus.n4) active.push(4);
          if (count >= 6 && setDef.bonus.n6) active.push(6);
          bonuses.push({ set: setId, count, active });
        }
      });

      return bonuses;
    },

    realmLabel() {
      const realm = G.realms[S.realm];
      if (S.realm === 8) return '渡劫期';

      const stages = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
      return `${realm.name} · ${stages[S.stage] || S.stage}层`;
    },

    tick() {
      const now = Date.now();
      const delta = (now - S.lastTick) / 1000;
      S.lastTick = now;

      const rate = this.qiRate();
      const need = this.qiNeed();
      S.qi = Math.min(S.qi + rate * delta, need);

      this.save();
    },

    offlineGain: null,

    canBreak() {
      const need = this.qiNeed();
      return S.qi >= need;
    },

    breakthrough() {
      if (!this.canBreak()) return { ok: false };

      const isMinor = S.stage < (G.realms[S.realm].stages || 9);
      if (isMinor) {
        return { ok: true, needTrib: false, rate: 100 };
      } else {
        if (S.realm >= 2) {
          return { ok: true, needTrib: true, rate: 0.7 };
        } else {
          return { ok: true, needTrib: false, rate: 100 };
        }
      }
    },

    applyBreak(success) {
      const realm = G.realms[S.realm];
      const isMinor = S.stage < (realm.stages || 9);

      if (isMinor) {
        S.stage++;
      } else {
        if (success) {
          S.realm++;
          S.stage = 1;
        } else {
          S.qi = 0;
        }
      }

      S.qi = 0;
      this.save();
      this.report('breakthrough', { success, realm: S.realm, stage: S.stage });
    },

    ownsItem(id) {
      if (!window.XianEconomy) return true;
      if (window.XianEconomy.owns(id)) return true;

      if (!window.XianData) return false;
      const item = window.XianData.items.find(it => it.id === id);
      if (!item) return false;
      if (item.rarity === 'N' || item.rarity === 'R') return true;
      if (window.XianData.defaultOutfit?.includes(id)) return true;

      return false;
    },

    itemUsable(item) {
      if (!X.ownsItem(item.id)) return false;
      if (!item.vip) return true;
      if (!this.isVip()) return false;
      return this.tier() >= (item.minTier || 1);
    },

    isVip() {
      return window.VIP && typeof window.VIP.active === 'function' && window.VIP.active();
    },

    tier() {
      return window.VIP && typeof window.VIP.tier === 'function' ? window.VIP.tier() : 0;
    },

    equip(id) {
      if (!window.XianData) return false;
      const item = window.XianData.items.find(it => it.id === id);
      if (!item || !X.itemUsable(item)) return false;

      const slot = item.slot;
      if (S.equipped[slot] === id) {
        delete S.equipped[slot];
        this.save();
        return false;
      }

      S.equipped[slot] = id;
      this.save();
      return true;
    },

    equipSet(setId) {
      if (!window.XianData) return;
      const set = window.XianData.sets.find(s => s.id === setId);
      if (!set) return;

      set.items.forEach(itemId => {
        const item = window.XianData.items.find(it => it.id === itemId);
        if (item && X.itemUsable(item)) {
          S.equipped[item.slot] = itemId;
        }
      });

      this.save();
    },

    newGame(name, rootId) {
      S.name = name;
      S.root = rootId;
      S.created = true;
      S.realm = 0;
      S.stage = 1;
      S.qi = 0;

      if (window.XianData && window.XianData.defaultOutfit) {
        window.XianData.defaultOutfit.forEach(itemId => {
          if (window.XianEconomy) {
            window.XianEconomy.grant(itemId, 'starting');
          }
          const item = window.XianData.items.find(it => it.id === itemId);
          if (item) S.equipped[item.slot] = itemId;
        });
      }

      const startHerbs = {
        '灵草': 5,
        '灵果': 3,
        '铁皮草': 2,
        '月光花': 1,
        '玉灵草': 1,
        '千年人参': 1
      };
      Object.assign(S.herbs, startHerbs);

      S.pills['juqi'] = 1;
      S.pills['zhuji'] = 1;

      const startArt = G.artifacts[0];
      S.artifacts.push({ uid: 1, id: startArt.id, lv: 1 });
      S.artEquip.sword = 1;

      this.save();
      this.report('new_game', { name, root: rootId });
    },

    missionProgress(type, n) {
      const today = new Date().toDateString();
      if (S.missions.date !== today) {
        S.missions.date = today;
        S.missions.list = [];
      }

      let mission = S.missions.list.find(m => m.type === type);
      if (!mission) {
        const pool = G.missionsPool.filter(m => m.type === type);
        if (pool.length === 0) return;
        const m = pool[Math.floor(Math.random() * pool.length)];
        mission = { id: m.id, prog: 0, done: false };
        S.missions.list.push(mission);
      }

      mission.prog += n;
      const poolItem = G.missionsPool.find(m => m.id === mission.id);
      if (poolItem && mission.prog >= poolItem.target && !mission.done) {
        mission.done = true;
        if (window.XianEconomy && poolItem.reward) {
          if (poolItem.reward.lingshi) window.XianEconomy.add('lingshi', poolItem.reward.lingshi, 'mission');
          if (poolItem.reward.gems) window.XianEconomy.add('gem', poolItem.reward.gems, 'mission');
        }
      }

      this.save();
    },

    report(type, payload) {
      if (window.XianEconomy && typeof window.XianEconomy.report === 'function') {
        window.XianEconomy.report(type, payload);
      }
    },

    Doll: {
      _blinkT: null,
      layersFor(eq) {
        const D = window.XianData, out = [], erase = [];
        const ids = Object.values(eq || {}).filter(Boolean);
        const top = ids.map(id => D.items.find(i => i.id === id)).find(i => i && i.slot === 'top' && i.full);
        ids.forEach(id => {
          const it = D.items.find(i => i.id === id); if (!it) return;
          if (it.slot === 'bottom' && top) return;
          (it.layers || []).forEach(l => out.push({ ...l, item: it.id }));
          if (it.erase) erase.push(it.erase);
        });
        out.sort((a, b) => (a.z || 0) - (b.z || 0));
        return { layers: out, erase };
      },
      render(container, equippedMap, opts = {}) {
        const D = window.XianData, W = D.W || 640, H = D.H || 960, base = D.base;
        const prev = new Set([...container.querySelectorAll('img[data-src]')].map(i => i.dataset.src));
        container.classList.add('doll');
        container.style.aspectRatio = W + '/' + H;
        if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
        container.innerHTML = '';
        const pct = (l) => `position:absolute;left:${l.x / W * 100}%;top:${l.y / H * 100}%;width:${l.w / W * 100}%;height:${l.h / H * 100}%;z-index:${l.z || 0};pointer-events:none;`;
        const { layers, erase } = this.layersFor(equippedMap);
        // base body on canvas so erase masks can cut hidden parts
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;z-index:20;pointer-events:none;background:none';
        container.appendChild(cv);
        const ctx = cv.getContext('2d');
        const load = (src) => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
        Promise.all([load(base.src), ...erase.map(e => load(e.src))]).then(([b, ...ms]) => {
          if (!b) return; ctx.clearRect(0, 0, W, H); ctx.drawImage(b, base.x, base.y, base.w, base.h);
          ctx.globalCompositeOperation = 'destination-out';
          ms.forEach((m, i) => { if (m) ctx.drawImage(m, erase[i].x, erase[i].y, erase[i].w, erase[i].h); });
          ctx.globalCompositeOperation = 'source-over';
        });
        layers.forEach(l => {
          const img = document.createElement('img'); img.alt = ''; img.dataset.src = l.src; img.src = l.src; img.draggable = false;
          img.style.cssText = pct(l);
          img.onerror = () => { img.style.display = 'none'; };
          if (opts.animate && !prev.has(l.src)) img.style.animation = 'dollIn .45s cubic-bezier(.2,.8,.2,1) both';
          container.appendChild(img);
        });
        if (D.blink) {
          const bl = document.createElement('img'); bl.alt = ''; bl.src = D.blink.src; bl.style.cssText = pct({ ...D.blink, z: D.blink.z || 67 }) + 'opacity:0;transition:opacity .08s';
          container.appendChild(bl);
          const loop = () => { if (!bl.isConnected) return; bl.style.opacity = 1; setTimeout(() => { bl.style.opacity = 0; }, 140); setTimeout(loop, 3000 + Math.random() * 3000); };
          setTimeout(loop, 2000 + Math.random() * 2000);
        }
      },
      preview(container, itemId, ms = 2500) {
        const it = window.XianData.items.find(i => i.id === itemId); if (!it) return;
        const eq = { ...X.S.equipped, [it.slot]: itemId };
        this.render(container, eq, { animate: true });
        clearTimeout(container._pv);
        container._pv = setTimeout(() => this.render(container, X.S.equipped), ms);
      }
    }
  };

  const loadingScreen = () => {
    const sect = document.createElement('section');
    sect.className = 'screen active';
    sect.id = 'scr-loading';
    sect.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      background: linear-gradient(135deg, #1a472a 0%, #0f2818 100%);
      color: #fff;
    `;
    sect.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 20px;">⚙️</div>
      <div style="margin-bottom: 20px; font-size: 16px;">加载中...</div>
      <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden;">
        <div id="loadBar" style="height: 100%; background: linear-gradient(90deg, #DAA520, #FFD700); width: 0%; transition: width 0.3s;"></div>
      </div>
    `;
    document.getElementById('screens').appendChild(sect);

    X.screens.loading = {
      el: sect,
      enter() {},
      leave() {}
    };

    return (progress) => {
      document.getElementById('loadBar').style.width = progress + '%';
    };
  };

  window.addEventListener('DOMContentLoaded', async () => {
    X.load();
    const updateProgress = loadingScreen();

    const preloadImage = (src) => {
      return new Promise((resolve) => {
        if (!src) {
          resolve();
          return;
        }
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve;
        img.src = src;
      });
    };

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    updateProgress(20);
    if (window.XianData) {
      if (window.XianData.base?.src) {
        await preloadImage(window.XianData.base.src);
      }
      updateProgress(40);

      const equipped = X.S.equipped || {};
      for (const itemId of Object.values(equipped)) {
        const item = window.XianData.items?.find(it => it.id === itemId);
        if (item?.layers) {
          for (const layer of item.layers) {
            await preloadImage(layer.src);
          }
        }
      }
      updateProgress(60);
    }

    updateProgress(80);
    const scenes = ['title', 'lobby', 'hall'];
    for (const scene of scenes) {
      if (window.XianData?.scenes?.[scene]) {
        await preloadImage(window.XianData.scenes[scene]);
      }
    }

    updateProgress(100);
    await delay(300);

    {
      const url = new URL(window.location);
      const want = url.searchParams.get('screen');
      const skipIntro = url.searchParams.get('skipintro') === '1';
      if (!X.S.created && (skipIntro || want)) X.newGame('云瑶', 'shuang');
      if (want && X.screens[want]) X.show(want, want==='battle'?{dungeon:0}:{});
      else X.show(X.S.created ? 'lobby' : 'title');
    }

    document.getElementById('scr-loading')?.remove();

    setInterval(() => X.tick(), 1000);
    window.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        const offline = Math.floor((Date.now() - X.S.lastTick) / 1000);
        const maxOffline = 8 * 3600;
        if (offline > 60) {
          const rate = X.qiRate();
          const capped = Math.min(offline, maxOffline);
          const gain = rate * capped;
          X.offlineGain = gain;
          X.toast(`闭关归来！获得 ${X.fmt(gain)} 灵气`, 'success');
          X.S.qi += gain;
          X.save();
        }
      }
    });

    window.addEventListener('beforeunload', () => X.save());

    window.Xian = {
      state: () => X.S,
      show: X.show.bind(X),
      equip: X.equip.bind(X),
      equipSet: X.equipSet.bind(X),
      addQi: (n) => { X.S.qi += n; X.save(); },
      breakthrough: () => X.screens.hall?.doBreak?.(),
      tribulation: () => X.show('tribulation'),
      battle: (i) => X.show('battle', { dungeon: i }),
      gacha: (n) => X.screens.gacha?.draw?.(n)
    };
  });

  X.setBg = (src, dim = false) => {
    const bgLayer = document.getElementById('bgLayer');
    if (bgLayer) {
      bgLayer.style.backgroundImage = src ? `url('${src}')` : 'none';
      bgLayer.style.backgroundSize = 'cover';
      bgLayer.style.backgroundPosition = 'center';
      bgLayer.style.opacity = '1';
      const d = dim === true ? 0.5 : (typeof dim === 'number' ? Math.min(0.7, dim * 0.5) : 0);
      bgLayer.style.filter = d ? `brightness(${1 - d})` : 'none';
    }
  };
})();