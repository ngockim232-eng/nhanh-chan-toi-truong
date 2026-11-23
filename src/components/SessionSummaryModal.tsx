import React from 'react';
import { Award, RotateCcw, Star, X } from 'lucide-react';
import { RoundResult } from '../types/game';
import { ChibiAvatar } from './ChibiAvatar';

interface SessionSummaryModalProps {
  isOpen: boolean;
  schoolName: string;
  history: RoundResult[];
  onClose: () => void;
  onStartNewSession: () => void;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  isOpen,
  schoolName,
  history,
  onClose,
  onStartNewSession,
}) => {
  if (!isOpen) return null;

  const starredCount = history.filter((h) => h.answerStatus === 'correct').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-summary-title"
    >
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="session-summary-title"
                className="font-display text-xl font-bold text-slate-900"
              >
                Tổng kết lượt gọi trả lời câu hỏi
              </h2>
              <p className="text-xs font-medium text-slate-500">
                {schoolName} ·{' '}
                <span className="font-semibold tabular-nums text-slate-800">
                  {history.length} lượt
                </span>{' '}
                ·{' '}
                <span className="font-semibold tabular-nums text-amber-700">
                  {starredCount} sao khen thưởng
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng tổng kết"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {history.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-8 text-center">
              <p className="text-base font-semibold text-slate-800">
                Chưa có học sinh nào được chọn trả lời!
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Hãy bấm “Bắt đầu” hoặc “Chạy thôi” để chọn ngẫu nhiên bạn trả lời câu hỏi nhé.
              </p>
            </div>
          ) : (
            <div>
              <h3 className="mb-2.5 text-sm font-semibold text-slate-700">
                Danh sách học sinh đã được chọn trả lời
              </h3>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {history.map((item) => (
                  <div
                    key={item.timestamp}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ChibiAvatar
                        profile={item.caughtStudent}
                        size={44}
                        state={item.answerStatus === 'correct' ? 'safe' : 'idle'}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          Lượt {item.roundNumber} · {item.className}:{' '}
                          <span className="text-rose-700">
                            {item.caughtStudent.name}
                          </span>
                        </p>
                        <p className="truncate text-xs text-slate-600">
                          {item.question
                            ? `Câu hỏi: ${item.question.prompt}`
                            : `“${item.caughtQuote}”`}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right text-xs font-semibold">
                      {item.answerStatus === 'correct' ? (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          Trả lời tốt
                        </span>
                      ) : item.answerStatus === 'encouraged' ? (
                        <span className="text-sky-700">Cố gắng thêm</span>
                      ) : (
                        <span className="text-slate-500">Đã chọn</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
          >
            Quay lại sân chơi
          </button>
          <button
            type="button"
            onClick={onStartNewSession}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-4 w-4" />
            Bắt đầu phiên mới
          </button>
        </div>
      </div>
    </div>
  );
};
