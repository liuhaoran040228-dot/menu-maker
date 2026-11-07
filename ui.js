/* shared UI chrome: top bar, footer, toasts, confirm, game overlays. No network. */
window.UI=(()=>{const root=document.currentScript.src.replace(/ui\.js(\?.*)?$/,'');
const MASCOT=window.Chars?Chars.render('li'):'';
const isHub=/tools\.html$/.test(location.pathname);
const bar=document.createElement('div');bar.className='topbar';bar.innerHTML='<div class="topbar-in"><a class="brand" href="'+root+'tools.html">'+MASCOT+'<span>星糖宇宙</span></a>'+(isHub?'<span style="margin-left:auto"></span>':'<a class="back" href="'+root+'tools.html">← 全部工具</a>')+'<span class="vip-slot"></span></div>';
document.body.prepend(bar);
document.querySelectorAll('footer').forEach(f=>f.remove());
const foot=document.createElement('footer');foot.className='site-foot';foot.innerHTML='<b>需要定制可以闲鱼找我</b><br>本地处理 · 内容不上传';document.body.append(foot);
const tw=document.createElement('div');tw.className='toast-wrap';tw.setAttribute('aria-live','polite');document.body.append(tw);
function toast(t,ms=2400){if(!t)return;const d=document.createElement('div');d.className='toast';d.textContent=t;tw.append(d);while(tw.children.length>2)tw.firstChild.remove();setTimeout(()=>{d.classList.add('out');setTimeout(()=>d.remove(),320)},ms)}
function confirm(msg){return new Promise(res=>{const d=document.createElement('dialog');d.className='ui-dialog';d.innerHTML='<div class="dlg-head"><h2>确认一下</h2></div><div class="dlg-body"><p></p><div class="dlg-row"><button class="alt" value="0">取消</button><button value="1">继续</button></div></div>';d.querySelector('p').textContent=msg;document.body.append(d);d.querySelectorAll('button').forEach(b=>b.onclick=()=>{d.close();d.remove();res(b.value==='1')});d.addEventListener('cancel',()=>{d.remove();res(false)});d.showModal()})}
// mirror status lines to toasts
['notice','status','msg'].forEach(id=>{const el=document.getElementById(id);if(!el)return;new MutationObserver(()=>{const t=el.textContent.trim();if(t)toast(t);if(window.__onMsg)window.__onMsg(t)}).observe(el,{childList:true,characterData:true,subtree:true})});
// game overlays
function gameOverlay(target,{title,desc,over,restartId}){const wrap=document.createElement('div');wrap.className='game-wrap';target.before(wrap);wrap.append(target);const ov=document.createElement('div');ov.className='overlay';ov.innerHTML=MASCOT+'<h2></h2><p></p><button>开始游戏</button>';ov.querySelector('h2').textContent=title;ov.querySelector('p').textContent=desc;wrap.append(ov);ov.querySelector('button').onclick=()=>{if(ov.dataset.over){document.getElementById(restartId).click()}ov.hidden=true;delete ov.dataset.over};
window.__onMsg=t=>{if(over.test(t)){ov.dataset.over=1;ov.querySelector('h2').textContent='这局结束啦';ov.querySelector('p').textContent=t;ov.querySelector('button').textContent='再来一局';ov.hidden=false}};document.getElementById(restartId).addEventListener('click',()=>{ov.hidden=true;delete ov.dataset.over})}
return {toast,confirm,gameOverlay,MASCOT}})();
