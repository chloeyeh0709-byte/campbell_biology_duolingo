# Campbell Biology · 多鄰國風格學習系統

把 Campbell Biology 教科書內容轉換成解鎖式學習路徑、知識圖譜與遊戲化機制（XP、等級、連勝、生命值、成就）的學習平台。架構參考了 [Athena](https://github.com/devjoshi0/Athena) 的資料模型與內容產生流程，但簡化為單機可跑、不需外部服務的版本。

## 技術棧

- **Next.js 14**（App Router）+ TypeScript + Tailwind CSS
- **Prisma ORM** + SQLite（開發用；正式部署時把 `DATABASE_URL` 換成 Postgres 即可）
- 自製輕量 email/password 認證（bcrypt + JWT cookie，無第三方 auth 服務）
- **Cytoscape.js** 呈現知識圖譜
- 課程內容以 JSON 檔匯入，不需要背景佇列或即時呼叫 AI API

## 開始使用

```bash
npm install
cp .env.example .env        # 視需要調整 JWT_SECRET
npx prisma migrate dev      # 建立本地 SQLite 資料庫
npm run db:seed             # 匯入 prisma/seed/sample-curriculum.json 的範例章節
npm run dev
```

開啟 http://localhost:3000，註冊帳號後就會進入學習路徑。

## 匯入教科書內容

課程內容以 `prisma/seed/curriculum-schema.ts` 定義的 JSON 格式描述（單元 → 課程 → 投影片/題目，加上知識圖譜的概念與關係）。要匯入新章節：

1. 依照 schema 準備一份 JSON（可參考 `prisma/seed/sample-curriculum.json`）
2. 執行 `npm run db:seed -- path/to/your-chapter.json`

若已存在同名課程（`title` 相同），會先整個刪除再重新建立，方便反覆調整內容。

## 資料模型重點

- `Course → Unit → Lesson → LessonSlide / Question`：學習路徑的主結構
- `Concept / ConceptEdge`：知識圖譜節點與關係（PREREQUISITE / RELATED / EXTENDS / CONTRASTS / PART_OF）
- `UserConceptMastery`：每個使用者對每個概念的熟練度（獨立於 Concept，因為同一門課可能有多個帳號一起使用）
- `UserLessonProgress` / `UserCourseProgress`：課程進度與正確率
- 課程解鎖邏輯：下一堂課只有在前一堂課被標記為 `COMPLETED`/`PERFECT` 後才會解鎖（見 `src/lib/roadmap.ts`）
- 遊戲化邏輯（等級曲線、連勝、生命值恢復、成就解鎖）集中在 `src/lib/gamification.ts`

SQLite 不支援原生 enum，所有原本該用 enum 的欄位（`LessonType`、`QuestionType`、`MasteryStatus` 等）都存成字串，實際的合法值定義在 `src/lib/enums.ts`。
