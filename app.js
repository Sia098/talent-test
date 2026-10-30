/* ===================== 状态 ===================== */
let idx = 0;
const ans = new Array(Q.length).fill(null);
let globalToken = null;                       // 当前有效访问 token（无则未授权，不可答题）
const RESULT_TTL = 7 * 24 * 60 * 60 * 1000;   // 结果本地保留 7 天（重进链接直接展示）
let autoTimer = null;
let hoverTimer = null;      // 跳题后短暂抑制 hover 高亮，避免"上一题的紫色残留"观感

const $ = (id) => document.getElementById(id);

function show(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(screenId).classList.add('active');
  window.scrollTo(0, 0);
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ===================== 首页：落地页（免费开放，无需密码） ===================== */
$('startBtn').addEventListener('click', startTest);

function startTest() {
  ans.fill(null);
  idx = 0;
  renderQ();
  show('screen-quiz');
}

/* ===================== 答题 ===================== */
function renderQ() {
  if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  $('qcount').textContent = `第 ${idx + 1} / ${Q.length} 题`;
  $('qnum').textContent = 'QUESTION ' + String(idx + 1).padStart(2, '0');
  $('qtitle').textContent = Q[idx].q;
  const box = $('qopts');
  box.innerHTML = '';
  // 换题瞬间关掉 hover 高亮，防止鼠标残留位置把新选项"点亮"
  box.classList.add('nohover');
  if (hoverTimer) clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => box.classList.remove('nohover'), 450);
  const keys = ['A', 'B', 'C', 'D', 'E'];
  Q[idx].o.forEach((txt, i) => {
    const b = document.createElement('button');
    b.className = 'opt' + (ans[idx] === i ? ' sel' : '');
    b.innerHTML = `<span class="k">${keys[i]}</span><span>${txt}</span>`;
    b.onclick = () => {
      ans[idx] = i;
      document.querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
      b.classList.add('sel');
      // 选完自动跳到下一题（或结果页）
      if (autoTimer) clearTimeout(autoTimer);
      autoTimer = setTimeout(advance, 320);
    };
    box.appendChild(b);
  });
  $('bar').style.width = (idx / Q.length * 100) + '%';
  $('prevBtn').style.visibility = idx === 0 ? 'hidden' : 'visible';
  $('nextBtn').textContent = idx === Q.length - 1 ? '查看结果 →' : '下一题';
  $('nextBtn').onclick = () => {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    if (ans[idx] === null) { toast('先选一个最像你的吧～'); return; }
    advance();
  };
  $('prevBtn').onclick = () => {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    if (idx > 0) { idx--; renderQ(); }
  };
}

function advance() {
  if (ans[idx] === null) { toast('先选一个最像你的吧～'); return; }
  if (idx < Q.length - 1) { idx++; renderQ(); }
  else renderResult(ans);
}

/* ===================== 结果计算 + 渲染 ===================== */
function computeResult(answers) {
  const score = {};
  ORDER.forEach(k => score[k] = 0);
  answers.forEach((a, i) => {
    if (a === null || a === undefined) return;
    const kk = Q[i].k[a];
    if (kk && score[kk] !== undefined) score[kk] += 1;
  });
  const sorted = ORDER.map(k => ({ k, v: score[k] })).sort((a, b) => b.v - a.v);
  const top3 = sorted.slice(0, 3);
  const lowest = sorted[sorted.length - 1];
  const prim = top3[0].k, sec = top3[1].k;
  const T = TYPES[prim], S = TYPES[sec];
  const maxV = Math.max(...ORDER.map(k => score[k]), 1);
  const rel = {};
  ORDER.forEach(k => rel[k] = score[k] / maxV);
  const MAXD = {};
  Q.forEach(q => q.k.forEach(k => { if (k) MAXD[k] = (MAXD[k] || 0) + 1; }));
  const pctOf = (k, v) => Math.round(v / (MAXD[k] || 12) * 100) + '%';
  return { score, sorted, top3, lowest, prim, sec, T, S, rel, pctOf };
}

