const assert=require('node:assert/strict');const E=require('./engine.js');let count=0;
function eq(a,b){assert.deepEqual(a,b);count++}
const blank=n=>Array.from({length:n},()=>Array(n).fill(0));
for(const [line,want,gain] of [
 [[2,2,2,2],[4,4,0,0],8],[[4,4,8,0],[8,8,0,0],8],[[2,2,4,4],[4,8,0,0],12],[[2,0,2,2],[4,2,0,0],4],[[0,2,0,4],[2,4,0,0],0],[[1024,1024,0,0],[2048,0,0,0],2048],[[2048,2048,0,0],[4096,0,0,0],4096]]){
 const b=blank(4);b[0]=line;const original=JSON.stringify(b),r=E.slide(b,'left');eq(r.board[0],want);eq(r.gain,gain);eq(JSON.stringify(b),original);
 const right=blank(4);right[0]=[...line].reverse();eq(E.slide(right,'right').board[0],[...want].reverse());
 const vert=blank(4);line.forEach((v,i)=>vert[i][0]=v);eq(E.slide(vert,'up').board.map(r=>r[0]),want);
 const down=blank(4);[...line].reverse().forEach((v,i)=>down[i][0]=v);eq(E.slide(down,'down').board.map(r=>r[0]),[...want].reverse());
}
let b=blank(4);b[0][0]=2;eq(E.slide(b,'left').changed,false);eq(E.hasMoves(b),true);
const dead=[[2,4,2,4],[4,2,4,2],[2,4,2,4],[4,2,4,2]];eq(E.hasMoves(dead),false);dead[0][1]=2;eq(E.hasMoves(dead),true);
let c=blank(5);c[2]=[2,2,2,2,2];eq(E.slide(c,'left').board[2],[4,4,2,0,0]);
// Spawn contract: inspect exact value threshold independent of RNG call order.
for(const [v,want] of [[0,2],[.899999,2],[.9,4],[.999999,4]]){const r=E.spawn(blank(4),()=>v);eq(r.board.flat().filter(Boolean),[want]);}
// Exhaustively compare every small row with an independent pair-collapse oracle.
for(let x=0;x<256;x++){let n=x,line=[];for(let k=0;k<4;k++){line.push([0,2,4,8][n%4]);n=Math.floor(n/4)}const compact=line.filter(Boolean),want=[];let gain=0;for(let i=0;i<compact.length;i++){if(compact[i]===compact[i+1]){want.push(compact[i]*2);gain+=compact[i]*2;i++}else want.push(compact[i]);}while(want.length<4)want.push(0);const a=blank(4);a[0]=line;const r=E.slide(a,'left');eq(r.board[0],want);eq(r.gain,gain);}
// Conservation and source accounting in every direction on deterministic boards.
for(let seed=0;seed<200;seed++){
 const a=Array.from({length:4},(_,r)=>Array.from({length:4},(_,c)=>[0,2,4,8,16][(seed*(r+1)+c*7+r*3)%5]));
 for(const dir of ['left','right','up','down']){
  const out=E.slide(a,dir);eq(out.board.flat().reduce((x,y)=>x+y,0),a.flat().reduce((x,y)=>x+y,0));
  eq(out.motions.length,a.flat().filter(Boolean).length);
  const sourceSet=new Set(out.motions.map(m=>m.from.r+','+m.from.c));eq(sourceSet.size,out.motions.length);
  eq(out.gain,out.merges.reduce((sum,m)=>sum+m.value,0));
 }
}
console.log(JSON.stringify({assertions:count,status:'pass'}));
