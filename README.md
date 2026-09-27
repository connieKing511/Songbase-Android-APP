# Songbase 歌曲库

多人协作的歌曲资料库：上传歌名、歌词、音频网址；按内容性质 / 速度 / 年代 / 熟悉度分类；关键词检索；管理员审核后入库；审核通过后所有用户实时收到通知。

技术栈全部可用免费方案：**Vite + React**（前端）+ **Supabase 免费套餐**（账号、PostgreSQL、行级权限、Realtime）。

## 你需要准备

1. Node.js（本项目按 Node 16+ 编写）
2. 一个 [Supabase](https://supabase.com) 账号，创建免费项目（免费套餐即可）

## 一次性配置 Supabase

1. 打开项目 **SQL Editor**，把 `supabase/schema.sql` 全部粘贴执行。若上传时报 `permission denied for table songs`，再执行一次 `supabase/fix-grants.sql`。若项目已经建好、现在要加上四维分类，再执行 `supabase/migrate-taxonomy.sql`。若要让管理员能删除已入库歌曲，再执行 `supabase/migrate-admin-delete.sql`。
2. **Authentication → Providers** 确认 Email 已开启。若收不到验证信，可暂时关闭 Confirm email；上线建议打开邮箱确认。
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

5. 先注册一个账号，再到 SQL Editor 把该用户提成管理员（可设多名）：

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

6. **Database → Replication** 确认 `songs` 和 `notifications` 已加入 `supabase_realtime`（脚本里已 `alter publication`；若报错说已存在可忽略）。

## 本地启动

```bash
cd C:\Users\xdkon\Projects\songbase
npm install
npm run dev
```

浏览器打开终端提示的地址（默认 http://localhost:5173 ）。

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


## 功能对应

| 需求 | 实现 |
| --- | --- |
| 上传歌曲信息、歌词、音频 URL | `/upload` 表单写入 `songs` |
| 分类 + 关键词检索 | 内容性质、速度、年代；熟悉度由已带次数自动计算（0–15 不太熟悉，16–30 较熟悉，>30 熟悉） |
| 多用户 + 全员同步通知 | 审核通过时数据库触发器给每位用户写 `notifications`，前端 Realtime 订阅 |
| 管理员审核后入库 | `status`: pending → approved/rejected；仅 approved 出现在公共曲库 |
| 多名管理员 | `profiles.role = 'admin'`，用上面的 SQL 可设多人 |

## 审核与通知流程

1. 任意用户提交 → 状态 `pending` → **所有管理员**收到「待审核」通知。
2. 管理员通过 → 状态 `approved` → **所有用户**收到「新歌入库」通知，曲库列表自动刷新。
3. 管理员拒绝 → 仅投稿人收到原因。

未审核内容不会进入公共曲库，避免未通过的资料同步给所有人。

## 免费额度说明

Supabase Free 包含数据库、Auth、Realtime。适合个人/小团队。暂停项目或超限时以官网说明为准。本仓库不包含付费 API 或商业字体授权以外的依赖（界面字体来自 Google Fonts）。