function renderResult(answers) {
  const R = computeResult(answers);
  const { prim, sec, T, S, top3, lowest, rel, pctOf } = R;

  $('radar').innerHTML = radarSVG(rel);

  let dr = '';
  top3.forEach((t, i) => {
    const rank = ['最强', '第二', '第三'][i];
    dr += `<div class="dr"><b>${DIMS[t.k].emoji} ${DIMS[t.k].full} · ${rank}（${pctOf(t.k, t.v)}）</b><br>${DIMREAD[t.k].hi}</div>`;
  });
  dr += `<div class="dr low"><b>${DIMS[lowest.k].emoji} ${DIMS[lowest.k].full} · 相对待开发（${pctOf(lowest.k, lowest.v)}）</b><br>${DIMREAD[lowest.k].lo} 这不是短板，只是你最不常走的那条路——需要时可以刻意调用。</div>`;
  $('r-dimread').innerHTML = dr;

  $('r-emoji').textContent = DIMS[prim].emoji;
  $('r-name').textContent = T.name;
  $('r-tag').textContent = T.tag;
  $('r-desc').textContent = T.desc;
  $('r-combo').innerHTML =
    `<div class="combo-main">天赋组合：${T.name} × ${S.name}</div>` +
    `<div class="combo-sub">主天赋「${DIMS[prim].full}」　副天赋「${DIMS[sec].full}」</div>`;

  const pp = $('r-persona'); pp.innerHTML = '';
  T.persona.forEach(p => {
    const d = document.createElement('div');
    d.className = 'pitem';
    d.innerHTML = `<span class="plabel">${p.l}</span><span class="ptext">${p.t}</span>`;
    pp.appendChild(d);
  });

  const dl = $('r-detail'); dl.innerHTML = '';
  T.detail.forEach(t => { const li = document.createElement('li'); li.textContent = t; dl.appendChild(li); });

  $('r-stack').innerHTML =
    `你的主天赋是<b>${DIMS[prim].full}</b>，副天赋是<b>${DIMS[sec].full}</b>。<br>${T.stack}<br><br>` +
    `再加上「${DIMS[sec].name}」这一层，${S.tag.replace(/。$/, '')}——所以你不只是${DIMS[prim].name}型，还带着${DIMS[sec].name}型的底色，这也是为什么你常觉得自己「有点矛盾」。`;

  const bl = $('r-blind'); bl.innerHTML = '';
  T.blind.forEach(b => {
    const d = document.createElement('div');
    d.className = 'blind-sec';
    d.innerHTML = `<div class="bw">⚠️ ${b.w}</div><div class="bc">${b.c}</div><div class="bf">💡 怎么补：${b.f}</div>`;
    bl.appendChild(d);
  });

  $('th-title').textContent = T.th;
  $('th-theory').textContent = T.theory;
  $('th-fact').textContent = T.fact;

  const chips = $('d-chips'); chips.innerHTML = '';
  T.jobs.forEach(j => { const c = document.createElement('span'); c.className = 'chip'; c.textContent = j; chips.appendChild(c); });

  $('r-waste').textContent = T.waste;

  // 把结果写入可分享链接（?r= 编码答案）
  setShareURL(answers);
  // 授权访问（带有效 token）时，把结果缓存到本地，7 天内重进链接直接展示
  if (globalToken) saveLocalResult(globalToken, answers);

  show('screen-result');

  // 后台预生成长图，点「保存结果」时可直接保存/分享（无需等待）
  setTimeout(prepareResultImage, 400);
}

function setShareURL(answers) {
  try {
    const enc = btoa(JSON.stringify(answers));
    const url = location.pathname + '?r=' + encodeURIComponent(enc);
    history.replaceState(null, '', url);
  } catch (e) { /* 忽略 */ }
}

/* ===================== 结果页交互 ===================== */
$('saveBtn').addEventListener('click', saveImage);
$('copyBtn').addEventListener('click', copyLink);
$('retakeBtn').addEventListener('click', retake);

