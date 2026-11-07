(()=>{'use strict';
StarData.games.push({id:'story',name:'星糖物语',character:'lan',desc:'互动剧情 · 第一、二章',new:true},{id:'survivor',name:'星野夜航',character:'xing',desc:'自动攻击 · 技能进化',new:true},{id:'td',name:'花园守护计划',character:'mo',desc:'策略布阵 · 六波守护',new:true});
const cover={'space-shooter':'lobby-shooter','fighter':'lobby-fighter','monster-loot':'lobby-loot','moe-runner':'lobby-runner','snake':'bg-undersea','lili-merge':'bg-garden','lili-match':'bg-forest','lili-2048':'bg-sky','lili-fortune':'bg-moon','story':'story-atmosphere','survivor':'bg-space','td':'bg-sakura','lili-dressup':'skin-2'};
document.getElementById('gameCards').innerHTML=StarData.games.map((g,i)=>`<a class="tcard g v2-game${i<2?' big':''}" href="./${g.id}/"><span class="v2-cover" style="background-image:url(./assets/icon-${g.id}.webp),url(./assets/${cover[g.id]||'bg-sky'}.webp)"></span><div class="v2-meta"><h3>${g.name}${g.new?' <span class="tag">NEW</span>':''}</h3><p>${g.desc}</p></div></a>`).join('');
document.getElementById('lineup').innerHTML=Chars.cast.map(c=>'<div class="character">'+Chars.render(c.id)+'<b>'+c.name+'</b></div>').join('');
document.getElementById('rasterCast').innerHTML=Chars.cast.map(c=>'<div class="cast-card"><img src="./assets/'+c.id+'-portrait.webp" alt="'+c.name+'" loading="lazy"><b>'+c.name+'</b><small>'+c.tag+'</small></div>').join('');
const openSkins=()=>{const P=window.StarPremium;try{if(P&&document.body.dataset.siteTheme!==undefined){P.open('themes');if(document.getElementById('premium-themes-dialog')?.open)return;}}catch(e){}VIP.open();};
const rail=document.getElementById('skinRail');
const draw=()=>{const P=window.StarPremium;if(!P)return false;const cur=document.body.dataset.siteTheme||'default';rail.innerHTML=P.themes.filter(t=>t.tier).map(t=>`<button type="button" class="v2-skin${t.id===cur?' on':''}" style="--s:url(./assets/${t.file})"><i>VIP${t.tier}</i><b>${t.name}</b></button>`).join('');rail.querySelectorAll('button').forEach(b=>b.onclick=openSkins);return true;};
if(!draw()){let n=0;const iv=setInterval(()=>{if(draw()||++n>40)clearInterval(iv)},250);}
new MutationObserver(draw).observe(document.body,{attributes:true,attributeFilter:['data-site-theme']});
document.getElementById('heroSkin').onclick=openSkins;
document.getElementById('hubVip').onclick=()=>VIP.open();
})();
