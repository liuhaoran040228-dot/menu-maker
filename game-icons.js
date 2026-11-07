/* Accessible pictogram controls. Existing button nodes and game handlers stay intact. */
(()=>{'use strict';const host=document.querySelector('.play-viewport');if(!host)return;
const paths={
 sword:'M5 20l4-4m-3-3 5 5M9 15 19 3l2 1-1 4-9 9M4 19l2 2',
 fist:'M7 12V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v8c0 5-3 7-7 7H9l-5-6a2 2 0 0 1 3-3l3 3',
 boot:'M9 3h6v9l5 3v4H5v-5l4-3zM5 16h15',
 star:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
 bolt:'m14 2-9 12h7l-2 8 9-12h-7z',
 wing:'M12 20V8m-4 4 4-4 4 4M9 16C3 15 2 8 3 4l6 5m6 7c6-1 7-8 6-12l-6 5',
 down:'m5 9 7 7 7-7M5 21h14',
 shield:'m12 2 8 3v6c0 5-5 9-8 11-3-2-8-6-8-11V5zM8 12l3 3 5-6',
 heart:'M12 21 3 12C-2 5 7 0 12 7c5-7 14-2 9 5zM8 12h8m-4-4v8',
 undo:'M9 4 3 10l6 6M3 10h10c11 0 9 12 1 12',
 shuffle:'M3 5h3c6 0 6 14 12 14h3m-4-4 4 4-4 3M3 19h3c2 0 4-3 5-5m3-5c1-2 3-4 5-4h2m-4-3 4 3-4 4',
 hammer:'m4 21 10-12M10 5l4-4 8 8-4 4zM3 18l3 3',
 card:'M5 3h14v18H5zM12 7l1 3 3 1-3 1-1 3-1-3-3-1 3-1z',
 save:'M12 2v13m-5-5 5 5 5-5M4 16v5h16v-5',
 play:'m7 3 14 9-14 9z',pause:'M7 4v16M17 4v16',menu:'M4 6h16M4 12h16M4 18h16',
 arrow:'M4 12h16m-6-6 6 6-6 6',book:'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3zM12 6v16',
 clock:'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9m0 4v6l4 2',
 tower:'M5 21V8h14v13M3 4h4v4h3V4h4v4h3V4h4v4M9 21v-6h6v6',
 up:'M12 21V3m-7 7 7-7 7 7',coin:'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9m0 4v10m-3-3h5M9 8h5',
 eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m10-3a3 3 0 1 0 3 3 3 3 0 0 0-3-3'};
const map={punch:'fist',kick:'boot',special:'star',ultimate:'bolt',strike:'sword',heal:'heart',jump:'wing',slide:'down',vipitem:'shield',pulse:'star',freeze:'clock',undo:'undo',shuffle:'shuffle',pop:'hammer',go:'card',save:'save',next:'play',speed:'bolt',pause:'pause',previous:'undo',auto:'play','skip-type':'eye','log-button':'book','quick-upgrade':'up','quick-sell':'coin'};
function decorate(b){if(b.classList.contains('account-trigger'))return;if(b.closest('.play-launch,.rotate-overlay,.a2-overlay,.overlay,.a2-vn-end,.a2-vn-choices'))return;const text=b.textContent.trim();if(text)b.dataset.controlText=text;if(!b.dataset.iconLabel)b.dataset.iconLabel=b.getAttribute('aria-label')||text||'控制';const id=b.dataset.action||b.id;let key=map[id]||(b.classList.contains('menu-toggle')?'menu':b.closest('#quick-towers')?'tower':'play');if(['up','down','left','right'].includes(id)){key='arrow';b.style.setProperty('--icon-turn',({up:'-90deg',down:'90deg',left:'180deg',right:'0deg'})[id])}
const sec=text.match(/(\d+)s/);if(sec&&['strike','heal'].includes(id))b.style.setProperty('--cooldown',Number(sec[1])/(id==='heal'?15:5));else if(!b.disabled)b.style.setProperty('--cooldown',0);
b.setAttribute('aria-label',b.dataset.iconLabel);b.title=b.dataset.iconLabel;
if(b.querySelector(':scope > .control-glyph'))return;b.classList.add('icon-control');b.innerHTML='<svg class="control-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths[key]+'"/></svg><svg class="cooldown-ring" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="27"/></svg>';
}
const scan=()=>host.querySelectorAll('.play-skills button,.play-pad button,.play-nav button,.play-story-controls button,.play-quickbuild button').forEach(decorate);scan();let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;scan()})}).observe(host,{subtree:true,childList:true,characterData:true});
})();