/* 结果长图：渲染后预生成；普通浏览器直接保存/分享，微信等环境看图长按兜底 */
let resultBlob = null;      // 预生成的 PNG
let preparing = null;       // 进行中的生成 Promise
let modalImgURL = '';       // 兜底看图的 objectURL

$('imgClose').addEventListener('click', () => { $('img-modal').classList.remove('show'); });
$('imgDownload').addEventListener('click', () => { if (resultBlob) downloadBlob(resultBlob); });
$('imgSave').addEventListener('click', saveImageToAlbum);

function isMobileUA() {
  return navigator.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
function isWeChat() {
  return /MicroMessenger/i.test(navigator.userAgent);
}

// 把内联 SVG 转成 dataURL（html2canvas 在 Safari 下不渲染内联 SVG）
function svgToDataURL(svgEl) {
  try {
    const xml = new XMLSerializer().serializeToString(svgEl);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  } catch (e) { return null; }
}

// 截图前，把 #radar 里的内联 SVG 同步替换成已加载完成的 <img>（等待加载+超时兜底，防卡死）
function replaceRadarSvgWithImage() {
  const svgEl = $('capture').querySelector('#radar svg');
  if (!svgEl || svgEl.dataset.replaced) return Promise.resolve();
  const url = svgToDataURL(svgEl);
  if (!url) return Promise.resolve();
  return Promise.race([
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const r = svgEl.getBoundingClientRect();
        img.style.width = (r.width || 300) + 'px';
        img.style.height = (r.height || 300) + 'px';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        svgEl.replaceWith(img);
        img.dataset.replaced = '1';
        resolve();
      };
      img.onerror = () => resolve();
      img.src = url;
    }),
    new Promise(resolve => setTimeout(resolve, 1500))   // 1.5s 超时兜底，绝不卡死
  ]);
}

function html2canvasToBlob(canvas) {
  return new Promise(resolve => {
    if (canvas.toBlob) {
      canvas.toBlob(b => resolve(b), 'image/png');
    } else {
      try {
        const d = canvas.toDataURL('image/png');
        if (d && d.indexOf('data:image') === 0) {
          fetch(d).then(r => r.blob()).then(resolve).catch(() => resolve(null));
        } else resolve(null);
      } catch (e) { resolve(null); }
    }
  });
}

function generateBlob() {
  if (typeof html2canvas !== 'function') return Promise.resolve(null);
  const node = $('capture');
  const w = node.offsetWidth || window.innerWidth;
  return replaceRadarSvgWithImage().then(() => {
    return html2canvas(node, {
      scale: Math.max(2, window.devicePixelRatio || 1),
      backgroundColor: '#f4f5fb',
      useCORS: true,
      logging: false,
      windowWidth: w
    });
  }).then(canvas => html2canvasToBlob(canvas)).catch(() => null);
}

function prepareResultImage() {
  resultBlob = null;
  preparing = generateBlob().then(b => { resultBlob = b; return b; }).catch(() => null);
}

function downloadBlob(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = '我的天赋测试结果.png';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 6000);
  toast('已保存，请到相册/下载查看');
}

// 把长图放进弹窗并显示
function showLongImage(blob) {
  if (modalImgURL) URL.revokeObjectURL(modalImgURL);
  modalImgURL = URL.createObjectURL(blob);
  $('img-result').src = modalImgURL;
  $('img-modal').classList.add('show');
}

// 点"保存结果"：先立即弹出长图预览（保证一定能看到），再异步填充截图
function saveImage() {
  $('img-modal').classList.add('show');      // 立即弹窗，绝不因截图失败而不出现
  const fill = blob => {
    if (blob) { resultBlob = blob; showLongImage(blob); }
    else toast('生成长图失败，请稍后重试');
  };
  if (resultBlob) { fill(resultBlob); return; }
  if (!preparing) preparing = generateBlob().then(b => { resultBlob = b; return b; }).catch(() => null);
  toast('正在生成结果长图…');
  preparing.then(fill);
}

