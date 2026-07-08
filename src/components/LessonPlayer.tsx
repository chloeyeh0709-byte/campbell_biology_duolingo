"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { PlayableLesson, PlayableQuestion } from "@/lib/lesson-view";

type Answer =
  | { type: "MULTIPLE_CHOICE" | "TRUE_FALSE"; optionId: string }
  | { type: "FILL_IN_THE_BLANK"; text: string }
  | { type: "SHORT_ANSWER" | "FLASHCARD"; selfRating: "correct" | "incorrect" }
  | { type: "MATCHING"; pairs: { left: string; right: string }[] };

type Phase = "slides" | "question" | "feedback" | "out-of-hearts" | "summary";

interface AttemptResult {
  isCorrect: boolean;
  explanation: string | null;
  correctOptionId: string | null;
  blankAnswer: string | null;
  heartsRemaining: number | null;
}

interface CompleteResult {
  passed: boolean;
  perfect: boolean;
  xpEarned: number;
  unlockedAchievements: { title: string; iconEmoji: string; xpReward: number }[];
  user: { xp: number; level: number; streakDays: number; hearts: number; maxHearts: number };
}

export function LessonPlayer({ lesson, courseId }: { lesson: PlayableLesson; courseId: string }) {
  const router = useRouter();
  const [slideIndex, setSlideIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(lesson.slides.length > 0 ? "slides" : "question");
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptResult, setAttemptResult] = useState<AttemptResult | null>(null);
  const [completeResult, setCompleteResult] = useState<CompleteResult | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);

  // Local per-question interaction state
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [blankText, setBlankText] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [pairs, setPairs] = useState<{ left: string; right: string }[]>([]);
  const [usedRights, setUsedRights] = useState<string[]>([]);

  const totalSteps = lesson.slides.length + lesson.questions.length;
  const stepsDone =
    phase === "slides" ? slideIndex : lesson.slides.length + questionIndex + (phase === "feedback" ? 1 : 0);
  const progressPct = totalSteps > 0 ? Math.min(100, Math.round((stepsDone / totalSteps) * 100)) : 100;

  const currentQuestion: PlayableQuestion | undefined = lesson.questions[questionIndex];

  function resetQuestionState() {
    setSelectedOptionId(null);
    setBlankText("");
    setRevealed(false);
    setSelectedLeft(null);
    setPairs([]);
    setUsedRights([]);
    setQuestionStartedAt(Date.now());
  }

  function goToNextSlideOrQuestion() {
    if (slideIndex + 1 < lesson.slides.length) {
      setSlideIndex(slideIndex + 1);
    } else {
      setPhase("question");
      resetQuestionState();
    }
  }

  async function submitAnswer(answer: Answer) {
    if (!currentQuestion || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/questions/${currentQuestion.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, responseMs: Date.now() - questionStartedAt }),
      });
      const data = await res.json();
      if (res.status === 403 && data.error) {
        setPhase("out-of-hearts");
        return;
      }
      if (!res.ok) return;

      if (data.isCorrect) setCorrectCount((c) => c + 1);
      setAttemptResult(data);
      setPhase("feedback");
    } finally {
      setSubmitting(false);
    }
  }

  async function goToNextQuestionOrFinish() {
    if (questionIndex + 1 < lesson.questions.length) {
      setQuestionIndex(questionIndex + 1);
      setPhase("question");
      resetQuestionState();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correctCount,
          totalCount: lesson.questions.length,
          timeSpentMs: Date.now() - startedAt,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCompleteResult(data);
        setPhase("summary");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleMatchClick(side: "left" | "right", value: string) {
    if (usedRights.includes(value)) return;
    if (side === "left") {
      setSelectedLeft(value === selectedLeft ? null : value);
      return;
    }
    if (!selectedLeft) return;
    const nextPairs = [...pairs, { left: selectedLeft, right: value }];
    setPairs(nextPairs);
    setUsedRights([...usedRights, value]);
    setSelectedLeft(null);
  }

  const matchComplete = currentQuestion?.matchLeft ? pairs.length === currentQuestion.matchLeft.length : false;

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-[var(--bg)] px-4 pb-2 pt-4 sm:px-8">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button onClick={() => router.push(`/course/${courseId}`)} className="text-xl text-[var(--gray)]">
            ✕
          </button>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--green)] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-8">
        {phase === "slides" && lesson.slides[slideIndex] && (
          <div className="card-duo flex flex-col gap-4 p-6">
            {lesson.slides[slideIndex].title && (
              <h2 className="text-xl font-extrabold">{lesson.slides[slideIndex].title}</h2>
            )}
            <div className="prose prose-neutral max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {lesson.slides[slideIndex].content}
              </ReactMarkdown>
            </div>
            {lesson.slides[slideIndex].imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lesson.slides[slideIndex].imageUrl!} alt="" className="rounded-xl" />
            )}
            <button onClick={goToNextSlideOrQuestion} className="btn-duo-green mt-4 self-stretch">
              繼續
            </button>
          </div>
        )}

        {phase === "question" && currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            selectedOptionId={selectedOptionId}
            setSelectedOptionId={setSelectedOptionId}
            blankText={blankText}
            setBlankText={setBlankText}
            revealed={revealed}
            setRevealed={setRevealed}
            selectedLeft={selectedLeft}
            pairs={pairs}
            usedRights={usedRights}
            matchComplete={matchComplete}
            onMatchClick={handleMatchClick}
            submitting={submitting}
            onSubmit={submitAnswer}
          />
        )}

        {phase === "feedback" && attemptResult && currentQuestion && (
          <FeedbackCard result={attemptResult} onContinue={goToNextQuestionOrFinish} submitting={submitting} />
        )}

        {phase === "out-of-hearts" && (
          <div className="card-duo flex flex-col items-center gap-4 p-8 text-center">
            <div className="text-5xl">💔</div>
            <h2 className="text-xl font-extrabold">生命值用完了</h2>
            <p className="text-[var(--gray)]">休息一下，等生命值恢復後再回來挑戰吧！</p>
            <button onClick={() => router.push(`/course/${courseId}`)} className="btn-duo-blue">
              回到學習路徑
            </button>
          </div>
        )}

        {phase === "summary" && completeResult && (
          <SummaryCard result={completeResult} onDone={() => router.push(`/course/${courseId}`)} />
        )}
      </main>
    </div>
  );
}

