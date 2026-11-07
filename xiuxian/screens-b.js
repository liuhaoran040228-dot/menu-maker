(function() {
  if (!window.X) return;
  const { S, G, h, toast, modal, fmt, topBar, sfx, fx, setBg, show, back, ownsItem, itemUsable, isVip, tier, equip, equipSet, stats, setBonuses, Doll, save, refreshBalances } = X;

  const style = document.createElement('style');
  style.textContent = `
    .wd-container { position: relative; width: 100%; height: calc(100% - 44px); display: flex; flex-direction: column; overflow: hidden; }
    .wd-doll-area { position: relative; height: 56%; display: flex; align-items: center; justify-content: center; border-bottom: 2px solid rgba(218,165,32,0.3); background: linear-gradient(180deg, rgba(16,30,40,0.3), rgba(16,30,40,0.6)); }
    .wd-doll-wrap { width: 100%; height: 100%; max-height: 52vh; position: relative; }
    .wd-sets-btn { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); padding: 10px 16px; background: linear-gradient(135deg, rgba(218,165,32,0.9), rgba(184,134,11,0.9)); border: 2px solid #FFD700; border-radius: 8px; color: #000; font-weight: bold; font-size: 13px; cursor: pointer; box-shadow: 0 4px 12px rgba(218,165,32,0.5); transition: all 0.3s; z-index: 10; }
    .wd-sets-btn:hover { transform: translateY(-50%) scale(1.05); box-shadow: 0 6px 16px rgba(218,165,32,0.7); }
    .wd-sheet { height: 44%; display: flex; flex-direction: column; background: linear-gradient(180deg, rgba(32,50,60,0.95), rgba(16,30,40,0.98)); overflow: hidden; }
    .wd-controls { padding: 8px; border-bottom: 1px solid rgba(218,165,32,0.2); overflow-x: auto; overflow-y: hidden; white-space: nowrap; }
    .wd-controls::-webkit-scrollbar { height: 3px; }
    .wd-controls::-webkit-scrollbar-thumb { background: rgba(218,165,32,0.4); border-radius: 2px; }
    .wd-slot-tab { display: inline-block; padding: 6px 10px; margin: 2px; border: 1px solid rgba(218,165,32,0.5); border-radius: 4px; color: #d4af37; font-size: 11px; cursor: pointer; background: transparent; transition: all 0.2s; }
    .wd-slot-tab.active { background: rgba(218,165,32,0.4); border-color: #FFD700; box-shadow: 0 0 8px rgba(218,165,32,0.3); }
    .wd-style-filter { display: inline-block; padding: 5px 9px; margin: 2px; border: 1px solid rgba(218,165,32,0.4); border-radius: 4px; color: #d4af37; font-size: 10px; cursor: pointer; background: transparent; transition: all 0.2s; }
    .wd-style-filter.active { background: rgba(218,165,32,0.35); border-color: #FFD700; }
    .wd-rarity-chip { display: inline-block; padding: 4px 8px; margin: 2px; border-radius: 4px; font-size: 9px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
    .wd-grid-wrap { flex: 1; overflow-y: auto; padding: 8px 8px 70px 8px; }
    .wd-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .wd-item-tile { position: relative; width: 100%; aspect-ratio: 1; border-radius: 8px; cursor: pointer; overflow: hidden; transition: all 0.3s; display: flex; align-items: center; justify-content: center; }
    .wd-item-tile:active { transform: scale(0.95); }
    .wd-item-tile img { width: 85%; height: 85%; object-fit: contain; }
    .wd-badge { position: absolute; top: 3px; right: 3px; padding: 2px 5px; border-radius: 3px; font-size: 8px; font-weight: bold; background: rgba(0,0,0,0.7); color: #fff; }
    .wd-lock { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); padding: 4px 8px; border-radius: 4px; color: #fff; font-size: 11px; }

    .bag-container { position: relative; width: 100%; height: calc(100% - 44px); display: flex; flex-direction: column; }
    .bag-tabs { display: flex; border-bottom: 1px solid rgba(218,165,32,0.3); background: rgba(16,30,40,0.8); }
    .bag-tab { flex: 1; padding: 12px; border: none; background: transparent; color: #d4af37; cursor: pointer; font-size: 12px; font-weight: bold; border-bottom: 2px solid transparent; transition: all 0.2s; }
    .bag-tab.active { border-bottom-color: #FFD700; background: rgba(218,165,32,0.15); }
    .bag-content { flex: 1; overflow-y: auto; padding: 12px; background: linear-gradient(180deg, rgba(32,50,60,0.9), rgba(16,30,40,0.95)); }
    .bag-art-slot { padding: 14px; margin: 8px 0; border-radius: 8px; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: space-between; }
    .bag-art-slot:active { transform: scale(0.98); }
    .bag-art-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
    .bag-art-item { padding: 12px; border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.3s; }
    .bag-art-item:active { transform: scale(0.95); }
    .bag-pill-item, .bag-herb-item { padding: 12px; margin: 6px 0; border: 1px solid rgba(218,165,32,0.3); border-radius: 6px; background: linear-gradient(135deg, rgba(218,165,32,0.08), rgba(218,165,32,0.02)); display: flex; align-items: center; justify-content: space-between; }

    .alch-container { position: relative; width: 100%; height: calc(100% - 44px); display: flex; flex-direction: column; align-items: center; padding: 20px 12px 60px 12px; overflow-y: auto; background: linear-gradient(135deg, rgba(32,50,60,0.95), rgba(16,30,40,0.98)); }
    .alch-furnace { position: relative; width: 120px; height: 140px; margin: 20px auto; perspective: 1000px; }
    .alch-furnace-body { position: relative; width: 100%; height: 100%; border: 3px solid #8b7355; border-radius: 50% 50% 40% 40%; background: linear-gradient(135deg, #4a3728, #2a1810); box-shadow: inset 0 0 20px rgba(0,0,0,0.8), 0 0 20px rgba(218,165,32,0.4); transition: transform 0.3s; }
    .alch-furnace-fire { position: absolute; bottom: 20px; left: 10px; right: 10px; height: 60px; background: linear-gradient(180deg, #ff6600, #ff3300, #660000); border-radius: 50%; opacity: 0.85; filter: blur(8px); animation: alchFlicker 0.6s infinite; }
    @keyframes alchFlicker { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
    .alch-furnace-lid { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); width: 40px; height: 30px; background: #6b5d50; border-radius: 50% 50% 30% 30%; box-shadow: 0 2px 6px rgba(0,0,0,0.4); }
    .alch-recipe { width: 100%; max-width: 360px; padding: 14px; margin: 10px 0; border: 2px solid rgba(218,165,32,0.4); border-radius: 8px; background: linear-gradient(135deg, rgba(218,165,32,0.12), rgba(218,165,32,0.04)); transition: all 0.3s; }
    .alch-recipe.can-brew { cursor: pointer; }
    .alch-recipe.can-brew:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(218,165,32,0.4); }
    .alch-brew-btn { padding: 8px 16px; border: none; border-radius: 5px; font-size: 11px; font-weight: bold; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
    .alch-brew-btn:not(:disabled) { background: linear-gradient(135deg, #d4af37, #b8860b); color: #000; box-shadow: 0 3px 8px rgba(218,165,32,0.4); }
    .alch-brew-btn:not(:disabled):active { transform: scale(0.95); }
    .alch-brew-btn:disabled { background: #555; color: #888; cursor: not-allowed; }

    @keyframes dollIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `;
  document.head.appendChild(style);

  // ============ WARDROBE ============
  X.screens.wardrobe = {
    el: null,
    currentSlot: null,
    currentStyle: '全部',
    currentRarity: null,

    renderWardrobe() {
      const scr = this.el;
      scr.innerHTML = topBar('👘 衣橱');

      const container = h('<div class="wd-container"></div>');
      scr.appendChild(container);

      const dollArea = h('<div class="wd-doll-area"></div>');
      container.appendChild(dollArea);

      const setsBtn = h('<button class="wd-sets-btn">⭐ 套装</button>');
      dollArea.appendChild(setsBtn);
      setsBtn.addEventListener('click', () => this.openSetsDrawer());

      const dollWrap = h('<div class="wd-doll-wrap"></div>');
      dollArea.appendChild(dollWrap);
      Doll.render(dollWrap, S.equipped, { animate: false });

      const sheet = h('<div class="wd-sheet"></div>');
      container.appendChild(sheet);

      const controls = h('<div class="wd-controls"></div>');
      sheet.appendChild(controls);

      const slots = window.XianData?.slots || [];
      slots.forEach(sl => {
        const btn = h(`<button class="wd-slot-tab ${this.currentSlot === sl.id ? 'active' : ''}">${sl.icon} ${sl.name}</button>`);
        btn.addEventListener('click', () => {
          this.currentSlot = this.currentSlot === sl.id ? null : sl.id;
          this.renderWardrobe();
        });
        controls.appendChild(btn);
      });

      const styleOpts = ['全部', '可爱', '性感', '优雅', '帅气'];
      styleOpts.forEach(s => {
        const btn = h(`<button class="wd-style-filter ${this.currentStyle === s ? 'active' : ''}">${s}</button>`);
        btn.addEventListener('click', () => {
          this.currentStyle = s;
          this.renderWardrobe();
        });
        controls.appendChild(btn);
      });

      const rarities = window.XianData?.rarities || [];
      rarities.forEach(r => {
        const active = this.currentRarity === r.id;
        const btn = h(`<button class="wd-rarity-chip" style="border:2px solid ${r.color};background:${active ? r.color + '50' : 'transparent'};color:${active ? '#fff' : r.color};">${r.id}</button>`);
        btn.addEventListener('click', () => {
          this.currentRarity = this.currentRarity === r.id ? null : r.id;
          this.renderWardrobe();
        });
        controls.appendChild(btn);
      });

      const gridWrap = h('<div class="wd-grid-wrap"></div>');
      sheet.appendChild(gridWrap);

      const items = (window.XianData?.items || []).filter(it => {
        if (this.currentSlot && it.slot !== this.currentSlot) return false;
        if (this.currentStyle !== '全部' && it.style !== this.currentStyle) return false;
        if (this.currentRarity && it.rarity !== this.currentRarity) return false;
        return true;
      });

      const grid = h('<div class="wd-grid"></div>');
      gridWrap.appendChild(grid);

      items.forEach(it => {
        const owned = ownsItem(it.id);
        const usable = owned && itemUsable(it);
        const equipped = S.equipped[it.slot] === it.id;
        const firstLayer = it.layers?.[0];
        const rarity = rarities.find(r => r.id === it.rarity);
        const bgColor = rarity ? rarity.color : '#888';
        const glow = (it.rarity === 'SSR' || it.rarity === 'UR') ? `0 0 12px ${bgColor}AA` : 'none';

        const tile = h(`<div class="wd-item-tile" style="border:2px solid ${bgColor};background:linear-gradient(135deg,${bgColor}25,${bgColor}08);box-shadow:${glow};opacity:${usable ? '1' : '0.6'};"></div>`);
        
        if (firstLayer?.src) {
          const img = h(`<img src="${firstLayer.src}" alt="${it.name}">`);
          tile.appendChild(img);
        }

        if (!owned && it.vip) {
          const badge = h(`<div class="wd-badge" style="background:#d4af37;color:#000;">VIP${it.minTier || 1}</div>`);
          tile.appendChild(badge);
        } else if (!owned) {
          const lock = h('<div class="wd-lock">🔒</div>');
          tile.appendChild(lock);
        } else if (equipped) {
          const check = h('<div class="wd-badge" style="background:#4af;color:#000;">✓</div>');
          tile.appendChild(check);
        }

        tile.addEventListener('click', () => {
          if (!usable) {
            if (!owned) {
              this.showLockedModal(it, dollWrap);
            } else {
              toast('需要更高VIP等级', 'warn');
            }
            return;
          }

          equip(it.id);
          sfx('click');
          fx.burst(scr.offsetWidth / 2, scr.offsetHeight * 0.3, '#FFD700', 12);
          this.renderWardrobe();
        });

        grid.appendChild(tile);
      });
    },

    showLockedModal(it, dollContainer) {
      const m = modal(`
        <div style="text-align:center;padding:24px;color:#d4af37;">
          <div style="font-size:16px;font-weight:bold;margin-bottom:12px;color:#FFD700;">🔒 ${it.name}</div>
          <div style="font-size:12px;color:#aaa;margin-bottom:20px;">需要 VIP${it.minTier || 1} 或通过其他方式获得</div>
          <button id="vip-open-btn" style="padding:10px 20px;background:linear-gradient(135deg,#d4af37,#b8860b);color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:bold;margin-right:10px;box-shadow:0 4px 12px rgba(218,165,32,0.4);">开通VIP</button>
          <button id="modal-close-btn" style="padding:10px 20px;background:rgba(218,165,32,0.2);color:#d4af37;border:1px solid #d4af37;border-radius:6px;cursor:pointer;">关闭</button>
        </div>
      `);
      
      const vipBtn = m.el.querySelector('#vip-open-btn');
      if (vipBtn) {
        vipBtn.addEventListener('click', () => {
          if (window.VIP?.open) window.VIP.open();
          m.close();
        });
      }
      
      const closeBtn = m.el.querySelector('#modal-close-btn');
      if (closeBtn) closeBtn.addEventListener('click', () => m.close());

      Doll.preview(dollContainer, it.id, 2500);
    },

    openSetsDrawer() {
      const sets = window.XianData?.sets || [];
      const setBonuses = X.setBonuses();
      
      const setsHtml = sets.map(set => {
        const progress = setBonuses.find(b => b.set === set.id);
        const count = progress?.count || 0;
        const totalItems = set.items?.length || 6;
        const active = progress?.active || [];
        
        const activeBonus = active.map(n => {
          const bonus = set.bonus[`n${n}`];
          return `<div style="font-size:10px;color:#4af;margin-top:4px;">✓ ${n}件: ${bonus}</div>`;
        }).join('');

        const inactive = [2, 4, 6].filter(n => !active.includes(n) && set.bonus[`n${n}`]).map(n => {
          const bonus = set.bonus[`n${n}`];
          return `<div style="font-size:10px;color:#666;margin-top:4px;">○ ${n}件: ${bonus}</div>`;
        }).join('');

        const rarity = window.XianData?.rarities?.find(r => r.id === set.rarity);
        const color = rarity?.color || '#888';

        return `
          <div style="padding:14px;margin:10px 0;border:2px solid ${color};border-radius:8px;background:linear-gradient(135deg,${color}15,${color}05);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <div style="font-size:13px;font-weight:bold;color:#FFD700;">${set.name}</div>
              <div style="font-size:11px;color:#aaa;">${count}/${totalItems}</div>
            </div>
            <div style="font-size:10px;color:#888;margin-bottom:8px;">${set.desc || ''}</div>
            ${activeBonus}${inactive}
            <button class="equip-set-btn" data-set-id="${set.id}" style="width:100%;margin-top:12px;padding:8px;background:linear-gradient(135deg,#d4af37,#b8860b);border:none;border-radius:5px;color:#000;font-weight:bold;font-size:11px;cursor:pointer;box-shadow:0 3px 8px rgba(218,165,32,0.3);">一键穿戴</button>
          </div>
        `;
      }).join('');

      const m = modal(`
        <div style="padding:16px;max-height:70vh;overflow-y:auto;">
          <div style="font-size:16px;font-weight:bold;color:#FFD700;margin-bottom:16px;text-align:center;">⭐ 套装系统</div>
          ${setsHtml}
          <button id="close-sets-btn" style="width:100%;padding:10px;background:rgba(218,165,32,0.2);color:#d4af37;border:1px solid #d4af37;border-radius:6px;cursor:pointer;margin-top:16px;">关闭</button>
        </div>
      `);

      m.el.querySelectorAll('.equip-set-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const setId = btn.dataset.setId;
          equipSet(setId);
          sfx('chime');
          fx.flash('#FFD700');
          toast('套装已穿戴', 'success');
          m.close();
          this.renderWardrobe();
        });
      });

      const closeBtn = m.el.querySelector('#close-sets-btn');
      if (closeBtn) closeBtn.addEventListener('click', () => m.close());
    },

    enter(params) {
      if (!this.el) {
        this.el = h('<section class="screen" id="scr-wardrobe" style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(32,50,60,0.95),rgba(16,30,40,0.98));"></section>');
        document.getElementById('screens').appendChild(this.el);
      }
      setBg(window.XianData?.scenes?.hall || '', true);
      this.currentSlot = null;
      this.currentStyle = '全部';
      this.currentRarity = null;
      this.renderWardrobe();
    },

    leave() {}
  };

  // ============ BAG ============
  X.screens.bag = {
    el: null,
    currentTab: '法宝',

    renderBag() {
      const scr = this.el;
      scr.innerHTML = topBar('🎒 背包');

      const container = h('<div class="bag-container"></div>');
      scr.appendChild(container);

      const tabsRow = h('<div class="bag-tabs"></div>');
      container.appendChild(tabsRow);

      ['法宝', '丹药', '材料'].forEach(t => {
        const btn = h(`<button class="bag-tab ${this.currentTab === t ? 'active' : ''}">${t}</button>`);
        btn.addEventListener('click', () => {
          this.currentTab = t;
          this.renderBag();
        });
        tabsRow.appendChild(btn);
      });

      const content = h('<div class="bag-content"></div>');
      container.appendChild(content);

      if (this.currentTab === '法宝') {
        this.renderArtifacts(content);
      } else if (this.currentTab === '丹药') {
        this.renderPills(content);
      } else if (this.currentTab === '材料') {
        this.renderHerbs(content);
      }
    },

    renderArtifacts(content) {
      const slots = ['sword', 'seal', 'bell'];
      const slotNames = { sword: '剑', seal: '印', bell: '铃' };
      const slotIcons = { sword: '⚔️', seal: '🏮', bell: '🔔' };

      slots.forEach(s => {
        const uid = S.artEquip[s];
        const art = uid ? S.artifacts.find(a => a.uid && a.uid.toString() === uid.toString()) : null;
        const artData = art ? G.artifacts.find(x => x.id === art.id) : null;
        const rarity = artData ? (window.XianData?.rarities || []).find(r => r.id === artData.rarity) : null;
        const color = rarity?.color || '#555';
        const display = art && artData ? `${artData.name} Lv${art.lv}` : '空';

        const slot = h(`
          <div class="bag-art-slot" style="border:2px solid ${color};background:linear-gradient(135deg,${color}20,${color}08);box-shadow:0 3px 10px ${color}30;">
            <div>
              <div style="font-size:13px;color:#FFD700;font-weight:bold;margin-bottom:4px;">${slotIcons[s]} ${slotNames[s]}栏</div>
              <div style="font-size:11px;color:#aaa;">${display}</div>
            </div>
            <div style="font-size:18px;">${art ? '⚙️' : '➕'}</div>
          </div>
        `);

        slot.addEventListener('click', () => {
          const ownedArts = S.artifacts.filter(a => {
            const ad = G.artifacts.find(x => x.id === a.id);
            return ad && ad.slot === s;
          });

          if (ownedArts.length === 0) {
            toast('未拥有此类法宝', 'info');
            return;
          }

          this.showArtifactSelector(s, slotNames[s], ownedArts);
        });

        content.appendChild(slot);
      });

      const ownedArts = S.artifacts || [];
      if (ownedArts.length > 0) {
        const title = h('<div style="font-size:13px;color:#FFD700;font-weight:bold;margin:20px 0 12px 0;text-align:center;">✨ 已拥有法宝</div>');
        content.appendChild(title);

        const grid = h('<div class="bag-art-grid"></div>');
        content.appendChild(grid);

        ownedArts.forEach(art => {
          const artData = G.artifacts.find(x => x.id === art.id);
          if (!artData) return;

          const rarity = (window.XianData?.rarities || []).find(r => r.id === artData.rarity);
          const color = rarity?.color || '#555';
          const equipped = Object.values(S.artEquip).some(u => u && u.toString() === art.uid.toString());

          const item = h(`
            <div class="bag-art-item" style="border:2px solid ${color};background:linear-gradient(135deg,${color}20,${color}08);box-shadow:0 3px 8px ${color}40;">
              <div style="font-size:20px;margin-bottom:6px;">${artData.icon}</div>
              <div style="font-size:11px;color:#FFD700;font-weight:bold;">${artData.name}</div>
              <div style="font-size:10px;color:#888;margin:4px 0;">Lv ${art.lv}</div>
              <div style="font-size:9px;color:#aaa;">⚔️${artData.base.atk} 🛡️${artData.base.def}</div>
              ${equipped ? '<div style="color:#4af;font-size:9px;margin-top:4px;">✓</div>' : ''}
            </div>
          `);

          item.addEventListener('click', () => this.showArtifactDetail(art, artData));
          grid.appendChild(item);
        });
      }
    },

    showArtifactSelector(slot, slotName, ownedArts) {
      const gridHtml = ownedArts.map(a => {
        const artData = G.artifacts.find(x => x.id === a.id);
        const rarity = artData ? (window.XianData?.rarities || []).find(r => r.id === artData.rarity) : null;
        const color = rarity?.color || '#555';
        return `
          <button class="select-art-btn" data-uid="${a.uid}" style="padding:10px;margin:6px;border:2px solid ${color};border-radius:6px;background:linear-gradient(135deg,${color}25,${color}10);color:#FFD700;cursor:pointer;font-size:11px;min-width:90px;">
            ${artData.icon} ${artData.name} Lv${a.lv}
          </button>
        `;
      }).join('');

      const m = modal(`
        <div style="padding:20px;text-align:center;">
          <div style="font-size:14px;font-weight:bold;color:#FFD700;margin-bottom:16px;">${slotName}栏 - 选择法宝</div>
          <div style="display:flex;flex-wrap:wrap;justify-content:center;margin-bottom:16px;">
            ${gridHtml}
          </div>
          <button id="close-selector-btn" style="width:100%;padding:10px;background:rgba(218,165,32,0.2);color:#d4af37;border:1px solid #d4af37;border-radius:6px;cursor:pointer;">关闭</button>
        </div>
      `);

      m.el.querySelectorAll('.select-art-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const uid = parseInt(btn.dataset.uid);
          S.artEquip[slot] = uid;
          save();
          sfx('click');
          toast('法宝已装备', 'success');
          m.close();
          this.renderBag();
        });
      });

      const closeBtn = m.el.querySelector('#close-selector-btn');
      if (closeBtn) closeBtn.addEventListener('click', () => m.close());
    },

    showArtifactDetail(art, artData) {
      const lvMult = 1 + art.lv * 0.05;
      const atk = Math.floor(artData.base.atk * lvMult);
      const def = Math.floor(artData.base.def * lvMult);
      const hp = Math.floor(artData.base.hp * lvMult);
      const cost = 1000 * art.lv;
      const rate = Math.max(30, 100 - art.lv * 10);

      const m = modal(`
        <div style="padding:24px;text-align:center;color:#d4af37;">
          <div style="font-size:28px;margin-bottom:8px;">${artData.icon}</div>
          <div style="font-size:15px;font-weight:bold;color:#FFD700;margin-bottom:8px;">${artData.name}</div>
          <div style="font-size:11px;color:#888;margin-bottom:16px;">稀有度: ${artData.rarity} | 等级: ${art.lv}</div>
          <div style="font-size:12px;margin-bottom:16px;line-height:1.6;">
            <div>⚔️ 攻击: <span style="color:#f44;">${atk}</span></div>
            <div>🛡️ 防御: <span style="color:#4af;">${def}</span></div>
            <div>❤️ 生命: <span style="color:#f84;">${hp}</span></div>
          </div>
          <div style="margin-bottom:16px;padding:12px;background:rgba(0,0,0,0.3);border-radius:6px;">
            <div style="font-size:11px;color:#888;margin-bottom:8px;">升级费用: 💠 ${fmt(cost)}</div>
            <div style="font-size:10px;color:#666;">成功率: ${rate}%</div>
          </div>
          <button id="enhance-art-btn" style="width:100%;padding:12px;background:linear-gradient(135deg,#d4af37,#b8860b);color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;margin-bottom:12px;box-shadow:0 4px 12px rgba(218,165,32,0.4);">✨ 升级</button>
          <button id="close-detail-btn" style="width:100%;padding:10px;background:rgba(218,165,32,0.2);color:#d4af37;border:1px solid #d4af37;border-radius:6px;cursor:pointer;">关闭</button>
        </div>
      `);

      const enhanceBtn = m.el.querySelector('#enhance-art-btn');
      if (enhanceBtn) {
        enhanceBtn.addEventListener('click', () => {
          if (window.XianEconomy.balance('lingshi') < cost) {
            toast('灵石不足', 'warn');
            return;
          }

          const success = Math.random() * 100 < rate;
          window.XianEconomy.spend('lingshi', cost, 'art_enhance');

          if (success) {
            art.lv++;
            toast(`✓ 升级成功！Lv${art.lv}`, 'success');
            sfx('chime');
            fx.burst(window.innerWidth / 2, window.innerHeight / 2, '#FFD700', 16);
          } else {
            toast('升级失败，灵石已消耗', 'warn');
            sfx('fail');
          }

          save();
          refreshBalances();
          m.close();
          this.renderBag();
        });
      }

      const closeBtn = m.el.querySelector('#close-detail-btn');
      if (closeBtn) closeBtn.addEventListener('click', () => m.close());
    },

    renderPills(content) {
      const pills = S.pills || {};
      G.pills.forEach(p => {
        const count = pills[p.id] || 0;
        const item = h(`
          <div class="bag-pill-item">
            <div>
              <div style="font-size:13px;color:#FFD700;font-weight:bold;">${p.icon} ${p.name}</div>
              <div style="font-size:10px;color:#888;margin-top:4px;">${p.desc}</div>
            </div>
            <div style="font-size:14px;color:#4af;font-weight:bold;min-width:50px;text-align:right;">×${count}</div>
          </div>
        `);
        content.appendChild(item);
      });
    },

    renderHerbs(content) {
      const herbs = S.herbs || {};
      G.herbs.forEach(hb => {
        const count = herbs[hb.id] || 0;
        const item = h(`
          <div class="bag-herb-item">
            <div style="font-size:13px;color:#FFD700;font-weight:bold;">${hb.icon} ${hb.name}</div>
            <div style="font-size:14px;color:#4af;font-weight:bold;min-width:50px;text-align:right;">×${count}</div>
          </div>
        `);
        content.appendChild(item);
      });
    },

    enter(params) {
      if (!this.el) {
        this.el = h('<section class="screen" id="scr-bag" style="position:absolute;inset:0;"></section>');
        document.getElementById('screens').appendChild(this.el);
      }
      setBg(window.XianData?.scenes?.hall || '', true);
      this.currentTab = '法宝';
      this.renderBag();
    },

    leave() {}
  };

  // ============ ALCHEMY ============
  X.screens.alchemy = {
    el: null,
    brewing: false,

    renderAlchemy() {
      const scr = this.el;
      scr.innerHTML = topBar('⚗️ 炼丹');

      const container = h('<div class="alch-container"></div>');
      scr.appendChild(container);

      const furnace = h(`
        <div class="alch-furnace">
          <div class="alch-furnace-body">
            <div class="alch-furnace-fire"></div>
            <div class="alch-furnace-lid"></div>
          </div>
        </div>
      `);
      container.appendChild(furnace);

      G.pills.forEach(p => {
        const recipe = p.recipe || {};
        const herbsOwned = S.herbs || {};

        const herbLines = Object.entries(recipe).map(([hid, need]) => {
          const herb = G.herbs.find(h => h.id === hid);
          const own = herbsOwned[hid] || 0;
          const ok = own >= need;
          return `<div style="font-size:10px;color:${ok ? '#4af' : '#f44'};">  ${herb?.icon || '🌿'} ${hid} ×${need} (有${own})</div>`;
        }).join('');

        const canBrew = Object.entries(recipe).every(([hid, need]) => (herbsOwned[hid] || 0) >= need);

        const recipeCard = h(`
          <div class="alch-recipe ${canBrew ? 'can-brew' : ''}" style="opacity:${canBrew ? '1' : '0.65'};">
            <div style="font-size:14px;color:#FFD700;font-weight:bold;margin-bottom:6px;">${p.icon} ${p.name}</div>
            <div style="font-size:11px;color:#aaa;margin-bottom:8px;">${p.desc}</div>
            <div style="font-size:10px;color:#888;margin-bottom:8px;line-height:1.5;">
              ${herbLines}
            </div>
          </div>
        `);

        const brewBtn = h(`<button class="alch-brew-btn" ${canBrew ? '' : 'disabled'}>🔥 炼制</button>`);
        recipeCard.appendChild(brewBtn);

        if (canBrew) {
          brewBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.brewing) return;

            Object.entries(recipe).forEach(([hid, need]) => {
              S.herbs[hid] = (S.herbs[hid] || 0) - need;
            });

            this.brewing = true;
            brewBtn.disabled = true;
            brewBtn.textContent = '炼制中...';
            sfx('click');

            const furnaceBody = scr.querySelector('.alch-furnace-body');
            if (furnaceBody) {
              furnaceBody.style.transform = 'scale(1.15) rotateZ(2deg)';
              setTimeout(() => { furnaceBody.style.transform = ''; }, 400);
            }

            setTimeout(() => {
              const success = Math.random() < 0.85;
              if (success) {
                S.pills[p.id] = (S.pills[p.id] || 0) + 1;
                toast(`✓ ${p.name}炼制成功！`, 'success');
                sfx('chime');
                fx.burst(scr.offsetWidth / 2, 180, '#FFD700', 16);
              } else {
                toast('炼制失败，材料已消耗', 'warn');
                sfx('fail');
                fx.flash('#660000');
              }
              save();
              this.brewing = false;
              this.renderAlchemy();
            }, 2500);
          });
        }

        container.appendChild(recipeCard);
      });
    },

    enter(params) {
      if (!this.el) {
        this.el = h('<section class="screen" id="scr-alchemy" style="position:absolute;inset:0;"></section>');
        document.getElementById('screens').appendChild(this.el);
      }
      setBg(window.XianData?.scenes?.hall || '', true);
      this.brewing = false;
      this.renderAlchemy();
    },

    leave() {
      this.brewing = false;
    }
  };
})();