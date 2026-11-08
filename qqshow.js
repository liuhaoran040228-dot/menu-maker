/* StarShow：星糖萌宠账号形象组件，接口见 QQSHOW_API.md */
window.StarShowLines=window.StarShowLines||{"wave": ["早上好呀，新的一天开始了", "嗨，好久不见呢", "挥挥手，我们来加油吧", "朋友们好，很高兴见到你", "温柔地向你打个招呼", "今天天气真不错呢", "来吧，让我们一起出发", "谢谢你的到来，真开心"], "spin": ["转一圈，心情变得更好了", "旋转起来，感受生活的美好", "哈哈，转圈圈真舒服呀", "在阳光下轻快地转圈", "一起转圈跳舞吧，很有趣", "转啊转，世界都在闪闪发光", "优雅地转身，展现最好的自己", "转圈的时候最能感受快乐"], "heart": ["把爱心献给你，永远支持", "心里装满对你的感谢", "爱你呢，我的朋友们", "用心对待每一个人", "比心给所有善良的灵魂", "真心实意地与你同行", "心与心相连的美好瞬间", "感谢有你，心满意足"], "jump": ["开心到不能自己，一起跳起来", "哈哈，跳跃着迎接美好时光", "蹦蹦跳跳，充满了朝气活力", "跳起来庆祝这个特别的时刻", "欢呼雀跃，生活真是太美好", "跳跃吧，让快乐传播开去", "一起跳舞，感受生命的节奏", "跳起来，拥抱每一份惊喜"], "idle": ["静静地享受这份安宁的时刻", "呢喃细语，诉说心中的秘密", "轻声说着悄悄话呢", "温柔地陪伴在你身旁", "思考着生活中的美好事物", "柔和的光芒照亮心间", "轻轻地低语着期许和梦想", "用温暖的心等待你的回应"]};
/**
 * StarShow - 原创星糖萌宠装扮渲染器
 * 用于动漫站点的角色装扮展示
 */

