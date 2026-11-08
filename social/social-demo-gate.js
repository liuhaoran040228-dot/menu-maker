/* 本地演示闸门：仅当 location.hostname 严格为 127.0.0.1 或 localhost 且查询参数恰有一个 demo=1 时，才同步加载合成 fixture 与内存 mock。
   其他任何主机（线上、localhost.xxx 伪后缀、::1、127.0.0.2 等）一律不加载演示模块、不装 mock，页面走正常流程。 */
(function () {
  'use strict';
  var h = location.hostname, q = new URLSearchParams(location.search), d = q.getAll('demo');
  var on = (h === '127.0.0.1' || h === 'localhost') && d.length === 1 && d[0] === '1';
  if (!on) return;
  document.write('<script src="./demo-fixture.synthetic.js"><\/script><script src="./social-demo.js"><\/script>');
})();
