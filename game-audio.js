/* Original procedural PCM/WAV audio. Playback: self-hosted Howler (MIT). */
(function () {
  'use strict';
  const KEY = 'game-audio-v1';
  let settings = {muted:false, sfx:.65, bgm:.22};
  try { const saved=JSON.parse(localStorage.getItem(KEY)||'null'); if(saved) {settings.muted=saved.muted===true; for(const k of ['sfx','bgm']) if(Number.isFinite(saved[k])) settings[k]=Math.max(0,Math.min(1,saved[k]));} } catch (_) {}
  const supported=()=>typeof window.Howl==='function'&&!!window.Howler;
  const cache=new Map(), last=new Map();
  let unlocked=false, unlockAttempts=0, current=null, track=null, wantsMusic=false, pauseCheck=()=>false, button=null;
  const sequences={tap:[660],button:[520,780],swap:[400,600],invalid:[180,115],match:[520,660,780],combo:[660,830,990],merge:[330,495,660],eat:[740,990],levelup:[440,550,660,880],win:[523,659,784,1047],lose:[392,330,262,196],jump:[280,560],power:[330,660,990],drop:[440,220]};
  // Direct PCM rendering (no realtime oscillators, remote assets or copyrighted music).
  function wav(notes, step, music) {
    const rate=22050, frames=Math.ceil(notes.length*step*rate), buffer=new ArrayBuffer(44+frames*2), v=new DataView(buffer);
    const text=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
    text(0,'RIFF');v.setUint32(4,36+frames*2,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,frames*2,true);
    for(let i=0;i<frames;i++){
      const t=i/rate, n=Math.min(notes.length-1,Math.floor(t/step)), phase=t-n*step, f=notes[n];
      const env=Math.min(1,phase/.008)*Math.max(0,1-phase/step)**2;
      let sample=f? Math.sin(2*Math.PI*f*phase)+.2*Math.sin(2*Math.PI*f*2*phase):0;
      if(music) sample+=.25*Math.sin(2*Math.PI*(n%8<4?130.8128:174.6141)*phase);
      v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,sample*env*.3))*32767),true);
    }
    const bytes=new Uint8Array(buffer);let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return 'data:audio/wav;base64,'+btoa(raw);
  }
  function sound(name, music) {
    if(!supported())return null;
    const key=(music?'bgm:':'sfx:')+name;if(cache.has(key))return cache.get(key);
    try{
      let notes=sequences[name]||sequences.tap, step=.065;
      if(music){
        const tunes={ 'lili-2048':[523,0,659,784,659,0,587,0,440,0,523,659,587,0,392,0], snake:[392,523,0,659,587,0,523,440,392,0,440,523,659,587,0,523], 'lili-merge':[330,0,392,494,440,0,392,0,349,0,440,523,494,0,392,0] };
        notes=tunes[name]||tunes['lili-2048'];step=.29;
      }
      const howl=new Howl({src:[wav(notes,step,music)],format:['wav'],loop:!!music,volume:music?settings.bgm:settings.sfx,preload:true,onloaderror:()=>{},onplayerror:()=>{}});
      cache.set(key,howl);return howl;
    }catch(_){return null;}
  }
  function blocked(){try{return document.hidden||!!pauseCheck();}catch(_){return document.hidden;}}
  function sync(){
    try{
      for(const [key,h] of cache){h.mute(settings.muted);h.volume(key.startsWith('bgm:')?settings.bgm:settings.sfx);}
      if(track){if(!unlocked||!wantsMusic||settings.muted||blocked()){if(track.playing())track.pause();}else if(!track.playing())track.play();}
    }catch(_){}
    if(button){button.textContent=settings.muted?'🔇':'🔊';button.setAttribute('aria-pressed',String(settings.muted));button.setAttribute('aria-label',settings.muted?'开启声音':'静音');}
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_){}sync();}
  function unlock(){
    unlockAttempts++;
    if(!supported())return Promise.resolve(false);
    // Instantiation inside user gesture sets up Howler's own iOS silent-buffer unlock.
    sound('tap',false);
    try{
      const ctx=Howler.ctx;
      const resumed=ctx&&ctx.state!=='running'?ctx.resume():Promise.resolve();
      return Promise.resolve(resumed).then(()=>{unlocked=!ctx||ctx.state==='running';sync();return unlocked;}).catch(()=>false);
    }catch(_){return Promise.resolve(false);}
  }
  function sfx(name, options={}){
    if(!unlocked||settings.muted||document.hidden)return;
    const now=performance.now();if(now-(last.get(name)||-Infinity)<45)return;last.set(name,now);
    try{const h=sound(name,false);if(!h)return;const id=h.play();h.rate(Math.max(.6,Math.min(1.8,Number(options.rate)||1)),id);h.volume(settings.sfx,id);}catch(_){}
  }
  function bgm(game){if(current!==game){if(track)track.stop();current=game;track=sound(game,true);}wantsMusic=true;sync();}
  function stop(){wantsMusic=false;if(track)track.stop();}
  function mount(){
    if(button)return;button=document.createElement('button');button.id='game-audio-toggle';button.type='button';
    button.style.cssText='position:fixed;right:12px;top:calc(env(safe-area-inset-top,0px) + 70px);z-index:12000;width:40px;height:40px;border:1px solid #ffffff70;border-radius:50%;background:#152c4899;color:white;font-size:19px;touch-action:manipulation';
    button.onclick=()=>{settings.muted=!settings.muted;save();};document.body.append(button);sync();
  }
  for(const event of ['touchend','pointerdown','click','keydown'])document.addEventListener(event,()=>{if(!unlocked)unlock();},{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){for(const [key,h] of cache)try{if(key.startsWith('bgm:'))h.pause();else h.stop();}catch(_){}}sync();});
  document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('button,.lobby-side-icon,.lobby-tab'))sfx('button');});
  setInterval(sync,250);
  window.GameAudio=Object.freeze({unlock,sfx,bgm,stop,mount,
    mute(value){settings.muted=value===undefined?!settings.muted:!!value;save();return settings.muted;},
    volumes(value={}){for(const k of ['sfx','bgm'])if(Number.isFinite(value[k]))settings[k]=Math.max(0,Math.min(1,value[k]));save();return {...settings};},
    setPauseCheck(fn){pauseCheck=typeof fn==='function'?fn:()=>false;},
    status:()=>({available:supported(),unlocked,unlockAttempts,...settings,game:current,musicPlaying:!!track&&track.playing(),cached:cache.size})
  });
})();
