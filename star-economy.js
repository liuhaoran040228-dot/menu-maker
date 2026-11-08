/* Shared economy adapter. No SDK, credentials, direct table writes or client-owned balances. */
(()=>{'use strict';
 const mockMode=new URLSearchParams(location.search).get('mock')==='1';
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const moneyCalls=new Set(['claim_daily','redeem_currency_code','buy_item','claim_task','draw_gacha']);
 const transactionsEnabled=()=>!mockMode&&window.STAR_SHOP_LIVE===true&&/(?:^|\/)(shop|tasks|gacha)\.html$/.test(location.pathname);
 const allowedEvents=new Set(['visit_shop','game_finished','chat_message_moderated']);
 function key(value){if(typeof value!=='string'||!uuid.test(value))throw Error('必须传入可重试复用的 UUID 事件标识');return value;}
 async function rpc(name,args={}){if(mockMode)throw Error('演示模式不会操作真实账号');if(moneyCalls.has(name)&&!transactionsEnabled())throw Error('此页面不开放星糖交易');const a=window.StarAccount;if(!a?.shopRequest)throw Error('账号组件未就绪');await a.ready;return a.shopRequest(name,args);}
 async function catalog(){if(mockMode)throw Error('演示模式不会读取真实账号');if(!window.StarAccount?.shopCatalog)throw Error('账号组件未就绪');await window.StarAccount.ready;return window.StarAccount.shopCatalog();}
 async function getOwned(){const [s,items]=await Promise.all([rpc('get_shop_state'),catalog()]);return {itemIds:[...s.inventory],outfitSetIds:items.filter(x=>x.category==='outfit'&&s.inventory.includes(x.id)).map(x=>x.id),equipped:{...s.equipped},vipTier:s.tier};}
 async function getOutfit(){const [s,items]=await Promise.all([rpc('get_shop_state'),catalog()]);const id=s.equipped.outfit||null,item=items.find(x=>x.id===id);return {setItemId:id,renderer:item?'illustration':null,assetKey:item?.asset_key||null,preview:item?.preview||null};}
 async function saveOutfit(outfit){if(!outfit||typeof outfit.setItemId!=='string'||outfit.parts)throw Error('当前仅支持已拥有的完整套装ID；分层部件接口尚未接通');const items=await catalog();if(!items.some(x=>x.id===outfit.setItemId&&x.category==='outfit'))throw Error('套装ID无效');const s=await rpc('equip_item',{item_id:outfit.setItemId});return {setItemId:s.equipped.outfit||null,equipped:s.equipped};}
// Local-only VIP perk adapter; no client date, tier calculation or currency mutation.

const CANONICAL_GAMES = [
  'space-shooter', 'snake', 'fighter', 'monster-loot', 'moe-runner',
  'lili-merge', 'lili-match', 'lili-2048', 'lili-fortune', 'lili-dressup',
  'xiuxian', 'story', 'survivor', 'td', 'twin-echo'
];

const GAME_ALIASES = {
  'shmup': 'space-shooter',
  'moetai': 'fighter',
  'lost-star': 'story',
  'star-survivor': 'survivor',
  'garden-guardians': 'td'
};

/**
 * Claim daily VIP perk for a game
 * @param {string} game - Game identifier (canonical or alias)
 * @returns {Promise<{ok: boolean, already_claimed: boolean, vip_level: number, reward: object, unavailable?: boolean, reason?: string}>}
 */
async function claimVipPerk(game) {
  // Validate game input
  const normalized = typeof game === 'string' ? GAME_ALIASES[game] || game : null;
  if (!CANONICAL_GAMES.includes(normalized)) {
    throw new Error(`Invalid game identifier: ${game}`);
  }

  const unavailable = reason => ({ok:false,already_claimed:false,vip_level:0,
    reward:{coin:0,gem:0,coin_bonus_pct:0,exclusive_skin_ids:[]},unavailable:true,reason});
  if (mockMode) return unavailable('mock_mode');
  if (typeof window.StarAccount?.shopRequest !== 'function') return unavailable('bridge_unavailable');
  try {
    return await rpc('claim_vip_perk', {p_game:game});
  } catch (error) {
    const code=error?.code, message=String(error?.message||'');
    const namesRpc=/\b(?:public\.)?claim_vip_perk(?:\b|\()/i.test(message);
    const missingWording=/does not exist|could not find (?:the )?function/i.test(message);
    if (namesRpc && (code==='PGRST202' || code==='42883' || (!code && missingWording)))
      return unavailable('rpc_unavailable');
    throw error;
  }
}

 window.StarEconomy=Object.freeze({version:1,enabled:()=>!mockMode&&Boolean(window.StarAccount?.shopRequest),transactionsEnabled,createEventKey:()=>crypto.randomUUID(),getWallet:()=>rpc('get_shop_state'),getOwned,getOutfit,saveOutfit,claimVipPerk,
 setPublicAppearance:enabled=>rpc('set_public_appearance',{enabled:Boolean(enabled)}),
 getPublicAppearance:userIds=>{if(userIds===undefined)return rpc('get_public_appearance');if(!Array.isArray(userIds)||userIds.length>64||userIds.some(x=>!uuid.test(x)))return Promise.reject(Error('最多查询64个有效用户ID'));return rpc('get_public_appearance',{target_user_ids:[...new Set(userIds)]});},
 reportTaskEvent:(eventType,idempotencyKey)=>{if(!allowedEvents.has(eventType))return Promise.reject(Error('不支持的任务事件'));return rpc('report_task_event',{event_type:eventType,idempotency_key:key(idempotencyKey)});},
 getTasks:()=>rpc('get_tasks'),claimTask:taskId=>rpc('claim_task',{task_id:taskId}),getGachaPool:()=>rpc('get_gacha_pool'),getGachaState:()=>rpc('get_gacha_state'),drawGacha:(count,requestId)=>{if(count!==1&&count!==10)return Promise.reject(Error('仅支持单抽或十连'));return rpc('draw_gacha',{draw_count:count,request_id:key(requestId)});}
 });
})();
