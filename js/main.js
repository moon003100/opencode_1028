/* ============================================================
   放置天地 · 單機版 — 啟動
   ============================================================ */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  themeApply();
  initTitle();
  bindCreate();
  bindGame();
  resetCreate();

  // 建立角色頁返回
  document.querySelectorAll('[data-back]').forEach(b => {
    b.onclick = () => showScreen(b.dataset.back);
  });

  // 若已有存檔，預設顯示「繼續」
  if (hasSave()) {
    // 不自動載入，讓玩家自己按
  }
});
