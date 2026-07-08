# 多鄰國風格教科書學習系統

把教科書內容轉換成解鎖式學習路徑、知識圖譜與遊戲化機制（XP、等級、連勝、生命值、成就）的學習平台。架構參考了 [Athena](https://github.com/devjoshi0/Athena) 的資料模型與內容產生流程，但簡化為單機可跑、不需外部服務的版本。

系統支援**多學科、多教科書**：首頁會列出所有已匯入的課程，依 `Course.subject` 分組（例如 Chemistry、Biology），每本教科書是一個 `Course`，底下的每一章是一個 `Unit`。

目前已匯入的課程：`prisma/seed/organic-chemistry-ch1-4.json` —— 改編自 Clayden《Organic Chemistry》第 1–4 章（有機化學導論、有機結構、測定有機結構、分子結構），翻譯成繁體中文，共 4 個單元、11 堂課、19 個知識圖譜概念、35 道題目。

## 技術棧

- **Next.js 14**（App Router）+ TypeScript + Tailwind CSS
- **Prisma ORM** + **PostgreSQL**
- 自製輕量 email/password 認證（bcrypt + JWT cookie，無第三方 auth 服務）
- **Cytoscape.js** 呈現知識圖譜
- 課程內容以 JSON 檔匯入，不需要背景佇列或即時呼叫 AI API

## 本機開發

需要一個可連線的 PostgreSQL（本機安裝，或直接用下面部署章節申請的免費雲端資料庫）。

```bash
npm install
cp .env.example .env        # 填入 DATABASE_URL、DIRECT_URL 與 JWT_SECRET
npx prisma migrate dev      # 建立資料表
npm run db:seed -- prisma/seed/organic-chemistry-ch1-4.json
npm run dev
```

本機開發用同一個資料庫時，`DATABASE_URL` 跟 `DIRECT_URL` 可以填一樣的值；只有部署到 Neon 這類「連線池／直連分開」的雲端 Postgres 時，兩者才需要不同（見下方部署章節）。

開啟 http://localhost:3000，註冊帳號後就會進入學習路徑。

## 部署到正式環境（Vercel + Postgres）

這是一個完整全端應用（有登入、資料庫、伺服器端 API），**不能部署到 GitHub Pages**——GitHub Pages 只能放靜態網頁，跑不動 API routes 跟資料庫。以下是免費、最簡單的正式部署方式。

### 1. 申請一個免費的 PostgreSQL（擇一）

- [Neon](https://neon.tech)：新增 Project 後，到 Connect 畫面**分別複製兩組連線字串**：
  - 有勾選「Connection pooling」的（網址裡有 `-pooler`）→ 這個是 `DATABASE_URL`
  - 沒勾選的直連字串（網址裡沒有 `-pooler`）→ 這個是 `DIRECT_URL`
- [Supabase](https://supabase.com)：Settings → Database 底下同樣有 "Transaction pooler"（給 `DATABASE_URL`）跟 "Direct connection"（給 `DIRECT_URL`）兩種字串

**用連線池的字串當 `DATABASE_URL` 這件事很重要**：Vercel 每次請求都可能是全新的伺服器執行個體，如果 `DATABASE_URL` 用直連字串，每次讀寫資料庫都要重新建立一條全新連線，會讓網站變得很慢；直連字串只給 `DIRECT_URL` 在建置時執行資料庫遷移用。

### 2. 建立 Vercel 專案

1. 到 [vercel.com](https://vercel.com) 用 GitHub 帳號登入
2. 「Add New… → Project」，選擇 `chloeyeh0709-byte/campbell_biology_duolingo` 這個 repo（**注意**：如果之前已經 import 過一次，直接選那個既有專案繼續用，不要每次都重新 import，否則會建出好幾個不同網址的專案）
3. Branch 選 `claude/athena-repo-review-hyuqw1`（或先把它合併到 `main`）
4. 在 Environment Variables 設定：
   - `DATABASE_URL`：連線池（pooler）字串，記得在結尾加上 `&pgbouncer=true`
   - `DIRECT_URL`：直連字串
   - `JWT_SECRET`：隨便一段夠長的隨機字串（例如用 `openssl rand -base64 32` 產生）
5. 按下 Deploy。建置時會自動執行 `prisma migrate deploy` 建立資料表（見 `package.json` 的 `build` 腳本）。

### 3. 匯入課程內容（部署完成後，只需執行一次）

在本機，把 `.env` 的 `DATABASE_URL` 暫時換成 Vercel 專案用的那組正式資料庫連線字串（連線池版本即可，已經有 `pgbouncer=true`），然後執行：

```bash
npm run db:seed -- prisma/seed/organic-chemistry-ch1-4.json
```

跑完後記得把 `.env` 的 `DATABASE_URL` 換回本機開發用的資料庫。如果你手邊沒有能跑 `npm` 指令的環境，也可以請 Claude 幫你在專案裡臨時加一個受密碼保護的匯入 API route，從瀏覽器觸發匯入，完成後記得請它移除該 route。

完成後，Vercel 給你的網址就是正式可用、任何人都能打開、帳號與進度會確實存起來的網站。

## 匯入教科書內容

課程內容以 `prisma/seed/curriculum-schema.ts` 定義的 JSON 格式描述（單元 → 課程 → 投影片/題目，加上知識圖譜的概念與關係）。一本書可以分好幾次、分好幾份 JSON 陸續匯入新章節。

```bash
npm run db:seed -- path/to/your-chapter.json
```

**預設是安全的增量匯入**：如果 `title` 跟現有課程相同，不會整個砍掉重建，而是：
- 概念（concept）依名稱比對，同名的直接沿用既有的，不會重複建立
- 章節（unit）依標題比對，同名的整個跳過（假設已經匯入過，避免影響已有進度）；只有標題還沒出現過的新章節會被加進去，排在既有章節後面

也就是說，同一本書想陸續加新章節，直接把新章節放進同一個 `title`、同一份 JSON（或新的 JSON 檔案，只要 `title` 一樣）再跑一次 `db:seed` 就好，已經在讀的人進度不會被清掉。

**只有真的想砍掉重來**（例如調整範例內容、測試用途）時，才加上 `--replace`：

```bash
npm run db:seed -- path/to/your-chapter.json --replace
```

新增一本全新的教科書、或全新的學科，就準備一份新的 JSON、換一個 `title`（`subject` 也可以換成新學科名稱），一樣執行 `npm run db:seed -- path/to/new-book.json`，首頁會自動列出來，不需要額外設定。

## 資料模型重點

- `Course → Unit → Lesson → LessonSlide / Question`：學習路徑的主結構
- `Concept / ConceptEdge`：知識圖譜節點與關係（PREREQUISITE / RELATED / EXTENDS / CONTRASTS / PART_OF）
- `UserConceptMastery`：每個使用者對每個概念的熟練度（獨立於 Concept，因為同一門課可能有多個帳號一起使用）
- `UserLessonProgress` / `UserCourseProgress`：課程進度與正確率。`UserCourseProgress` 不會在註冊時就幫每個人建好每一門課的紀錄，而是使用者第一次在該課程完成一堂課時才建立（見 `syncCourseProgress`），首頁的課程總覽是即時算 `UserLessonProgress` 的完成數，不依賴這筆紀錄是否存在
- 課程解鎖邏輯：下一堂課只有在前一堂課被標記為 `COMPLETED`/`PERFECT` 後才會解鎖（見 `src/lib/roadmap.ts`）
- 遊戲化邏輯（等級曲線、連勝、生命值恢復、成就解鎖）集中在 `src/lib/gamification.ts`

原本該用 enum 的欄位（`LessonType`、`QuestionType`、`MasteryStatus` 等）目前都存成字串（這個專案一開始是先在 SQLite 上開發，SQLite 沒有原生 enum，後來才切到 Postgres，但沿用了字串設計以減少變動），實際的合法值定義在 `src/lib/enums.ts`。
