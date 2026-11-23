import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  FileText,
  FileUp,
  FolderPlus,
  GraduationCap,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { ClassRoom, QuestionItem, QuestionSet, QuestionType } from '../types/game';

export type QuestionModalInitialTab = 'manage' | 'ai' | 'bulk' | 'classes';

interface QuestionBankModalProps {
  isOpen: boolean;
  initialTab?: QuestionModalInitialTab;
  classrooms: ClassRoom[];
  activeClassId: string;
  questionSets: QuestionSet[];
  activeSetId: string;
  questionSetByClass: Record<string, string>;
  usedQuestionIds: Set<string>;
  avoidRepeatQuestions: boolean;
  onClose: () => void;
  onSave: (
    nextSets: QuestionSet[],
    nextActiveSetId: string,
    nextSetByClass: Record<string, string>,
    avoidRepeat: boolean
  ) => void;
  onResetUsedQuestions: (setId: string) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;
const AI_COUNT_OPTIONS = [5, 8, 10, 15] as const;

interface UploadedLessonFile {
  fileName: string;
  mimeType: string;
  base64: string;
  sizeBytes: number;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function parseBulkQuestions(raw: string): QuestionItem[] {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items: QuestionItem[] = [];

  for (const line of lines) {
    const cleaned = line
      .replace(/^(câu\s*\d+\s*[:.)-]|\d+\s*[.):-])\s*/i, '')
      .trim();
    if (!cleaned) continue;

    const parts = cleaned.split('|').map((p) => p.trim());

    if (parts.length >= 6) {
      const prompt = parts[0];
      const options = parts.slice(1, 5);
      const rawKey = (parts[5] || 'A').trim().toUpperCase();
      let correctIdx = 0;
      if (rawKey === 'B' || rawKey === '2') correctIdx = 1;
      else if (rawKey === 'C' || rawKey === '3') correctIdx = 2;
      else if (rawKey === 'D' || rawKey === '4') correctIdx = 3;
      const answerText = parts[6] || '';

      if (prompt) {
        items.push({
          id: makeId('q'),
          type: 'multiple_choice',
          prompt,
          options,
          correctOptionIndex: correctIdx,
          answerText: answerText || undefined,
        });
      }
      continue;
    }

    if (parts.length >= 2) {
      const prompt = parts[0];
      const answerText = parts.slice(1).join(' | ').trim();
      if (prompt) {
        items.push({
          id: makeId('q'),
          type: 'open',
          prompt,
          answerText: answerText || undefined,
        });
      }
      continue;
    }

    items.push({
      id: makeId('q'),
      type: 'open',
      prompt: cleaned,
    });
  }

  return items;
}

