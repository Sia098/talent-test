/* ===================== 状态 ===================== */
let idx = 0;
const ans = new Array(Q.length).fill(null);
// 免费开放：无需密码校验，直接进入测试
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

function isMobileUA() {
  return navigator.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
function isWeChat() {
  return /MicroMessenger/i.test(navigator.userAgent);
}

function generateBlob() {
  if (typeof html2canvas !== 'function') return Promise.reject(new Error('no html2canvas'));
  return html2canvas($('capture'), { scale: 2, backgroundColor: '#f4f5fb', useCORS: true, logging: false })
    .then(canvas => new Promise(resolve => {
      if (canvas.toBlob) canvas.toBlob(b => resolve(b), 'image/png');
      else resolve(null);
    }));
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

// 兜底：显示长图，用户长按保存（微信 / 旧版 iOS 等不支持分享下载的环境）
function showImageFallback(blob) {
  if (modalImgURL) URL.revokeObjectURL(modalImgURL);
  modalImgURL = URL.createObjectURL(blob);
  $('img-result').src = modalImgURL;
  $('img-modal').classList.add('show');
}

function saveImage() {
  const proceed = blob => {
    if (!blob) { toast('生成失败，请重试'); return; }
    resultBlob = blob;
    // 微信内置浏览器：无法分享/下载，直接看图长按
    if (isWeChat()) { showImageFallback(blob); return; }
    const file = new File([blob], '我的天赋测试结果.png', { type: 'image/png' });
    // 移动端优先系统分享（iOS「存储图像」/ 安卓「保存到相册」）
    if (isMobileUA() && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: '我的天赋测试结果' }).catch(err => {
        if (err && err.name === 'AbortError') return;  // 用户取消
        showImageFallback(blob);                       // 分享失败 → 看图长按
      });
    } else if (isMobileUA()) {
      showImageFallback(blob);                         // 移动端不支持分享 → 看图长按
    } else {
      downloadBlob(blob);                              // 桌面端直接下载
    }
  };
  if (resultBlob) { proceed(resultBlob); return; }
  if (!preparing) preparing = generateBlob().catch(() => null);
  toast('正在生成结果长图…');
  preparing.then(proceed);
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
  // 免费开放：直接重新测试，无需再次校验
  ans.fill(null); idx = 0; renderQ(); show('screen-quiz');
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
if (!loadShared()) {
  show('screen-home');
}
