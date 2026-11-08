window.TwinSprites = (() => {
  const atlases = {};
  const images = {};

  async function preload(base = 'art/') {
    const types = ['ice', 'fire'];
    const promises = types.map(async type => {
      const imgSrc = `${base}${type}-atlas.webp`;
      const jsonSrc = `${base}${type}-atlas.json`;
      
      try {
        const [jsonRes, img] = await Promise.all([
          fetch(jsonSrc).then(r => {
            if (!r.ok) throw new Error(`Failed to load ${jsonSrc}`);
            return r.json();
          }),
          new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error(`Failed to load ${imgSrc}`));
            image.src = imgSrc;
          })
        ]);
        
        atlases[type] = jsonRes;
        images[type] = img;
      } catch (err) {
        console.warn(`TwinSprites preload error: ${err.message}`);
        throw err;
      }
    });
    
    await Promise.all(promises);
  }

  function draw(ctx, actor, now, opts = {}) {
    const type = actor.type || 'ice';
    const atlas = atlases[type];
    const img = images[type];
    
    if (!atlas || !img) return false;
    
    const { cellW, cellH, cols, animations } = atlas;
    const onGround = actor.onGround;
    const vx = actor.vx || 0;
    const vy = actor.vy || 0;
    
    let animName;
    if (opts.victory) {
      animName = 'victory';
    } else if (actor.hurtUntil > now) {
      animName = 'hurt';
    } else if (!onGround) {
      animName = vy < 0 ? 'jump' : 'fall';
    } else if (Math.abs(vx) > 10) {
      animName = 'run';
    } else {
      animName = 'idle';
    }
    
    const frames = animations[animName] || animations.idle;
    const fps = animName === 'run' ? 10 : 3;
    const frameIndex = Math.floor((now / 1000) * fps) % frames.length;
    const cellIndex = frames[frameIndex];
    
    const srcX = (cellIndex % cols) * cellW;
    const srcY = Math.floor(cellIndex / cols) * cellH;
    
    const drawHeight = opts.height || 112;
    const drawWidth = drawHeight * cellW / cellH;
    const centerX = actor.x + actor.w / 2;
    const baseline = actor.y + actor.h;
    const drawX = centerX - drawWidth / 2;
    const drawY = baseline - drawHeight * ((atlas.baseline || cellH) / cellH);
    
    ctx.save();
    
    if (opts.royal) {
      ctx.shadowColor = 'gold';
      ctx.shadowBlur = 5;
    }
    
    if (actor.facing === -1) {
      ctx.translate(centerX, 0);
      ctx.scale(-1, 1);
      ctx.translate(-centerX, 0);
    }
    
    ctx.drawImage(img, srcX, srcY, cellW, cellH, drawX, drawY, drawWidth, drawHeight);
    
    ctx.restore();
    return true;
  }

  function info() {
    const result = {};
    for (const type in atlases) {
      const atlas = atlases[type];
      const frameCount = Object.values(atlas.animations).reduce((sum, arr) => sum + arr.length, 0);
      result[type] = {
        cellW: atlas.cellW,
        cellH: atlas.cellH,
        animations: Object.keys(atlas.animations).length,
        totalFrames: frameCount
      };
    }
    return result;
  }

  return { preload, draw, info };
})();