/* Game-side facade only. Waits for the existing asynchronous account bridge.
 * Never constructs a client, reads tokens, or enables STAR_GAME_INVITE_REAL.
 */
(function (root) {
  'use strict';
  // vip.js boots account.js asynchronously. Publish readiness, never a fake client.
  var bridge, timer, deadline, resolveReady, done = false;
  root.StarInviteBridgeReady = new Promise(function (resolve) { resolveReady = resolve; });
  function pending() {
    console.info('[star-invite-bridge-adapter] bridge pending: waiting for StarAccountBridge; no invite client created.');
  }
  function cleanup() { clearInterval(timer); clearTimeout(deadline); root.removeEventListener('vipchange', check); }
  function check() {
    var candidate = root.StarAccountBridge;
    if (done || !candidate || typeof candidate.getUser !== 'function' || typeof candidate.rpc !== 'function') return;
    done = true; bridge = candidate; cleanup(); install(); resolveReady(root.StarGameInviteClient);
  }
  function install() {
  function currentBridge() {
    if (root.StarAccountBridge !== bridge) {
      throw Object.assign(new Error('Account bridge changed; reload before continuing.'), {code: 'CLIENT_CHANGED'});
    }
    return bridge;
  }
  root.StarGameInviteClient = Object.freeze({
    auth: Object.freeze({
      getUser: async function () {
        try {
          // Always ask the bridge again, including after sign-out/account switches.
          var user = await currentBridge().getUser();
          currentBridge();
          if (user !== null && (!user || typeof user.id !== 'string' || !user.id)) {
            throw Object.assign(new Error('Invalid account bridge user.'), {code: 'INVALID_RESPONSE'});
          }
          return {data: {user: user}, error: null};
        } catch (error) {
          return {data: {user: null}, error: error};
        }
      }
    }),
    rpc: function (name, args) {
      // Preserve arguments, receiver and response; the account bridge owns its allowlist.
      return currentBridge().rpc(name, args);
    }
  });
  }
  check();
  if (!done) {
    pending();
    timer = setInterval(check, 100);
    root.addEventListener('vipchange', check);
    deadline = setTimeout(function () {
      if (done) return;
      done = true; cleanup(); pending(); resolveReady(null);
      // Stay pending after timeout. Reload once the account bootstrap is repaired.
    }, 5000);
  }
})(window);