// 弹窗内"保存到相册"：移动端走系统分享（可一键存图），否则回退下载
function saveImageToAlbum() {
  if (!resultBlob) return;
  const file = new File([resultBlob], '我的天赋测试结果.png', { type: 'image/png' });
  if (!isWeChat() && isMobileUA() && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: '我的天赋测试结果' }).catch(() => {});
  } else {
    downloadBlob(resultBlob);
  }
}

function copyLink() {
  const url = location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => toast('结果链接已复制，去分享吧～')).catch(() => fallbackCopy(url));
  } else fallbackCopy(url);
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.top = '-100px';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); toast('结果链接已复制'); }
  catch (e) { toast('复制失败，请手动复制地址栏链接'); }
  ta.remove();
}

function retake() {
  if (globalToken) clearLocalResult(globalToken);  // 清掉本地结果缓存（结果 7 天有效期重置）
  show('screen-home');                             // 先回到"开始测试"页，不直接进入第一题
}

/* ===================== 分享链接打开（免密查看） ===================== */
function loadShared() {
  const m = location.search.match(/[?&]r=([^&]+)/);
  if (!m) return false;
  try {
    const answers = JSON.parse(atob(decodeURIComponent(m[1])));
    if (!Array.isArray(answers) || answers.length !== Q.length) return false;
    renderResult(answers);
    return true;
  } catch (e) { return false; }
}

/* ===================== 启动 ===================== */
(function boot() {
  // 分享链接优先：?r= 编码答案，免密直接看结果（不消耗 token 授权）
  if (loadShared()) return;

  // 否则必须带有效 token 访问链接
  const m = location.search.match(/[?&]t=([^&]+)/);
  if (!m) { showInvalid('请通过有效的测试链接打开本页面'); return; }
  verifyLink(decodeURIComponent(m[1]));
})();

function supaHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': window.SUPABASE_ANON,
    'Authorization': 'Bearer ' + window.SUPABASE_ANON
  };
}

// 链接无效 / 过期 / 作废 时展示的提示页
function showInvalid(msg) {
  const el = $('invalid-msg');
  if (el) el.textContent = msg || '该测试链接无效，请联系卖家获取';
  show('screen-invalid');
}

// 校验访问链接（存在 / 未作废 / 未过期）
function verifyLink(token) {
  fetch(window.SUPABASE_URL + '/rest/v1/rpc/verify_link', {
    method: 'POST',
    headers: supaHeaders(),
    body: JSON.stringify({ p_token: token })
  }).then(r => r.json()).then(d => {
    if (d && d.ok) {
      globalToken = token;
      const saved = loadLocalResult(token);
      if (saved) { renderResult(saved); return; }   // 7 天内有结果 → 直接展示，跳过答题
      show('screen-home');
    } else {
      const msg = d && d.reason === 'expired' ? '该测试链接已过期，请联系卖家获取新链接'
                 : d && d.reason === 'revoked' ? '该测试链接已被卖家作废，请联系卖家获取新链接'
                 : '该测试链接无效，请联系卖家获取';
      showInvalid(msg);
    }
  }).catch(() => showInvalid('网络异常，请刷新页面重试'));
}

/* ---- 本地结果缓存（按 token 关联，7 天有效）---- */
function resultKey(token) { return 'tt_res_' + token; }
function saveLocalResult(token, answers) {
  try { localStorage.setItem(resultKey(token), JSON.stringify({ a: answers, ts: Date.now() })); } catch (e) {}
}
function loadLocalResult(token) {
  try {
    const raw = localStorage.getItem(resultKey(token));
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !Array.isArray(o.a) || o.a.length !== Q.length) return null;
    if (Date.now() - o.ts > RESULT_TTL) { localStorage.removeItem(resultKey(token)); return null; }
    return o.a;
  } catch (e) { return null; }
}
function clearLocalResult(token) {
  try { localStorage.removeItem(resultKey(token)); } catch (e) {}
}
