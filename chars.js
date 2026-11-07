window.Chars=(()=>{const cast=StarData.characters,imgs=new Map();
function key(id,outfit=0){if(id==='lan')return outfit?'whale-cast':'whale-idle';return id+'-chibi'}
function image(id='lan',skin=0,head=false,outfit=0){return GameArt.image(key(id,outfit))}
function render(id='lan',skin=0,head=false,outfit=0){const c=cast.find(c=>c.id===id)||cast[0];return '<img class="raster-mascot '+(head?'raster-head':'')+' skin-'+skin+'" src="'+new URL('assets/'+key(c.id,outfit)+'.webp',GameArt.root).href+'" alt="'+c.name+'" draggable="false">'}
function draw(ctx,id,x,y,w=80,skin=0,head=false,outfit=0){const im=image(id,skin,head,outfit);if(!im.complete||!im.naturalWidth)return;ctx.save();if(skin){ctx.shadowColor=skin===1?'#ff9fdb':'#9ff3ff';ctx.shadowBlur=GameArt.reduced?0:14}if(head){const sh=im.naturalHeight*.46,sw=Math.min(im.naturalWidth,sh);ctx.drawImage(im,(im.naturalWidth-sw)/2,0,sw,sh,x,y,w,w*100/120)}else GameArt.sprite(ctx,key(id,outfit),x,y,w,w*150/120);ctx.restore()}
cast.forEach(c=>image(c.id));const ready=Promise.all(cast.map(c=>image(c.id).decode().catch(()=>{})));return {cast,render,draw,image,ready,outfits:StarData.outfits};})();