function QuestionCard({
  question,
  selectedOptionId,
  setSelectedOptionId,
  blankText,
  setBlankText,
  revealed,
  setRevealed,
  selectedLeft,
  pairs,
  usedRights,
  matchComplete,
  onMatchClick,
  submitting,
  onSubmit,
}: {
  question: PlayableQuestion;
  selectedOptionId: string | null;
  setSelectedOptionId: (v: string | null) => void;
  blankText: string;
  setBlankText: (v: string) => void;
  revealed: boolean;
  setRevealed: (v: boolean) => void;
  selectedLeft: string | null;
  pairs: { left: string; right: string }[];
  usedRights: string[];
  matchComplete: boolean;
  onMatchClick: (side: "left" | "right", value: string) => void;
  submitting: boolean;
  onSubmit: (answer: Answer) => void;
}) {
  const usedLefts = useMemo(() => pairs.map((p) => p.left), [pairs]);

  return (
    <div className="card-duo flex flex-col gap-5 p-6">
      <p className="text-lg font-bold">{question.prompt || question.front}</p>
      {question.sourceInfo && <p className="text-xs text-[var(--gray)]">出處：{question.sourceInfo}</p>}

      {(question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") && question.options && (
        <div className="flex flex-col gap-3">
          {question.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedOptionId(opt.id)}
              className={`rounded-xl border-2 px-4 py-3 text-left font-semibold transition-colors ${
                selectedOptionId === opt.id
                  ? "border-[var(--blue)] bg-[var(--blue)]/10"
                  : "border-[var(--border)] hover:border-[var(--blue)]"
              }`}
            >
              {opt.text}
            </button>
          ))}
          <button
            disabled={!selectedOptionId || submitting}
            onClick={() => selectedOptionId && onSubmit({ type: question.type as "MULTIPLE_CHOICE" | "TRUE_FALSE", optionId: selectedOptionId })}
            className="btn-duo-green mt-2"
          >
            檢查答案
          </button>
        </div>
      )}

      {question.type === "FILL_IN_THE_BLANK" && (
        <div className="flex flex-col gap-3">
          {question.blankHint && <p className="text-sm italic text-[var(--gray)]">提示：{question.blankHint}</p>}
          <input
            value={blankText}
            onChange={(e) => setBlankText(e.target.value)}
            className="rounded-xl border-2 border-[var(--border)] bg-transparent px-4 py-3 outline-none focus:border-[var(--blue)]"
            placeholder="輸入答案…"
          />
          <button
            disabled={!blankText.trim() || submitting}
            onClick={() => onSubmit({ type: "FILL_IN_THE_BLANK", text: blankText })}
            className="btn-duo-green"
          >
            檢查答案
          </button>
        </div>
      )}

      {(question.type === "FLASHCARD" || question.type === "SHORT_ANSWER") && (
        <div className="flex flex-col gap-3">
          {!revealed ? (
            <button onClick={() => setRevealed(true)} className="btn-duo-blue self-start">
              顯示答案
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                disabled={submitting}
                onClick={() => onSubmit({ type: question.type as "FLASHCARD" | "SHORT_ANSWER", selfRating: "incorrect" })}
                className="btn-duo bg-[var(--red)] border-[#d63d3d] flex-1 text-white"
              >
                還不熟
              </button>
              <button
                disabled={submitting}
                onClick={() => onSubmit({ type: question.type as "FLASHCARD" | "SHORT_ANSWER", selfRating: "correct" })}
                className="btn-duo-green flex-1"
              >
                答對了
              </button>
            </div>
          )}
        </div>
      )}

      {question.type === "MATCHING" && question.matchLeft && question.matchRight && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              {question.matchLeft.map((left) => (
                <button
                  key={left}
                  disabled={usedLefts.includes(left)}
                  onClick={() => onMatchClick("left", left)}
                  className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${
                    usedLefts.includes(left)
                      ? "border-[var(--green)] bg-[var(--green)]/10 text-[var(--gray)]"
                      : selectedLeft === left
                      ? "border-[var(--blue)] bg-[var(--blue)]/10"
                      : "border-[var(--border)]"
                  }`}
                >
                  {left}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {question.matchRight.map((right) => (
                <button
                  key={right}
                  disabled={usedRights.includes(right)}
                  onClick={() => onMatchClick("right", right)}
                  className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${
                    usedRights.includes(right)
                      ? "border-[var(--green)] bg-[var(--green)]/10 text-[var(--gray)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  {right}
                </button>
              ))}
            </div>
          </div>
          <button disabled={!matchComplete || submitting} onClick={() => onSubmit({ type: "MATCHING", pairs })} className="btn-duo-green">
            檢查答案
          </button>
        </div>
      )}
    </div>
  );
}

function FeedbackCard({
  result,
  onContinue,
  submitting,
}: {
  result: AttemptResult;
  onContinue: () => void;
  submitting: boolean;
}) {
  return (
    <div className={`card-duo flex flex-col gap-3 p-6 ${result.isCorrect ? "border-[var(--green)]" : "border-[var(--red)]"}`}>
      <h3 className={`text-xl font-extrabold ${result.isCorrect ? "text-[var(--green-dark)]" : "text-[var(--red)]"}`}>
        {result.isCorrect ? "答對了！🎉" : "再想想 🤔"}
      </h3>
      {result.explanation && <p className="text-sm">{result.explanation}</p>}
      {!result.isCorrect && result.blankAnswer && (
        <p className="text-sm font-semibold">正確答案：{result.blankAnswer}</p>
      )}
      {result.heartsRemaining !== null && (
        <p className="text-xs text-[var(--gray)]">剩餘生命值：{result.heartsRemaining}</p>
      )}
      <button onClick={onContinue} disabled={submitting} className="btn-duo-green mt-2">
        繼續
      </button>
    </div>
  );
}

function SummaryCard({
  result,
  onDone,
}: {
  result: CompleteResult;
  onDone: () => void;
}) {
  return (
    <div className="card-duo flex flex-col items-center gap-4 p-8 text-center">
      <div className="text-5xl">{result.perfect ? "💯" : result.passed ? "🎉" : "😅"}</div>
      <h2 className="text-2xl font-extrabold">
        {result.perfect ? "完美通關！" : result.passed ? "課程完成！" : "還差一點點"}
      </h2>
      <p className="text-[var(--gold)] font-bold">+{result.xpEarned} XP</p>
      <div className="flex gap-4 text-sm font-semibold text-[var(--gray)]">
        <span>⭐ Lv.{result.user.level}</span>
        <span>🔥 {result.user.streakDays} 天連勝</span>
        <span>❤️ {result.user.hearts}/{result.user.maxHearts}</span>
      </div>
      {result.unlockedAchievements.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-bold">解鎖新成就！</p>
          {result.unlockedAchievements.map((a) => (
            <div key={a.title} className="rounded-xl border-2 border-[var(--gold)] px-4 py-2">
              {a.iconEmoji} {a.title}
            </div>
          ))}
        </div>
      )}
      <button onClick={onDone} className="btn-duo-green mt-2">
        回到學習路徑
      </button>
    </div>
  );
}
