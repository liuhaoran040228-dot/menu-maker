/* Shared rendering + persistence utilities. No networking or account backend. */
window.A2=window.A2||{};
A2.util=(()=>{
 const memory={},root=new URL('./',document.currentScript.src),images={};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function load(key,def){try{return JSON.parse(localStorage.getItem('a2-'+key))??def}catch{return memory[key]??def}}
 function save(key,value){memory[key]=value;try{localStorage.setItem('a2-'+key,JSON.stringify(value))}catch{}}
 function img(id,kind='chibi'){const key=id+'-'+kind;if(!images[key]){images[key]=new Image();images[key].src=new URL('assets/'+key+'.webp',root).href}return images[key]}
 A2.characters.forEach(c=>{img(c.id);img(c.id,'portrait')});
 function sprite(ctx,id,x,y,w=45,h=w){const im=img(id);if(im.complete&&im.naturalWidth){const k=Math.min(w/im.naturalWidth,h/im.naturalHeight);ctx.drawImage(im,x-im.naturalWidth*k/2,y-im.naturalHeight*k/2,im.naturalWidth*k,im.naturalHeight*k)}else{ctx.fillStyle='#d5bbff';ctx.beginPath();ctx.arc(x,y,w*.35,0,Math.PI*2);ctx.fill()}}
 const projections=new WeakMap();
 function setup(canvas,w,h){const ctx=canvas.getContext('2d');function resize(){const dpr=Math.min(devicePixelRatio||1,2),realH=w*innerHeight/Math.min(innerWidth,620),offset=(realH-h)/2;canvas.width=w*dpr;canvas.height=realH*dpr;canvas.style.aspectRatio=w+'/'+realH;ctx.setTransform(dpr,0,0,dpr,0,offset*dpr);projections.set(canvas,{w,realH,offset})}resize();return{ctx,w,h}}
 function point(canvas,e,w,h){const r=canvas.getBoundingClientRect(),p=projections.get(canvas);return{x:(e.clientX-r.left)*w/r.width,y:p?(e.clientY-r.top)*p.realH/r.height-p.offset:(e.clientY-r.top)*h/r.height}}
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const rand=(a,b)=>a+Math.random()*(b-a);const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function pill(ctx,text,x,y,color='#e3caff',size=16){ctx.save();ctx.textAlign='center';ctx.font=`800 ${size}px system-ui`;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=reduced?0:12;ctx.fillText(text,x,y);ctx.restore()}
 class FX{
  constructor(){this.particles=[];this.texts=[];this.rings=[];this.shake=0;this.enabled=!reduced}
  burst(x,y,color,n=14){if(!this.enabled)n=3;for(let i=0;i<n&&this.particles.length<240;i++){const a=rand(0,Math.PI*2),v=rand(40,180);this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:rand(.25,.7),max:.7,r:rand(1.5,4),color})}if(this.enabled)this.shake=Math.max(this.shake,4)}
  text(text,x,y,color='#fff',size=18){if(this.texts.length>20)this.texts.shift();this.texts.push({text,x,y,l:1.1,color,size})}
  ring(x,y,r,color){this.rings.push({x,y,r,l:.5,color});if(this.rings.length>12)this.rings.shift()}
  update(dt){for(const p of this.particles){p.l-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97}this.particles=this.particles.filter(p=>p.l>0);for(const t of this.texts){t.l-=dt;t.y-=24*dt}this.texts=this.texts.filter(p=>p.l>0);for(const r of this.rings)r.l-=dt;this.rings=this.rings.filter(r=>r.l>0);this.shake*=.86}
  draw(ctx){ctx.save();ctx.globalCompositeOperation='lighter';for(const p of this.particles){ctx.globalAlpha=clamp(p.l/.5,0,1);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=this.enabled?8:0;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()}for(const r of this.rings){ctx.globalAlpha=r.l*1.5;ctx.strokeStyle=r.color;ctx.lineWidth=3;ctx.shadowBlur=this.enabled?18:0;ctx.shadowColor=r.color;ctx.beginPath();ctx.arc(r.x,r.y,r.r*(1-r.l)+15,0,Math.PI*2);ctx.stroke()}ctx.restore();for(const t of this.texts){ctx.save();ctx.globalAlpha=clamp(t.l*2,0,1);pill(ctx,t.text,t.x,t.y,t.color,t.size);ctx.restore()}}
 }
 function puff(ctx,e,time){ctx.save();ctx.shadowColor=e.color;ctx.shadowBlur=reduced?0:12;GameArt.sprite(ctx,e.boss?'enemy-boss':e.r>20?'enemy-slime':'enemy-bat',e.x-e.r*1.35,e.y-e.r*1.35,e.r*2.7,e.r*2.7);ctx.restore()}
 function skins(container,onChange){let selected=load('skin','base');if(!A2.skins.some(s=>s.id===selected)||A2.skins.find(s=>s.id===selected)?.vip&&!window.VIP?.active())selected='base';
  function render(){container.replaceChildren();A2.skins.forEach(s=>{const b=document.createElement('button');b.textContent=s.name+(s.vip?' ♛':'');b.title=s.desc;b.classList.toggle('active',s.id===selected);b.onclick=()=>{if(s.vip&&!window.VIP?.active()){VIP.open();return}selected=s.id;save('skin',selected);render();onChange(s)};container.append(b)})}
  render();onChange(A2.skins.find(s=>s.id===selected));window.addEventListener('vipchange',()=>{const s=A2.skins.find(s=>s.id===selected);if(s?.vip&&!VIP.active()){selected='base';render();onChange(A2.skins[0])}})
 }
 function bindFX(button,fx){button.textContent=fx.enabled?'特效：华丽':'特效：柔和';button.onclick=()=>{fx.enabled=!fx.enabled;button.textContent=fx.enabled?'特效：华丽':'特效：柔和'}}
 return{root,load,save,img,sprite,setup,point,clamp,rand,dist,pill,FX,puff,skins,bindFX,reduced};
})();
