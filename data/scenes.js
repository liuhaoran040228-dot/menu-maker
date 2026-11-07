/* Owner API gpt-6.1-sol draft, reviewed and corrected during integration. */
(() => {
  'use strict';

  const scenes = {
    'bg-space': { name: '星海回廊', weather: 'star', props: ['prop-crystal', 'prop-arch'] },
    'bg-arena': { name: '月影演武场', weather: 'mote', props: ['prop-lantern', 'prop-rail'] },
    'bg-garden': { name: '春樱庭院', weather: 'petal', props: ['prop-sakura', 'prop-flowers'] },
    'bg-rail': { name: '星轨列车站', weather: 'mote', props: ['prop-rail', 'prop-lantern'] },
    'bg-sakura': { name: '落樱神社', weather: 'petal', props: ['prop-sakura', 'prop-arch'] },
    'bg-neon': { name: '霓虹梦境', weather: 'star', props: ['prop-crystal', 'prop-lantern'] },
    'bg-forest': { name: '雾森秘境', weather: 'mote', props: ['prop-pine', 'prop-flowers'] },
    'bg-undersea': { name: '珊瑚月海', weather: 'bubble', props: ['prop-coral', 'prop-crystal'] },
    'bg-sky': { name: '云端花园', weather: 'mote', props: ['prop-arch', 'prop-flowers'] },
    'bg-snow': { name: '雪灯小镇', weather: 'snow', props: ['prop-pine', 'prop-lantern'] },
    'bg-station': { name: '晨星驿站', weather: 'star', props: ['prop-rail', 'prop-arch'] },
    'bg-moon': { name: '月桂海岸', weather: 'bubble', props: ['prop-coral', 'prop-sakura'] }
  };

  const order=Object.keys(scenes), starts={'space-shooter':'bg-space',snake:'bg-garden',fighter:'bg-arena','monster-loot':'bg-forest','moe-runner':'bg-rail','lili-merge':'bg-sakura','lili-match':'bg-moon','lili-dressup':'bg-sakura',xiuxian:'bg-sky','lili-2048':'bg-neon','lili-fortune':'bg-snow',survivor:'bg-undersea',td:'bg-sky',story:'bg-station'};
  const routes=Object.fromEntries(Object.entries(starts).map(([route,key])=>{const at=order.indexOf(key);return [route,[...order.slice(at),...order.slice(0,at)]]}));
  const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const particleCount = typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches ? 18 : 36;
  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pick = (route, level) => {
    const list = routes[route] || routes.story;
    const n = Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0;
    return list[n % list.length];
  };

  function decorate(ctx, w, h, t, sceneKey) {
    const scene = scenes[sceneKey] || scenes['bg-garden'];
    const time = reducedMotion ? 0 : (Number.isFinite(t) ? t : 0);
    const width = Math.max(1, w);
    const height = Math.max(1, h);
    const props = scene.props;
    const sprite = (key, x, y, sw, sh) => {
      if (window.GameArt && typeof window.GameArt.sprite === 'function') {
        window.GameArt.sprite(ctx, key, x, y, sw, sh);
      }
    };

    ctx.save();
    ctx.globalAlpha = 0.72;
    sprite(props[0], 0, height * 0.58, width * 0.19, height * 0.42);
    sprite(props[1], width * 0.81, height * 0.62, width * 0.19, height * 0.38);
    ctx.globalAlpha = 0.38;
    const drift = Math.sin(time * 0.00022) * width * 0.012;
    sprite(props[1], width * 0.14 + drift, height * 0.7, width * 0.12, height * 0.27);
    sprite(props[0], width * 0.74 - drift, height * 0.72, width * 0.13, height * 0.25);

    if(scene.weather==='bubble'){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.10;ctx.fillStyle='#9aeaff';for(let i=0;i<7;i++){const yy=height*(.6+i*.045);ctx.fillRect(width*.18+Math.sin(time*.001+i)*width*.1,yy,width*(.12+i*.018),1.5)}ctx.restore()}
    if (scene.weather === 'bubble') {
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = '#a9efff';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const x = ((i * 0.217 + time * 0.000025) % 1) * width;
        const y = height * (0.25 + ((i * 0.163 + time * 0.00004) % 0.65));
        ctx.beginPath();
        ctx.arc(x, y, 7 + (i % 3) * 3, 0, TAU);
        ctx.stroke();
      }
    }

    const colors = {
      petal: '#ffd4e2', snow: '#e7f6ff', bubble: '#b7efff', mote: '#fff0bd', star: '#fff5cc'
    };
    ctx.fillStyle = colors[scene.weather] || colors.mote;
    ctx.globalAlpha = 0.48;
    for (let i = 0; i < particleCount; i++) {
      const seed = i * 127.1 + 311.7;
      const x0 = ((seed * 0.61803398875) % 1 + 1) % 1;
      const y0 = ((seed * 0.754877666) % 1 + 1) % 1;
      const speed = 0.000018 + (i % 5) * 0.000006;
      const x = ((x0 + time * speed * (scene.weather === 'snow' ? 0.3 : 1) + 1) % 1) * width;
      const y = ((y0 + time * speed * (scene.weather === 'snow' ? 1 : 0.65) + 1) % 1) * height;
      const size = scene.weather === 'petal' ? 1.5 + (i % 3) * 0.5 : 1 + (i % 2) * 0.7;
      if (scene.weather === 'petal') {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(time * 0.0004 + i);
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 1.8, size, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TAU);
        ctx.fill();
      }
    }

    const edge = Math.min(width, height) * 0.2;
    const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.28, width / 2, height / 2, Math.max(width, height) * 0.72);
    vignette.addColorStop(0, 'rgba(8,14,26,0)');
    vignette.addColorStop(1, 'rgba(8,14,26,0.28)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function bindDOM(field, route, getLevel) {
    if (!field || !field.style || !field.ownerDocument) return () => {};
    const doc = field.ownerDocument;
    const makeUrl = key => new URL('assets/'+key+'.webp',window.GameArt.root).href;
    const layer = doc.createElement('div');
    layer.setAttribute('aria-hidden', 'true');
    Object.assign(layer.style, {
      position: 'absolute', inset: '0', overflow: 'hidden', pointerEvents: 'none',
      zIndex: '0', contain: 'layout paint style',
      backgroundImage: 'url("' + makeUrl(pick(route, 0)) + '")',
      backgroundSize: 'cover', backgroundPosition: 'center'
    });
    const previousPosition = field.style.position;
    if (getComputedStyle(field).position === 'static') field.style.position = 'relative';
    field.insertBefore(layer, field.firstChild);

    const style = doc.createElement('style');
    style.textContent = '@keyframes worldFarDrift{0%,100%{background-position:50% 50%}50%{background-position:52% 49%}}@keyframes worldPropDrift{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-5px,0)}}@keyframes worldMoteRise{0%{transform:translate3d(0,12px,0);opacity:.1}40%{opacity:.65}100%{transform:translate3d(9px,-28px,0);opacity:0}}@media(prefers-reduced-motion:reduce){.world-scene-far,.world-scene-prop,.world-scene-mote{animation:none!important}}';
    (doc.head || field).appendChild(style);
    layer.className = 'world-scene-far';
    if (!reducedMotion) layer.style.animation = 'worldFarDrift 32s ease-in-out infinite';

    const propNodes = [];
    for (let i = 0; i < 2; i++) {
      const img = doc.createElement('img');
      img.alt = '';
      img.draggable = false;
      img.src = makeUrl('prop-sakura');
      img.className = 'world-scene-prop';
      Object.assign(img.style, {
        position: 'absolute', bottom: '0', width: 'min(19vw, 190px)', height: 'auto',
        maxHeight: '44%', objectFit: 'contain', opacity: i ? '.34' : '.68',
        left: i ? 'auto' : '0', right: i ? '0' : 'auto',
        transformOrigin: 'bottom center'
      });
      if (!reducedMotion) img.style.animation = 'worldPropDrift ' + (7 + i * 2) + 's ease-in-out infinite';
      layer.appendChild(img);
      propNodes.push(img);
    }
    for (let i = 0; i < 8; i++) {
      const dot = doc.createElement('i');
      dot.className = 'world-scene-mote';
      Object.assign(dot.style, {
        position: 'absolute', left: (8 + (i * 37) % 84) + '%', top: (46 + (i * 19) % 45) + '%',
        width: (3 + i % 3) + 'px', height: (3 + i % 3) + 'px', borderRadius: '50%',
        background: i % 2 ? '#ffe2ec' : '#e8f7ff', opacity: '.5'
      });
      if (!reducedMotion) dot.style.animation = 'worldMoteRise ' + (5 + i % 4) + 's ' + (i * 0.63) + 's linear infinite';
      layer.appendChild(dot);
    }

    let lastLevel = -1;
    const update = () => {
      if (!field.isConnected) {
        stop();
        return;
      }
      let level = 0;
      try { level = getLevel(); } catch (_) { level = 0; }
      level = Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0;
      if (level === lastLevel) return;
      lastLevel = level;
      const key = pick(route, level);
      layer.style.backgroundImage = 'url("' + makeUrl(key) + '")';
      const props = scenes[key].props;
      propNodes[0].src = makeUrl(props[0]);
      propNodes[1].src = makeUrl(props[1]);
      for(const dot of layer.querySelectorAll('.world-scene-mote')){dot.style.background=scenes[key].weather==='petal'?'#ffd0e3':scenes[key].weather==='snow'?'#eff9ff':'#b8f2ff';dot.style.borderRadius=scenes[key].weather==='petal'?'80% 0 80% 0':'50%';dot.style.animationDirection=scenes[key].weather==='petal'||scenes[key].weather==='snow'?'reverse':'normal'}
    };
    let timer = setInterval(update, 500);
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      if (layer.parentNode) layer.parentNode.removeChild(layer);
      if (style.parentNode) style.parentNode.removeChild(style);
      if (field.style.position === 'relative' && previousPosition !== 'relative') field.style.position = previousPosition;
    };
    update();
    return stop;
  }

  window.WorldScenes = Object.freeze({ scenes, pick, decorate, bindDOM });
})();