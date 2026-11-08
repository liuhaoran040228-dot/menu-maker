/* Load chat-cosmetics-catalog.js first. Never use in anonymous treehole. */
(()=>{'use strict';
 const catalog=window.StarChatCosmeticsCatalog||[];
 const categories=['bubble','chat_effect','avatar_frame'];
 const badgeNames={level5:'初星',level10:'月华',level20:'曜日',level40:'星冠'};
 for(let i=1;i<=8;i++)badgeNames['vip'+i]='VIP'+i;
 const contexts=new Set(['dm','guild','lobby','public_feed']);
 function find(category,id){return catalog.find(x=>x.category===category&&x.id===id)||catalog.find(x=>x.category===category&&x.id==='default');}
 function clean(node){if(!node)return;for(const c of [...node.classList])if(c.startsWith('cc-'))node.classList.remove(c);}
 function render({message,avatar,badges},row,{context,animate=false}={}){
   // Always clear recycled DOM before checking context; no stale appearance in anonymous views.
   clean(message);clean(avatar);if(badges)badges.replaceChildren();
   if(!contexts.has(context)||!row)return false;
   if(context==='public_feed'&&(typeof row.post_id!=='string'||! /^[1-9][0-9]{0,18}$/.test(row.post_id)))return false;
   for(const category of categories){const item=find(category,row[category]);const node=category==='avatar_frame'?avatar:message;
     if(item&&node){node.classList.add('cc-'+category.replace('_','-'),item.css_class);}}
   if(animate&&message)message.classList.add('cc-enter');
   if(badges)for(const id of [row.vip_badge,row.level_badge])if(Object.hasOwn(badgeNames,id)){
     const b=document.createElement('span');b.className='cc-badge cc-badge-'+id;b.textContent=badgeNames[id];b.title=badgeNames[id];badges.append(b);
   }
   return true;
 }
 window.StarChatCosmetics=Object.freeze({catalog:Object.freeze(catalog.map(x=>Object.freeze(x))),find,render});
})();
