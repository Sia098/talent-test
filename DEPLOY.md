# 部署指南：GitHub Pages（前端）+ Supabase（后端/数据库）

本目录就是 GitHub Pages 要用的**静态站点**（已 `git init` 并提交）。
后端密码校验 + 用量统计搬到 Supabase，前端通过 Supabase 的公开 REST 接口调用，
无需自建服务器，常驻、免费、全球可访问。

> 标注 🔐 的步骤需要你**登录/注册对应账号**操作；其余可由你或我执行。

---

## ✅ 当前进度（2026-10-28）

- **Supabase 后端：已完成并由我实配。** 项目 `ijzneurwsapcxambrdiz` 已建表 + 校验函数 + 导入 53 个密码（总剩余 154 次），`config.js` 已填入真实 `SUPABASE_URL` 与 `anon` key 并提交。已实测：有效码→放行、错码→invalid、用满→exhausted，全部正常。
- **⚠️ 安全动作（请你现在做）**：把刚才给我用的 Supabase Personal Access Token 删掉 ——
  打开 https://supabase.com/dashboard/account/tokens ，找到那条 token 点 **Delete / Revoke**。
  它只是配置时用的临时钥匙，删掉不影响网站和数据库。
- **只剩 GitHub Pages 发布**（见第三节），需要你登录 GitHub 操作。

---

## 一、Supabase（后端 + 数据库）🔐 —— ✅ 已完成

> 这一步已由我操作完成，你无需再做。仅作记录：
> 1. 打开 https://supabase.com ，用 GitHub 注册/登录，新建一个 Project（地区任选，比如 Asia）。
> 2. 进入左侧 **SQL Editor** → **New query**，把本仓库 `supabase/verify_password.sql`
>    的**全部内容**粘贴进去，点 **Run**。它会自动：建表、创建校验函数、导入现有的 53 个密码及已用次数。
> 3. 进入 **Project Settings → API**，复制两项：
>    - `Project URL`（形如 `https://xxxx.supabase.co`）
>    - `anon` / `public` 的 **Project API key**（这一把 key 本就可公开，安全）
> 4. CORS：Supabase 数据接口默认允许跨域（`*`），GitHub Pages 直接可调用，无需额外配置。

---

## 二、填入配置 —— ✅ 已完成

`config.js` 已由我填入真实 `SUPABASE_URL` 与 `anon` key 并提交（commit `44dea57`），
你不需要再改。如要查看，它就是：

```js
window.SUPABASE_URL = 'https://ijzneurwsapcxambrdiz.supabase.co';
window.SUPABASE_ANON = 'eyJhbGci...';   // 已填入真实 anon key
```

---

## 三、GitHub Pages（前端）🔐

1. 登录 GitHub，新建一个**公开**仓库（名字随意，例如 `talent-test`）。
2. 在本机这个目录里，把远程指向上面的仓库并推送：

   ```bash
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin master
   ```

   > 如果 git 提示要登录：用 `gh auth login` 走 GitHub CLI，或推送时在弹窗里用
   > **Personal Access Token**（不是账号密码）登录。

3. 仓库页面 → **Settings → Pages**：
   - Source（来源）：**Deploy from a branch**
   - Branch（分支）：选 **master**，目录选 **/ (root)**
   - 点 Save。
4. 等 1–2 分钟构建完成，访问 `https://<你的用户名>.github.io/<仓库名>/` 即可。
   如果仓库名就是 `<用户名>.github.io`，则地址是 `https://<用户名>.github.io/`。

---

## 四、验证是否成功

1. 打开网站，输入任意一个 4 位密码（如 `7661`），应进入答题页。
2. 连续错输一个不存在的密码，应提示「密码不正确」。
3. 同一个密码输入第 4 次，应提示「测试次数已用完」（每个密码 3 次）。
4. 在 Supabase 控制台 **Table Editor → passwords** 里可以看到 `used` 在增长。

---

## 五、以后怎么加密码 / 查剩余次数

- **加密码**：在 Supabase **Table Editor → passwords** 直接新增一行
  （`code` 填新密码，`max_uses` 填 3，`used` 填 0）；或写一条
  `insert into public.passwords (code, max_uses, used) values ('新密码', 3, 0);` 在 SQL Editor 运行。
- **查剩余次数**：`remaining = max_uses - used`，在 Table Editor 里一眼可见；
  也可运行 `select code, max_uses, used, max_uses-used as remaining from public.passwords order by code;`
- **重置某个密码**：把对应行的 `used` 改回 0 即可。

---

## 六、密码管理后台（admin.html）🔐

`admin.html` 是一个独立的后台页面，**地址**：`https://<你的用户名>.github.io/<仓库名>/admin.html`

功能：输入管理员密码后，可 **查看所有密码的剩余次数**、**一键重置全部（清零 used）**、**重置单个**、**新增密码**。

> 安全设计：管理员密码以 bcrypt 哈希存于 Supabase 的 `admin_config` 表；
> 前端只用 `anon` key，拿不到密码表、也拿不到明文。所有后台操作都经过带密码校验的 RPC。

**上线这一页需要两步（均已准备好，待授权执行）：**

1. 在 Supabase **SQL Editor** 运行本仓库的 `supabase/admin.sql`
   （建 `admin_config` 表 + 4 个受保护函数：`admin_list` / `admin_reset_one` / `admin_reset_all` / `admin_add`）。
2. 把本仓库的 `admin.html` 推送到 GitHub（已包含在部署目录，随下次 push 上线）。

**管理员密码**：部署时已用随机强密码初始化（随机值见交付说明，不在任何仓库文件中明文保存）。
如需改成你自己的，在 Supabase SQL Editor 执行（把 `你的新密码` 换掉即可，哈希自动重算）：
`update public.admin_config set pw_hash = crypt('你的新密码', gen_salt('bf')) where id = 1;`

---

## 备注

- **本地测试**：`config.js` 还是占位符时，前端会自动回退到同源的 `node server.js`
  的 `/api/verify`（密码在 `config/passwords.json`、`data/usage.json`）。
  所以本地直接 `cd talent-site && node server.js` 打开 `http://localhost:3000` 就能测，
  无需先配 Supabase。把 `config.js` 填好真实值后，才会走 Supabase。
- 本地 `talent-site/`（含 `server.js`）与本 GitHub Pages 版本共用同一套题目与结果逻辑，
  只是后端实现不同（一个是 Node，一个是 Supabase）。
- 分享链接（`?r=` 编码答案）是纯前端渲染，**不需要后端**，任何人打开都能看结果。
