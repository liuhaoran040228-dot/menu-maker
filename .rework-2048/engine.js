/* Original pure 2048 rules. Values are actual powers of two, not exponents. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.Puzzle2048=factory();})(typeof self!=='undefined'?self:this,function(){
'use strict';
const clone=b=>b.map(r=>r.slice());
function slide(board,dir){
 const n=board.length,out=Array.from({length:n},()=>Array(n).fill(0)),motions=[],merges=[];let gain=0;
 if(!['left','right','up','down'].includes(dir))return{board:clone(board),gain:0,changed:false,motions:[],merges:[]};
 const coord=(line,i)=>dir==='left'?{r:line,c:i}:dir==='right'?{r:line,c:n-1-i}:dir==='up'?{r:i,c:line}:{r:n-1-i,c:line};
 for(let line=0;line<n;line++){
  const cells=[];for(let i=0;i<n;i++){const p=coord(line,i),value=board[p.r][p.c];if(value)cells.push({from:p,value});}
  let dest=0;
  for(let i=0;i<cells.length;i++,dest++){
   const a=cells[i],to=coord(line,dest);let value=a.value;
   motions.push({from:a.from,to,value:a.value});
   if(i+1<cells.length&&a.value===cells[i+1].value){const b=cells[++i];value*=2;gain+=value;motions.push({from:b.from,to,value:b.value});merges.push({...to,value});}
   out[to.r][to.c]=value;
  }
 }
 return{board:out,gain,changed:out.some((row,r)=>row.some((v,c)=>v!==board[r][c])),motions,merges};
}
function spawn(board,rng=Math.random){const next=clone(board),empty=[];next.forEach((row,r)=>row.forEach((v,c)=>{if(!v)empty.push({r,c})}));if(!empty.length)return{board:next,tile:null};const value=rng()<.9?2:4;const p=empty[Math.min(empty.length-1,Math.max(0,Math.floor(rng()*empty.length)))];next[p.r][p.c]=value;return{board:next,tile:{...p,value}};}
function hasMoves(board){return board.some((row,r)=>row.some((v,c)=>!v||(c+1<row.length&&v===row[c+1])||(r+1<board.length&&v===board[r+1][c])));}
return Object.freeze({slide,spawn,hasMoves});
});