(function() {
  'use strict';

  const VERSION = '1.0';
  const STORAGE_OUTFIT_KEY = 'starshow-outfit-v1';
  const STORAGE_MOTION_KEY = 'starshow-reduce-motion';
  
  // 数据文件的基础URL（在脚本加载时捕获）
  const scriptUrl = document.currentScript?.src || location.href;
  const defaultDataUrl = new URL('lili-dressup/dressup-data.js', scriptUrl);
  
  let dataPromise = null;
  let dressData = null;
  let provider = null;
  let localUserId = null;
  let reducedMotion = localStorage.getItem(STORAGE_MOTION_KEY) === 'true';
  
  // 默认台词
  let lines = {
    wave: ['嗨~', '你好呀！', '见到你真高兴~'],
    spin: ['看我转圈圈~', '怎么样？', '好看吗？'],
    heart: ['喜欢你哦~', '❤', '么么哒~'],
    jump: ['跳！', '耶！', '开心~']
  };
  
  // 监听系统偏好设置
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const updateMotionPreference = () => {
    reducedMotion = localStorage.getItem(STORAGE_MOTION_KEY) === 'true' || motionQuery.matches;
  };
  motionQuery.addEventListener('change', updateMotionPreference);
  updateMotionPreference();
  
  /**
   * 加载装扮数据
   */
  async function loadData(dataUrl) {
    if (window.DressData) {
      dressData = window.DressData;
      return dressData;
    }
    
    if (!dataPromise) {
      dataPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = dataUrl.toString();
        script.onload = () => {
          dressData = window.DressData;
          resolve(dressData);
        };
        script.onerror = () => reject(new Error('Failed to load DressData'));
        document.head.appendChild(script);
      });
    }
    
    return dataPromise;
  }
  
  /**
   * 解析装备配置
   */
  function parseOutfit(outfitOrIds, data) {
    if (Array.isArray(outfitOrIds)) {
      // 数组形式：按槽位映射
      const items = {};
      outfitOrIds.forEach(id => {
        const item = data.items.find(i => i.id === id);
        if (item) items[item.slot] = id;
      });
      return { v: 1, items };
    }
    return outfitOrIds;
  }
  
  /**
   * 获取装备的所有图层
   */
  function getItemLayers(itemId, data, dataBase) {
    const item = data.items.find(i => i.id === itemId);
    if (!item) return [];
    
    return item.layers.map(layer => ({
      ...layer,
      src: new URL(layer.src, dataBase).toString(),
      z: layer.z || 50
    }));
  }
  
  /**
   * 检查是否应该渲染套装插画
   */
  function checkSetIllustration(outfit, data, dataBase) {
    if (!outfit.set) return null;
    
    const set = data.sets?.find(s => s.id === outfit.set);
    if (!set || !set.illus) return null;
    
    // 检查是否所有套装物品都已装备
    const allEquipped = set.items.every(itemId => {
      const item = data.items.find(i => i.id === itemId);
      return item && outfit.items[item.slot] === itemId;
    });
    
    if (allEquipped) {
      return {
        ...set.illus,
        src: new URL(set.illus.src, dataBase).toString()
      };
    }
    
    return null;
  }
  
  /**
   * 绘制基础身体到canvas
   */
  function drawBase(canvas, data, dataBase, outfit) {
    const ctx = canvas.getContext('2d');
    canvas.width = data.W;
    canvas.height = data.H;
    ctx.clearRect(0, 0, data.W, data.H);
    
    const base = data.base;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, base.x || 0, base.y || 0, base.w, base.h);
        
        // 应用遮罩（destination-out模式擦除被衣物覆盖的身体部分）
        const erasePromises = [];
        Object.values(outfit.items || {}).forEach(itemId => {
          const item = data.items.find(i => i.id === itemId);
          if (item?.erase) {
            const eraseImg = new Image();
            eraseImg.crossOrigin = 'anonymous';
            const p = new Promise(res => {
              eraseImg.onload = () => {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.drawImage(eraseImg, item.erase.x, item.erase.y, item.erase.w, item.erase.h);
                ctx.globalCompositeOperation = 'source-over';
                res();
              };
              eraseImg.onerror = res;
            });
            eraseImg.src = new URL(item.erase.src, dataBase).toString();
            erasePromises.push(p);
          }
        });
        
        Promise.all(erasePromises).then(resolve);
      };
      img.onerror = resolve;
      img.src = new URL(base.src, dataBase).toString();
    });
  }
  
  /**
   * 创建图层元素
   */
  function createLayer(layer, index) {
    const div = document.createElement('div');
    div.className = 'ss-layer';
    div.style.cssText = `
      position: absolute;
      left: ${(layer.x / dressData.W * 100)}%;
      top: ${(layer.y / dressData.H * 100)}%;
      width: ${(layer.w / dressData.W * 100)}%;
      height: ${(layer.h / dressData.H * 100)}%;
      z-index: ${layer.z};
      pointer-events: none;
    `;
    
    if (layer.role) {
      div.dataset.role = layer.role;
    }
    
    const img = document.createElement('img');
    img.style.cssText = 'width: 100%; height: 100%; display: block;';
    img.src = layer.src;
    img.onerror = () => div.style.display = 'none';
    
    div.appendChild(img);
    return div;
  }
  
  /**
   * 渲染纸娃娃
   */
  async function render(el, outfitOrUserId, opts = {}) {
    const {
      size = 'full',
      idle = true,
      interactive = true,
      lazy = true,
      bubbles = true,
      scene = false,
      dataUrl = defaultDataUrl
    } = opts;
    
    // 加载数据
    const data = await loadData(dataUrl);
    const dataBase = new URL('./', dataUrl);
    
    // 获取装备配置
    let outfit;
    if (typeof outfitOrUserId === 'string') {
      // UUID：从数据库或本地获取
      try {
        if (provider && typeof provider.getOutfit === 'function') {
          const o = await provider.getOutfit(outfitOrUserId);
          if (o && typeof o === 'object') outfit = o;
        }
      } catch (e) { /* provider 失败回落本地 */ }
      
      if (!outfit) {
        if (outfitOrUserId === localUserId) {
          outfit = getLocal();
        } else if (data.defaultOutfit) {
          outfit = parseOutfit(data.defaultOutfit, data);
        }
      }
    } else {
      outfit = outfitOrUserId;
    }
    // 空槽自动穿基础款（不露打底衣）
    if (outfit && outfit.items && data.defaults) {
      const its = { ...outfit.items }, df = data.defaults;
      if (!its.top && df.top) its.top = df.top;
      const t = (data.items || []).find(x => x.id === its.top);
      if (!its.bottom && df.bottom && !(t && t.full)) its.bottom = df.bottom;
      outfit = { ...outfit, items: its };
    }
    
    if (!outfit) {
      outfit = { v: 1, items: {} };
    }
    
    // 创建根容器
    el.innerHTML = '';
    el.className = 'starshow';
    el.dataset.size = size;
    if (data.chibi && size !== 'head') el.style.aspectRatio = `${data.W} / ${data.H}`;
    
    // 创建舞台
    const stage = document.createElement('div');
    stage.className = 'ss-stage';
    
    // 检查套装插画
    const faceOn = !!(window.StarFace && outfit.face && !window.StarFace.isDefault(outfit.face));
    const illus = faceOn ? null : checkSetIllustration(outfit, data, dataBase);
    
    if (illus) {
      // 渲染完整插画
      const img = document.createElement('img');
      img.className = 'ss-illus';
      img.style.cssText = `
        position: absolute;
        left: ${(illus.x / data.W * 100)}%;
        top: ${(illus.y / data.H * 100)}%;
        width: ${(illus.w / data.W * 100)}%;
        height: ${(illus.h / data.H * 100)}%;
      `;
      img.src = illus.src;
      img.onerror = () => img.style.display = 'none';
      stage.appendChild(img);
    } else {
      // 分层渲染
      const body = document.createElement('div');
      body.className = 'ss-body';
      
      // 基础身体canvas
      const canvas = document.createElement('canvas');
      canvas.className = 'ss-base';
      canvas.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        z-index: 20;
      `;
      body.appendChild(canvas);
      
      await drawBase(canvas, data, dataBase, outfit);
      if (faceOn && window.StarFace.recolorBase) { data._base = dataBase; await window.StarFace.recolorBase(canvas, data, outfit.face); }
      
      // 收集所有图层
      const allLayers = [];
      const slots = Object.keys(outfit.items || {});
      
      // 检查full遮挡
      const hasFullTop = slots.some(slot => {
        const itemId = outfit.items[slot];
        const item = data.items.find(i => i.id === itemId);
        return item?.full && slot.includes('top');
      });
      
      slots.forEach(slot => {
        // 跳过被遮挡的bottom
        if (hasFullTop && slot.includes('bottom')) return;
        
        const itemId = outfit.items[slot];
        const layers = getItemLayers(itemId, data, dataBase);
        allLayers.push(...layers);
      });
      
      // 按z-index排序
      allLayers.sort((a, b) => a.z - b.z);
      
      // 创建图层元素
      const hairF = faceOn ? window.StarFace.hairFilter(data, outfit.face) : 'none';
      allLayers.forEach((layer, i) => {
        const el = createLayer(layer, i);
        if (faceOn && (layer.role === 'hairBack' || layer.role === 'hairFront')) { const im = el.tagName === 'IMG' ? el : el.querySelector('img'); if (im) window.StarFace.applyHair(im, data, outfit.face); else if (hairF !== 'none') el.style.filter = hairF; }
        body.appendChild(el);
      });
      // 捏脸图层（StarFace）
      if (faceOn) {
        try {
          const specs = await window.StarFace.build(data, outfit.face, { resolve: s => new URL(s, dataBase).toString(), coverLayers: allLayers });
          window.StarFace.mount(body, specs, data.W, data.H);
        } catch (e) { /* 捏脸失败不影响主体 */ }
      }
      
      // 眨眼图层
      if (data.blink) {
        const blinkDiv = document.createElement('div');
        blinkDiv.className = 'ss-blink';
        blinkDiv.style.cssText = `
          position: absolute;
          left: ${(data.blink.x / data.W * 100)}%;
          top: ${(data.blink.y / data.H * 100)}%;
          width: ${(data.blink.w / data.W * 100)}%;
          height: ${(data.blink.h / data.H * 100)}%;
          z-index: 67;
          opacity: 0;
          pointer-events: none;
        `;
        
        const blinkImg = document.createElement('img');
        blinkImg.style.cssText = 'width: 100%; height: 100%;';
        blinkImg.src = new URL(data.blink.src, dataBase).toString();
        blinkImg.onerror = () => blinkDiv.style.display = 'none';
        
        blinkDiv.appendChild(blinkImg);
        body.appendChild(blinkDiv);
      }
      
      stage.appendChild(body);
    }
    
    el.appendChild(stage);
    
    // 语音气泡容器
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'ss-bubble';
    el.appendChild(bubbleDiv);
    
    // 创建handle
    const handle = {
      el,
      stage,
      body: stage.querySelector('.ss-body'),
      blink: stage.querySelector('.ss-blink'),
      bubble: bubbleDiv,
      idle: idle && !reducedMotion,
      interactive,
      blinkTimer: null,
      actionRunning: false,
      observer: null,
      visible: true
    };
    
    // 启动idle动画
    if (handle.idle && handle.body) {
      startIdleAnimation(handle);
    }
    
    // 交互
    if (interactive) {
      let actionIndex = 0;
      const actions = ['wave', 'spin', 'heart', 'jump'];
      
      el.addEventListener('click', () => {
        if (handle.actionRunning) return;
        play(handle, actions[actionIndex]);
        actionIndex = (actionIndex + 1) % actions.length;
      });
    }
    
    // 懒加载
    if (lazy && 'IntersectionObserver' in window) {
      handle.observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          handle.visible = entry.isIntersecting;
          updateAnimationState(handle);
        });
      });
      handle.observer.observe(el);
    }
    
    // 监听页面可见性
    const visibilityHandler = () => {
      handle.visible = !document.hidden;
      updateAnimationState(handle);
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    handle.visibilityHandler = visibilityHandler;
    
    return handle;
  }
  
  /**
   * 启动idle动画
   */
  function startIdleAnimation(handle) {
    if (reducedMotion || !handle.body) return;
    
    // 呼吸动画
    handle.body.style.animation = 'ss-breathe 3.6s ease-in-out infinite';
    
    // 头发和裙子摇曳
    const hairLayers = handle.body.querySelectorAll('[data-role="hairBack"], [data-role="hairFront"]');
    hairLayers.forEach(layer => {
      layer.style.animation = 'ss-sway 4.2s ease-in-out infinite alternate';
      layer.style.transformOrigin = '50% 0%';
    });
    
    const skirtLayers = handle.body.querySelectorAll('[data-role="skirt"]');
    skirtLayers.forEach(layer => {
      layer.style.animation = 'ss-sway 4.2s ease-in-out infinite alternate';
      layer.style.transformOrigin = '50% 0%';
    });
    
    // 眨眼
    if (handle.blink) {
      scheduleBlink(handle);
    }
  }
  
  /**
   * 计划下一次眨眼
   */
  function scheduleBlink(handle) {
    if (!handle.blink || reducedMotion) return;
    
    const delay = 2800 + Math.random() * 3200;
    handle.blinkTimer = setTimeout(() => {
      if (!handle.visible) {
        scheduleBlink(handle);
        return;
      }
      
      handle.blink.style.transition = 'opacity 60ms';
      handle.blink.style.opacity = '1';
      
      setTimeout(() => {
        handle.blink.style.opacity = '0';
        scheduleBlink(handle);
      }, 120);
    }, delay);
  }
  
  /**
   * 更新动画状态
   */
  function updateAnimationState(handle) {
    if (!handle.body) return;
    
    if (handle.visible && handle.idle && !reducedMotion) {
      handle.body.style.animationPlayState = 'running';
      handle.body.querySelectorAll('[data-role]').forEach(layer => {
        layer.style.animationPlayState = 'running';
      });
    } else {
      handle.body.style.animationPlayState = 'paused';
      handle.body.querySelectorAll('[data-role]').forEach(layer => {
        layer.style.animationPlayState = 'paused';
      });
    }
  }
  
  /**
   * 播放动作
   */
  async function play(elOrHandle, action) {
    const handle = elOrHandle.el ? elOrHandle : { el: elOrHandle, body: elOrHandle.querySelector('.ss-body'), bubble: elOrHandle.querySelector('.ss-bubble') };
    
    if (handle.actionRunning) return;
    handle.actionRunning = true;
    
    try {
      if (reducedMotion) {
        // 简化动作：闪烁 + 气泡
        if (handle.body) {
          handle.body.animate([
            { opacity: 1 },
            { opacity: 0.6 },
            { opacity: 1 }
          ], { duration: 300, easing: 'ease-in-out' });
        }
        
        showBubble(handle, action);
        await new Promise(resolve => setTimeout(resolve, 2200));
      } else {
        await performAction(handle, action);
      }
    } finally {
      handle.actionRunning = false;
    }
  }
  
  /**
   * 执行具体动作
   */
  async function performAction(handle, action) {
    if (!handle.body) return;
    
    const actionMap = {
      wave: () => performWave(handle),
      spin: () => performSpin(handle),
      heart: () => performHeart(handle),
      jump: () => performJump(handle)
    };
    
    const actionFn = actionMap[action];
    if (actionFn) {
      await actionFn();
    }
  }
  
  async function performWave(handle) {
    showBubble(handle, 'wave');
    
    await handle.body.animate([
      { transform: 'rotate(-3deg)' },
      { transform: 'rotate(3deg)' },
      { transform: 'rotate(-3deg)' },
      { transform: 'rotate(3deg)' },
      { transform: 'rotate(-3deg)' },
      { transform: 'rotate(3deg)' },
      { transform: 'rotate(0deg)' }
    ], {
      duration: 1200,
      easing: 'ease-in-out'
    }).finished;
    
    createParticles(handle, 'wave', { x: 70, y: 52 });
  }
  
  async function performSpin(handle) {
    showBubble(handle, 'spin');
    
    const supports3D = CSS.supports('transform', 'rotateY(0deg)');
    
    if (supports3D) {
      handle.stage.style.perspective = '1000px';
      await handle.body.animate([
        { transform: 'rotateY(0deg)' },
        { transform: 'rotateY(360deg)' }
      ], {
        duration: 900,
        easing: 'ease-in-out'
      }).finished;
      handle.stage.style.perspective = '';
    } else {
      await handle.body.animate([
        { transform: 'scaleX(1)' },
        { transform: 'scaleX(-1)' },
        { transform: 'scaleX(1)' }
      ], {
        duration: 900,
        easing: 'ease-in-out'
      }).finished;
    }
  }
  
  async function performHeart(handle) {
    showBubble(handle, 'heart');
    
    await handle.body.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.04)' },
      { transform: 'scale(1)' }
    ], {
      duration: 600,
      easing: 'ease-in-out'
    }).finished;
    
    createParticles(handle, 'heart', { x: 50, y: 35 });
  }
  
  async function performJump(handle) {
    showBubble(handle, 'jump');
    
    await handle.body.animate([
      { transform: 'translateY(0) scaleY(1)' },
      { transform: 'translateY(0) scaleY(0.94)', offset: 0.1 },
      { transform: 'translateY(-9%) scaleY(1.02)', offset: 0.4 },
      { transform: 'translateY(-9%) scaleY(1)', offset: 0.6 },
      { transform: 'translateY(0) scaleY(0.94)', offset: 0.9 },
      { transform: 'translateY(0) scaleY(1)' }
    ], {
      duration: 700,
      easing: 'ease-in-out'
    }).finished;
    
    createParticles(handle, 'jump', { x: 50, y: 100 });
  }
  
  /**
   * 显示语音气泡
   */
  function showBubble(handle, action) {
    if (!handle.bubble) return;
    
    const texts = lines[action] || ['...'];
    const text = texts[Math.floor(Math.random() * texts.length)];
    
    handle.bubble.textContent = text;
    handle.bubble.style.display = 'block';
    handle.bubble.style.animation = 'ss-bubble-pop 0.2s ease-out';
    
    setTimeout(() => {
      handle.bubble.style.display = 'none';
    }, 2200);
  }
  
  /**
   * 创建粒子效果
   */
  function createParticles(handle, type, pos) {
    const particles = {
      wave: ['👋'],
      heart: ['❤', '💕', '💖'],
      jump: ['⭐', '✨', '💫']
    };
    
    const symbols = particles[type] || [];
    const count = Math.min(6, symbols.length * 2);
    
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('span');
      particle.className = 'ss-particle';
      particle.textContent = symbols[i % symbols.length];
      particle.style.cssText = `
        position: absolute;
        left: ${pos.x}%;
        top: ${pos.y}%;
        font-size: 20px;
        pointer-events: none;
        z-index: 100;
      `;
      
      handle.el.appendChild(particle);
      
      const angle = (Math.random() - 0.5) * 120;
      const distance = 30 + Math.random() * 40;
      const duration = 800 + Math.random() * 400;
      
      particle.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${Math.sin(angle * Math.PI / 180) * distance}px, ${-Math.cos(angle * Math.PI / 180) * distance}px) scale(0.5)`, opacity: 0 }
      ], {
        duration,
        easing: 'ease-out'
      }).finished.then(() => particle.remove());
    }
    
    // 限制粒子数量
    const allParticles = handle.el.querySelectorAll('.ss-particle');
    if (allParticles.length > 24) {
      for (let i = 0; i < allParticles.length - 24; i++) {
        allParticles[i].remove();
      }
    }
  }
  
  /**
   * 销毁实例
   */
  function destroy(el) {
    const handle = el.__starshow_handle__;
    if (!handle) return;
    
    if (handle.blinkTimer) {
      clearTimeout(handle.blinkTimer);
    }
    
    if (handle.observer) {
      handle.observer.disconnect();
    }
    
    if (handle.visibilityHandler) {
      document.removeEventListener('visibilitychange', handle.visibilityHandler);
    }
    
    el.innerHTML = '';
    delete el.__starshow_handle__;
  }
  
  /**
   * 获取本地装备
   */
  function getLocal() {
    try {
      const json = localStorage.getItem(STORAGE_OUTFIT_KEY);
      return json ? JSON.parse(json) : null;
    } catch (e) {
      return null;
    }
  }
  
  /**
   * 保存装备
   */
  async function save(outfit) {
    // 验证
    if (!outfit || typeof outfit !== 'object') {
      return { local: false, synced: false, error: 'Invalid outfit' };
    }
    
    const json = JSON.stringify(outfit);
    if (json.length > 4096) {
      return { local: false, synced: false, error: 'Outfit too large' };
    }
    
    // 本地保存
    try {
      localStorage.setItem(STORAGE_OUTFIT_KEY, json);
    } catch (e) {
      return { local: false, synced: false, error: e.message };
    }
    
    // 云端同步
    let synced = false;
    let error = null;
    
    if (provider && typeof provider.saveOutfit === 'function') {
      try {
        const r = await provider.saveOutfit(outfit);
        synced = r !== false;
      } catch (e) {
        error = e && e.message || String(e);
      }
    }
    
    // 触发事件
    window.dispatchEvent(new CustomEvent('starshow:change', { detail: outfit }));
    
    return { local: true, synced, error };
  }
  
  /**
   * 设置客户端
   */
  // 可插拔数据源（由商城适配器接入）：{getOwned(), getOutfit(userId), saveOutfit(outfit)}，均可返回 Promise
  function setProvider(p, userId) {
    provider = p || null;
    if (userId !== undefined) localUserId = userId;
  }
  async function getOwned() {
    try { return provider && provider.getOwned ? await provider.getOwned() : null; } catch (e) { return null; }
  }
  
  /**
   * 设置减弱动画
   */
  function setReducedMotion(enabled) {
    reducedMotion = enabled;
    localStorage.setItem(STORAGE_MOTION_KEY, enabled.toString());
    updateMotionPreference();
  }
  
  // 覆盖台词
  if (window.StarShowLines) {
    lines = { ...lines, ...window.StarShowLines };
  }
  
  // 导出API
  window.StarShow = {
    version: VERSION,
    render,
    play,
    destroy,
    getLocal,
    save,
    setProvider, getOwned,
    setReducedMotion,
    lines,
    get localUserId() { return localUserId; }
  };
  
})();
