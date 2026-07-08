# 多鄰國風格教科書學習系統

把教科書內容轉換成解鎖式學習路徑、知識圖譜與遊戲化機制（XP、等級、連勝、生命值、成就）的學習平台。架構參考了 [Athena](https://github.com/devjoshi0/Athena) 的資料模型與內容產生流程，但簡化為單機可跑、不需外部服務的版本。

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
cp .env.example .env        # 填入 DATABASE_URL 與 JWT_SECRET
npx prisma migrate dev      # 建立資料表
npm run db:seed -- prisma/seed/organic-chemistry-ch1-4.json
npm run dev
```

開啟 http://localhost:3000，註冊帳號後就會進入學習路徑。

## 部署到正式環境（Vercel + Postgres）

這是一個完整全端應用（有登入、資料庫、伺服器端 API），**不能部署到 GitHub Pages**——GitHub Pages 只能放靜態網頁，跑不動 API routes 跟資料庫。以下是免費、最簡單的正式部署方式。

### 1. 申請一個免費的 PostgreSQL（擇一）

- [Supabase](https://supabase.com)：新增 Project，在 Settings → Database 找到 Connection string（選 "URI" 格式，記得把 `[YOUR-PASSWORD]` 換成你設定的密碼）
- [Neon](https://neon.tech)：新增 Project 後直接會給你一組 `postgresql://...` 連線字串

拿到形如 `postgresql://user:password@host:5432/dbname` 的連線字串備用。

### 2. 建立 Vercel 專案

1. 到 [vercel.com](https://vercel.com) 用 GitHub 帳號登入
2. 「Add New… → Project」，選擇 `chloeyeh0709-byte/campbell_biology_duolingo` 這個 repo
3. Branch 選 `claude/athena-repo-review-hyuqw1`（或先把它合併到 `main`）
4. 在 Environment Variables 設定：
   - `DATABASE_URL`：上一步拿到的 Postgres 連線字串
   - `JWT_SECRET`：隨便一段夠長的隨機字串（例如用 `openssl rand -base64 32` 產生）
5. 按下 Deploy。建置時會自動執行 `prisma migrate deploy` 建立資料表（見 `package.json` 的 `build` 腳本）。

### 3. 匯入課程內容（部署完成後，只需執行一次）

在本機，把 `.env` 的 `DATABASE_URL` 暫時換成 Vercel 專案用的那組正式資料庫連線字串，然後執行：

```bash
npm run db:seed -- prisma/seed/organic-chemistry-ch1-4.json
```

跑完後記得把 `.env` 的 `DATABASE_URL` 換回本機開發用的資料庫。

完成後，Vercel 給你的網址（例如 `https://campbell-biology-duolingo.vercel.app`）就是正式可用、任何人都能打開、帳號與進度會確實存起來的網站。

## 匯入教科書內容

課程內容以 `prisma/seed/curriculum-schema.ts` 定義的 JSON 格式描述（單元 → 課程 → 投影片/題目，加上知識圖譜的概念與關係）。要匯入新章節：

1. 依照 schema 準備一份 JSON（可參考 `prisma/seed/sample-curriculum.json` 或實際已匯入的 `prisma/seed/organic-chemistry-ch1-4.json`）
2. 執行 `npm run db:seed -- path/to/your-chapter.json`

若已存在同名課程（`title` 相同），會先整個刪除再重新建立，方便反覆調整內容。

## 資料模型重點

- `Course → Unit → Lesson → LessonSlide / Question`：學習路徑的主結構
- `Concept / ConceptEdge`：知識圖譜節點與關係（PREREQUISITE / RELATED / EXTENDS / CONTRASTS / PART_OF）
- `UserConceptMastery`：每個使用者對每個概念的熟練度（獨立於 Concept，因為同一門課可能有多個帳號一起使用）
- `UserLessonProgress` / `UserCourseProgress`：課程進度與正確率
- 課程解鎖邏輯：下一堂課只有在前一堂課被標記為 `COMPLETED`/`PERFECT` 後才會解鎖（見 `src/lib/roadmap.ts`）
- 遊戲化邏輯（等級曲線、連勝、生命值恢復、成就解鎖）集中在 `src/lib/gamification.ts`

原本該用 enum 的欄位（`LessonType`、`QuestionType`、`MasteryStatus` 等）目前都存成字串（這個專案一開始是先在 SQLite 上開發，SQLite 沒有原生 enum，後來才切到 Postgres，但沿用了字串設計以減少變動），實際的合法值定義在 `src/lib/enums.ts`。
