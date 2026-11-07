(function() {
  'use strict';

  const { X, XianData, XianEconomy } = window;
  const { S, G, h, toast, modal, fmt, topBar, refreshBalances, sfx, fx, setBg, stats, ownsItem, itemUsable, report, save, back, show } = X;

  const style = document.createElement('style');
  style.textContent = `
    .sc-map-screen { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; }
    .sc-map-top { position: relative; z-index: 10; }
    .sc-map-wrapper { position: relative; flex: 1; overflow: hidden; background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%); }
    .sc-map-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .sc-map-node { position: absolute; transform: translate(-50%, -50%); cursor: pointer; text-align: center; transition: all 0.3s; z-index: 5; }
    .sc-map-node.locked { opacity: 0.6; cursor: not-allowed; }
    .sc-map-node:not(.locked):hover { transform: translate(-50%, -50%) scale(1.15); }
    .sc-map-node-orb { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 4px; font-size: 40px; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent); border: 2px solid #DAA520; box-shadow: 0 0 20px rgba(218,165,32,0.8), inset 0 0 10px rgba(218,165,32,0.4); transition: all 0.3s; position: relative; }
    .sc-map-node:not(.locked):hover .sc-map-node-orb { box-shadow: 0 0 30px rgba(218,165,32,1), inset 0 0 15px rgba(218,165,32,0.6); }
    .sc-map-node-name { font-size: 12px; font-weight: bold; color: #fff; text-shadow: 0 2px 6px rgba(0,0,0,0.8), 0 0 12px rgba(218,165,32,0.6); white-space: nowrap; }
    .sc-map-node-stars { font-size: 12px; color: #FFD700; margin-top: 2px; text-shadow: 0 0 8px #FFD700; }
    .sc-map-node-lock { position: absolute; top: -8px; right: -8px; font-size: 24px; }
    .sc-map-svg-path { fill: none; stroke: #DAA520; stroke-width: 1; stroke-dasharray: 3 3; opacity: 0.6; filter: drop-shadow(0 0 4px rgba(218,165,32,0.8)); }

    .sc-battle-screen { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
    .sc-battle-top { position: relative; z-index: 10; }
    .sc-battle-wave { text-align: center; padding: 12px; font-size: 16px; font-weight: bold; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.8); background: linear-gradient(90deg, rgba(218,165,32,0.2), rgba(240,255,240,0.1)); border-bottom: 1px solid rgba(218,165,32,0.4); }
    .sc-battle-arena { position: relative; flex: 1; display: flex; align-items: center; justify-content: space-between; padding: 20px; gap: 20px; }
    .sc-battle-player-side { flex: 0 0 40%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
    .sc-battle-doll { width: 100%; max-width: 140px; aspect-ratio: 640/960; }
    .sc-battle-hp-bar { width: 100%; margin-top: 12px; }
    .sc-battle-hp-track { height: 8px; background: rgba(0,0,0,0.4); border-radius: 4px; overflow: hidden; border: 1px solid rgba(255,255,255,0.3); }
    .sc-battle-hp-fill { height: 100%; background: linear-gradient(90deg, #ff4466, #ff8899); transition: width 0.3s; box-shadow: 0 0 8px rgba(255,68,102,0.6); }
    .sc-battle-hp-text { font-size: 12px; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.8); margin-top: 4px; text-align: center; }
    .sc-battle-enemy-side { flex: 0 0 50%; display: flex; flex-direction: column; gap: 16px; align-items: center; justify-content: center; height: 100%; }
    .sc-battle-enemy { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .sc-battle-enemy-icon { font-size: 48px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5)); width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; border: 2px solid #DAA520; border-radius: 50%; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), transparent); box-shadow: 0 0 16px rgba(218,165,32,0.6); }
    .sc-battle-enemy-icon.boss { font-size: 64px; width: 110px; height: 110px; border-color: #ff4466; box-shadow: 0 0 24px rgba(255,68,102,0.8); animation: scBattleBossFloat 2s ease-in-out infinite; }
    @keyframes scBattleBossFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    .sc-battle-enemy-info { width: 100%; }
    .sc-battle-enemy-name { font-size: 13px; font-weight: bold; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.8); }
    .sc-battle-enemy-hp-track { height: 6px; background: rgba(0,0,0,0.4); border-radius: 3px; overflow: hidden; border: 1px solid rgba(255,255,255,0.3); margin-top: 4px; width: 100%; }
    .sc-battle-enemy-hp-fill { height: 100%; background: linear-gradient(90deg, #66ff66, #99ff99); transition: width 0.3s; box-shadow: 0 0 6px rgba(102,255,102,0.6); }
    .sc-battle-enemy-hp-text { font-size: 10px; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.8); margin-top: 2px; }
    .sc-battle-controls { position: absolute; bottom: 16px; left: 16px; display: flex; gap: 12px; z-index: 20; width: calc(100% - 170px); }
    .sc-battle-btn { padding: 10px 16px; font-size: 14px; font-weight: bold; border: 2px solid #DAA520; border-radius: 8px; cursor: pointer; color: #fff; transition: all 0.2s; background: linear-gradient(135deg, rgba(218,165,32,0.8), rgba(255,215,0,0.6)); }
    .sc-battle-btn:hover { box-shadow: 0 0 16px rgba(218,165,32,0.8); }
    .sc-battle-btn-retreat { background: linear-gradient(135deg, rgba(200,50,50,0.8), rgba(255,100,100,0.6)); border-color: #c33; }
    .sc-battle-btn-retreat:hover { box-shadow: 0 0 16px rgba(200,50,50,0.8); }
    .sc-battle-fx-canvas { position: absolute; inset: 0; pointer-events: none; z-index: 15; }
    .sc-battle-results-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 200; display: flex; align-items: center; justify-content: center; }
    .sc-battle-results-modal { background: linear-gradient(135deg, rgba(240,255,240,0.95) 0%, rgba(230,245,250,0.95) 100%); border: 2px solid #DAA520; border-radius: 16px; padding: 24px; max-width: 380px; max-height: 85%; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
    .sc-battle-results-title { font-size: 32px; font-weight: bold; margin: 0 0 20px 0; text-shadow: 0 2px 8px rgba(0,0,0,0.3); text-align: center; }
    .sc-battle-results-title.win { color: #DAA520; text-shadow: 0 0 20px rgba(218,165,32,0.8); }
    .sc-battle-results-title.lose { color: #c33; }
    .sc-battle-results-stars { font-size: 40px; color: #FFD700; margin-bottom: 24px; text-shadow: 0 0 16px rgba(255,215,0,0.8); text-align: center; }
    .sc-battle-results-section { margin: 16px 0; }
    .sc-battle-results-section h3 { margin: 0 0 12px 0; color: #2a5a3a; font-size: 16px; }
    .sc-battle-drops-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .sc-battle-drop-item { padding: 12px; background: linear-gradient(135deg, rgba(218,165,32,0.15), rgba(240,255,240,0.15)); border-radius: 8px; border: 1px solid rgba(218,165,32,0.4); font-size: 14px; text-align: center; }

    .sc-gacha-screen { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; }
    .sc-gacha-top { position: relative; z-index: 10; }
    .sc-gacha-banner { position: relative; padding: 40px 20px; text-align: center; background: linear-gradient(135deg, rgba(218,165,32,0.2), rgba(240,255,240,0.1)); border-bottom: 2px solid #DAA520; overflow: hidden; }
    .sc-gacha-banner-rays { position: absolute; inset: 0; pointer-events: none; }
    .sc-gacha-title { font-size: 28px; font-weight: bold; color: #DAA520; text-shadow: 0 0 24px rgba(218,165,32,0.9); margin-bottom: 4px; position: relative; z-index: 1; }
    .sc-gacha-subtitle { font-size: 13px; color: #666; position: relative; z-index: 1; }
    .sc-gacha-info { padding: 16px; background: rgba(240,255,240,0.6); border-bottom: 1px solid rgba(218,165,32,0.3); text-align: center; }
    .sc-gacha-pity { font-size: 16px; font-weight: bold; color: #DAA520; margin-bottom: 8px; }
    .sc-gacha-rates { font-size: 12px; color: #666; line-height: 1.6; }
    .sc-gacha-controls { display: flex; gap: 12px; padding: 16px; background: linear-gradient(180deg, rgba(240,255,240,0.5), rgba(230,245,250,0.3)); }
    .sc-gacha-btn { flex: 1; padding: 16px 12px; background: linear-gradient(135deg, rgba(218,165,32,0.8), rgba(255,215,0,0.6)); border: 2px solid #DAA520; border-radius: 12px; cursor: pointer; color: #fff; font-weight: bold; transition: all 0.2s; }
    .sc-gacha-btn:hover { box-shadow: 0 0 20px rgba(218,165,32,0.8); }
    .sc-gacha-btn-label { font-size: 18px; margin-bottom: 4px; }
    .sc-gacha-btn-cost { font-size: 13px; opacity: 0.9; }
    .sc-gacha-results-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .sc-gacha-results-modal { background: linear-gradient(135deg, rgba(240,255,240,0.98) 0%, rgba(230,245,250,0.98) 100%); border: 3px solid #DAA520; border-radius: 20px; padding: 28px; max-width: 360px; max-height: 90%; overflow-y: auto; box-shadow: 0 12px 48px rgba(0,0,0,0.4); }
    .sc-gacha-results-title { font-size: 28px; font-weight: bold; color: #DAA520; margin: 0 0 20px 0; text-align: center; text-shadow: 0 0 16px rgba(218,165,32,0.6); }
    .sc-gacha-results-grid { display: grid; gap: 12px; margin-bottom: 24px; }
    .sc-gacha-results-grid.single { grid-template-columns: 1fr; justify-items: center; }
    .sc-gacha-results-grid.multi { grid-template-columns: repeat(5, 1fr); }
    .sc-gacha-card { aspect-ratio: 2/3; perspective: 1000px; cursor: pointer; }
    .sc-gacha-card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s; transform-style: preserve-3d; }
    .sc-gacha-card.flip .sc-gacha-card-inner { transform: rotateY(180deg); }
    .sc-gacha-card-front, .sc-gacha-card-back { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-direction: column; }
    .sc-gacha-card-front { background: radial-gradient(circle, rgba(218,165,32,0.4) 0%, transparent 70%); border: 2px solid #DAA520; font-size: 32px; }
    .sc-gacha-card-back { transform: rotateY(180deg); padding: 8px; border: 2px solid #DAA520; }
    .sc-gacha-card[data-rarity="UR"] .sc-gacha-card-back { border-color: #ff6b9d; background: linear-gradient(135deg, rgba(255,107,157,0.15), rgba(240,200,220,0.15)); box-shadow: 0 0 24px rgba(255,107,157,0.9); }
    .sc-gacha-card[data-rarity="SSR"] .sc-gacha-card-back { border-color: #ffb700; background: linear-gradient(135deg, rgba(255,183,0,0.15), rgba(255,220,100,0.15)); box-shadow: 0 0 20px rgba(255,183,0,0.8); }
    .sc-gacha-card[data-rarity="SR"] .sc-gacha-card-back { border-color: #b19cd9; background: linear-gradient(135deg, rgba(177,156,217,0.15), rgba(220,200,255,0.15)); box-shadow: 0 0 16px rgba(177,156,217,0.7); }
    .sc-gacha-card[data-rarity="R"] .sc-gacha-card-back { border-color: #87ceeb; background: linear-gradient(135deg, rgba(135,206,235,0.1), rgba(200,240,255,0.1)); box-shadow: 0 0 12px rgba(135,206,235,0.5); }
    .sc-gacha-card[data-rarity="N"] .sc-gacha-card-back { border-color: #a9a9a9; background: linear-gradient(135deg, rgba(169,169,169,0.1), rgba(220,220,220,0.1)); box-shadow: 0 0 8px rgba(169,169,169,0.4); }
    .sc-gacha-item-img { max-width: 90%; max-height: 60%; object-fit: contain; margin-bottom: 4px; }
    .sc-gacha-artifact-icon { font-size: 48px; margin-bottom: 6px; }
    .sc-gacha-item-name { font-size: 11px; font-weight: bold; text-align: center; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; max-height: 2.6em; }
    .sc-gacha-new-badge { position: absolute; top: 4px; right: 4px; padding: 2px 6px; background: #ff4466; color: #fff; font-size: 9px; font-weight: bold; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
    .sc-gacha-owned-badge { position: absolute; top: 4px; right: 4px; padding: 2px 6px; background: #999; color: #fff; font-size: 9px; font-weight: bold; border-radius: 4px; }
    .sc-gacha-results-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, rgba(218,165,32,0.8), rgba(255,215,0,0.6)); border: 2px solid #DAA520; border-radius: 12px; cursor: pointer; color: #fff; font-weight: bold; font-size: 16px; transition: all 0.2s; }
    .sc-gacha-results-btn:hover { box-shadow: 0 0 20px rgba(218,165,32,0.8); }

    @keyframes scDollIn { 0% { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
    .doll { animation: scDollIn 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
  `;
  document.head.appendChild(style);

  const mapScreen = (() => {
    const el = h('<section class="screen sc-map-screen" id="scr-map"></section>');

    function enter() {
      setBg(XianData.scenes.map);
      const myRealm = S.realm;

      el.innerHTML = `
        <div class="sc-map-top">${topBar('秘境探索')}</div>
        <div class="sc-map-wrapper">
          <svg class="sc-map-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
            ${G.dungeons.slice(0, -1).map((d, i) => {
              const next = G.dungeons[i + 1];
              const cx = (d.x + next.x) / 2;
              const cy = (d.y + next.y) / 2;
              return `<path d="M${d.x} ${d.y}Q${cx} ${cy - 8} ${next.x} ${next.y}" class="sc-map-svg-path"/>`;
            }).join('')}
          </svg>
          <div style="position: absolute; inset: 0;">
            ${G.dungeons.map((d, i) => {
              const locked = d.minRealm > myRealm;
              const cleared = S.cleared[i] || 0;
              const stars = cleared > 0 ? '★'.repeat(cleared) : '☆☆☆';
              return `
                <div class="sc-map-node ${locked ? 'locked' : ''}" data-idx="${i}" style="left: ${d.x}%; top: ${d.y}%;">
                  <div class="sc-map-node-orb">${d.icon}</div>
                  <div class="sc-map-node-name">${d.name}</div>
                  <div class="sc-map-node-stars">${stars}</div>
                  ${locked ? '<div class="sc-map-node-lock">🔒</div>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      const backBtn = el.querySelector('[onclick*="X.back"]');
      if (backBtn) backBtn.onclick = () => { sfx('click'); back(); };

      el.querySelectorAll('.sc-map-node').forEach(node => {
        node.onclick = () => {
          sfx('click');
          const i = +node.dataset.idx;
          openDungeonDetail(i);
        };
      });
    }

    function openDungeonDetail(i) {
      const d = G.dungeons[i];
      const myRealm = S.realm;
      const locked = d.minRealm > myRealm;
      const cleared = S.cleared[i] || 0;
      const stars = cleared > 0 ? '★'.repeat(cleared) : '☆☆☆';

      const m = modal(`
        <div style="text-align: center; max-width: 380px;">
          <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 20px;">
            <div style="font-size: 56px;">${d.icon}</div>
            <div style="text-align: left; flex: 1;">
              <h2 style="margin: 0 0 8px 0; color: #DAA520; font-size: 20px;">${d.name}</h2>
              <div style="font-size: 13px; color: #666;">需求境界：${G.realms[d.minRealm].name}</div>
              <div style="font-size: 16px; color: #FFD700; margin-top: 4px; text-shadow: 0 0 8px #FFD700;">${stars}</div>
            </div>
          </div>

          <div style="margin: 16px 0; text-align: left;">
            <h3 style="margin: 0 0 10px 0; color: #2a5a3a; font-size: 15px;">⚔️ Boss</h3>
            <div style="padding: 12px; background: linear-gradient(135deg, rgba(218,165,32,0.1), rgba(240,255,240,0.1)); border-radius: 8px; border: 1px solid #DAA520; display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 40px;">${d.boss.icon}</div>
              <div style="flex: 1;">
                <div style="font-weight: bold; color: #333;">${d.boss.name}</div>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">❤️ ${fmt(d.boss.hp)} | ⚔️ ${fmt(d.boss.atk)}</div>
              </div>
            </div>
          </div>

          <div style="margin: 16px 0; text-align: left;">
            <h3 style="margin: 0 0 10px 0; color: #2a5a3a; font-size: 15px;">💝 掉落奖励</h3>
            <div style="font-size: 14px; color: #333; line-height: 1.8;">
              ${d.drops.lingshi ? `💠 灵石 ×${fmt(d.drops.lingshi)}<br>` : ''}
              ${d.drops.gems ? `💎 仙玉 ×${fmt(d.drops.gems)}` : ''}
            </div>
          </div>

          ${locked ? `<div style="padding: 12px; color: #999; font-style: italic; text-align: center;">🔒 需要达到 ${G.realms[d.minRealm].name} 境界</div>` :
            `<button id="sc-mapChalBtn" style="width: 100%; margin-top: 16px; padding: 12px; background: linear-gradient(135deg, rgba(218,165,32,0.8), rgba(255,215,0,0.6)); border: 2px solid #DAA520; border-radius: 8px; cursor: pointer; color: #fff; font-weight: bold; transition: all 0.2s;">⚔️ 挑战秘境</button>`}
        </div>
      `);

      if (!locked) {
        const btn = m.el.querySelector('#sc-mapChalBtn');
        if (btn) btn.onclick = () => {
          sfx('sword');
          m.close();
          show('battle', { dungeon: i });
        };
      }
    }

    return { el, enter };
  })();

  const battleScreen = (() => {
    const el = h('<section class="screen sc-battle-screen" id="scr-battle"></section>');
    let state = null;
    let raf = null;
    let timers = [];

    function clrTimers() {
      timers.forEach(t => clearTimeout(t));
      timers = [];
    }

    function enter(params) {
      clrTimers();
      if (raf) cancelAnimationFrame(raf);

      const di = params?.dungeon ?? 0;
      const d = G.dungeons[di];
      if (!d) return;

      setBg(XianData.scenes[d.scene], true);

      const ps = stats();
      state = {
        di,
        d,
        wave: 0,
        enemies: [],
        pHp: ps.hp,
        pMaxHp: ps.hp,
        pAtk: ps.atk,
        pDef: ps.def,
        speed: 1,
        pAtkCd: 0,
        done: false
      };

      el.innerHTML = `
        <div class="sc-battle-top">${topBar(d.name)}</div>
        <div class="sc-battle-wave">第 <span id="sc-waveNum">1</span> 波 / ${d.waves.length + 1}</div>
        <div class="sc-battle-arena">
          <div class="sc-battle-player-side">
            <div id="sc-playerDoll" class="sc-battle-doll"></div>
            <div class="sc-battle-hp-bar">
              <div class="sc-battle-hp-track"><div class="sc-battle-hp-fill" id="sc-pHpFill" style="width: 100%;"></div></div>
              <div class="sc-battle-hp-text"><span id="sc-pHpTxt">${fmt(state.pHp)}</span>/${fmt(state.pMaxHp)}</div>
            </div>
          </div>
          <div class="sc-battle-enemy-side" id="sc-enemySide"></div>
          <canvas id="sc-battleFxCanvas" class="sc-battle-fx-canvas"></canvas>
        </div>
        <div class="sc-battle-controls">
          <button class="sc-battle-btn" id="sc-speedBtn">x1</button>
          <button class="sc-battle-btn sc-battle-btn-retreat" id="sc-retreatBtn">撤退</button>
        </div>
      `;

      const bck = el.querySelector('[onclick*="X.back"]');
      if (bck) bck.onclick = () => {
        sfx('click');
        clrTimers();
        if (raf) cancelAnimationFrame(raf);
        back();
      };

      const spd = el.querySelector('#sc-speedBtn');
      if (spd) spd.onclick = () => {
        sfx('click');
        state.speed = state.speed === 1 ? 2 : 1;
        spd.textContent = `x${state.speed}`;
      };

      const ret = el.querySelector('#sc-retreatBtn');
      if (ret) ret.onclick = () => {
        if (confirm('撤退？不获得奖励。')) {
          sfx('click');
          clrTimers();
          if (raf) cancelAnimationFrame(raf);
          state.done = true;
          back();
        }
      };

      const dollCont = el.querySelector('#sc-playerDoll');
      if (dollCont) X.Doll.render(dollCont, S.equipped, { scale: 0.42 });

      startWave();
      loop();
    }

    function leave() {
      clrTimers();
      if (raf) cancelAnimationFrame(raf);
      state = null;
    }

    function startWave() {
      const wi = state.wave;
      const isBoss = wi === state.d.waves.length;

      if (isBoss) {
        const b = state.d.boss;
        state.enemies = [{
          name: b.name,
          icon: b.icon,
          hp: b.hp * 6,
          maxHp: b.hp * 6,
          atk: b.atk,
          boss: true,
          atkCd: 0
        }];
      } else {
        const w = state.d.waves[wi];
        if (!w) return;
        state.enemies = w.map(e => ({
          name: e.name || '妖兽',
          icon: e.icon || '👹',
          hp: e.hp * 5,
          maxHp: e.hp * 5,
          atk: e.atk,
          boss: false,
          atkCd: 0
        }));
      }

      state.pAtkCd = 0;
      renderEnemies();
      const wn = el.querySelector('#sc-waveNum');
      if (wn) wn.textContent = wi + 1;
    }

    function renderEnemies() {
      const cont = el.querySelector('#sc-enemySide');
      if (!cont) return;
      cont.innerHTML = state.enemies.map((e, i) => {
        const hpPct = (e.hp / e.maxHp * 100).toFixed(1);
        return `
          <div class="sc-battle-enemy" data-idx="${i}">
            <div class="sc-battle-enemy-icon ${e.boss ? 'boss' : ''}">${e.icon}</div>
            <div class="sc-battle-enemy-info">
              <div class="sc-battle-enemy-name">${e.name}</div>
              <div class="sc-battle-enemy-hp-track"><div class="sc-battle-enemy-hp-fill" id="sc-eHpFill${i}" style="width: ${hpPct}%;"></div></div>
              <div class="sc-battle-enemy-hp-text"><span id="sc-eHpTxt${i}">${fmt(e.hp)}</span>/${fmt(e.maxHp)}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    function loop() {
      if (!state || state.done) return;

      const dt = 16 / 1000 * state.speed;

      state.pAtkCd -= dt;
      if (state.pAtkCd <= 0 && state.enemies.length > 0) {
        state.pAtkCd = 0.8;
        pAttack();
      }

      state.enemies.forEach((e, i) => {
        e.atkCd -= dt;
        if (e.atkCd <= 0) {
          e.atkCd = 0.8;
          eAttack(i);
        }
      });

      state.enemies = state.enemies.filter(e => e.hp > 0);

      if (state.enemies.length === 0) {
        state.wave++;
        if (state.wave > state.d.waves.length) {
          win();
          return;
        } else {
          const t = setTimeout(() => {
            if (state && !state.done) startWave();
          }, 1000 / state.speed);
          timers.push(t);
        }
      }

      if (state.pHp <= 0) {
        lose();
        return;
      }

      raf = requestAnimationFrame(loop);
    }

    function pAttack() {
      if (state.enemies.length === 0) return;
      const t = state.enemies[0];
      const crit = Math.random() < 0.15;
      const dmg = Math.floor(state.pAtk * (crit ? 2 : 1) * (0.9 + Math.random() * 0.2));
      t.hp = Math.max(0, t.hp - dmg);

      sfx('sword');
      drawSlash();
      updateEnemyHp(0, t);
      floatDmg(0, dmg, crit);
    }

    function eAttack(idx) {
      const e = state.enemies[idx];
      const dmg = Math.max(1, Math.floor((e.atk - state.pDef * 0.5) * (0.9 + Math.random() * 0.2)));
      state.pHp = Math.max(0, state.pHp - dmg);

      fx.shake(100);
      updatePlayerHp();
      floatPlayerDmg(dmg);
    }

    function updatePlayerHp() {
      const pct = (state.pHp / state.pMaxHp * 100).toFixed(1);
      const f = el.querySelector('#sc-pHpFill');
      const t = el.querySelector('#sc-pHpTxt');
      if (f) f.style.width = pct + '%';
      if (t) t.textContent = fmt(state.pHp);
    }

    function updateEnemyHp(idx, e) {
      const pct = (e.hp / e.maxHp * 100).toFixed(1);
      const f = el.querySelector('#sc-eHpFill' + idx);
      const t = el.querySelector('#sc-eHpTxt' + idx);
      if (f) f.style.width = pct + '%';
      if (t) t.textContent = fmt(e.hp);
    }

    function drawSlash() {
      const cv = el.querySelector('#sc-battleFxCanvas');
      if (!cv) return;
      const ctx = cv.getContext('2d');
      const r = cv.getBoundingClientRect();
      cv.width = r.width * devicePixelRatio;
      cv.height = r.height * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);

      ctx.strokeStyle = 'rgba(0,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#0ff';
      ctx.shadowBlur = 10;

      const sx = r.width * 0.2;
      const sy = r.height * 0.4;
      const ex = r.width * 0.8;
      const ey = r.height * 0.35;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      const t = setTimeout(() => {
        ctx.clearRect(0, 0, cv.width, cv.height);
      }, 150 / state.speed);
      timers.push(t);
    }

    function floatDmg(idx, dmg, crit) {
      const e = el.querySelector(`.sc-battle-enemy[data-idx="${idx}"]`);
      if (!e) return;
      const r = e.getBoundingClientRect();
      const sr = el.getBoundingClientRect();
      const x = r.left + r.width / 2 - sr.left;
      const y = r.top + r.height / 2 - sr.top;
      fx.burst(x, y, crit ? '#ff0' : '#fff', 8);
      fx.floatText(x, y, (crit ? '暴击！' : '') + fmt(dmg), crit ? '#ff0' : '#fff');
    }

    function floatPlayerDmg(dmg) {
      const d = el.querySelector('#sc-playerDoll');
      if (d) {
        d.style.filter = 'brightness(1.4)';
        const t = setTimeout(() => { d.style.filter = ''; }, 100 / state.speed);
        timers.push(t);

        const r = d.getBoundingClientRect();
        const sr = el.getBoundingClientRect();
        const x = r.left + r.width / 2 - sr.left;
        const y = r.top + r.height / 3 - sr.top;
        fx.floatText(x, y, '-' + fmt(dmg), '#f44');
      }
    }

    function win() {
      state.done = true;
      const hp = Math.max(0, state.pHp / state.pMaxHp);
      const stars = hp > 0.8 ? 3 : hp > 0.5 ? 2 : 1;

      S.cleared[state.di] = Math.max(S.cleared[state.di] || 0, stars);

      if (state.d.drops.lingshi) {
        XianEconomy.add('lingshi', state.d.drops.lingshi, 'battle');
      }
      if (state.d.drops.gems) {
        XianEconomy.add('gem', state.d.drops.gems, 'battle');
      }

      save();
      refreshBalances();
      sfx('chime');
      fx.flash('rgba(255,215,0,0.3)');
      report('battle_result', { dungeon: state.di, win: true, stars });
      X.missionProgress('battle', 1);

      const t = setTimeout(() => {
        if (!state.done) return;
        const overlay = h(`
          <div class="sc-battle-results-overlay">
            <div class="sc-battle-results-modal">
              <h2 class="sc-battle-results-title win">✨ 胜利 ✨</h2>
              <div class="sc-battle-results-stars">${'★'.repeat(stars)}${' ☆'.repeat(3 - stars)}</div>
              <div class="sc-battle-results-section">
                <h3>获得奖励</h3>
                <div class="sc-battle-drops-grid">
                  ${state.d.drops.lingshi ? `<div class="sc-battle-drop-item">💠 灵石<br>${fmt(state.d.drops.lingshi)}</div>` : ''}
                  ${state.d.drops.gems ? `<div class="sc-battle-drop-item">💎 仙玉<br>${fmt(state.d.drops.gems)}</div>` : ''}
                </div>
              </div>
              <button id="sc-battleResBtn" class="sc-battle-results-btn">返回</button>
            </div>
          </div>
        `);
        document.getElementById('app').appendChild(overlay);
        const btn = overlay.querySelector('#sc-battleResBtn');
        if (btn) btn.onclick = () => {
          overlay.remove();
          back();
        };
      }, 500);
      timers.push(t);
    }

    function lose() {
      state.done = true;
      sfx('fail');
      fx.flash('rgba(255,0,0,0.3)');

      const t = setTimeout(() => {
        if (!state.done) return;
        const overlay = h(`
          <div class="sc-battle-results-overlay">
            <div class="sc-battle-results-modal">
              <h2 class="sc-battle-results-title lose">💀 失败</h2>
              <div style="padding: 20px; color: #666; font-style: italic; text-align: center;">实力不足，需继续修炼！</div>
              <button id="sc-battleResBtn" class="sc-battle-results-btn">返回</button>
            </div>
          </div>
        `);
        document.getElementById('app').appendChild(overlay);
        const btn = overlay.querySelector('#sc-battleResBtn');
        if (btn) btn.onclick = () => {
          overlay.remove();
          back();
        };
      }, 500);
      timers.push(t);
    }

    return { el, enter, leave };
  })();

  const gachaScreen = (() => {
    const el = h('<section class="screen sc-gacha-screen" id="scr-gacha"></section>');

    function enter() {
      setBg(XianData.scenes.title);

      el.innerHTML = `
        <div class="sc-gacha-top">${topBar('仙缘祈愿')}</div>
        <div class="sc-gacha-banner">
          <div class="sc-gacha-title">✨ 仙缘祈愿 ✨</div>
          <div class="sc-gacha-subtitle">时装法宝应有尽有</div>
          <div class="sc-gacha-banner-rays"></div>
        </div>
        <div class="sc-gacha-info">
          <div class="sc-gacha-pity">距离保底：<span id="sc-pityCount">${50 - (S.gachaPity || 0)}</span> 抽</div>
          <div class="sc-gacha-rates">
            <div>SSR 3% · SR 12% · R 85%</div>
            <div>50抽必出SSR+</div>
          </div>
        </div>
        <div class="sc-gacha-controls">
          <button class="sc-gacha-btn" data-n="1">
            <div class="sc-gacha-btn-label">单抽</div>
            <div class="sc-gacha-btn-cost">💎10</div>
          </button>
          <button class="sc-gacha-btn" data-n="10">
            <div class="sc-gacha-btn-label">十连</div>
            <div class="sc-gacha-btn-cost">💎90</div>
          </button>
        </div>
      `;

      const rays = el.querySelector('.sc-gacha-banner-rays');
      if (rays) fx.rays(rays);

      const bck = el.querySelector('[onclick*="X.back"]');
      if (bck) bck.onclick = () => { sfx('click'); back(); };

      el.querySelectorAll('.sc-gacha-btn').forEach(b => {
        b.onclick = () => draw(+b.dataset.n);
      });

      refreshBalances();
    }

    function draw(n) {
      const cost = n === 1 ? 10 : 90;
      if (!XianEconomy.spend('gem', cost, 'gacha')) {
        toast('仙玉不足！', 'error');
        return;
      }

      sfx('chime');

      const res = [];
      let pity = S.gachaPity || 0;

      for (let i = 0; i < n; i++) {
        pity++;
        let rar = 1;

        if (pity >= 50) {
          rar = Math.random() < 0.5 ? 3 : 2;
          pity = 0;
        } else {
          const r = Math.random();
          if (r < 0.03) {
            rar = 3;
            pity = 0;
          } else if (r < 0.15) {
            rar = 2;
          } else {
            rar = 1;
          }
        }

        const isOut = Math.random() < 0.6;
        const rarMap = { 1: 'N', 2: 'R', 3: 'SR' };
        const rarStr = (pity === 0 && rar === 3) ? 'SSR' : rarMap[rar] || 'N';

        if (isOut) {
          const pool = XianData.items.filter(it => !it.vip && it.rarity === rarStr);
          if (pool.length > 0) {
            const it = pool[Math.floor(Math.random() * pool.length)];
            const own = ownsItem(it.id);
            if (!own) XianEconomy.grant(it.id, 'gacha');
            res.push({ type: 'outfit', item: it, owned: own, new: !own });
          }
        } else {
          const pool = G.artifacts.filter(a => a.rarity === rarStr);
          if (pool.length > 0) {
            const a = pool[Math.floor(Math.random() * pool.length)];
            const uid = Date.now() + Math.random();
            S.artifacts.push({ uid, id: a.id, lv: 1 });
            res.push({ type: 'artifact', art: a, new: true });
          }
        }
      }

      S.gachaPity = pity;
      save();
      refreshBalances();

      const pc = el.querySelector('#sc-pityCount');
      if (pc) pc.textContent = 50 - pity;

      showRes(res, n);
      report('gacha', { count: n });
      X.missionProgress('gacha', n);
    }

    function showRes(res, n) {
      const overlay = h(`
        <div class="sc-gacha-results-overlay">
          <div class="sc-gacha-results-modal">
            <div class="sc-gacha-results-title">祈愿结果</div>
            <div class="sc-gacha-results-grid ${n === 1 ? 'single' : 'multi'}">
              ${res.map((r, i) => {
                const rar = r.type === 'outfit' ? r.item.rarity : r.art.rarity;
                const lyr = r.type === 'outfit' ? r.item.layers?.[0] : null;
                return `
                  <div class="sc-gacha-card" data-rarity="${rar}" data-idx="${i}">
                    <div class="sc-gacha-card-inner">
                      <div class="sc-gacha-card-front">${r.type === 'outfit' ? '✨' : '⭐'}</div>
                      <div class="sc-gacha-card-back">
                        ${lyr ? `<img src="${lyr.src}" class="sc-gacha-item-img" alt="">` : `<div class="sc-gacha-artifact-icon">${r.type === 'outfit' ? r.item.icon : r.art.icon}</div>`}
                        <div class="sc-gacha-item-name" style="color: ${XianData.rarities?.find(x => x.id === rar)?.color || '#333'};">${r.type === 'outfit' ? r.item.name : r.art.name}</div>
                        ${r.new ? '<div class="sc-gacha-new-badge">NEW</div>' : '<div class="sc-gacha-owned-badge">已有</div>'}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            <button id="sc-gachaResBtn" class="sc-gacha-results-btn">确定</button>
          </div>
        </div>
      `);
      document.getElementById('app').appendChild(overlay);

      const cards = overlay.querySelectorAll('.sc-gacha-card');
      cards.forEach((c, i) => {
        setTimeout(() => {
          c.classList.add('flip');
          sfx('chime');
          const rar = res[i].type === 'outfit' ? res[i].item.rarity : res[i].art.rarity;
          if (rar === 'SSR' || rar === 'UR') {
            const col = XianData.rarities?.find(x => x.id === rar)?.color || '#DAA520';
            fx.burst(c.offsetLeft + c.offsetWidth / 2, c.offsetTop + c.offsetHeight / 2, col, 20);
          }
        }, i * 200);
      });

      const btn = overlay.querySelector('#sc-gachaResBtn');
      if (btn) btn.onclick = () => {
        overlay.remove();
      };
    }

    return { el, enter, draw };
  })();

  X.screens.map = mapScreen;
  X.screens.battle = battleScreen;
  X.screens.gacha = gachaScreen;
})();