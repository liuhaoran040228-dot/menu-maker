const E=require('./engine.js'),assert=require('node:assert/strict');let assertions=0;
const eq=(a,b)=>{assert.deepEqual(a,b);assertions++};
const make=(opts={})=>E.create({rng:()=>.4,...opts});
for(const mode of ['classic','levels','arena'])for(let level=0;level<6;level++){
 const s=make({mode,level});eq(s.player.body.length,4);eq(s.food.length,12);eq(new Set(s.food.map(f=>f.x+','+f.y)).size,12);eq(s.obstacles.some(p=>s.player.body.some(q=>p.x===q.x&&p.y===q.y)),false);
 for(const f of s.food){eq(f.x>=0&&f.x<s.cols&&f.y>=0&&f.y<s.rows,true);eq(s.obstacles.some(p=>p.x===f.x&&p.y===f.y),false);eq(s.player.body.some(p=>p.x===f.x&&p.y===f.y),false);}
 eq(s.ai.length,mode==='arena'?3:0);
}
let s=make();eq(E.turn(s,'left'),false);eq(E.turn(s,'up'),true);eq(E.turn(s,'down'),false);eq(E.turn(s,'left'),true);eq(E.turn(s,'down'),false);E.step(s);eq(s.player.dir,'up');eq(s.player.body[0],{x:6,y:14});E.step(s);eq(s.player.dir,'left');eq(s.player.body[0],{x:5,y:14});
for(const kind of ['berry','cake','star','speed','magnet','shield']){
 s=make();s.food=[{x:7,y:15,kind}];const events=E.step(s);eq(events[0].type,'eat');eq(s.player.body.length,5);eq(s.eaten,1);eq(s.combo,1);eq(s.score,{berry:10,cake:30,star:50,speed:15,magnet:15,shield:15}[kind]);if(['speed','magnet','shield'].includes(kind))eq(s.powers[kind]>0,true);
}
s=make();s.food=[{x:7,y:15,kind:'berry'},{x:8,y:15,kind:'berry'}];E.step(s);E.step(s);eq(s.combo,2);eq(s.score,30);eq(s.player.body.length,6);
s=make();s.food=[{x:7,y:15,kind:'star'}];E.step(s);E.step(s);E.step(s);eq(s.player.body.length,7);
s=make();s.food=[{x:8,y:14,kind:'cake'}];s.powers.magnet=7;const ev=E.step(s);eq(ev.some(e=>e.type==='eat'&&e.kind==='cake'),true);eq(s.score,30);
s=make();s.food=[];s.player.body=[{x:17,y:15},{x:16,y:15},{x:15,y:15}];s.player.prev=s.player.body;s.powers.shield=12;eq(E.step(s)[0].type,'shieldbreak');eq(s.phase,'playing');eq(s.player.alive,true);eq(s.powers.shield,0);eq(s.player.body[0],{x:17,y:15});eq(E.step(s)[0].type,'death');eq(s.phase,'dead');const score=s.score;eq(E.step(s),[]);eq(s.score,score);
// Moving into the vacated own tail is legal without pending growth.
s=make();s.player.body=[{x:3,y:3},{x:3,y:4},{x:2,y:4},{x:2,y:3}];s.player.dir='left';s.food=[{x:10,y:10,kind:'berry'}];E.step(s);eq(s.phase,'playing');eq(s.player.body[0],{x:2,y:3});
s=make();s.player.body=[{x:3,y:3},{x:3,y:4},{x:2,y:4},{x:2,y:3}];s.player.dir='left';s.player.grow=1;eq(E.step(s)[0].type,'death');
s=make({mode:'levels'});s.goal=1;s.food=[{x:7,y:15,kind:'berry'}];const win=E.step(s);eq(s.phase,'won');eq(win.some(e=>e.type==='win'),true);
s=make();const base=E.interval(s);s.powers.speed=7;eq(E.interval(s)<base,true);
// AI heads move and consume food; bounded respawns.
s=make({mode:'arena'});const start=s.ai.map(a=>JSON.stringify(a.body));E.step(s);eq(s.ai.some((a,i)=>JSON.stringify(a.body)!==start[i]),true);eq(s.ai.every(a=>a.body.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))),true);
// Full board spawning must terminate rather than loop forever.
s=make();s.obstacles=[];s.ai=[];s.player.body=[];for(let y=0;y<s.rows;y++)for(let x=0;x<s.cols;x++)s.player.body.push({x,y});s.food=[];eq(E.spawn(s,'berry'),false);
// Multi-seed arena stress, finite geometry, bounded actors/food and collision-safe spawns.
for(let seed=1;seed<=20;seed++){
 let r=seed;const rng=()=>{r=(Math.imul(r,1664525)+1013904223)>>>0;return r/4294967296};
 const a=make({mode:'arena',rng});
 for(let t=0;t<80 && a.phase==='playing';t++){
  const candidates=['up','right','down','left'];const h=a.player.body[0];
  if(!a.player.queue.length){for(const d of candidates){const v=E.DIR[d],p={x:h.x+v.x,y:h.y+v.y};if(!E.collision(a,a.player,p)&&E.turn(a,d))break;}}
  E.step(a,E.interval(a));
  eq(a.ai.length,3);eq(a.food.every(f=>f.x>=0&&f.x<a.cols&&f.y>=0&&f.y<a.rows),true);
  eq(a.player.body.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),true);
 }
}
console.log(JSON.stringify({status:'pass',assertions}));
