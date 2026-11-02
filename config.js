/* ============================================================
 * Supabase 配置 —— 部署前请替换下面两个值
 * 获取位置：Supabase 控制台 → 你的项目 → Project Settings → API
 *   - SUPABASE_URL：项目地址，形如 https://xxxx.supabase.co
 *   - SUPABASE_ANON：anon public key（可公开，安全，用于浏览器调用）
 * 这两个值本身是可以公开给前端的，无需保密。
 * ============================================================ */
window.SUPABASE_URL = 'https://ijzneurwsapcxambrdiz.supabase.co';
window.SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqem5ldXJ3c2FwY3hhbWJyZGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxOTg1MDgsImV4cCI6MjEwODc3NDUwOH0.jbw6eSdQo7GD9aObkcRvbJsRoTPvMmkt5S2ZuKTHfEA';

/* ============================================================
 * 访问链接签名密钥 + GitHub 仓库信息
 * 链接校验改为浏览器本地验签（不依赖 supabase，国内可用）。
 * LINK_SECRET 虽写在前端，但仅用于控制"链接能否进入"，不碰任何敏感数据。
 * 若要彻底作废所有已发链接，改掉这一串并重新部署即可（rotate secret）。
 * ============================================================ */
window.LINK_SECRET = '6dd11002828444dff66e491b8d9e4920570d4397cc7422cb0aaf095ead3f4136';
window.GH_OWNER = 'Sia098';
window.GH_REPO = 'talent-test';
window.GH_BRANCH = 'master';
