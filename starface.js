/* StarFace：捏脸合成模块（栗栗换装 / StarShow / 修仙共用）。数据见 DressData.face，格式见 QQSHOW_API.md。
   face = {shape,eyes,brows,mouth: 部件id|null, iris,skin,hair: 色板id, blush:0..1, mark:'none'|'eye'|'lip'|'cheek'}  */
(function(){
'use strict';
const cache={};
function load(src){if(!cache[src]){cache[src]=new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src;});}return cache[src];}
function hex2hsl(h){h=h.replace('#','');const r=parseInt(h.slice(0,2),16)/255,g=parseInt(h.slice(2,4),16)/255,b=parseInt(h.slice(4,6),16)/255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let H=0,S=0;if(mx!==mn){const d=mx-mn;S=l>.5?d/(2-mx-mn):d/(mx+mn);H=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;H/=6;}return [H,S,l];}
function hsl2rgb(h,s,l){if(!s){const v=l*255;return [v,v,v];}const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;const f=t=>{t=(t+1)%1;return 255*(t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p);};return [f(h+1/3),f(h),f(h-1/3)];}
function find(list,id){return (list||[]).find(x=>x.id===id);}
const SF={
  defaults:{shape:null,eyes:null,brows:null,mouth:null,iris:'amber',skin:'natural',hair:'orig',blush:0,mark:'none'},
  normalize(face){return Object.assign({},SF.defaults,face||{});},
  isDefault(face){const f=SF.normalize(face),d=SF.defaults;return Object.keys(d).every(k=>f[k]===d[k]);},
  hairEntry(data,face){const F=data&&data.face;if(!F)return null;const h=find(F.hair,SF.normalize(face).hair);return h&&h.id!=='orig'?h:null;},
  /* 保亮度重着色：按目标色相/饱和度重着色，亮度围绕目标亮度保留原明暗层次；白点也被着色。mask 可选（同尺寸 alpha） */
  recolorData(id,hex,mask){const d=id.data;const t=hex2hsl(hex);let sum=0,sq=0,n=0;
    for(let i=0;i<d.length;i+=4){const a=d[i+3]*(mask?mask[i+3]/255:1);if(a<40)continue;{const L=(.299*d[i]+.587*d[i+1]+.114*d[i+2])/255;sum+=L;sq+=L*L;n++;}}
    if(!n)return id;const mL=sum/n,sd=Math.sqrt(Math.max(1e-4,sq/n-mL*mL)),k=Math.min(1.8,Math.max(.8,.17/sd))*(t[2]<.3?.8:1);
    for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const w=mask?mask[i+3]/255:1;if(w<=0)continue;
      const L=(.299*d[i]+.587*d[i+1]+.114*d[i+2])/255;const nl=Math.min(.97,Math.max(.03,t[2]+(L-mL)*k));
      const c=hsl2rgb(t[0],t[1]*(0.55+0.45*Math.min(1,1-Math.abs(nl-.5)*1.2)),nl);
      d[i]=d[i]*(1-w)+c[0]*w;d[i+1]=d[i+1]*(1-w)+c[1]*w;d[i+2]=d[i+2]*(1-w)+c[2]*w;}
    return id;},
  _rc:{},
  recolorSrc(src,hex){const key=src+'|'+hex;if(!SF._rc[key])SF._rc[key]=load(src).then(im=>{if(!im)return src;const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const g=c.getContext('2d');g.drawImage(im,0,0);const id=g.getImageData(0,0,c.width,c.height);g.putImageData(SF.recolorData(id,hex),0,0);return new Promise(r=>c.toBlob(b=>r(b?URL.createObjectURL(b):src),'image/png'));});return SF._rc[key];},
  /* 把 <img> 换成重着色版本；保留原 src 于 data-osrc */
  applyHair(img,data,face){const h=SF.hairEntry(data,face);if(!h)return;const o=img.dataset.osrc||img.getAttribute('src');img.dataset.osrc=o;img.style.filter='';SF.recolorSrc(new URL(o,location.href).href,h.hex).then(u=>{if(img.dataset.osrc===o)img.src=u;});},
  /* 底模画布上的原发色（发髻/鬓发）同步重着色 */
  async recolorBase(canvas,data,face){const h=SF.hairEntry(data,face);const F=data&&data.face;if(!h||!F||!F.hairMask)return;const m=await load(F.hairMask.src.startsWith('http')?F.hairMask.src:new URL(F.hairMask.src,(data._base||location.href)).href);if(!m)return;
    const W=canvas.width,H=canvas.height,mc=document.createElement('canvas');mc.width=W;mc.height=H;const mg=mc.getContext('2d');mg.drawImage(m,F.hairMask.x,F.hairMask.y,F.hairMask.w,F.hairMask.h);
    const g=canvas.getContext('2d');const id=g.getImageData(0,0,W,H);const md=mg.getImageData(0,0,W,H).data;g.putImageData(SF.recolorData(id,h.hex,md),0,0);},
  /* 脸部件/眨眼/表情等矩形层里带着底模发丝：只在 hairMask 范围内重着色 */
  _rm:{},
  recolorMaskedSrc(src,l,data,face){const h=SF.hairEntry(data,face);const F=data&&data.face;if(!h||!F||!F.hairMask)return Promise.resolve(null);const key=src+'|'+h.hex;
    if(!SF._rm[key])SF._rm[key]=Promise.all([load(src),load(new URL(F.hairMask.src,(data._base||location.href)).href)]).then(([im,m])=>{if(!im||!m)return null;const w=im.naturalWidth,hh=im.naturalHeight,sx=w/l.w,sy=hh/l.h;
      const c=document.createElement('canvas');c.width=w;c.height=hh;const g=c.getContext('2d');g.drawImage(im,0,0);
      const mc=document.createElement('canvas');mc.width=w;mc.height=hh;const mg=mc.getContext('2d');mg.drawImage(m,(F.hairMask.x-l.x)*sx,(F.hairMask.y-l.y)*sy,F.hairMask.w*sx,F.hairMask.h*sy);
      const id=g.getImageData(0,0,w,hh);g.putImageData(SF.recolorData(id,h.hex,mg.getImageData(0,0,w,hh).data),0,0);return new Promise(r=>c.toBlob(b=>r(b?URL.createObjectURL(b):null),'image/png'));});return SF._rm[key];},
  applyHairMasked(img,l,data,face){const o=img.dataset.osrc||img.getAttribute('src');img.dataset.osrc=o;SF.recolorMaskedSrc(new URL(o,location.href).href,l,data,face).then(u=>{if(u&&img.dataset.osrc===o)img.src=u;});},
  hairFilter(data,face){const F=data&&data.face;if(!F)return 'none';const h=find(F.hair,SF.normalize(face).hair);return h?h.filter:'none';},
  random(data){const F=data.face,pick=a=>a[Math.floor(Math.random()*a.length)];const by=k=>[null,...F.parts.filter(p=>p.kind===k).map(p=>p.id)];
    return {shape:pick(by('shape')),eyes:pick(by('eyes')),brows:pick(by('brows')),mouth:pick(by('mouth')),iris:pick(F.iris).id,skin:pick(F.skin).id,hair:pick(F.hair).id,blush:Math.round(Math.random()*7)/10,mark:pick(['none','none','eye','lip','cheek'])};},
  /* 返回图层规格：{z, src|canvas, x,y,w,h, filter, blend}；坐标系 W×H。
     resolve(src)->绝对URL；coverLayers: 已装备服装图层（用于从肤色蒙版中扣除被衣服遮住的部分） */
  async build(data,face,opts){SF._data=data;SF._face=SF.hairEntry(data,face)?face:null;
    const F=data&&data.face;if(!F)return [];
    const f=SF.normalize(face),W=data.W,H=data.H,res=(opts&&opts.resolve)||(s=>s),out=[];
    ['shape','eyes','brows','mouth'].forEach(k=>{const p=f[k]&&find(F.parts,f[k]);if(p&&p.kind===k)out.push({...p.layer,src:res(p.layer.src),hairMasked:true});});
    const ir=find(F.iris,f.iris);
    if(ir&&ir.filter!=='none'){const ep=f.eyes&&find(F.parts,f.eyes);const il=(ep&&ep.iris)||F.irisBase;if(il)out.push({...il,src:res(il.src),filter:ir.filter});}
    const sk=find(F.skin,f.skin);
    if(sk&&sk.alpha>0&&F.skinMask){
      const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
      const m=await load(res(F.skinMask.src));
      if(m){g.drawImage(m,F.skinMask.x,F.skinMask.y,F.skinMask.w,F.skinMask.h);g.globalCompositeOperation='source-in';g.fillStyle=sk.hex;g.globalAlpha=sk.alpha;g.fillRect(0,0,W,H);g.globalAlpha=1;
        g.globalCompositeOperation='destination-out';
        for(const l of (opts&&opts.coverLayers)||[]){if(l.z<30||(l.z>=62&&l.z<=67))continue;const im=await load(res(l.src));if(im)g.drawImage(im,l.x,l.y,l.w,l.h);}
        out.push({z:65,canvas:c,x:0,y:0,w:W,h:H,blend:sk.blend});}
    }
    if((f.blush>0)||(f.mark&&f.mark!=='none')){
      const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
      if(f.blush>0)(F.cheeks||[]).forEach(([x,y])=>{const gr=g.createRadialGradient(x,y,0,x,y,15);gr.addColorStop(0,F.blushColor||'#ff7f9a');gr.addColorStop(1,'rgba(255,127,154,0)');g.globalAlpha=Math.min(1,f.blush)*0.55;g.fillStyle=gr;g.beginPath();g.ellipse(x,y,15,9,0,0,Math.PI*2);g.fill();});
      g.globalAlpha=1;const mk=F.marks&&F.marks[f.mark];
      if(mk){g.fillStyle='rgba(70,35,30,.85)';g.beginPath();g.arc(mk[0],mk[1],1.3,0,Math.PI*2);g.fill();}
      out.push({z:65,canvas:c,x:0,y:0,w:W,h:H,blend:'normal'});
    }
    return out;
  },
  /* 把规格放进 DOM 容器（百分比定位） */
  mount(container,specs,W,H){
    container.querySelectorAll('.sf-layer').forEach(e=>e.remove());
    specs.forEach(s=>{const el=s.canvas||Object.assign(new Image(),{src:s.src});el.className='sf-layer';if(s.hairMasked&&!s.canvas&&SF._face)SF.applyHairMasked(el,s,SF._data,SF._face);
      Object.assign(el.style,{position:'absolute',left:s.x/W*100+'%',top:s.y/H*100+'%',width:s.w/W*100+'%',height:s.h/H*100+'%',zIndex:Math.round(s.z),pointerEvents:'none',filter:s.filter||'',mixBlendMode:s.blend&&s.blend!=='normal'?s.blend:''});
      container.appendChild(el);});
  },
  /* 画到 2D 画布（拍照导出）：k=缩放，dx,dy=偏移 */
  async paint(ctx,specs,dx,dy,k){
    for(const s of specs){let im=s.canvas||await load(s.src);if(s.hairMasked&&!s.canvas&&SF._face){const u=await SF.recolorMaskedSrc(s.src,s,SF._data,SF._face);if(u)im=await load(u);}if(!im)continue;ctx.save();if(s.filter)ctx.filter=s.filter;if(s.blend&&s.blend!=='normal')ctx.globalCompositeOperation=s.blend;ctx.drawImage(im,dx+s.x*k,dy+s.y*k,s.w*k,s.h*k);ctx.restore();}
  }
};
window.StarFace=SF;
})();
