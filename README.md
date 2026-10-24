# Songbase 歌曲库

多人协作的歌曲资料库：上传歌名、歌词、音频网址；按内容性质 / 速度 / 年代 / 熟悉度分类；关键词检索；管理员审核后入库；审核通过后所有用户实时收到通知。

技术栈全部可用免费方案：**Vite + React**（前端）+ **Supabase 免费套餐**（账号、PostgreSQL、行级权限、Realtime）。

## 你需要准备

1. Node.js（本项目按 Node 16+ 编写）
2. 一个 [Supabase](https://supabase.com) 账号，创建免费项目（免费套餐即可）

## 一次性配置 Supabase

1. 打开项目 **SQL Editor**，把 `supabase/schema.sql` 全部粘贴执行。若上传时报 `permission denied for table songs`，再执行一次 `supabase/fix-grants.sql`。若项目已经建好、现在要加上四维分类，再执行 `supabase/migrate-taxonomy.sql`。若要让管理员能删除已入库歌曲，再执行 `supabase/migrate-admin-delete.sql`。若要在歌曲详情页评论，再执行 `supabase/migrate-comments.sql`。
2. **Authentication → Providers** 确认 Email 已开启，并**关闭 Confirm email**（否则仅用户名注册会因收不到内部邮箱验证信而无法登录）。绑定真实邮箱是可选的，在登录后「账号」页操作。密码重置仅对已绑定真实邮箱的账号有效。URL Configuration 的 Site URL 设为 `http://localhost:5173`，Redirect URLs 加上 `http://localhost:5173` 和 `http://localhost:5173/**`。若项目已在运行，再执行 `supabase/migrate-username-login.sql`。
3. 在 **Project Settings → API** 复制 `Project URL` 和 `anon public` key。
4. 在项目根目录：

```bash
copy .env.example .env
```

填入：

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

5. 先让账号在网页或 App 里完成注册，再到 SQL Editor 把该用户提成管理员。**可以设多名管理员**，每人各执行一次（详见下面「设立管理员」）。

6. **Database → Replication** 确认 `songs` 和 `notifications` 已加入 `supabase_realtime`（脚本里已 `alter publication`；若报错说已存在可忽略）。

## 设立管理员

应用里没有「设管理员」按钮，必须在 Supabase **SQL Editor** 改 `profiles.role`。`role` 只有两种：`user`（默认）和 `admin`。**任意数量的账号都可以同时是管理员**，审核通知会发给每一位管理员。

1. 对方先用自己的**用户名**注册并成功登录一次（这样 `profiles` 里才会有这一行）。
2. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 你的项目 → 左侧 **SQL Editor** → New query。
3. 把下面的 `目标用户名` 换成对方在注册时填的用户名（大小写不敏感），然后 Run：

```sql
update public.profiles
set role = 'admin'
where lower(username) = lower('目标用户名');
```

4. 用下面语句确认结果。`role` 为 `admin` 即成功。对方**重新登录**（或刷新页面）后，导航里会出现「审核」。

```sql
select username, role, created_at
from public.profiles
order by username;
```

再设第二、第三个管理员时，重复第 1–4 步即可，把用户名换成另一个账号。不要改别人已有的 `admin` 行。

取消某人的管理员（变回普通用户）：

```sql
update public.profiles
set role = 'user'
where lower(username) = lower('目标用户名');
```

说明：

- 用用户名匹配即可，不必填邮箱。仅用户名注册时，Auth 里的邮箱是内部地址，不适合用来查找。
- 若该用户已在「账号」页绑定了真实邮箱，也可以按邮箱设管理员：

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

- 普通用户无法在网页里把自己改成管理员（数据库有触发器保护）。只有能打开 SQL Editor 的人（项目所有者）能改角色。

## 本地启动

```bash
cd C:\Users\xdkon\Projects\songbase
npm install
npm run dev
```

浏览器打开终端提示的地址（默认 http://localhost:5173 ）。

## 给别人用网页版（免费上线）

别人不能访问你电脑上的 `localhost`。需要把网站发布到网上，大家用同一个链接登录，数据和 App 仍是同一套 Supabase。

推荐用 **Cloudflare Pages**（免费，国内相对容易打开）。GitHub Pages 在国内有时打不开。

### 1. 发布到 Cloudflare Pages

1. 打开 [https://dash.cloudflare.com](https://dash.cloudflare.com) 注册/登录（可用邮箱）。  
2. 左侧 **Workers & Pages** → **Create** → **Pages** → 连接到 GitHub，选仓库 `Songbase-Android-APP`。  
3. 构建设置：  
   - Framework preset：无 / Vite  
   - Build command：`npm run build`  
   - Build output directory：`dist`  
4. **Environment variables** 增加（和本地 `.env` 一样）：  
   - `VITE_SUPABASE_URL`  
   - `VITE_SUPABASE_ANON_KEY`  
5. 保存并部署。完成后会得到类似 `https://xxxx.pages.dev` 的网址。把这个链接发给别人即可。

以后往 GitHub 推送代码，Cloudflare 一般会自动重新部署。

### 2. 在 Supabase 放行这个网址

打开 **Authentication → URL Configuration**：

- **Site URL** 改成你的线上地址，例如 `https://xxxx.pages.dev`  
- **Redirect URLs** 里同时加上（每行一个）：  
  - `https://xxxx.pages.dev`  
  - `https://xxxx.pages.dev/**`  
  - `http://localhost:5173`  
  - `http://localhost:5173/**`  

本地开发仍可保留 localhost。绑定邮箱、重置密码的跳转会用到这些地址。

### 3. 可选：GitHub Pages

仓库已包含 `.github/workflows/deploy-pages.yml`。

1. GitHub 仓库 → **Settings → Secrets and variables → Actions**，添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。  
2. **Settings → Pages** → Source 选 **GitHub Actions**。  
3. 推送代码或手动跑该 workflow。  
4. 地址形如 `https://connieKing511.github.io/Songbase-Android-APP/`，同样要加进 Supabase Redirect URLs。

把最终网址发给别人：用浏览器打开 → 注册/登录 → 即可用曲库。需要审核权限时，按上面「设立管理员」用 SQL 把对应**用户名**设为 `admin`（可设多人）。

## 打包成安卓 App（Capacitor）

网页功能会原样打进 APK，后端仍是同一套 Supabase。请先填好 `.env` 再打包，密钥会在 `npm run build` 时写进前端。

本机需要：[Android Studio](https://developer.android.com/studio)（含 Android SDK）。

```bash
cd C:\Users\xdkon\Projects\songbase
npm run build:android
npm run open:android
```

在 Android Studio 里：

1. 等待 Gradle 同步完成。
2. 选一台模拟器或用 USB 打开真机调试。
3. 点 Run（绿色三角）安装到设备。
4. 要安装包：菜单 **Build → Build Bundle(s) / APK(s) → Build APK(s)**，完成后点 locate 找到 `app-debug.apk`。

每次改完网页代码，再执行一次 `npm run build:android`，然后在 Android Studio 里重新 Run。不要只改网页却忘了 sync。

说明：App 内通知仍是应用里的实时消息，不是手机系统推送。电脑上的 `npm run dev` 不受影响。

## 打包成 iPhone App（Capacitor）

功能和安卓、网页相同，仍连同一套 Supabase。工程里已经有 `ios` 目录。

**必须在 Mac 上用 Xcode 编译。** Windows 不能生成可安装的 iOS 安装包（没有 Xcode / CocoaPods）。

在 Mac 上：

1. 安装 [Xcode](https://developer.apple.com/xcode/)（App Store），打开一次并同意许可。  
2. 安装 CocoaPods：`sudo gem install cocoapods`  
3. 把本项目拷到 Mac（或 git 拉取）。  
4. 填好 `.env` 后执行：

```bash
cd 项目目录
npm install
npm run build:ios
npm run open:ios
```

5. Xcode 顶部选你的 iPhone（用数据线连接，手机上信任此电脑）。  
6. 选中左侧 **App** 工程 → **Signing & Capabilities** → 勾选 **Automatically manage signing**，Team 选你的 Apple ID（免费账号可以把 App 装到自己的手机，大约每 7 天要重装一次）。  
7. 点 Run。第一次可能会提示在 iPhone：**设置 → 通用 → VPN 与设备管理** 里信任开发者证书。

要发给别人或上架 App Store，需要加入 [Apple Developer Program](https://developer.apple.com/programs/)（付费），用 Archive / TestFlight，不能像安卓那样随便拷一个 ipa。

每次改完网页，在 Mac 上再跑 `npm run build:ios`，然后 Xcode 里重新 Run。


## 功能对应

| 需求 | 实现 |
| --- | --- |
| 上传歌曲信息、歌词、音频 URL | `/upload` 表单写入 `songs` |
| 分类 + 关键词检索 | 内容性质、速度、年代；熟悉度由已带次数自动计算（0–15 不太熟悉，16–30 较熟悉，>30 熟悉） |
| 多用户 + 全员同步通知 | 审核通过时数据库触发器给每位用户写 `notifications`，前端 Realtime 订阅 |
| 管理员审核后入库 | `status`: pending → approved/rejected；仅 approved 出现在公共曲库 |
| 多名管理员 | `profiles.role = 'admin'`，按「设立管理员」对每个用户名各执行一次即可 |
| 歌曲评论 | 详情页发表评论，发出即公开；作者可删自己的，管理员可删任意评论 |

## 审核与通知流程

1. 任意用户提交 → 状态 `pending` → **所有管理员**收到「待审核」通知。
2. 管理员通过 → 状态 `approved` → **所有用户**收到「新歌入库」通知，曲库列表自动刷新。
3. 管理员拒绝 → 仅投稿人收到原因。

未审核内容不会进入公共曲库，避免未通过的资料同步给所有人。已入库歌曲的评论不经过审核。

## 免费额度说明

Supabase Free 包含数据库、Auth、Realtime。适合个人/小团队。暂停项目或超限时以官网说明为准。本仓库不包含付费 API 或商业字体授权以外的依赖（界面字体来自 Google Fonts）。