export const QuestionBankModal: React.FC<QuestionBankModalProps> = ({
  isOpen,
  initialTab = 'manage',
  classrooms,
  activeClassId,
  questionSets,
  activeSetId,
  questionSetByClass,
  usedQuestionIds,
  avoidRepeatQuestions,
  onClose,
  onSave,
  onResetUsedQuestions,
}) => {
  const [tab, setTab] = useState<QuestionModalInitialTab>(initialTab);
  const [draftSets, setDraftSets] = useState<QuestionSet[]>(questionSets);
  const [selectedSetId, setSelectedSetId] = useState<string>(
    activeSetId && activeSetId !== 'none'
      ? activeSetId
      : questionSets[0]?.id || ''
  );
  const [draftSetByClass, setDraftSetByClass] =
    useState<Record<string, string>>(questionSetByClass);
  const [draftAvoidRepeat, setDraftAvoidRepeat] = useState(avoidRepeatQuestions);

  // Set management inline panels
  const [showAddSet, setShowAddSet] = useState(false);
  const [newSetTitle, setNewSetTitle] = useState('');
  const [newSetSubject, setNewSetSubject] = useState('');
  const [showRenameSet, setShowRenameSet] = useState(false);
  const [renameSetTitle, setRenameSetTitle] = useState('');
  const [renameSetSubject, setRenameSetSubject] = useState('');
  const [confirmDeleteSet, setConfirmDeleteSet] = useState(false);

  // Add / Edit single question form
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qType, setQType] = useState<QuestionType>('multiple_choice');
  const [qPrompt, setQPrompt] = useState('');
  const [qOptions, setQOptions] = useState<[string, string, string, string]>([
    '',
    '',
    '',
    '',
  ]);
  const [qCorrectIdx, setQCorrectIdx] = useState<number>(0);
  const [qAnswerText, setQAnswerText] = useState('');

  // Bulk paste
  const [bulkText, setBulkText] = useState('');

  // AI Lesson Generator state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [aiLessonText, setAiLessonText] = useState('');
  const [aiUploadedFile, setAiUploadedFile] = useState<UploadedLessonFile | null>(
    null
  );
  const [aiTargetClassId, setAiTargetClassId] = useState<string>(activeClassId);
  const [aiSetTitle, setAiSetTitle] = useState('');
  const [aiSubject, setAiSubject] = useState('');
  const [aiCount, setAiCount] = useState<number>(8);
  const [aiFormat, setAiFormat] = useState<'mixed' | 'multiple_choice' | 'open'>(
    'mixed'
  );
  const [aiDifficulty, setAiDifficulty] = useState<'basic' | 'medium' | 'advanced'>(
    'medium'
  );
  const [aiSaveMode, setAiSaveMode] = useState<'new_set' | 'append'>('new_set');
  const [aiGenerating, setAiGenerating] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setDraftSets(questionSets);
      setDraftSetByClass(questionSetByClass);
      const initialId =
        activeSetId &&
        activeSetId !== 'none' &&
        questionSets.some((s) => s.id === activeSetId)
          ? activeSetId
          : questionSets[0]?.id || '';
      setSelectedSetId(initialId);
      setAiTargetClassId(activeClassId);
      setDraftAvoidRepeat(avoidRepeatQuestions);
      setShowAddSet(false);
      setShowRenameSet(false);
      setConfirmDeleteSet(false);
      setEditingQuestionId(null);
      setNewSetTitle('');
      setNewSetSubject('');
      setQPrompt('');
      setQOptions(['', '', '', '']);
      setQCorrectIdx(0);
      setQAnswerText('');
      setBulkText('');
      setErrorMsg(null);
      setStatusNote(null);
    }
  }, [
    isOpen,
    initialTab,
    questionSets,
    activeSetId,
    activeClassId,
    questionSetByClass,
    avoidRepeatQuestions,
  ]);

  if (!isOpen) return null;

  const activeSet =
    draftSets.find((s) => s.id === selectedSetId) || draftSets[0] || null;
  const activeQuestions = activeSet?.questions || [];
  const activeClassObj =
    classrooms.find((c) => c.id === activeClassId) || classrooms[0];
  const usedInActiveCount = activeQuestions.filter((q) =>
    usedQuestionIds.has(q.id)
  ).length;

  const updateActiveQuestions = (nextQuestions: QuestionItem[]) => {
    if (!activeSet) return;
    setDraftSets((prev) =>
      prev.map((s) =>
        s.id === activeSet.id ? { ...s, questions: nextQuestions } : s
      )
    );
  };

  const toggleTargetClassForActiveSet = (classId: string) => {
    if (!activeSet) return;
    setDraftSets((prev) =>
      prev.map((s) => {
        if (s.id !== activeSet.id) return s;
        const current = new Set(s.targetClassIds || []);
        if (current.has(classId)) current.delete(classId);
        else current.add(classId);
        const nextArr = Array.from(current);
        return {
          ...s,
          targetClassIds: nextArr.length > 0 ? nextArr : undefined,
        };
      })
    );
  };

  const clearTargetClassesForActiveSet = () => {
    if (!activeSet) return;
    setDraftSets((prev) =>
      prev.map((s) =>
        s.id === activeSet.id ? { ...s, targetClassIds: undefined } : s
      )
    );
  };

  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setQPrompt('');
    setQOptions(['', '', '', '']);
    setQCorrectIdx(0);
    setQAnswerText('');
    setErrorMsg(null);
  };

  const handleCreateSet = () => {
    const title = newSetTitle.trim();
    if (!title) {
      setErrorMsg('Vui lòng nhập tên bộ câu hỏi.');
      return;
    }
    const id = makeId('qs');
    const created: QuestionSet = {
      id,
      title,
      subject: newSetSubject.trim() || undefined,
      targetClassIds: activeClassId ? [activeClassId] : undefined,
      questions: [],
    };
    setDraftSets((prev) => [...prev, created]);
    setSelectedSetId(id);
    if (activeClassId) {
      setDraftSetByClass((prev) => ({ ...prev, [activeClassId]: id }));
    }
    setNewSetTitle('');
    setNewSetSubject('');
    setShowAddSet(false);
    setShowRenameSet(false);
    setConfirmDeleteSet(false);
    resetQuestionForm();
    setStatusNote(
      `Đã tạo bộ câu hỏi “${title}” và gán cho ${activeClassObj?.name || 'lớp hiện tại'}.`
    );
  };

  const handleOpenRenameSet = () => {
    if (!activeSet) return;
    setRenameSetTitle(activeSet.title);
    setRenameSetSubject(activeSet.subject || '');
    setShowRenameSet((v) => !v);
    setShowAddSet(false);
    setConfirmDeleteSet(false);
    setErrorMsg(null);
  };

  const handleConfirmRenameSet = () => {
    if (!activeSet) return;
    const title = renameSetTitle.trim();
    if (!title) {
      setErrorMsg('Tên bộ câu hỏi không được để trống.');
      return;
    }
    setDraftSets((prev) =>
      prev.map((s) =>
        s.id === activeSet.id
          ? { ...s, title, subject: renameSetSubject.trim() || undefined }
          : s
      )
    );
    setShowRenameSet(false);
    setErrorMsg(null);
    setStatusNote(`Đã đổi tên thành “${title}”.`);
  };

  const handleDeleteActiveSet = () => {
    if (!activeSet) return;
    if (draftSets.length <= 1) {
      setErrorMsg('Cần giữ lại ít nhất 1 bộ câu hỏi trong danh sách.');
      setConfirmDeleteSet(false);
      return;
    }
    const remaining = draftSets.filter((s) => s.id !== activeSet.id);
    const fallbackId = remaining[0].id;
    setDraftSets(remaining);
    setSelectedSetId(fallbackId);
    setDraftSetByClass((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (next[key] === activeSet.id) {
          next[key] = fallbackId;
        }
      }
      return next;
    });
    setConfirmDeleteSet(false);
    setShowRenameSet(false);
    resetQuestionForm();
    setStatusNote(`Đã xóa bộ câu hỏi “${activeSet.title}”.`);
  };

  const handleSaveQuestionItem = () => {
    if (!activeSet) return;
    const prompt = qPrompt.trim();
    if (!prompt) {
      setErrorMsg('Vui lòng nhập nội dung câu hỏi.');
      return;
    }

    let item: QuestionItem;
    if (qType === 'multiple_choice') {
      const cleanedOpts = qOptions.map((o) => o.trim());
      if (cleanedOpts.filter(Boolean).length < 2) {
        setErrorMsg('Câu trắc nghiệm cần nhập ít nhất 2 phương án trả lời.');
        return;
      }
      const normalizedOpts = cleanedOpts.map(
        (opt, idx) => opt || `Phương án ${OPTION_LETTERS[idx]}`
      );
      item = {
        id: editingQuestionId || makeId('q'),
        type: 'multiple_choice',
        prompt,
        options: normalizedOpts,
        correctOptionIndex: qCorrectIdx,
        answerText: qAnswerText.trim() || undefined,
      };
    } else {
      item = {
        id: editingQuestionId || makeId('q'),
        type: 'open',
        prompt,
        answerText: qAnswerText.trim() || undefined,
      };
    }

    if (editingQuestionId) {
      updateActiveQuestions(
        activeQuestions.map((q) => (q.id === editingQuestionId ? item : q))
      );
      setStatusNote('Đã cập nhật câu hỏi.');
    } else {
      updateActiveQuestions([...activeQuestions, item]);
      setStatusNote('Đã thêm câu hỏi vào bộ.');
    }
    resetQuestionForm();
  };

  const handleEditQuestion = (q: QuestionItem) => {
    setEditingQuestionId(q.id);
    setQType(q.type);
    setQPrompt(q.prompt);
    if (q.type === 'multiple_choice' && q.options) {
      setQOptions([
        q.options[0] || '',
        q.options[1] || '',
        q.options[2] || '',
        q.options[3] || '',
      ]);
      setQCorrectIdx(q.correctOptionIndex ?? 0);
    } else {
      setQOptions(['', '', '', '']);
      setQCorrectIdx(0);
    }
    setQAnswerText(q.answerText || '');
    setTab('manage');
    setErrorMsg(null);
    setStatusNote(null);
  };

  const handleDeleteQuestion = (id: string) => {
    updateActiveQuestions(activeQuestions.filter((q) => q.id !== id));
    if (editingQuestionId === id) {
      resetQuestionForm();
    }
  };

  const handleImportBulk = () => {
    if (!activeSet) return;
    const parsed = parseBulkQuestions(bulkText);
    if (parsed.length === 0) {
      setErrorMsg('Chưa có dòng câu hỏi hợp lệ để thêm.');
      return;
    }
    updateActiveQuestions([...activeQuestions, ...parsed]);
    setBulkText('');
    setTab('manage');
    setErrorMsg(null);
    setStatusNote(
      `Đã thêm nhanh ${parsed.length} câu hỏi vào bộ “${activeSet.title}”.`
    );
  };

  const handleUploadLessonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Tệp tải lên vượt quá 8MB. Vui lòng chọn tệp nhỏ hơn.');
      e.target.value = '';
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isPlainText =
      file.type.startsWith('text/') ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md') ||
      lowerName.endsWith('.csv');

    if (isPlainText) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        if (!text.trim()) {
          setErrorMsg('Tệp văn bản không có nội dung.');
          return;
        }
        setAiLessonText((prev) =>
          prev.trim() ? `${prev.trim()}\n\n${text.trim()}` : text.trim()
        );
        setAiUploadedFile(null);
        setStatusNote(`Đã đọc nội dung từ tệp “${file.name}”.`);
      };
      reader.onerror = () => {
        setErrorMsg('Không thể đọc tệp văn bản này.');
      };
      reader.readAsText(file, 'UTF-8');
      e.target.value = '';
      return;
    }

    const supportedBinary = new Set([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
    ]);
    if (!supportedBinary.has(file.type)) {
      setErrorMsg(
        'Vui lòng chọn tệp PDF, ảnh chụp trang sách (PNG/JPG/WEBP), hoặc tệp văn bản (.txt/.md).'
      );
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      const base64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : result;
      if (!base64) {
        setErrorMsg('Không thể đọc dữ liệu tệp tải lên.');
        return;
      }
      setAiUploadedFile({
        fileName: file.name,
        mimeType: file.type,
        base64,
        sizeBytes: file.size,
      });
      setStatusNote(
        `Đã đính kèm tệp “${file.name}” (${formatFileSize(file.size)}). Bấm “Tạo bộ câu hỏi bằng AI” để bắt đầu.`
      );
    };
    reader.onerror = () => {
      setErrorMsg('Không thể đọc tệp tải lên.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGenerateWithAI = async () => {
    if (!aiLessonText.trim() && !aiUploadedFile) {
      setErrorMsg(
        'Vui lòng dán nội dung bài dạy hoặc tải lên tệp PDF / ảnh trang sách / file văn bản.'
      );
      return;
    }

    setAiGenerating(true);
    setErrorMsg(null);
    setStatusNote(null);

    const targetClassObj =
      aiTargetClassId !== 'all'
        ? classrooms.find((c) => c.id === aiTargetClassId)
        : null;

    try {
      const resp = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonText: aiLessonText.trim(),
          fileData: aiUploadedFile
            ? {
                mimeType: aiUploadedFile.mimeType,
                base64: aiUploadedFile.base64,
                fileName: aiUploadedFile.fileName,
              }
            : null,
          className: targetClassObj
            ? targetClassObj.name
            : 'Học sinh Tiểu học & THCS',
          subject: aiSubject.trim(),
          setTitle: aiSetTitle.trim(),
          questionCount: aiCount,
          questionFormat: aiFormat,
          difficulty: aiDifficulty,
        }),
      });

      const data = (await resp.json().catch(() => ({}))) as {
        title?: string;
        subject?: string;
        questions?: QuestionItem[];
        error?: string;
      };

      if (!resp.ok) {
        setErrorMsg(
          data.error || 'Không thể tạo bộ câu hỏi từ AI. Vui lòng thử lại.'
        );
        return;
      }

      const generated = Array.isArray(data.questions) ? data.questions : [];
      if (generated.length === 0) {
        setErrorMsg('AI không tạo được câu hỏi nào từ nội dung này.');
        return;
      }

      if (aiSaveMode === 'append' && activeSet) {
        updateActiveQuestions([...activeQuestions, ...generated]);
        setTab('manage');
        setStatusNote(
          `AI đã tạo và thêm ${generated.length} câu hỏi vào bộ “${activeSet.title}”.`
        );
      } else {
        const newId = makeId('qs_ai');
        const createdTitle =
          aiSetTitle.trim() ||
          data.title?.trim() ||
          `Bộ câu hỏi ${targetClassObj?.name || 'mới'}`;
        const newSet: QuestionSet = {
          id: newId,
          title: createdTitle,
          subject: aiSubject.trim() || data.subject?.trim() || undefined,
          targetClassIds: targetClassObj ? [targetClassObj.id] : undefined,
          questions: generated,
        };
        setDraftSets((prev) => [...prev, newSet]);
        setSelectedSetId(newId);
        if (targetClassObj) {
          setDraftSetByClass((prev) => ({ ...prev, [targetClassObj.id]: newId }));
        } else if (activeClassId) {
          setDraftSetByClass((prev) => ({ ...prev, [activeClassId]: newId }));
        }
        setTab('manage');
        setStatusNote(
          `AI đã tạo bộ “${createdTitle}” gồm ${generated.length} câu hỏi${
            targetClassObj ? ` và tự động gán cho ${targetClassObj.name}` : ''
          }! Bạn có thể xem lại hoặc sửa ngay bên dưới.`
        );
      }

      setAiSetTitle('');
      setAiUploadedFile(null);
    } catch {
      setErrorMsg(
        'Lỗi kết nối tới máy chủ tạo câu hỏi. Vui lòng kiểm tra mạng và thử lại.'
      );
    } finally {
      setAiGenerating(false);
    }
  };

  const handleFinalSave = () => {
    const finalActiveId = activeSet?.id || draftSets[0]?.id || 'none';
    const nextMap = { ...draftSetByClass };
    if (activeClassId && !nextMap[activeClassId]) {
      nextMap[activeClassId] = finalActiveId;
    }
    onSave(draftSets, finalActiveId, nextMap, draftAvoidRepeat);
    onClose();
  };

  const bulkPreviewCount = parseBulkQuestions(bulkText).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-bank-modal-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="question-bank-modal-title"
                className="font-display text-xl font-bold text-slate-900"
              >
                Kho bộ câu hỏi & AI tạo câu hỏi theo bài dạy
              </h2>
              <p className="text-sm text-slate-500">
                {activeSet ? (
                  <>
                    Đang mở:{' '}
                    <strong className="font-semibold text-slate-800">
                      {activeSet.title}
                    </strong>
                    {activeSet.subject ? ` · ${activeSet.subject}` : ''} ·{' '}
                    <span className="font-semibold tabular-nums text-slate-800">
                      {activeQuestions.length}
                    </span>{' '}
                    câu · Lớp hiện tại:{' '}
                    <strong className="font-semibold text-sky-800">
                      {activeClassObj?.name}
                    </strong>
                  </>
                ) : (
                  'Tạo bộ câu hỏi thủ công hoặc để AI soạn tự động từ tài liệu bài dạy'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại bộ câu hỏi"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Mode Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setTab('manage');
                  setErrorMsg(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  tab === 'manage'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListChecks className="h-4 w-4" />
                Bộ câu hỏi ({activeQuestions.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('ai');
                  setErrorMsg(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  tab === 'ai'
                    ? 'bg-white text-sky-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="h-4 w-4 text-amber-600" />
                AI tạo từ bài dạy
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('classes');
                  setErrorMsg(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  tab === 'classes'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                Gán cho từng lớp
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('bulk');
                  setErrorMsg(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  tab === 'bulk'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="h-4 w-4" />
                Dán nhanh
              </button>
            </div>

            {activeSet && usedInActiveCount > 0 && tab === 'manage' && (
              <button
                type="button"
                onClick={() => {
                  onResetUsedQuestions(activeSet.id);
                  setStatusNote('Đã đặt lại trạng thái các câu đã hỏi trong bộ này.');
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-sky-700 whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Đặt lại {usedInActiveCount} câu đã hỏi
              </button>
            )}
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
              {errorMsg}
            </p>
          )}
          {statusNote && !errorMsg && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
              {statusNote}
            </p>
          )}

          {/* Question Set Selector & CRUD (shown on manage & bulk tabs) */}
          {(tab === 'manage' || tab === 'bulk') && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="modal-question-set-select"
                  className="text-sm font-semibold text-slate-700"
                >
                  Chọn bộ câu hỏi để chỉnh sửa
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSet((v) => !v);
                      setShowRenameSet(false);
                      setConfirmDeleteSet(false);
                      setErrorMsg(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 whitespace-nowrap"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    Thêm bộ mới
                  </button>
                  <button
                    type="button"
                    disabled={!activeSet}
                    onClick={handleOpenRenameSet}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 disabled:opacity-40 whitespace-nowrap"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Đổi tên
                  </button>
                  <button
                    type="button"
                    disabled={draftSets.length <= 1}
                    onClick={() => {
                      setConfirmDeleteSet((v) => !v);
                      setShowAddSet(false);
                      setShowRenameSet(false);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa bộ
                  </button>
                </div>
              </div>

              <select
                id="modal-question-set-select"
                value={activeSet?.id || ''}
                onChange={(e) => {
                  setSelectedSetId(e.target.value);
                  resetQuestionForm();
                  setShowRenameSet(false);
                  setConfirmDeleteSet(false);
                  setStatusNote(null);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-sky-600 focus:outline-none"
              >
                {draftSets.map((set) => {
                  const classLabels =
                    set.targetClassIds && set.targetClassIds.length > 0
                      ? set.targetClassIds
                          .map((cid) => classrooms.find((c) => c.id === cid)?.name)
                          .filter(Boolean)
                          .join(', ')
                      : 'Tất cả lớp';
                  return (
                    <option key={set.id} value={set.id}>
                      {set.title}
                      {set.subject ? ` (${set.subject})` : ''} — {set.questions.length} câu ·{' '}
                      {classLabels}
                    </option>
                  );
                })}
              </select>

              {/* Inline Target Classes Picker for Active Set */}
              {activeSet && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-600">
                      Áp dụng bộ câu hỏi này cho lớp:
                    </span>
                    {activeSet.targetClassIds && activeSet.targetClassIds.length > 0 && (
                      <button
                        type="button"
                        onClick={clearTargetClassesForActiveSet}
                        className="font-semibold text-sky-700 hover:underline"
                      >
                        Đặt dùng chung tất cả các lớp
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={clearTargetClassesForActiveSet}
                      className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                        !activeSet.targetClassIds ||
                        activeSet.targetClassIds.length === 0
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Tất cả các lớp
                    </button>
                    {classrooms.map((cls) => {
                      const isTargeted = Boolean(
                        activeSet.targetClassIds?.includes(cls.id)
                      );
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => toggleTargetClassForActiveSet(cls.id)}
                          className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                            isTargeted
                              ? 'border-sky-600 bg-sky-600 text-white'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-sky-400 hover:bg-sky-50'
                          }`}
                        >
                          {cls.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Inline Create New Set */}
              {showAddSet && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/70 p-3">
                  <input
                    type="text"
                    value={newSetTitle}
                    onChange={(e) => setNewSetTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateSet();
                      }
                    }}
                    placeholder="Tên bộ câu hỏi (VD: Ôn tập Chương 2 Toán 7)"
                    className="min-w-[200px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newSetSubject}
                    onChange={(e) => setNewSetSubject(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateSet();
                      }
                    }}
                    placeholder="Môn học (tùy chọn)"
                    className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateSet}
                    className="rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-sky-700 whitespace-nowrap"
                  >
                    Tạo bộ mới
                  </button>
                </div>
              )}

              {/* Inline Rename Set */}
              {showRenameSet && activeSet && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                  <input
                    type="text"
                    value={renameSetTitle}
                    onChange={(e) => setRenameSetTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmRenameSet();
                      }
                    }}
                    placeholder="Tên bộ câu hỏi mới..."
                    className="min-w-[200px] flex-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-amber-600 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={renameSetSubject}
                    onChange={(e) => setRenameSetSubject(e.target.value)}
                    placeholder="Môn học"
                    className="w-36 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-amber-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmRenameSet}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 whitespace-nowrap"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Lưu tên
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRenameSet(false)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                  >
                    Hủy
                  </button>
                </div>
              )}

              {/* Inline Delete Confirmation */}
              {confirmDeleteSet && activeSet && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5">
                  <span className="text-xs font-semibold text-rose-800">
                    Xóa bộ câu hỏi <strong>{activeSet.title}</strong> ({activeQuestions.length} câu)?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteActiveSet}
                      className="rounded-md bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-700 whitespace-nowrap"
                    >
                      Xác nhận xóa
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteSet(false)}
                      className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: Manage Single Questions */}
          {tab === 'manage' && activeSet && (
            <div className="space-y-5">
              {/* Single Question Composer */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-800">
                    {editingQuestionId ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}
                  </span>
                  <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                    <button
                      type="button"
                      onClick={() => setQType('multiple_choice')}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                        qType === 'multiple_choice'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Trắc nghiệm (A/B/C/D)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQType('open')}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                        qType === 'open'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tự luận / Hỏi miệng
                    </button>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={qPrompt}
                  onChange={(e) => {
                    setQPrompt(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Nhập nội dung câu hỏi..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                />

                {qType === 'multiple_choice' && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500">
                      Nhập 4 phương án và bấm chọn chữ cái A / B / C / D là đáp án đúng:
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {OPTION_LETTERS.map((letter, idx) => {
                        const isCorrect = qCorrectIdx === idx;
                        return (
                          <div key={letter} className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setQCorrectIdx(idx)}
                              title={`Chọn ${letter} là đáp án đúng`}
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
                                isCorrect
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-700'
                              }`}
                            >
                              {letter}
                            </button>
                            <input
                              type="text"
                              value={qOptions[idx]}
                              onChange={(e) => {
                                const next: [string, string, string, string] = [
                                  ...qOptions,
                                ];
                                next[idx] = e.target.value;
                                setQOptions(next);
                              }}
                              placeholder={`Phương án ${letter}...`}
                              className={`w-full rounded-lg border bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none ${
                                isCorrect
                                  ? 'border-emerald-400 focus:border-emerald-600'
                                  : 'border-slate-300 focus:border-sky-600'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={qAnswerText}
                    onChange={(e) => setQAnswerText(e.target.value)}
                    placeholder={
                      qType === 'multiple_choice'
                        ? 'Giải thích đáp án (tùy chọn)...'
                        : 'Đáp án gợi ý để giáo viên bật xem khi cần (tùy chọn)...'
                    }
                    className="min-w-[200px] flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                  />
                  {editingQuestionId && (
                    <button
                      type="button"
                      onClick={resetQuestionForm}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                    >
                      Hủy sửa
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveQuestionItem}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 whitespace-nowrap shrink-0"
                  >
                    {editingQuestionId ? (
                      <>
                        <Check className="h-4 w-4" />
                        Cập nhật câu
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Thêm câu hỏi
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Question List */}
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">
                    Danh sách câu hỏi trong bộ ({activeQuestions.length} câu)
                  </span>
                  {usedInActiveCount > 0 && (
                    <span className="tabular-nums">
                      Đã hỏi {usedInActiveCount}/{activeQuestions.length} câu
                    </span>
                  )}
                </div>

                {activeQuestions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-7 text-center text-sm text-slate-500">
                    Bộ câu hỏi này chưa có câu nào. Giáo viên có thể nhập ở trên hoặc dùng tab{' '}
                    <button
                      type="button"
                      onClick={() => setTab('ai')}
                      className="font-semibold text-sky-700 underline"
                    >
                      AI tạo từ bài dạy
                    </button>
                    .
                  </div>
                ) : (
                  <div className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    {activeQuestions.map((q, idx) => {
                      const isUsed = usedQuestionIds.has(q.id);
                      const isEditing = editingQuestionId === q.id;
                      const correctLetter =
                        q.type === 'multiple_choice' &&
                        q.correctOptionIndex !== undefined
                          ? OPTION_LETTERS[q.correctOptionIndex]
                          : null;

                      return (
                        <div
                          key={q.id}
                          className={`flex items-start justify-between gap-3 px-4 py-3 ${
                            isEditing ? 'bg-sky-50/60' : ''
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900">
                              <span className="mr-1.5 font-bold tabular-nums text-sky-700">
                                {String(idx + 1).padStart(2, '0')}.
                              </span>
                              {q.prompt}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                              <span>
                                {q.type === 'multiple_choice'
                                  ? 'Trắc nghiệm'
                                  : 'Tự luận / Hỏi miệng'}
                              </span>
                              {correctLetter &&
                                q.options?.[q.correctOptionIndex ?? 0] && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-semibold text-emerald-700">
                                      Đáp án {correctLetter}:{' '}
                                      {q.options[q.correctOptionIndex ?? 0]}
                                    </span>
                                  </>
                                )}
                              {q.type === 'open' && q.answerText && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="truncate text-slate-600">
                                    Gợi ý: {q.answerText}
                                  </span>
                                </>
                              )}
                              {isUsed && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-medium text-amber-700">
                                    Đã hỏi
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditQuestion(q)}
                              aria-label="Sửa câu hỏi"
                              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-sky-700"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              aria-label="Xóa câu hỏi"
                              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AI Generate Question Set from Lesson Content or Uploaded File */}
          {tab === 'ai' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
                <p className="text-sm font-bold text-slate-900">
                  Đưa nội dung bài dạy lên để AI tự động soạn bộ câu hỏi
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Giáo viên có thể dán văn bản giáo án, dàn ý bài học, hoặc tải trực tiếp tệp{' '}
                  <strong>PDF</strong>, <strong>ảnh chụp trang sách giáo khoa (PNG/JPG)</strong>,{' '}
                  <strong>file văn bản (.txt/.md)</strong>. AI sẽ tạo bộ câu hỏi bám sát nội dung và tự động gán cho lớp đã chọn.
                </p>
              </div>

              {/* Upload File & Paste Lesson Content */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="ai-lesson-textarea"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Nội dung bài dạy / tài liệu đính kèm
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.md,.csv,image/png,image/jpeg,image/webp"
                      onChange={handleUploadLessonFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={aiGenerating}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-bold text-sky-800 transition-colors hover:bg-sky-50 disabled:opacity-50 whitespace-nowrap"
                    >
                      <FileUp className="h-3.5 w-3.5" />
                      Tải tệp bài dạy (PDF / Ảnh / TXT)
                    </button>
                  </div>
                </div>

                {aiUploadedFile && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs">
                    <div className="flex min-w-0 items-center gap-2 font-semibold text-sky-950">
                      <FileText className="h-4 w-4 shrink-0 text-sky-700" />
                      <span className="truncate">{aiUploadedFile.fileName}</span>
                      <span className="shrink-0 font-normal text-sky-700 tabular-nums">
                        ({formatFileSize(aiUploadedFile.sizeBytes)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiUploadedFile(null)}
                      aria-label="Gỡ tệp đính kèm"
                      className="rounded p-1 text-sky-700 hover:bg-sky-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <textarea
                  id="ai-lesson-textarea"
                  rows={6}
                  value={aiLessonText}
                  disabled={aiGenerating}
                  onChange={(e) => {
                    setAiLessonText(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Dán nội dung bài học, kiến thức trọng tâm, đoạn văn bản, công thức Toán/Khoa học tự nhiên, hoặc ghi chú bổ sung cho tệp vừa tải lên..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm leading-relaxed text-slate-900 focus:border-sky-600 focus:outline-none disabled:bg-slate-50"
                />
              </div>

              {/* AI Parameters Grid */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="ai-target-class"
                    className="mb-1 block text-xs font-semibold text-slate-600"
                  >
                    Tạo cho lớp
                  </label>
                  <select
                    id="ai-target-class"
                    value={aiTargetClassId}
                    disabled={aiGenerating}
                    onChange={(e) => setAiTargetClassId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-sky-600 focus:outline-none"
                  >
                    {classrooms.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                    <option value="all">Dùng chung tất cả các lớp</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="ai-subject-input"
                    className="mb-1 block text-xs font-semibold text-slate-600"
                  >
                    Môn học (tùy chọn)
                  </label>
                  <input
                    id="ai-subject-input"
                    type="text"
                    value={aiSubject}
                    disabled={aiGenerating}
                    onChange={(e) => setAiSubject(e.target.value)}
                    placeholder="VD: Khoa học tự nhiên, Lịch sử..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ai-set-title-input"
                    className="mb-1 block text-xs font-semibold text-slate-600"
                  >
                    Tên bộ câu hỏi (tùy chọn)
                  </label>
                  <input
                    id="ai-set-title-input"
                    type="text"
                    value={aiSetTitle}
                    disabled={aiGenerating}
                    onChange={(e) => setAiSetTitle(e.target.value)}
                    placeholder="Để trống AI tự đặt tên"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                    Số câu
                  </span>
                  <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                    {AI_COUNT_OPTIONS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={aiGenerating}
                        onClick={() => setAiCount(n)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors ${
                          aiCount === n
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                    Dạng câu
                  </span>
                  <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                    {(
                      [
                        { v: 'mixed', l: 'Kết hợp' },
                        { v: 'multiple_choice', l: 'Trắc nghiệm' },
                        { v: 'open', l: 'Tự luận' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        disabled={aiGenerating}
                        onClick={() => setAiFormat(opt.v)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                          aiFormat === opt.v
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                    Mức độ
                  </span>
                  <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                    {(
                      [
                        { v: 'basic', l: 'Cơ bản' },
                        { v: 'medium', l: 'Trung bình' },
                        { v: 'advanced', l: 'Vận dụng' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        disabled={aiGenerating}
                        onClick={() => setAiDifficulty(opt.v)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                          aiDifficulty === opt.v
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                    Lưu vào:
                  </span>
                  <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                    <button
                      type="button"
                      disabled={aiGenerating}
                      onClick={() => setAiSaveMode('new_set')}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                        aiSaveMode === 'new_set'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tạo bộ câu hỏi mới
                    </button>
                    <button
                      type="button"
                      disabled={aiGenerating || !activeSet}
                      onClick={() => setAiSaveMode('append')}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-40 ${
                        aiSaveMode === 'append'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Thêm vào bộ hiện tại
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateWithAI}
                  disabled={aiGenerating}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI đang soạn bộ câu hỏi...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Tạo bộ câu hỏi bằng AI
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Per-Class Question Set Assignment Matrix */}
          {tab === 'classes' && (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-slate-600">
                Chọn sẵn bộ câu hỏi mặc định cho từng lớp. Khi giáo viên chuyển sang lớp nào ở màn hình chính, hệ thống sẽ tự động nạp đúng bộ câu hỏi đã gán cho lớp đó.
              </p>

              <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                {classrooms.map((cls) => {
                  const assignedId =
                    draftSetByClass[cls.id] ?? draftSets[0]?.id ?? 'none';
                  const isCurrentClass = cls.id === activeClassId;
                  return (
                    <div
                      key={cls.id}
                      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                        isCurrentClass ? 'bg-sky-50/50' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">
                          {cls.name}
                          {isCurrentClass && (
                            <span className="ml-2 text-xs font-semibold text-sky-700">
                              · Đang chọn
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {cls.students.length} học sinh
                        </p>
                      </div>

                      <select
                        value={assignedId}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          setDraftSetByClass((prev) => ({
                            ...prev,
                            [cls.id]: nextVal,
                          }));
                          if (cls.id === activeClassId && nextVal !== 'none') {
                            setSelectedSetId(nextVal);
                          }
                        }}
                        aria-label={`Chọn bộ câu hỏi cho ${cls.name}`}
                        className="min-w-[230px] max-w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-sky-600 focus:outline-none sm:w-80"
                      >
                        {draftSets.map((set) => (
                          <option key={set.id} value={set.id}>
                            {set.title} ({set.questions.length} câu)
                          </option>
                        ))}
                        <option value="none">
                          Không hiện câu hỏi (Hỏi trực tiếp)
                        </option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: Bulk Paste */}
          {tab === 'bulk' && activeSet && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
                <p className="font-semibold text-slate-800">
                  Mỗi dòng tương ứng 1 câu hỏi — hỗ trợ cả 2 định dạng:
                </p>
                <p className="mt-1">
                  • <strong>Tự luận:</strong>{' '}
                  <code className="rounded bg-white px-1.5 py-0.5 text-slate-800">
                    Nội dung câu hỏi | Đáp án gợi ý
                  </code>{' '}
                  (có thể bỏ phần sau dấu |)
                </p>
                <p className="mt-1">
                  • <strong>Trắc nghiệm:</strong>{' '}
                  <code className="rounded bg-white px-1.5 py-0.5 text-slate-800">
                    Câu hỏi | Đáp án A | Đáp án B | Đáp án C | Đáp án D | B
                  </code>
                </p>
              </div>

              <textarea
                rows={7}
                value={bulkText}
                onChange={(e) => {
                  setBulkText(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder={
                  'Thủ đô của Việt Nam là thành phố nào? | Hà Nội\n5 × 8 bằng bao nhiêu? | 35 | 40 | 45 | 50 | B | Vì 5 × 8 = 40\nKể tên 3 tác phẩm văn học dân gian mà em biết.'
                }
                className="w-full rounded-xl border border-slate-300 p-3.5 text-sm leading-relaxed text-slate-900 focus:border-sky-600 focus:outline-none"
              />

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-500">
                  Nhận diện được{' '}
                  <strong className="tabular-nums text-slate-800">
                    {bulkPreviewCount}
                  </strong>{' '}
                  câu hỏi hợp lệ
                </span>
                <button
                  type="button"
                  onClick={handleImportBulk}
                  disabled={bulkPreviewCount === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Thêm {bulkPreviewCount > 0 ? `${bulkPreviewCount} ` : ''}câu vào bộ
                </button>
              </div>
            </div>
          )}

          {/* Option: Avoid repeat questions */}
          <label className="flex cursor-pointer items-center gap-2.5 border-t border-slate-100 pt-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draftAvoidRepeat}
              onChange={(e) => setDraftAvoidRepeat(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span>Không lặp lại câu hỏi đã hỏi trong cùng một phiên chơi</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleFinalSave}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800 whitespace-nowrap"
          >
            <Check className="h-4 w-4" />
            Lưu cấu hình & bộ câu hỏi
          </button>
        </div>
      </div>
    </div>
  );
};
