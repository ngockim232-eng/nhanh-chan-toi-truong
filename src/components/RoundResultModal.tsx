import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  HelpCircle,
  MessageSquareHeart,
  Play,
  RefreshCw,
  Shuffle,
  Star,
  Trophy,
  XCircle,
} from 'lucide-react';
import { loadTransparentDogSprite } from '../game/dogSpriteProcessor';
import { soundEngine } from '../game/soundEngine';
import { AnswerStatus, RoundResult } from '../types/game';
import { ChibiAvatar } from './ChibiAvatar';

interface RoundResultModalProps {
  result: RoundResult | null;
  isHidden: boolean;
  canDrawAnotherQuestion: boolean;
  onRateAnswer: (timestamp: number, status: AnswerStatus) => void;
  onDrawAnotherQuestion: () => void;
  onOpenQuestionBank: () => void;
  onHideToPeek: () => void;
  onPlayNextRound: () => void;
  onReshuffle: () => void;
  onEndSession: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export const RoundResultModal: React.FC<RoundResultModalProps> = ({
  result,
  isHidden,
  canDrawAnotherQuestion,
  onRateAnswer,
  onDrawAnotherQuestion,
  onOpenQuestionBank,
  onHideToPeek,
  onPlayNextRound,
  onReshuffle,
  onEndSession,
}) => {
  const [cleanDogUrl, setCleanDogUrl] = useState<string | null>(null);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [showAnswerKey, setShowAnswerKey] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    loadTransparentDogSprite('/assets/aistudio/image_185c8ab8.png').then(
      (processed) => {
        if (active && processed) {
          setCleanDogUrl(processed.dataUrl);
        }
      }
    );
    return () => {
      active = false;
    };
  }, []);

  // Reset interactive question answer state whenever a new round or new question is drawn
  useEffect(() => {
    setSelectedOptionIdx(null);
    setShowAnswerKey(false);
  }, [result?.timestamp, result?.question?.id]);

  if (!result || isHidden) return null;

  const question = result.question;

  const handleMarkCorrect = () => {
    soundEngine.playSafeGate();
    onRateAnswer(result.timestamp, 'correct');
  };

  const handleMarkEncouraged = () => {
    soundEngine.playClick();
    onRateAnswer(result.timestamp, 'encouraged');
  };

  const handlePickOption = (idx: number) => {
    if (!question || question.type !== 'multiple_choice') return;
    setSelectedOptionIdx(idx);
    const isRight = idx === (question.correctOptionIndex ?? 0);
    if (isRight) {
      soundEngine.playSafeGate();
      onRateAnswer(result.timestamp, 'correct');
    } else {
      soundEngine.playClick();
      if (result.answerStatus === 'pending') {
        onRateAnswer(result.timestamp, 'encouraged');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-result-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Hero Announcement: Selected Student to Answer the Question */}
          <div className="border-b border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 px-6 py-5">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              {/* Chibi Student Portrait + Transparent Playful Dog */}
              <div className="flex shrink-0 items-end gap-2 rounded-2xl border border-amber-200/80 bg-white/90 px-3 py-2 shadow-xs">
                {cleanDogUrl && (
                  <img
                    src={cleanDogUrl}
                    alt="Chú chó tinh nghịch"
                    referrerPolicy="no-referrer"
                    className="h-20 w-20 object-contain"
                  />
                )}
                <ChibiAvatar
                  profile={result.caughtStudent}
                  size={80}
                  state={result.answerStatus === 'correct' ? 'safe' : 'idle'}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-orange-700">
                  Học sinh được chọn trả lời · {result.className} · Lượt{' '}
                  <span className="tabular-nums">{result.roundNumber}</span>
                </p>
                <h2
                  id="round-result-title"
                  className="mt-0.5 font-display text-3xl font-extrabold tracking-tight text-rose-700 sm:text-4xl"
                >
                  {result.caughtStudent.name}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  “{result.caughtQuote}”
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Question Challenge Block */}
          <div className="border-b border-slate-200 bg-white px-6 py-5">
            {question ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
                    <span className="inline-flex items-center gap-1 font-semibold text-sky-800">
                      <HelpCircle className="h-3.5 w-3.5" />
                      Câu hỏi cho {result.caughtStudent.name}
                    </span>
                    {result.questionSetTitle && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{result.questionSetTitle}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>
                      {question.type === 'multiple_choice'
                        ? 'Trắc nghiệm'
                        : 'Tự luận / Hỏi miệng'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {canDrawAnotherQuestion && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onDrawAnotherQuestion();
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Đổi câu khác
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onOpenQuestionBank();
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 whitespace-nowrap"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Bộ câu hỏi
                    </button>
                  </div>
                </div>

                {/* Large Classroom-Legible Question Prompt */}
                <div className="rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3.5">
                  <p className="text-base font-bold leading-relaxed text-slate-900 sm:text-lg">
                    {question.prompt}
                  </p>
                </div>

                {/* Multiple Choice Options */}
                {question.type === 'multiple_choice' && question.options && (
                  <div className="space-y-3">
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {question.options.map((opt, idx) => {
                        const isPicked = selectedOptionIdx === idx;
                        const isCorrect = idx === (question.correctOptionIndex ?? 0);
                        const hasAnswered = selectedOptionIdx !== null;

                        let btnClasses =
                          'border-slate-200 bg-white text-slate-800 hover:border-sky-400 hover:bg-sky-50/40';
                        let letterClasses = 'bg-slate-100 text-slate-700';

                        if (hasAnswered) {
                          if (isCorrect) {
                            btnClasses =
                              'border-emerald-500 bg-emerald-50 text-emerald-950';
                            letterClasses = 'bg-emerald-600 text-white';
                          } else if (isPicked) {
                            btnClasses = 'border-rose-400 bg-rose-50 text-rose-950';
                            letterClasses = 'bg-rose-600 text-white';
                          } else {
                            btnClasses =
                              'border-slate-200 bg-slate-50/60 text-slate-500';
                            letterClasses = 'bg-slate-200 text-slate-500';
                          }
                        }

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handlePickOption(idx)}
                            className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${btnClasses}`}
                          >
                            <span
                              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${letterClasses}`}
                            >
                              {OPTION_LETTERS[idx]}
                            </span>
                            <span className="flex-1 leading-snug">{opt}</span>
                            {hasAnswered && isCorrect && (
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            )}
                            {hasAnswered && isPicked && !isCorrect && (
                              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {selectedOptionIdx !== null && (
                      <div
                        className={`rounded-xl border px-4 py-2.5 text-sm ${
                          selectedOptionIdx === (question.correctOptionIndex ?? 0)
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : 'border-amber-200 bg-amber-50 text-amber-950'
                        }`}
                      >
                        <p className="font-bold">
                          {selectedOptionIdx === (question.correctOptionIndex ?? 0)
                            ? 'Chính xác! Chúc mừng bạn đã trả lời đúng (+1 sao).'
                            : `Chưa chính xác! Đáp án đúng là ${OPTION_LETTERS[question.correctOptionIndex ?? 0]}.`}
                        </p>
                        {question.answerText && (
                          <p className="mt-1 text-xs leading-relaxed opacity-90">
                            Giải thích: {question.answerText}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Open Question Answer Key Toggle */}
                {question.type === 'open' && question.answerText && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setShowAnswerKey((v) => !v);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap"
                    >
                      {showAnswerKey ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          Ẩn đáp án gợi ý
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          Hiện đáp án gợi ý
                        </>
                      )}
                    </button>
                    {showAnswerKey && (
                      <div className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                        <span className="font-bold text-emerald-800">Đáp án gợi ý: </span>
                        {question.answerText}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">
                  Chưa chọn bộ câu hỏi hoặc bộ câu hỏi hiện đang trống. Giáo viên có thể hỏi trực tiếp hoặc thêm bộ câu hỏi.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenQuestionBank();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Thêm bộ câu hỏi
                </button>
              </div>
            )}

            {/* Quick Teacher Evaluation Controls */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4">
              <span className="text-xs font-semibold text-slate-600">
                Đánh giá câu trả lời:
              </span>
              <button
                type="button"
                onClick={handleMarkCorrect}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  result.answerStatus === 'correct'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                <Star className="h-3.5 w-3.5 fill-current" />
                {result.answerStatus === 'correct'
                  ? 'Tuyệt vời! Đã thưởng 1 sao'
                  : 'Trả lời tốt (+1 sao)'}
              </button>
              <button
                type="button"
                onClick={handleMarkEncouraged}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  result.answerStatus === 'encouraged'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'border border-sky-200 bg-white text-sky-800 hover:bg-sky-50'
                }`}
              >
                <MessageSquareHeart className="h-3.5 w-3.5" />
                {result.answerStatus === 'encouraged'
                  ? 'Đã ghi nhận · Cố gắng lần sau nhé!'
                  : 'Khích lệ cố gắng thêm'}
              </button>
              {result.answerStatus !== 'pending' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã lưu kết quả
                </span>
              )}
            </div>
          </div>

          {/* Safe Students List (Compact) */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                <Trophy className="h-3.5 w-3.5 text-emerald-600" />
                Các bạn đã vào cổng trường an toàn (
                <span className="tabular-nums">{result.escapedStudents.length}</span> bạn)
              </span>
            </div>

            <div className="mt-2 max-h-24 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              {result.escapedStudents.length === 0 ? (
                <p className="text-xs text-slate-500">Không có bạn nào khác trong lượt này.</p>
              ) : (
                <ol className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                  {result.escapedStudents.map((stu, idx) => (
                    <li
                      key={stu.id}
                      className="flex items-center gap-1.5 truncate text-slate-800"
                    >
                      <span className="font-semibold tabular-nums text-emerald-700">
                        {idx + 1}.
                      </span>
                      <span className="truncate font-medium">{stu.name}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Footer Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <button
            type="button"
            onClick={onHideToPeek}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
          >
            <Eye className="h-4 w-4" />
            Xem cảnh hài hước
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onEndSession}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              <Flag className="h-4 w-4" />
              Kết thúc
            </button>
            <button
              type="button"
              onClick={onReshuffle}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2 text-sm font-semibold text-sky-800 transition-colors hover:bg-sky-100 whitespace-nowrap shrink-0"
            >
              <Shuffle className="h-4 w-4" />
              Chọn lại
            </button>
            <button
              type="button"
              onClick={onPlayNextRound}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 whitespace-nowrap shrink-0"
            >
              <Play className="h-4 w-4 fill-current" />
              Chạy lượt tiếp!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
