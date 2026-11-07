window.A2=window.A2||{};
A2.td={title:'花园守护计划',cols:9,rows:12,startGold:160,lives:15,
 path:[[0,2],[6,2],[6,5],[2,5],[2,8],[7,8],[7,11]],
 towers:[
  {id:'lan',name:'蓝蓝 · 星泡塔',color:'#78ddff',cost:50,damage:20,range:2.5,rate:0.8,desc:'单体快攻 · 攻击最近终点的敌人'},
  {id:'mo',name:'小模 · 薄荷塔',color:'#89efb1',cost:65,damage:10,range:2.2,rate:1,slow:0.5,desc:'命中减速 · 控制弯道'},
  {id:'xing',name:'星眠 · 星陨塔',color:'#c7a3ff',cost:95,damage:44,range:2.9,rate:1.8,splash:1.05,desc:'群体爆发 · 适合聚怪'}
 ],
 enemies:{puff:{name:'迷梦团',hp:48,speed:0.70,reward:9,color:'#b298ec',r:0.25},dash:{name:'闪电团',hp:35,speed:1.25,reward:11,color:'#ffb779',r:0.21},tank:{name:'软糖卫士',hp:155,speed:0.44,reward:18,color:'#71cabb',r:0.34},boss:{name:'晚安大王',hp:1300,speed:0.32,reward:150,color:'#ed9ada',r:0.49}},
 waves:[
  {label:'初次巡夜',groups:[['puff',7,1.05]]},
  {label:'星光小径',groups:[['puff',10,0.8],['dash',3,0.8]]},
  {label:'薄荷晚风',groups:[['dash',9,0.6],['tank',2,1.2]]},
  {label:'打盹小队',groups:[['puff',13,0.5],['tank',5,1.1]]},
  {label:'梦境潮汐',groups:[['dash',15,0.45],['tank',5,1]]},
  {label:'晚安大王',groups:[['tank',6,0.8],['boss',1,2],['dash',12,0.5]]}
 ],
 items:[{id:'freeze',name:'月光暂停',vip:true,desc:'每场一次，全场减速6秒'}]
};
