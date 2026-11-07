/* Content registry: add original content here without editing game logic. No external URLs. */
window.StarData={
characters:[{id:'lan',name:'蓝蓝',hair:'#65bde9',dark:'#3e71b6',dress:'#d5f4ff',tag:'海风导航员',mark:'whale'}, {id:'mo',name:'小模',hair:'#7bc7af',dark:'#398474',dress:'#e3fff0',tag:'花园整理师',mark:'flower'}, {id:'li',name:'栗栗',hair:'#c38c74',dark:'#875d63',dress:'#ffe7c7',tag:'点心治愈师',mark:'nut'}, {id:'xing',name:'星眠',hair:'#b39ae6',dark:'#7962b2',dress:'#ede3ff',tag:'银河观测员',mark:'star'}, {id:'hu',name:'橙铃',hair:'#f4ae7c',dark:'#c66a58',dress:'#fff0d7',tag:'元气探险家',mark:'fox'}],
skins:[{id:0,name:'伙伴原色',vip:false},{id:1,name:'樱糖粉',vip:true,hair:'#f0a6cc',dress:'#fff1fa'},{id:2,name:'星河蓝',vip:true,minTier:3,hair:'#91a6ef',dress:'#e9efff'}],
outfits:[
{id:0,name:'星糖校服',price:0,vip:false,svg:'<path d="M42 103h36l8 28H34z" fill="#8188bf"/><path d="m47 101 13 11 13-11m-13 11v17" stroke="white" stroke-width="3" fill="none"/><path d="m60 111-7-5v10l7-3 7 3v-10z" fill="#f2accd"/>'},
{id:1,name:'星愿魔法少女',price:100,vip:true,minTier:2,svg:'<path d="M42 101h36l14 31-16 6-16-5-17 5-15-6z" fill="#b995e8"/><path d="m43 102 17 9 17-9-7 18H50z" fill="#f5b9db"/><path d="m60 106 3 6 7 1-5 4 1 7-6-3-6 3 1-7-5-4 7-1z" fill="#fff0b0"/><path d="M40 129h40" stroke="#fff" stroke-width="3"/>'}
],
vehicles:[{id:'foot',name:'轻快步行',kind:'foot',price:0,vip:false,speed:1,jump:1},{id:'board',name:'糖星滑板',kind:'board',price:80,vip:false,speed:1.12,jump:1.07},{id:'hover',name:'月光飞行器',kind:'hover',price:0,vip:true,minTier:4,speed:1.2,jump:1.13}],
runnerItems:[{id:'magnet',name:'磁铁',glyph:'磁',color:'#f3b5d1',duration:7},{id:'shield',name:'护盾',glyph:'盾',color:'#aadfe6',duration:10},{id:'dash',name:'冲刺',glyph:'冲',color:'#e8c888',duration:3}],
arcadeItems:{shooter:{name:'补给护盾',lives:1,duration:4},snake:{name:'防撞护符',charges:1},fighter:{name:'星光护盾',charges:1}},
campaign:[{id:'lan',name:'海风试炼 · 蓝蓝',hp:80,speed:80,damage:.7},{id:'li',name:'点心试炼 · 栗栗',hp:100,speed:100,damage:.85},{id:'mo',name:'花园试炼 · 小模',hp:120,speed:105,damage:1},{id:'hu',name:'迅影试炼 · 橙铃',hp:145,speed:135,damage:1.05},{id:'xing',name:'星眠的幻光',hp:170,speed:120,damage:1.15},{id:'xing',name:'首领 · 星穹守护者',hp:230,speed:140,damage:1.3}],
rarities:[{name:'朴素',color:'#8a8d9e',scale:1,weight:.6,bossWeight:0},{name:'精良',color:'#6094c7',scale:2,weight:.28,bossWeight:.5},{name:'星辉',color:'#ab79d1',scale:3,weight:.1,bossWeight:.38},{name:'传说',color:'#c59235',scale:4,weight:.02,bossWeight:.12}],
gear:[{id:'weapon',slot:'weapon',name:'星枝法杖',slotName:'武器',icon:'weapon',stats:{atk:4}},{id:'armor',slot:'armor',name:'云棉斗篷',slotName:'护甲',icon:'armor',stats:{hp:12,def:2}},{id:'accessory',slot:'accessory',name:'糖晶挂坠',slotName:'饰品',icon:'accessory',stats:{atk:2,crit:.015}}],
monsters:[{name:'软糖团',color:'#a7d4d9'},{name:'叶子啾',color:'#b4d7aa'}],
loot:{baseStats:{atk:12,hp:100,def:2,crit:.05},normalDrop:.5,vipDrop:.7,bossEvery:5,bagMax:60,maxLevel:20},
games:[
{id:'space-shooter',name:'萌娘打外星人',character:'xing',desc:'星舰巡航 · 强化补给 · 首领弹幕',new:true},
{id:'snake',name:'贪吃蓝蓝',character:'lan',desc:'海盐星糖 · 冰晶道具 · 灵巧转向',new:true},
{id:'fighter',name:'萌娘星光擂台',character:'hu',desc:'闯关试炼 · 星光连击 · 华丽终结',new:true},
{id:'monster-loot',name:'萌娘星糖远征',character:'li',desc:'自动战斗 · 装备掉落 · 合成升级',new:true},
{id:'moe-runner',name:'萌娘星风跑酷',character:'lan',desc:'二段跳 · 金币衣橱 · 奇妙载具',new:true},
{id:'lili-merge',name:'栗栗合成大栗子',character:'li',desc:'相同萌娘合成，收集大大快乐'},
{id:'lili-dressup',name:'栗栗换装 · 星糖衣橱',character:'li',desc:'分层换装 · 华丽套装 · 拍照馆',new:true},
{id:'xiuxian',name:'云阙问仙 · 修仙换装',character:'li',desc:'境界突破 · 渡劫秘境 · 仙衣法宝',new:true},
{id:'lili-match',name:'萌娘森林消消',character:'mo',desc:'三枚相同伙伴，轻轻松松消掉'},
{id:'lili-2048',name:'萌娘伙伴 2048',character:'hu',desc:'滑动集结伙伴，向 2048 前进'},
{id:'lili-fortune',name:'星眠今日小运势',character:'xing',desc:'抽一张今日卡片，仅供娱乐'}
]
};
