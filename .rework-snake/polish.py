from pathlib import Path
p=Path('.rework-snake/game.js');s=p.read_text();a=s.index('  function drawFood()');b=s.index('  function drawStar(',a)
s=s[:a]+'''  function drawFood(){
    if(!engine)return;
    const t=performance.now()/1000;
    for(const f of engine.food){const x=boardX+(f.x+.5)*cellSize,y=boardY+(f.y+.5)*cellSize,r=cellSize*.32;
      CTX.save();CTX.translate(x,y);
      const colors={berry:'#f7ae92',cake:'#f2c9d0',star:'#ffe3a2',speed:'#a2e9c9',magnet:'#c9b3ef',shield:'#a7d8f4'},color=colors[f.kind];
      const aura=CTX.createRadialGradient(0,0,0,0,0,r*2.2);aura.addColorStop(0,color+'50');aura.addColorStop(1,color+'00');CTX.fillStyle=aura;CTX.beginPath();CTX.arc(0,0,r*2.2,0,Math.PI*2);CTX.fill();
      if(f.kind==='berry'){
        const g=CTX.createRadialGradient(-r*.3,-r*.4,0,0,0,r);g.addColorStop(0,'#ffe0ae');g.addColorStop(.5,'#efa47d');g.addColorStop(1,'#bc6476');CTX.fillStyle=g;CTX.beginPath();CTX.arc(0,0,r,0,Math.PI*2);CTX.fill();
        CTX.fillStyle='#b1d4a9';CTX.beginPath();CTX.ellipse(r*.2,-r*.9,r*.5,r*.2,-.5,0,Math.PI*2);CTX.fill();CTX.fillStyle='#fff8';CTX.beginPath();CTX.ellipse(-r*.25,-r*.3,r*.2,r*.1,-.8,0,Math.PI*2);CTX.fill();
      }else if(f.kind==='cake'){
        CTX.fillStyle='#bd858e';roundRect(-r,-r*.5,r*2,r*1.4,r*.25);CTX.fill();CTX.fillStyle='#fae8ce';roundRect(-r,-r*.8,r*2,r*.85,r*.3);CTX.fill();CTX.fillStyle='#efacae';CTX.fillRect(-r*.85,r*.15,r*1.7,r*.24);CTX.fillStyle='#d88b9c';CTX.beginPath();CTX.arc(0,-r*.9,r*.35,0,Math.PI*2);CTX.fill();
      }else if(f.kind==='star'){
        CTX.rotate(Math.sin(t+f.x)*.12);drawStar(0,0,r*1.1,'#f5d68f');drawStar(-r*.1,-r*.1,r*.65,'#fff2c9');
      }else{
        CTX.fillStyle='#244359';CTX.strokeStyle=color;CTX.lineWidth=1.1;CTX.beginPath();CTX.arc(0,0,r*1.15,0,Math.PI*2);CTX.fill();CTX.stroke();CTX.strokeStyle=color;CTX.fillStyle=color;CTX.lineWidth=1.6;
        if(f.kind==='speed'){CTX.beginPath();CTX.moveTo(r*.2,-r*.8);CTX.lineTo(-r*.5,r*.1);CTX.lineTo(r*.1,r*.1);CTX.lineTo(-r*.2,r*.8);CTX.lineTo(r*.6,-r*.15);CTX.lineTo(0,-r*.15);CTX.closePath();CTX.fill();}
        else if(f.kind==='magnet'){CTX.beginPath();CTX.moveTo(-r*.5,-r*.6);CTX.lineTo(-r*.5,r*.2);CTX.quadraticCurveTo(0,r*.9,r*.5,r*.2);CTX.lineTo(r*.5,-r*.6);CTX.stroke();}
        else{CTX.beginPath();CTX.moveTo(0,-r*.7);CTX.lineTo(r*.65,-r*.3);CTX.lineTo(r*.5,r*.35);CTX.lineTo(0,r*.8);CTX.lineTo(-r*.5,r*.35);CTX.lineTo(-r*.65,-r*.3);CTX.closePath();CTX.stroke();}
      }CTX.restore();
    }
  }

'''+s[b:]
s=s.replace("    CTX.strokeStyle=colors[1];CTX.lineWidth=cellSize*.73;", "    if(player&&engine.powers.speed>0){CTX.strokeStyle='#b9ebf33d';CTX.lineWidth=cellSize;CTX.beginPath();points.forEach((p,i)=>i?CTX.lineTo(p.x,p.y):CTX.moveTo(p.x,p.y));CTX.stroke();}\n    CTX.strokeStyle=colors[1];CTX.lineWidth=cellSize*.73;")
# guard pointer input before the start gesture, but allow direct drag changes only on primary pointer.
s=s.replace("gameState.touchId = e.pointerId;", "gameState.touchId = e.pointerId;",1)
p.write_text(s)
