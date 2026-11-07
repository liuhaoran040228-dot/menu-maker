window.A2=window.A2||{};
A2.survivor={title:'星野幸存者',duration:180,bossAt:135,arena:{w:1600,h:1600},baseHP:100,speed:185,
 skills:[
  {id:'bolt',name:'星芒飞弹',icon:'✦',color:'#8be7ff',max:4,kind:'projectile',damageBase:12,damagePerLevel:8,cooldownBase:.72,cooldownPerLevel:.08,range:315,projectileSpeed:520,evolveRequires:'haste',evolveName:'极光连星',evolveCount:5,evolveDamage:1.5,desc:'自动追踪最近目标；提升伤害与弹数',evolution:'满级 + 星轨：进化「极光连星」'},
  {id:'orbit',name:'薄荷星环',icon:'❋',color:'#94f4b9',max:4,kind:'orbit',damageBase:8,damagePerLevel:8,countBase:2,radius:70,evolveRadius:100,rotationSpeed:2.5,evolveRequires:'bolt',evolveName:'森之领域',desc:'环绕身边的叶片，近身持续伤害',evolution:'满级 + 星芒：进化「森之领域」'},
  {id:'nova',name:'栗香脉冲',icon:'◉',color:'#ffd28b',max:4,kind:'pulse',damageBase:20,damagePerLevel:20,radiusBase:90,radiusPerLevel:25,cooldown:3.5,evolveCooldown:1.5,evolveRequires:'orbit',evolveName:'点心星爆',desc:'定期释放大范围星糖冲击波',evolution:'满级 + 星环：进化「点心星爆」'},
  {id:'haste',name:'星轨加速',icon:'»',color:'#d4aaff',max:3,kind:'passive',speedPerLevel:.12,pickupPerLevel:18,desc:'移速 +12%，拾取范围 +18'},
  {id:'heart',name:'暖心补给',icon:'♥',color:'#ff9fcf',max:3,kind:'heal',heal:35,hpPerLevel:15,desc:'立即恢复35生命，生命上限 +15'}
 ],
 enemies:[
  {id:'puff',name:'迷梦团',color:'#b593ed',hp:18,speed:46,r:15,xp:1,weight:6},
  {id:'dash',name:'闪电团',color:'#ffb079',hp:12,speed:85,r:12,xp:2,weight:2,after:35},
  {id:'tank',name:'软糖卫士',color:'#86d2d2',hp:64,speed:34,r:23,xp:4,weight:1,after:60}
 ],
 boss:{name:'失眠大团子',hp:900,r:62,speed:32,color:'#e2a9ff',xp:20},
 spawn:{initial:.4,interval:.85,acceleration:.003,minInterval:.20,doubleAfter:50,maxEnemies:110,radiusX:315,radiusY:365},pickupRadius:80,bossProjectile:{count:12,speed:105,damage:15,interval:3.2,lifetime:5},
 items:[{id:'pulse',name:'星糖清场',desc:'每局一次 · 不伤害首领',vip:true},{id:'revive',name:'暖心护符',desc:'每局一次原地复苏',vip:true}]
};
