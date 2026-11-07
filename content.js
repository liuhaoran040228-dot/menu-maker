/* Small registry facade shared by all engines. IDs stay stable across saved games. */
window.Content={
 find(kind,id){return (StarData[kind]||[]).find(x=>x.id===id)},
 allowed(item){return !!item&&(!item.vip||!!window.VIP?.active())},
 skinAllowed(id){return this.allowed(this.find('skins',Number(id)))},
 skinValue(id){return this.skinAllowed(id)?Number(id):StarData.skins.find(x=>!x.vip).id},
 skinOptions(){return StarData.skins.map(s=>'<option value="'+s.id+'">'+s.name+(s.vip?' · VIP':' · 免费')+'</option>').join('')}
};
