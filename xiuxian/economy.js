/* 修仙游戏内账本 v2。
   - 灵石/仙玉、法宝、丹药、材料都是本游戏内部资源，只存 localStorage，不走商城。
   - 衣橱部件归属也暂存本地：StarEconomy 合约 v1（shop/ADAPTER.md §D）只接受整套插画 setItemId，
     明确拒绝分层 parts，所以部件不能交给商城；等平台有部件校验接口后再接。
   - 平台对接只用 ../star-economy.js 的 reportTaskEvent('game_finished', uuid)：
     仅在一局秘境真正通关时上报，每局一个 UUID，存本地，超时可原样重试；失败永不阻塞游戏。 */
(function(){
  const KEY='xiuxian-econ-v1';
  const local={
    load(){try{return JSON.parse(localStorage.getItem(KEY))||null}catch(e){return null}},
    save(d){try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){}}
  };
  let d=local.load()||{cur:{lingshi:500,gem:100},owned:{},inv:{}};
  const listeners=[],events=[];
  const persist=()=>E.backend.save(d);
  const E={
    backend:local,
    balance:k=>d.cur[k]||0,
    add(k,n,reason){d.cur[k]=(d.cur[k]||0)+n;persist();E.emit('currency',{k,n,reason});return d.cur[k]},
    spend(k,n,reason){if((d.cur[k]||0)<n)return false;d.cur[k]-=n;persist();E.emit('currency',{k,n:-n,reason});return true},
    owns:id=>!!d.owned[id],
    grant(id,src){if(!d.owned[id]){d.owned[id]=Date.now();persist();E.emit('grant',{id,src})}},
    ownedList:()=>Object.keys(d.owned),
    invCount:id=>d.inv[id]||0,
    invAdd(id,n){d.inv[id]=Math.max(0,(d.inv[id]||0)+n);persist();return d.inv[id]},
    /* 结果/任务上报钩子：目前只在本地排队并广播 xiuxian:event，将来由平台适配层消费 */
    report(type,payload){const ev={type,payload,t:Date.now()};events.push(ev);if(events.length>100)events.shift();E.emit('report',ev);try{window.dispatchEvent(new CustomEvent('xiuxian:event',{detail:ev}))}catch(e){}},
    pending:()=>events.slice(),
    platformPending:()=>pend.slice(),
    on(fn){listeners.push(fn)},
    emit(t,p){listeners.forEach(f=>{try{f(t,p)}catch(e){}})},
    reset(){d={cur:{lingshi:500,gem:100},owned:{},inv:{}};persist()}
  };
  /* ---- StarEconomy bridge (low-trust task progress only) ---- */
  const PK='xiuxian-platform-pending-v1';
  let pend=[];try{pend=JSON.parse(localStorage.getItem(PK))||[]}catch(e){}
  const savePend=()=>{try{localStorage.setItem(PK,JSON.stringify(pend.slice(-10)))}catch(e){}};
  const SE=()=>window.StarEconomy;
  function flush(){
    const se=SE();if(!se||!se.enabled||!se.enabled()||!pend.length)return;
    pend.slice().forEach(p=>{
      se.reportTaskEvent('game_finished',p.key).then(r=>{pend=pend.filter(x=>x.key!==p.key);savePend();E.emit('platform',{ok:true,res:r})})
        .catch(err=>{const m=String(err&&err.message||err);
          // 不可重试的错误（未登录/演示模式/参数）直接丢弃，网络类保留下次重试
          if(/演示|未就绪|不支持|UUID/.test(m)||++p.tries>5){pend=pend.filter(x=>x.key!==p.key)}savePend();E.emit('platform',{ok:false,err:m})});
    });
  }
  function newKey(){try{return (window.StarEconomy&&StarEconomy.createEventKey)?StarEconomy.createEventKey():crypto.randomUUID()}catch(e){return null}}
  const _report=E.report;
  E.report=function(type,payload){
    _report(type,payload);
    if(type==='battle_result'&&payload&&payload.win){const k=newKey();if(k){pend.push({key:k,t:Date.now(),tries:0});savePend();flush()}}
  };
  setTimeout(flush,3000);
  window.XianEconomy=E;
})();
