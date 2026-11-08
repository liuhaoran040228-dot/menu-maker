/* Original grid-snake rules; rendering and platform rewards are deliberately separate. */
(function(root,make){if(typeof module==='object'&&module.exports)module.exports=make();else root.SnakeEngine=make();})(typeof self!=='undefined'?self:this,function(){
'use strict';
const DIR={up:{x:0,y:-1},right:{x:1,y:0},down:{x:0,y:1},left:{x:-1,y:0}};
const key=p=>p.x+','+p.y,eq=(a,b)=>a.x===b.x&&a.y===b.y,copy=a=>a.map(p=>({...p}));
const kinds=['berry','cake','star','speed','magnet','shield'];
const LEVELS=[{name:'潮汐花园',goal:12,theme:'ocean'},{name:'琉璃回廊',goal:18,theme:'forest'},{name:'星月迷湾',goal:24,theme:'night'},{name:'珊瑚之径',goal:30,theme:'ocean'},{name:'幻光迷林',goal:36,theme:'forest'},{name:'群星回响',goal:42,theme:'night'}];
function occupied(s,ignoreFood=false){const set=new Set(s.obstacles.map(key));for(const a of [s.player,...s.ai])if(a.alive)a.body.forEach(p=>set.add(key(p)));if(!ignoreFood)s.food.forEach(p=>set.add(key(p)));return set;}
function free(s){const used=occupied(s),cells=[];for(let y=0;y<s.rows;y++)for(let x=0;x<s.cols;x++)if(!used.has(x+','+y))cells.push({x,y});if(!cells.length)return null;return cells[Math.min(cells.length-1,Math.floor((s.rng||Math.random)()*cells.length))];}
function spawn(s,kind){const p=free(s);if(!p)return false;s.food.push({...p,kind:kind||kinds[Math.floor((s.rng||Math.random)()*kinds.length)]});return true;}
function actor(x,y,dir,id){return{id,body:[{x,y},{x:x-1,y},{x:x-2,y},{x:x-3,y}],prev:[],dir,queue:[],grow:0,alive:true};}
function create(options={}){
 const mode=['classic','levels','arena'].includes(options.mode)?options.mode:'classic',level=Math.max(0,Math.min(5,Math.floor(options.level)||0));
 const s={cols:18,rows:26,mode,level,rng:options.rng||Math.random,player:actor(6,15,'right','player'),ai:[],obstacles:[],food:[],score:0,eaten:0,combo:0,lastEat:-999,time:0,ticks:0,phase:'playing',powers:{speed:0,magnet:0,shield:0},goal:mode==='levels'?LEVELS[level].goal:null};
 s.player.prev=copy(s.player.body);
 if(mode==='levels'){
  for(let k=0;k<=level;k++)for(let x=4;x<14;x++)if(x!==7+k%4)s.obstacles.push({x,y:4+k*3});
  // Starting corridor and board edges always remain clear.
  s.obstacles=s.obstacles.filter(p=>!(p.y>=14&&p.y<=16&&p.x<10));
 }
 if(mode==='arena'){s.ai=[actor(12,5,'down','a0'),actor(12,21,'up','a1'),actor(5,8,'right','a2')];s.ai.forEach(a=>a.prev=copy(a.body));}
 kinds.forEach(k=>spawn(s,k));while(s.food.length<12&&spawn(s,'berry')){}
 return s;
}
function turn(s,dir){if(s.phase!=='playing'||!DIR[dir])return false;const a=s.player,last=a.queue.length?a.queue[a.queue.length-1]:a.dir;if(last===dir||DIR[last].x===-DIR[dir].x&&DIR[last].y===-DIR[dir].y||a.queue.length>=2)return false;a.queue.push(dir);return true;}
function outside(s,p){return p.x<0||p.x>=s.cols||p.y<0||p.y>=s.rows;}
function collision(s,a,p){if(outside(s,p)||s.obstacles.some(q=>eq(p,q)))return true;for(const other of [s.player,...s.ai]){if(!other.alive)continue;const body=other===a&&a.grow===0?other.body.slice(0,-1):other.body;if(body.some(q=>eq(p,q)))return true;}return false;}
function chooseAI(s,a){const head=a.body[0],targets=s.food.filter(f=>!['speed','magnet','shield'].includes(f.kind)),target=targets.sort((p,q)=>Math.abs(p.x-head.x)+Math.abs(p.y-head.y)-Math.abs(q.x-head.x)-Math.abs(q.y-head.y))[0];const dirs=Object.keys(DIR).filter(d=>!(DIR[d].x===-DIR[a.dir].x&&DIR[d].y===-DIR[a.dir].y));let best=null,rank=Infinity;for(const d of dirs){const p={x:head.x+DIR[d].x,y:head.y+DIR[d].y};if(collision(s,a,p))continue;const cost=(target?Math.abs(p.x-target.x)+Math.abs(p.y-target.y):0)+(d!==a.dir?.15:0);if(cost<rank){rank=cost;best=d;}}return best||a.dir;}
function collect(s,f,events){const index=s.food.indexOf(f);if(index<0)return;s.food.splice(index,1);s.combo=s.time-s.lastEat<=3?Math.min(8,s.combo+1):1;s.lastEat=s.time;const normal=['berry','cake','star'].includes(f.kind);const points={berry:10,cake:30,star:50,speed:15,magnet:15,shield:15}[f.kind]||10;const growth={berry:1,cake:2,star:3}[f.kind]||1;s.score+=points*s.combo;s.player.grow+=growth;s.eaten++;if(!normal)s.powers[f.kind]=f.kind==='shield'?12:7;events.push({type:'eat',kind:f.kind,x:f.x,y:f.y,value:points*s.combo,combo:s.combo,growth});spawn(s,(s.rng||Math.random)()<.65?'berry':null);}
function step(s,dt=.16){const events=[];if(s.phase!=='playing')return events;s.time+=dt;s.ticks++;for(const k of Object.keys(s.powers))s.powers[k]=Math.max(0,s.powers[k]-dt);if(s.time-s.lastEat>3)s.combo=0;
 const actors=[s.player,...s.ai].filter(a=>a.alive),plans=[];for(const a of actors){a.prev=copy(a.body);if(a===s.player){if(a.queue.length)a.dir=a.queue.shift();}else a.dir=chooseAI(s,a);const d=DIR[a.dir];plans.push({a,p:{x:a.body[0].x+d.x,y:a.body[0].y+d.y}});}
 // All collisions are assessed before moving any actor; head-on cells kill both.
 for(const plan of plans){const{a,p}=plan;plan.blocked=collision(s,a,p)||plans.some(q=>q!==plan&&eq(q.p,p));}
 for(const{a,p,blocked}of plans){
  if(blocked){if(a===s.player&&s.powers.shield>0){s.powers.shield=0;events.push({type:'shieldbreak',x:a.body[0].x,y:a.body[0].y});continue;}a.alive=false;events.push({type:a===s.player?'death':'aideath',x:a.body[0].x,y:a.body[0].y});if(a===s.player)s.phase='dead';else for(const q of a.body.filter((_,i)=>i%2===0))if(!s.food.some(f=>eq(f,q)))s.food.push({...q,kind:'berry'});continue;}
  a.body.unshift(p);
  if(a===s.player){const f=s.food.find(f=>eq(f,p));if(f)collect(s,f,events);if(s.powers.magnet>0){const near=s.food.find(f=>Math.abs(f.x-p.x)+Math.abs(f.y-p.y)<=3);if(near)collect(s,near,events);}}
  else{const f=s.food.find(f=>eq(f,p));if(f){s.food.splice(s.food.indexOf(f),1);a.grow++;spawn(s,'berry');}}
  if(a.grow>0)a.grow--;else a.body.pop();
 }
 if(s.phase==='playing'&&s.goal!==null&&s.eaten>=s.goal){s.phase='won';events.push({type:'win'});}
 if(s.phase==='playing'&&s.food.length===0&&!free(s)){s.phase='won';events.push({type:'win'});}
 if(s.mode==='arena'&&s.ticks%25===0){for(const a of s.ai)if(!a.alive){const pos=free(s);if(pos){a.body=[pos];a.prev=copy(a.body);a.dir='up';a.grow=3;a.queue=[];a.alive=true;}}}
 return events;
}
function interval(s){return Math.max(.095,.205-Math.min(s.eaten,45)*.0018)*(s.powers.speed>0?.65:1);}
return Object.freeze({create,turn,step,interval,collision,spawn,LEVELS,DIR});
});
