(()=>{'use strict';
  const levels = [
    {
      walls: [],
      platforms: [{ x: 400, y: 420, w: 200, h: 20 }, { x: 800, y: 420, w: 200, h: 20 }],
      springs: [],
      movingPlatforms: [],
      mechanisms: {},
      gems: [
        { x: 200, y: 480, color: 'ice' },
        { x: 600, y: 380, color: 'ice' },
        { x: 1000, y: 480, color: 'fire' },
        { x: 300, y: 350, color: 'fire' },
        { x: 700, y: 300, color: 'ice' },
        { x: 900, y: 350, color: 'fire' }
      ]
    },
    {
      walls: [],
      platforms: [{ x: 350, y: 420, w: 250, h: 20 }, { x: 750, y: 420, w: 250, h: 20 }],
      springs: [],
      movingPlatforms: [],
      mechanisms: {
        bridge: { x: 400, y: 520, w: 70, h: 20, type: 'freeze', triggered: false, actor: null }
      },
      pools: [{ x: 380, y: 510, w: 70, h: 30, type: 'water', frozen: false }],
      gems: [
        { x: 150, y: 480, color: 'ice' },
        { x: 500, y: 350, color: 'ice' },
        { x: 1050, y: 480, color: 'fire' },
        { x: 700, y: 300, color: 'fire' },
        { x: 400, y: 250, color: 'ice' },
        { x: 950, y: 350, color: 'fire' }
      ]
    },
    {
      walls: [{ x: 580, y: 400, w: 40, h: 120, melted: false }],
      platforms: [{ x: 300, y: 420, w: 200, h: 20 }, { x: 800, y: 420, w: 200, h: 20 }],
      springs: [],
      movingPlatforms: [],
      mechanisms: {},
      gems: [
        { x: 200, y: 480, color: 'ice' },
        { x: 650, y: 350, color: 'ice' },
        { x: 1000, y: 480, color: 'fire' },
        { x: 400, y: 300, color: 'fire' },
        { x: 750, y: 250, color: 'ice' },
        { x: 900, y: 350, color: 'fire' }
      ]
    },
    {
      walls: [{ x: 580, y: 400, w: 40, h: 120, melted: false }],
      platforms: [
        { x: 250, y: 420, w: 150, h: 20 },
        { x: 850, y: 420, w: 150, h: 20 }
      ],
      springs: [],
      movingPlatforms: [],
      mechanisms: {
        pressurePlate: { x: 300, y: 500, w: 80, h: 20, triggered: false, actors: [] },
        returnSwitch: { x: 720, y: 500, w: 80, h: 20, triggered: false, actors: [] }
      },
      gems: [
        { x: 150, y: 480, color: 'ice' },
        { x: 500, y: 300, color: 'ice' },
        { x: 1050, y: 480, color: 'fire' },
        { x: 700, y: 350, color: 'fire' },
        { x: 400, y: 250, color: 'ice' },
        { x: 950, y: 300, color: 'fire' }
      ]
    },
    {
      walls: [],
      platforms: [
        { x: 100, y: 480, w: 120, h: 20 },
        { x: 400, y: 380, w: 150, h: 20 },
        { x: 750, y: 300, w: 150, h: 20 },
        { x: 1000, y: 420, w: 120, h: 20 }
      ],
      springs: [],
      movingPlatforms: [],
      mechanisms: {},
      gems: [
        { x: 200, y: 450, color: 'ice' },
        { x: 500, y: 330, color: 'ice' },
        { x: 900, y: 250, color: 'fire' },
        { x: 300, y: 250, color: 'fire' },
        { x: 650, y: 200, color: 'ice' },
        { x: 1050, y: 350, color: 'fire' }
      ]
    },
    {
      walls: [],
      platforms: [
        { x: 200, y: 420, w: 120, h: 20 },
        { x: 550, y: 320, w: 120, h: 20 },
        { x: 900, y: 420, w: 120, h: 20 }
      ],
      springs: [],
      movingPlatforms: [],
      mechanisms: {
        timedWall: { x: 580, y: 400, w: 40, h: 120, active: false, duration: 8, elapsed: 0, lever: { x: 460, y: 500, w: 60, h: 20 } }
      },
      gems: [
        { x: 150, y: 480, color: 'ice' },
        { x: 600, y: 250, color: 'ice' },
        { x: 1050, y: 480, color: 'fire' },
        { x: 350, y: 300, color: 'fire' },
        { x: 750, y: 200, color: 'ice' },
        { x: 950, y: 350, color: 'fire' }
      ]
    },
    {
      walls: [],
      platforms: [
        { x: 150, y: 480, w: 100, h: 20 },
        { x: 500, y: 380, w: 200, h: 20 },
        { x: 950, y: 480, w: 100, h: 20 }
      ],
      springs: [],
      movingPlatforms: [
        { x: 600, y: 360, w: 80, h: 20, minX: 450, maxX: 750, speed: 100, dir: 1, carryActor: null }
      ],
      mechanisms: {},
      gems: [
        { x: 200, y: 450, color: 'ice' },
        { x: 550, y: 320, color: 'ice' },
        { x: 1000, y: 450, color: 'fire' },
        { x: 450, y: 280, color: 'fire' },
        { x: 700, y: 250, color: 'ice' },
        { x: 850, y: 300, color: 'fire' }
      ]
    },
    {
      walls: [],
      platforms: [
        { x: 100, y: 480, w: 120, h: 20 },
        { x: 500, y: 380, w: 100, h: 20 },
        { x: 950, y: 480, w: 120, h: 20 }
      ],
      springs: [{ x: 500, y: 350, power: -1200 }],
      movingPlatforms: [],
      mechanisms: {},
      gems: [
        { x: 150, y: 450, color: 'ice' },
        { x: 550, y: 300, color: 'ice' },
        { x: 1000, y: 450, color: 'fire' },
        { x: 400, y: 250, color: 'fire' },
        { x: 750, y: 200, color: 'ice' },
        { x: 900, y: 300, color: 'fire' }
      ]
    },
    {
      walls: [{ x: 580, y: 400, w: 40, h: 120, melted: false }],
      platforms: [
        { x: 250, y: 420, w: 150, h: 20 },
        { x: 400, y: 380, w: 120, h: 20 },
        { x: 850, y: 420, w: 150, h: 20 }
      ],
      springs: [],
      movingPlatforms: [],
      mechanisms: {
        bridge: { x: 400, y: 520, w: 70, h: 20, type: 'freeze', triggered: false, actor: null },
        pressurePlate: { x: 300, y: 500, w: 80, h: 20, triggered: false, actors: [] }
      },
      pools: [{ x: 380, y: 510, w: 70, h: 30, type: 'water', frozen: false }],
      gems: [
        { x: 200, y: 480, color: 'ice' },
        { x: 500, y: 320, color: 'ice' },
        { x: 1000, y: 480, color: 'fire' },
        { x: 650, y: 300, color: 'fire' },
        { x: 400, y: 250, color: 'ice' },
        { x: 900, y: 350, color: 'fire' }
      ]
    },
    {
      walls: [],
      platforms: [
        { x: 200, y: 480, w: 120, h: 20 },
        { x: 900, y: 480, w: 120, h: 20 }
      ],
      springs: [],
      movingPlatforms: [],
      mechanisms: {
        shieldPedestal: [
          { x: 350, y: 460, charged: false, type: 'ice' },
          { x: 850, y: 460, charged: false, type: 'fire' }
        ],
        shield: { x: 1100, y: 380, w: 40, h: 80, active: true }
      },
      gems: [
        { x: 150, y: 450, color: 'ice' },
        { x: 500, y: 400, color: 'ice' },
        { x: 1050, y: 450, color: 'fire' },
        { x: 700, y: 400, color: 'fire' },
        { x: 400, y: 300, color: 'ice' },
        { x: 950, y: 300, color: 'fire' }
      ]
    }
  ];


const W=1200,H=600,G=520,E=window.TwinEchoEconomy;
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.getElementById('game-container').append(canvas);const c=canvas.getContext('2d');
let S={running:false,paused:false,actors:[],stage:0,time:0},keys={},touch=[0,0],jump=[false,false],act=[false,false],last=0,particles=[];
const names=['冰火初遇','冻结回响','融解迷局','镜像对称','温差引擎','相位共鸣','平衡天秤','元素循环','破碎封印','双星归一'];
const hints=['岚汐在蓝色晶石旁使用✦，切换烬遥点亮橙色晶石，最后两人抵达右侧星门。','岚汐靠近蓝色水面使用✦，冰桥将永久保留，烬遥便可通过。','烬遥在中央冰墙左侧使用✦融冰，岚汐随后通过。','留一位伙伴踩住左侧圆盘，另一位通过冰墙后踩右侧开关，锁定通路。','沿两层平台跳跃收集对应颜色宝石。晶石和出口仍在底层。','在中央星盘旁使用✦，八秒内穿门；关闭后可以再次开启。','登上阶梯后等待移动平台靠近，它会带着伙伴移动。','踩上金色弹簧可飞向高处；收齐宝石不是通关的强制条件。','先冻结水面，再由烬遥融化中央冰墙。左侧压力盘也能临时打开冰墙。','岚汐、烬遥分别点亮各自祭坛，双元素护盾会解除。再点亮晶石并一同进入星门。'];
const art={};for(const [key,path]of Object.entries({bg:'background.webp',ice:'ice.webp',fire:'fire.webp',iceRoyal:'../assets/skin-lan-glam.webp',fireRoyal:'../assets/skin-mo-glam.webp'})){const im=new Image();im.src=path;art[key]=im;}
const ui=document.createElement('div');ui.id='twin-ui';ui.innerHTML=`<div id="twin-top"><a href="../" aria-label="返回平台">⌂</a><span id="twin-info"></span><div id="twin-actions"></div></div><div id="twin-tip"></div><div id="twin-controls"></div><div id="twin-modal" hidden></div><div id="twin-toast"></div><div id="rotate-note">↻ 请横屏体验双星回响</div>`;document.body.append(ui);
function button(parent,text,label,fn){const b=document.createElement('button');b.textContent=text;b.ariaLabel=label;b.title=label;b.onclick=fn;parent.append(b);return b;}
function toast(t){const e=document.getElementById('twin-toast');e.textContent=t;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),3500);}
function modal(title,body,buttons=[]){S.paused=true;keys={};touch=[0,0];const m=document.getElementById('twin-modal');m.hidden=false;m.innerHTML=`<section><h2>${title}</h2><p>${body}</p><div></div></section>`;const row=m.querySelector('section div');for(const [symbol,label,fn]of buttons)button(row,symbol,label,fn);button(row,'▷','继续',()=>{m.hidden=true;S.paused=false;last=performance.now();});}
function home(){S.running=false;ui.classList.remove('playing');document.getElementById('twin-modal').hidden=true;keys={};Lobby.show();}
function bag(){modal('行囊 · 星砂补给',`金币 ${E.get('coins')}　提示 ${E.get('hints')}<br>每日任务：通关三次 ${E.daily().clears}/3　收集星晶 ${E.daily().gems}/20<br>仅使用本游戏金币；不会扣除平台货币。`,[['✧','购买提示（20金币）',()=>{if(E.spend('coins',20)){E.earn('hints',1);toast('已获得一份提示');}else toast('金币不足');bag();}],['☀','领取每日任务',()=>toast(E.claimDaily()?'任务奖励已存入行囊':'任务尚未完成或已领取')]]);}
function pause(){modal('星光暂歇','两位伙伴会留在原地，准备好再继续。',[['↻','重新开始',()=>start(S.stage,S.mode)],['⌂','返回大厅',home],['♧','行囊',bag]]);}
async function vip(){const msg='VIP 福利服务暂不可用，稍后再试';try{if(!window.StarEconomy?.claimVipPerk)return toast(msg);const r=await StarEconomy.claimVipPerk('twin-echo');if(!r?.ok)return toast(msg);if(!r.already_claimed){E.earn('coins',Math.max(0,Number(r.reward?.coin)||0));E.earn('gems',Math.max(0,Number(r.reward?.gem)||0));}toast(r.already_claimed?'今日福利已领取':'服务器福利已存入本游戏行囊');}catch{toast(msg);}}
const actions=document.getElementById('twin-actions');button(actions,'Ⅱ','暂停',pause);button(actions,'♧','行囊',bag);button(actions,'?','机关提示',()=>{if(E.spend('hints',1))modal('回响提示',hints[S.stage]);else toast('提示不足，可在行囊用金币兑换');});button(actions,'♔','领取VIP福利',vip);
function controls(){const d=document.getElementById('twin-controls');d.innerHTML='';if(S.mode==='solo'){button(d,'⇄','切换角色',()=>{S.active=1-S.active;burst(S.actors[S.active].x,S.actors[S.active].y,'#fff',12);});button(d,'✦','元素互动',()=>{act[S.active]=true;});button(d,'↑','跳跃',()=>{jump[S.active]=true;});}else{for(let i=0;i<2;i++){const group=document.createElement('div');group.className='duo-control p'+i;d.append(group);button(group,'✦',i?'烬遥互动':'岚汐互动',()=>act[i]=true);button(group,'↑',i?'烬遥跳跃':'岚汐跳跃',()=>jump[i]=true);}}}
function start(stage=0,mode='solo'){if(typeof stage==='object'){mode=stage.mode||'solo';stage=stage.stage||0;}stage=Math.max(0,Math.min(9,Math.floor(Number(stage)||0)));const L=levels[stage];S={stage,mode,running:true,paused:false,time:0,deaths:0,active:0,gems:0,stars:0,actors:[0,1].map(i=>({id:i,type:i?'fire':'ice',x:80+i*60,y:430,w:32,h:70,vx:0,vy:0,onGround:false,coyote:0,facing:1})),platforms:[],pools:[],walls:JSON.parse(JSON.stringify(L.walls||[])),mechanisms:JSON.parse(JSON.stringify(L.mechanisms||{})),movingPlatforms:JSON.parse(JSON.stringify(L.movingPlatforms||[])),springs:stage===7?[{x:520,y:520,power:-900}]:[],crystals:[{x:250,y:480,type:'ice',charged:false},{x:950,y:480,type:'fire',charged:false}],collected:[],portal:{x:1120,y:450}};
// Reachable tiered routes. Every rise is <=100 and every gap <=150.
S.platforms=[{x:200,y:440,w:150,h:18},{x:350,y:350,w:150,h:18},{x:500,y:270,w:180,h:18},{x:690,y:350,w:150,h:18},{x:850,y:440,w:160,h:18}];
if(stage===0)S.platforms=[{x:400,y:420,w:190,h:18},{x:800,y:420,w:190,h:18}];
S.collected=[{x:210,y:480,color:'ice'},{x:460,y:stage===0?390:320,color:'ice'},{x:610,y:stage===0?480:240,color:'ice'},{x:300,y:stage===0?480:410,color:'fire'},{x:760,y:stage===0?480:320,color:'fire'},{x:940,y:stage===0?390:410,color:'fire'}].map(g=>({...g,collected:false}));
S.pools=stage===1||stage===8?[{x:390,y:510,w:70,h:18,type:'water',frozen:false}]:[{x:380,y:510,w:65,h:18,type:'ice',frozen:false},{x:680,y:510,w:65,h:18,type:'fire',frozen:false}];
if(stage===5)S.walls=[{x:580,y:400,w:40,h:120,melted:false}];if(stage===9){S.mechanisms.shield={x:1050,y:360,w:28,h:160,active:true};S.mechanisms.shieldPedestal=[{x:350,y:480,type:'ice',charged:false},{x:850,y:480,type:'fire',charged:false}];}
keys={};touch=[0,0];jump=[false,false];act=[false,false];particles=[];document.getElementById('twin-modal').hidden=true;ui.classList.add('playing');document.getElementById('twin-tip').textContent=hints[stage]+'　A/D移动 · 上划跳跃 · Tab切换 · E互动';controls();Lobby.hide();Lobby.newRound();last=performance.now();}
function burst(x,y,color,n=18){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*180,vy:(Math.random()-.7)*160,life:1,color});}
function rect(a,b){return a.x+a.w>b.x&&a.x<b.x+b.w&&a.y+a.h>b.y&&a.y<b.y+b.h;}
function near(a,x,y,r=95){return Math.hypot(a.x+a.w/2-x,a.y+a.h/2-y)<r;}
function blockers(){return S.walls.filter(w=>!w.melted).concat(S.mechanisms.shield?.active?[S.mechanisms.shield]:[]);}
function respawn(a){a.x=80+a.id*60;a.y=430;a.vx=a.vy=0;S.deaths++;burst(a.x+16,a.y+35,a.type==='ice'?'#90efff':'#ffae80');toast('元素相斥！安全重生，不扣金币');}
function interact(a){let hit=false;for(const cr of S.crystals){if(!cr.charged&&cr.type===a.type&&near(a,cr.x,cr.y)){cr.charged=true;hit=true;burst(cr.x,cr.y,a.type==='ice'?'#7af4ff':'#ffbf76',25);}}
if(a.type==='ice'&&S.mechanisms.bridge&&near(a,420,490,125)){S.mechanisms.bridge.triggered=true;S.pools.forEach(p=>p.frozen=true);hit=true;}
if(a.type==='fire'&&![3,5].includes(S.stage)){for(const wall of S.walls)if(!wall.melted&&near(a,wall.x,460,130)){wall.melted=true;hit=true;burst(wall.x,wall.y+60,'#ffcf8a',24);}}
if(S.mechanisms.timedWall&&near(a,460,485,100)){S.mechanisms.timedWall.active=true;S.mechanisms.timedWall.elapsed=0;hit=true;}
for(const p of S.mechanisms.shieldPedestal||[]){if(p.type===a.type&&near(a,p.x,p.y)){p.charged=true;hit=true;burst(p.x,p.y,'#ffe5ab');}}
if(!hit)toast('靠近同色晶石或对应机关，再使用元素之力');}
function update(dt){S.time+=dt;
for(const mp of S.movingPlatforms){const old=mp.x;mp.x+=mp.speed*mp.dir*dt;if(mp.x>mp.maxX||mp.x<mp.minX){mp.x=Math.max(mp.minX,Math.min(mp.maxX,mp.x));mp.dir*=-1;}for(const a of S.actors)if(a.onGround&&Math.abs(a.y+a.h-mp.y)<3&&a.x+a.w>old&&a.x<old+mp.w)a.x+=mp.x-old;}
const pp=S.mechanisms.pressurePlate,rs=S.mechanisms.returnSwitch;if(pp){pp.triggered=S.actors.some(a=>Math.abs(a.y+a.h-G)<6&&a.x+a.w>pp.x&&a.x<pp.x+pp.w);if(rs&&S.actors.some(a=>Math.abs(a.y+a.h-G)<6&&a.x+a.w>rs.x&&a.x<rs.x+rs.w))rs.triggered=true;if(S.stage===3&&S.walls[0])S.walls[0].melted=pp.triggered||!!rs?.triggered;}
const tw=S.mechanisms.timedWall;if(tw){if(tw.active){tw.elapsed+=dt;if(tw.elapsed>tw.duration)tw.active=false;}S.walls[0].melted=tw.active;}
if(S.mechanisms.shieldPedestal?.every(p=>p.charged))S.mechanisms.shield.active=false;
for(const a of S.actors){const selected=S.mode==='duo'||a.id===S.active;let x=0,j=false;if(selected){if(S.mode==='solo'){x=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);j=keys.w||keys.arrowup||keys[' '];}else if(a.id===0){x=(keys.d?1:0)-(keys.a?1:0);j=keys.w;}else{x=(keys.arrowright?1:0)-(keys.arrowleft?1:0);j=keys.arrowup;}x=touch[a.id]||x;j=j||jump[a.id];}a.vx=x*280;if(x)a.facing=x>0?1:-1;if(a.onGround)a.coyote=.10;else a.coyote-=dt;if(j&&a.coyote>0){a.vy=-590;a.coyote=0;a.onGround=false;burst(a.x+16,a.y+a.h,'#ccefff',6);}jump[a.id]=false;
const oldX=a.x;a.x+=a.vx*dt;for(const w of blockers())if(rect(a,w))a.x=a.vx>0?w.x-a.w:w.x+w.w;a.x=Math.max(0,Math.min(W-a.w,a.x));const foot=a.y+a.h;a.vy=Math.min(900,a.vy+1500*dt);a.y+=a.vy*dt;a.onGround=false;for(const p of [{x:0,y:G,w:W,h:80},...S.platforms,...S.movingPlatforms])if(a.vy>=0&&foot<=p.y+2&&a.y+a.h>=p.y&&a.x+a.w>p.x&&a.x<p.x+p.w){a.y=p.y-a.h;a.vy=0;a.onGround=true;}
for(const p of S.pools)if(!p.frozen&&(p.type==='water'||p.type!==a.type)&&rect(a,p))respawn(a);
for(const sp of S.springs)if(a.onGround&&Math.abs(a.x+16-sp.x)<30&&Math.abs(a.y+a.h-sp.y)<4){a.vy=sp.power;a.onGround=false;burst(sp.x,sp.y,'#ffe7a2');}
for(const gem of S.collected)if(!gem.collected&&gem.color===a.type&&near(a,gem.x,gem.y,40)){gem.collected=true;S.gems++;burst(gem.x,gem.y,gem.color==='ice'?'#7af4ff':'#ffb577',12);}
if(act[a.id]){interact(a);act[a.id]=false;}if(a.y>650)respawn(a);}
for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt*1.5;}particles=particles.filter(p=>p.life>0).slice(-220);
if(S.crystals.every(p=>p.charged)&&!S.mechanisms.shield?.active&&S.actors.every(a=>near(a,1120,475,65)))finish();}
function finish(){if(!S.running)return;S.running=false;S.stars=1+(S.gems===6?1:0)+(S.deaths===0&&S.time<150?1:0);E.recordCompletion('s'+S.stage,S.stars,S.time,S.gems);ui.classList.remove('playing');Lobby.reportFinished();Lobby.reportResult({stage:S.stage,stars:S.stars,win:true,coins:0,score:S.stars*100+S.gems*20,time:Math.floor(S.time),stats:{'用时':Math.floor(S.time)+'秒','星晶':S.gems+'/6','重生':S.deaths}});}
function glow(color,blur=14){c.shadowColor=color;c.shadowBlur=blur;c.fillStyle=color;}
function diamond(x,y,size,color){c.save();c.translate(x,y);glow(color);c.beginPath();c.moveTo(0,-size);c.lineTo(size*.65,0);c.lineTo(0,size);c.lineTo(-size*.65,0);c.closePath();c.fill();c.shadowBlur=0;c.strokeStyle='#ffffffab';c.stroke();c.restore();}
function stone(p){c.save();let g=c.createLinearGradient(0,p.y,0,p.y+35);g.addColorStop(0,'#63889c');g.addColorStop(.2,'#324b65');g.addColorStop(1,'#17243e');c.fillStyle=g;c.fillRect(p.x,p.y,p.w,p.h+14);c.strokeStyle='#9fe6e3';c.lineWidth=2;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+p.w,p.y);c.stroke();c.strokeStyle='#0d1b38';for(let x=p.x+30;x<p.x+p.w;x+=46){c.beginPath();c.moveTo(x,p.y+5);c.lineTo(x+3,p.y+p.h+12);c.stroke();}c.restore();}
function render(now){c.clearRect(0,0,W,H);if(art.bg.complete&&art.bg.naturalWidth)c.drawImage(art.bg,0,0,W,H);else{let g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,'#112d48');g.addColorStop(.5,'#231f45');g.addColorStop(1,'#67394c');c.fillStyle=g;c.fillRect(0,0,W,H);}c.fillStyle='#07102565';c.fillRect(0,0,W,H);
for(let i=0;i<7;i++){const x=i*210-30;c.fillStyle='#16294099';c.fillRect(x,130,35,390);c.fillStyle='#9bdbff25';c.fillRect(x,130,4,390);c.beginPath();c.arc(x+17,130,30,Math.PI,0);c.fill();}for(let i=0;i<36;i++){const x=(i*83+Math.sin(now*.0002+i)*25)%W,y=(i*71-now*.012)%H;c.fillStyle=i%2?'#ffcf9f77':'#92ecff88';c.beginPath();c.arc(x,y<0?y+H:y,1+i%2,0,7);c.fill();}
stone({x:0,y:G,w:W,h:80});if(!S.running&&!S.actors.length)return;
for(const p of S.platforms||[])stone(p);for(const mp of S.movingPlatforms||[])stone(mp);
for(const p of S.pools||[]){c.save();glow(p.frozen?'#b4f5ff':p.type==='fire'?'#ff8a67':'#4ccce9',20);c.fillRect(p.x,p.y,p.w,p.h);c.strokeStyle='#ffffffaa';c.beginPath();for(let x=0;x<p.w;x++){let y=p.y+Math.sin(x*.15+now*.006)*2;x?c.lineTo(p.x+x,y):c.moveTo(p.x+x,y);}c.stroke();c.restore();}
for(const wall of S.walls||[])if(!wall.melted){c.save();let g=c.createLinearGradient(wall.x,0,wall.x+wall.w,0);g.addColorStop(0,'#a2dff8aa');g.addColorStop(1,'#2f6699dd');c.fillStyle=g;c.fillRect(wall.x,wall.y,wall.w,wall.h);c.strokeStyle='#c1f8ff';c.strokeRect(wall.x,wall.y,wall.w,wall.h);for(let y=wall.y+20;y<wall.y+wall.h;y+=25){c.beginPath();c.moveTo(wall.x,y);c.lineTo(wall.x+wall.w,y+15);c.stroke();}c.restore();}
for(const [key,p]of Object.entries(S.mechanisms||{})){if(!p||Array.isArray(p)||!Number.isFinite(p.x))continue;if(key==='shield'){if(!p.active)continue;c.save();glow('#d4a1ff',25);c.globalAlpha=.5;c.fillRect(p.x,p.y,p.w,p.h);c.restore();continue;}if(key==='bridge')continue;c.save();glow(p.triggered||p.active?'#e1ffd2':'#efcf9a',14);c.beginPath();c.ellipse(p.x+(p.w||40)/2,510,(p.w||40)/2,7,0,0,7);c.fill();c.font='22px sans-serif';c.textAlign='center';c.fillText(key==='timedWall'?'◷':'◇',p.x+20,495);c.restore();}
for(const p of S.mechanisms?.shieldPedestal||[]){c.save();glow(p.charged?'#e8ffd2':p.type==='ice'?'#7adaff':'#ffaf74');c.fillRect(p.x-18,496,36,24);diamond(p.x,470,20,p.type==='ice'?'#7adaff':'#ffaf74');c.restore();}
for(const p of S.springs||[]){c.strokeStyle='#ffe594';c.lineWidth=4;c.beginPath();for(let i=0;i<8;i++)c.lineTo(p.x+(i%2?20:-20),p.y-i*3);c.stroke();}
for(const g of S.collected||[])if(!g.collected)diamond(g.x,g.y+Math.sin(now*.004+g.x)*3,10,g.color==='ice'?'#8fefff':'#ffd197');
for(const p of S.crystals||[]){diamond(p.x,p.y,22,p.charged?'#e5ffc0':p.type==='ice'?'#80dfff':'#ffb77a');c.fillStyle='#ffffffbc';c.font='12px sans-serif';c.textAlign='center';c.fillText(p.charged?'已共鸣':p.type==='ice'?'冰之晶石':'火之晶石',p.x,p.y+33);}
if(S.crystals){let open=S.crystals.every(p=>p.charged)&&!S.mechanisms.shield?.active;c.save();c.translate(1120,475);c.strokeStyle=open?'#e0c7ff':'#6875a6';glow(c.strokeStyle,25);c.fillStyle=open?'#a77aff55':'#18335b88';c.beginPath();c.ellipse(0,0,36,58,0,0,7);c.fill();c.lineWidth=4;c.stroke();c.rotate(now*.0006);for(let i=0;i<8;i++){c.rotate(Math.PI/4);diamond(0,-53,5,open?'#ffdca4':'#66759d');}c.restore();}
for(const a of S.actors){let color=a.type==='ice'?'#8ceaff':'#ffba8e';c.save();c.globalAlpha=.3;glow(color);c.beginPath();c.ellipse(a.x+16,a.y+a.h+2,26,6,0,0,7);c.fill();c.restore();const royal=S.skinId===(a.type==='ice'?'frost-royal':'ember-royal');const im=art[royal?(a.type+'Royal'):a.type];c.save();c.translate(a.x+16,a.y+a.h);c.scale(a.facing,1);const bob=a.onGround&&Math.abs(a.vx)>0?Math.sin(now*.018)*2:0;if(im.complete&&im.naturalWidth){let h=102,w=h*im.naturalWidth/im.naturalHeight;c.drawImage(im,-w/2,-h+bob,w,h);}else{c.fillStyle=color;c.fillRect(-12,-65,24,65);c.beginPath();c.arc(0,-75,12,0,7);c.fill();}c.restore();if(a.id===S.active||S.mode==='duo'){c.fillStyle=color;c.font='16px sans-serif';c.textAlign='center';c.fillText('▼',a.x+16,a.y-42);} }
for(const p of particles){c.globalAlpha=p.life;c.fillStyle=p.color;c.fillRect(p.x,p.y,3,3);}c.globalAlpha=1;
if(S.running){document.getElementById('twin-info').textContent=`${String(S.stage+1).padStart(2,'0')} · ${names[S.stage]}　◷ ${Math.floor(S.time)}　✧ ${S.gems}/6　${S.active?'烬遥':'岚汐'}`;}}
function frame(now){let dt=Math.min(.033,Math.max(0,(now-last)/1000));last=now;if(S.running&&!S.paused)update(dt);render(now);requestAnimationFrame(frame);}requestAnimationFrame(frame);
window.addEventListener('keydown',e=>{if(!S.running)return;let k=e.key.toLowerCase();if(['tab',' ','arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','e','enter'].includes(k))e.preventDefault();if(e.repeat&&['tab','e','enter','escape'].includes(k))return;keys[k]=true;if(k==='tab'&&S.mode==='solo')S.active=1-S.active;if(k==='e')act[S.mode==='duo'?0:S.active]=true;if(k==='enter')act[1]=true;if(k==='escape')pause();});window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);window.addEventListener('blur',()=>{keys={};touch=[0,0];if(S.running)pause();});
const pointers=new Map();canvas.addEventListener('pointerdown',e=>{if(!S.running||S.paused)return;canvas.setPointerCapture(e.pointerId);const r=canvas.getBoundingClientRect();let x=(e.clientX-r.left)/r.width*W;const id=S.mode==='solo'?S.active:x<W/2?0:1;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,id});});canvas.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;touch[p.id]=Math.max(-1,Math.min(1,(e.clientX-p.x)/45));if(p.y-e.clientY>35){jump[p.id]=true;p.y=e.clientY;}});for(const ev of ['pointerup','pointercancel'])canvas.addEventListener(ev,e=>{const p=pointers.get(e.pointerId);if(p)touch[p.id]=0;pointers.delete(e.pointerId);});
window.TwinEcho={start,state:()=>JSON.parse(JSON.stringify(S)),pause,home};
Lobby.init({id:'twin-echo',title:'双星回响',subtitle:'冰与火，不同的光也能彼此照亮',bg:['bg-space'],chars:[{id:'frost',name:'岚汐',img:'skin-lan-cool',chibi:'skin-lan-cool',stats:{}},{id:'ember',name:'烬遥',img:'skin-mo-cool',chibi:'skin-mo-cool',stats:{}}],skins:[{id:'frost-plain',char:'frost',name:'霜旅常服',rarity:'N',img:'skin-lan-cool'},{id:'ember-plain',char:'ember',name:'焰旅常服',rarity:'N',img:'skin-mo-cool'},{id:'frost-royal',char:'frost',name:'霜华星冠',rarity:'SSR',vip:true,img:'skin-lan-glam'},{id:'ember-royal',char:'ember',name:'烬曜流光',rarity:'SSR',vip:true,img:'skin-mo-glam'}],stages:names.map((name,i)=>({id:'s'+i,name,bg:'bg-space',desc:hints[i]})),modes:[{id:'solo',name:'单人切换'},{id:'duo',name:'同屏双人'}],currency:[{id:'coin',name:'金币',icon:'item-star'}],onStart:sel=>{start(sel.stage,sel.mode);S.skinId=sel.skinId;}});
})();
