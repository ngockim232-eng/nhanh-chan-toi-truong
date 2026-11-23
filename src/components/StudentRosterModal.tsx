import React, { useEffect, useState } from 'react';
import {
  Backpack,
  Check,
  Download,
  FolderPlus,
  Glasses,
  Pencil,
  Plus,
  RefreshCw,
  Scissors,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  BACKPACK_COLOR_OPTIONS,
  BACKPACK_STYLE_OPTIONS,
  BOY_CHIBI_VARIANTS,
  BOY_HAIR_OPTIONS,
  GIRL_CHIBI_VARIANTS,
  GIRL_HAIR_OPTIONS,
  GLASSES_OPTIONS,
  getChibiSpec,
} from '../data/chibiCatalog';
import {
  DEFAULT_SCHOOL_NAME,
  createStudentProfile,
  guessGenderFromName,
} from '../data/defaults';
import {
  BackpackStyle,
  ChibiHairDesign,
  ClassRoom,
  Gender,
  GlassesStyle,
  StudentProfile,
} from '../types/game';
import {
  ProcessedChibiSprite,
  getAllCachedChibi3DSprites,
  loadChibi3DSprites,
  subscribeChibi3DSprites,
} from '../game/chibiSpriteProcessor';
import { ChibiAvatar } from './ChibiAvatar';

interface StudentRosterModalProps {
  isOpen: boolean;
  classrooms: ClassRoom[];
  activeClassId: string;
  schoolName: string;
  excludePreviouslyCaught: boolean;
  onClose: () => void;
  onSave: (
    nextClassrooms: ClassRoom[],
    nextActiveClassId: string,
    nextSchoolName: string,
    excludeCaught: boolean
  ) => void;
}

export const StudentRosterModal: React.FC<StudentRosterModalProps> = ({
  isOpen,
  classrooms,
  activeClassId,
  schoolName,
  excludePreviouslyCaught,
  onClose,
  onSave,
}) => {
  const [tab, setTab] = useState<'bulk' | 'list' | 'chibi'>('list');
  const [draftClasses, setDraftClasses] = useState<ClassRoom[]>(classrooms);
  const [selectedClassId, setSelectedClassId] = useState<string>(activeClassId);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender>('boy');
  const [newClassName, setNewClassName] = useState('');
  const [showAddClass, setShowAddClass] = useState(false);
  const [showRenameClass, setShowRenameClass] = useState(false);
  const [renameClassValue, setRenameClassValue] = useState('');
  const [confirmDeleteClass, setConfirmDeleteClass] = useState(false);
  const [draftSchoolName, setDraftSchoolName] = useState(schoolName);
  const [draftExclude, setDraftExclude] = useState(excludePreviouslyCaught);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [chibiSprites, setChibiSprites] = useState<
    Record<number, ProcessedChibiSprite>
  >(() => getAllCachedChibi3DSprites());

  useEffect(() => {
    if (!isOpen) return;
    loadChibi3DSprites().then((sprites) => setChibiSprites({ ...sprites }));
    return subscribeChibi3DSprites(() => {
      setChibiSprites({ ...getAllCachedChibi3DSprites() });
    });
  }, [isOpen]);

  const activeClass =
    draftClasses.find((c) => c.id === selectedClassId) || draftClasses[0];
  const draftList = activeClass?.students || [];

  useEffect(() => {
    if (isOpen) {
      setDraftClasses(classrooms);
      setSelectedClassId(activeClassId);
      const found =
        classrooms.find((c) => c.id === activeClassId) || classrooms[0];
      setBulkText((found?.students || []).map((s) => s.name).join('\n'));
      setDraftSchoolName(schoolName);
      setDraftExclude(excludePreviouslyCaught);
      setShowAddClass(false);
      setShowRenameClass(false);
      setConfirmDeleteClass(false);
      setNewClassName('');
      setRenameClassValue('');
      setEditingStudentId(null);
      setErrorMsg(null);
    }
  }, [isOpen, classrooms, activeClassId, schoolName, excludePreviouslyCaught]);

  if (!isOpen || !activeClass) return null;

  const updateActiveStudents = (nextStudents: StudentProfile[]) => {
    setDraftClasses((prev) =>
      prev.map((cls) =>
        cls.id === activeClass.id ? { ...cls, students: nextStudents } : cls
      )
    );
  };

  const parseNamesFromBulk = (text: string): StudentProfile[] => {
    const rawNames = text
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const existingByName = new Map(
      draftList.map((s) => [s.name.toLowerCase(), s])
    );

    let boyIdx = 0;
    let girlIdx = 0;

    return rawNames.map((name, idx) => {
      const existing = existingByName.get(name.toLowerCase());
      if (existing) {
        if (existing.gender === 'boy') boyIdx++;
        else girlIdx++;
        return { ...existing, name };
      }
      const g = guessGenderFromName(name, idx);
      const variant = g === 'boy' ? boyIdx++ % 10 : 10 + (girlIdx++ % 10);
      return createStudentProfile(name, idx, g, variant);
    });
  };

  const handleSelectClass = (nextClassId: string) => {
    if (tab === 'bulk') {
      const parsed = parseNamesFromBulk(bulkText);
      if (parsed.length > 0) updateActiveStudents(parsed);
    }
    setSelectedClassId(nextClassId);
    setEditingStudentId(null);
    setShowRenameClass(false);
    setConfirmDeleteClass(false);
    const nextCls = draftClasses.find((c) => c.id === nextClassId);
    setBulkText((nextCls?.students || []).map((s) => s.name).join('\n'));
    setErrorMsg(null);
  };

  const handleCreateClass = () => {
    const label = newClassName.trim();
    if (!label) return;
    const id = `lop_${Date.now()}`;
    const starterStudents = [
      createStudentProfile('Minh Khang', 0, 'boy', 0),
      createStudentProfile('Gia Hân', 1, 'girl', 10),
      createStudentProfile('Bảo Nam', 2, 'boy', 1),
      createStudentProfile('Tuệ Nhi', 3, 'girl', 11),
      createStudentProfile('Đức Phúc', 4, 'boy', 2),
      createStudentProfile('Khánh Linh', 5, 'girl', 12),
    ];
    const nextClass: ClassRoom = {
      id,
      name: label,
      students: starterStudents,
    };
    setDraftClasses((prev) => [...prev, nextClass]);
    setSelectedClassId(id);
    setBulkText(starterStudents.map((s) => s.name).join('\n'));
    setNewClassName('');
    setShowAddClass(false);
    setShowRenameClass(false);
    setConfirmDeleteClass(false);
    setErrorMsg(null);
  };

  const handleStartRenameClass = () => {
    setRenameClassValue(activeClass.name);
    setShowRenameClass((v) => !v);
    setShowAddClass(false);
    setConfirmDeleteClass(false);
    setErrorMsg(null);
  };

  const handleConfirmRenameClass = () => {
    const trimmed = renameClassValue.trim();
    if (!trimmed) {
      setErrorMsg('Tên lớp không được để trống.');
      return;
    }
    setDraftClasses((prev) =>
      prev.map((cls) =>
        cls.id === activeClass.id ? { ...cls, name: trimmed } : cls
      )
    );
    setShowRenameClass(false);
    setRenameClassValue('');
    setErrorMsg(null);
  };

  const handleDeleteActiveClass = () => {
    if (draftClasses.length <= 1) {
      setErrorMsg('Cần giữ lại ít nhất 1 lớp học trong danh sách.');
      setConfirmDeleteClass(false);
      return;
    }
    const remaining = draftClasses.filter((cls) => cls.id !== activeClass.id);
    const fallbackClass = remaining[0];
    setDraftClasses(remaining);
    setSelectedClassId(fallbackClass.id);
    setBulkText(fallbackClass.students.map((s) => s.name).join('\n'));
    setEditingStudentId(null);
    setShowRenameClass(false);
    setConfirmDeleteClass(false);
    setErrorMsg(null);
  };

  const handleTabSwitch = (nextTab: 'bulk' | 'list' | 'chibi') => {
    if (tab === 'bulk' && nextTab !== 'bulk') {
      const parsed = parseNamesFromBulk(bulkText);
      if (parsed.length > 0) updateActiveStudents(parsed);
    } else if (nextTab === 'bulk' && tab !== 'bulk') {
      setBulkText(draftList.map((s) => s.name).join('\n'));
    }
    setTab(nextTab);
    setErrorMsg(null);
  };

  const handleAddSingle = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const sameGenderCount = draftList.filter((s) => s.gender === newGender).length;
    const variant =
      newGender === 'boy'
        ? sameGenderCount % 10
        : 10 + (sameGenderCount % 10);
    const next = [
      ...draftList,
      createStudentProfile(trimmed, draftList.length, newGender, variant),
    ];
    updateActiveStudents(next);
    setBulkText(next.map((s) => s.name).join('\n'));
    setNewName('');
    setErrorMsg(null);
  };

  const handleToggleGender = (id: string) => {
    const next = draftList.map((s) => {
      if (s.id !== id) return s;
      const nextGender: Gender = s.gender === 'boy' ? 'girl' : 'boy';
      const nextVariant =
        nextGender === 'boy' ? s.chibiVariant % 10 : 10 + (s.chibiVariant % 10);
      return {
        ...createStudentProfile(s.name, nextVariant, nextGender, nextVariant),
        id: s.id,
      };
    });
    updateActiveStudents(next);
  };

  // Cycle through the 10 distinct Cute 3D Chibi THCS characters for this student's gender
  const handleCycleCharacter = (id: string) => {
    const next = draftList.map((s) => {
      if (s.id !== id) return s;
      const baseOffset = s.gender === 'boy' ? 0 : 10;
      const nextVariant = baseOffset + (((s.chibiVariant - baseOffset) + 1) % 10);
      const spec = getChibiSpec(nextVariant, s.gender);
      return {
        ...s,
        chibiVariant: nextVariant,
        hairDesign: spec.hairDesign,
        glassesStyle: spec.glassesStyle,
        hasGlasses: spec.glassesStyle !== 'none',
        backpackStyle: spec.backpackStyle,
        backpackColor: spec.backpackColor,
      };
    });
    updateActiveStudents(next);
  };

  const handleSetCharacter = (id: string, variantId: number) => {
    const next = draftList.map((s) => {
      if (s.id !== id) return s;
      const spec = getChibiSpec(variantId, s.gender);
      return {
        ...s,
        chibiVariant: spec.id,
        hairDesign: spec.hairDesign,
        glassesStyle: spec.glassesStyle,
        hasGlasses: spec.glassesStyle !== 'none',
        backpackStyle: spec.backpackStyle,
        backpackColor: spec.backpackColor,
      };
    });
    updateActiveStudents(next);
  };

  // Cycle Hairstyle directly ("Đổi tóc")
  const handleCycleHair = (id: string) => {
    const next = draftList.map((s) => {
      if (s.id !== id) return s;
      const options = s.gender === 'boy' ? BOY_HAIR_OPTIONS : GIRL_HAIR_OPTIONS;
      const spec = getChibiSpec(s.chibiVariant, s.gender);
      const current = s.hairDesign ?? spec.hairDesign;
      const curIdx = Math.max(
        0,
        options.findIndex((o) => o.value === current)
      );
      const nextHair = options[(curIdx + 1) % options.length].value;
      return { ...s, hairDesign: nextHair };
    });
    updateActiveStudents(next);
  };

  // Cycle Backpack style & color directly ("Đổi cặp")
  const handleCycleBackpack = (id: string) => {
    const next = draftList.map((s) => {
      if (s.id !== id) return s;
      const spec = getChibiSpec(s.chibiVariant, s.gender);
      const currentStyle = s.backpackStyle ?? spec.backpackStyle;
      const curIdx = Math.max(
        0,
        BACKPACK_STYLE_OPTIONS.findIndex((o) => o.value === currentStyle)
      );
      const nextStyle =
        BACKPACK_STYLE_OPTIONS[(curIdx + 1) % BACKPACK_STYLE_OPTIONS.length].value;
      const nextColor =
        BACKPACK_COLOR_OPTIONS[(curIdx + 1) % BACKPACK_COLOR_OPTIONS.length].color;
      return {
        ...s,
        backpackStyle: nextStyle,
        backpackColor: nextColor,
      };
    });
    updateActiveStudents(next);
  };

  // Cycle Glasses style directly ("Đổi kính")
  const handleCycleGlasses = (id: string) => {
    const next = draftList.map((s) => {
      if (s.id !== id) return s;
      const spec = getChibiSpec(s.chibiVariant, s.gender);
      const current = s.glassesStyle ?? spec.glassesStyle;
      const curIdx = Math.max(
        0,
        GLASSES_OPTIONS.findIndex((o) => o.value === current)
      );
      const nextGlasses =
        GLASSES_OPTIONS[(curIdx + 1) % GLASSES_OPTIONS.length].value;
      return {
        ...s,
        glassesStyle: nextGlasses,
        hasGlasses: nextGlasses !== 'none',
      };
    });
    updateActiveStudents(next);
  };

  const handleSetHair = (id: string, hairDesign: ChibiHairDesign) => {
    updateActiveStudents(
      draftList.map((s) => (s.id === id ? { ...s, hairDesign } : s))
    );
  };

  const handleSetGlasses = (id: string, glassesStyle: GlassesStyle) => {
    updateActiveStudents(
      draftList.map((s) =>
        s.id === id
          ? { ...s, glassesStyle, hasGlasses: glassesStyle !== 'none' }
          : s
      )
    );
  };

  const handleSetBackpackStyle = (id: string, backpackStyle: BackpackStyle) => {
    updateActiveStudents(
      draftList.map((s) => (s.id === id ? { ...s, backpackStyle } : s))
    );
  };

  const handleSetBackpackColor = (id: string, backpackColor: string) => {
    updateActiveStudents(
      draftList.map((s) => (s.id === id ? { ...s, backpackColor } : s))
    );
  };

  const handleRemove = (id: string) => {
    const next = draftList.filter((s) => s.id !== id);
    updateActiveStudents(next);
    setBulkText(next.map((s) => s.name).join('\n'));
    if (editingStudentId === id) setEditingStudentId(null);
  };

  const handleSubmit = () => {
    let finalClasses = draftClasses;
    if (tab === 'bulk') {
      const parsed = parseNamesFromBulk(bulkText);
      if (parsed.length < 2) {
        setErrorMsg('Mỗi lớp cần có ít nhất 2 học sinh để bắt đầu trò chơi.');
        return;
      }
      finalClasses = draftClasses.map((cls) =>
        cls.id === activeClass.id ? { ...cls, students: parsed } : cls
      );
    } else if (draftList.length < 2) {
      setErrorMsg('Mỗi lớp cần có ít nhất 2 học sinh để bắt đầu trò chơi.');
      return;
    }

    onSave(
      finalClasses,
      activeClass.id,
      draftSchoolName.trim() || DEFAULT_SCHOOL_NAME,
      draftExclude
    );
    onClose();
  };

  const previewCount =
    tab === 'bulk'
      ? bulkText
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean).length
      : draftList.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roster-modal-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="roster-modal-title"
                className="font-display text-xl font-bold text-slate-900"
              >
                Quản lý lớp, Kiểu tóc, Kính mắt & Cặp sách Chibi
              </h2>
              <p className="text-sm text-slate-500">
                Đang chỉnh:{' '}
                <strong className="font-semibold text-slate-800">
                  {activeClass.name}
                </strong>{' '}
                ·{' '}
                <span className="font-semibold tabular-nums text-slate-800">
                  {previewCount}
                </span>{' '}
                học sinh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Class Selector & School Gate Name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="modal-class-select"
                  className="text-sm font-semibold text-slate-700"
                >
                  Chọn lớp học
                </label>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddClass((v) => !v);
                      setShowRenameClass(false);
                      setConfirmDeleteClass(false);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 whitespace-nowrap"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    Thêm lớp
                  </button>
                  <button
                    type="button"
                    onClick={handleStartRenameClass}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 whitespace-nowrap"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Đổi tên
                  </button>
                  <button
                    type="button"
                    disabled={draftClasses.length <= 1}
                    onClick={() => {
                      setConfirmDeleteClass((v) => !v);
                      setShowAddClass(false);
                      setShowRenameClass(false);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa lớp
                  </button>
                </div>
              </div>
              <select
                id="modal-class-select"
                value={activeClass.id}
                onChange={(e) => handleSelectClass(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-sky-600 focus:outline-none"
              >
                {draftClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.students.length} học sinh)
                  </option>
                ))}
              </select>

              {showAddClass && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateClass();
                      }
                    }}
                    placeholder="VD: Lớp 5B, Lớp 8C..."
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateClass}
                    className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 whitespace-nowrap"
                  >
                    Tạo lớp
                  </button>
                </div>
              )}

              {showRenameClass && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={renameClassValue}
                    onChange={(e) => setRenameClassValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmRenameClass();
                      } else if (e.key === 'Escape') {
                        setShowRenameClass(false);
                      }
                    }}
                    placeholder="Nhập tên lớp mới..."
                    className="flex-1 rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-1.5 text-sm text-slate-900 focus:border-amber-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmRenameClass}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 whitespace-nowrap"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Lưu tên
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRenameClass(false)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                  >
                    Hủy
                  </button>
                </div>
              )}

              {confirmDeleteClass && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                  <span className="text-xs font-semibold text-rose-800">
                    Xóa lớp <strong>{activeClass.name}</strong> ({activeClass.students.length} HS)?
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleDeleteActiveClass}
                      className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700 whitespace-nowrap"
                    >
                      Xác nhận xóa
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteClass(false)}
                      className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="school-name-input"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Bảng tên cổng trường
              </label>
              <input
                id="school-name-input"
                type="text"
                value={draftSchoolName}
                onChange={(e) => setDraftSchoolName(e.target.value)}
                placeholder={DEFAULT_SCHOOL_NAME}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 transition-colors focus:border-sky-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => handleTabSwitch('list')}
              className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                tab === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đổi tóc, kính & cặp từng bạn
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('bulk')}
              className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                tab === 'bulk'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nhập / dán nhanh cả lớp
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('chibi')}
              className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                tab === 'chibi'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bộ 20 nhân vật 3D Chibi THCS (PNG)
            </button>
          </div>

          {tab === 'bulk' && (
            <div>
              <label
                htmlFor="bulk-student-textarea"
                className="mb-1.5 block text-sm font-medium text-slate-600"
              >
                Dán danh sách học sinh của <strong>{activeClass.name}</strong> (mỗi dòng 1 tên):
              </label>
              <textarea
                id="bulk-student-textarea"
                rows={8}
                value={bulkText}
                onChange={(e) => {
                  setBulkText(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder={'Minh Khang\nGia Hân\nBảo Nam\nTuệ Nhi'}
                className="w-full rounded-xl border border-slate-300 p-3.5 text-sm leading-relaxed text-slate-900 focus:border-sky-600 focus:outline-none"
              />
            </div>
          )}

          {tab === 'list' && (
            <div className="space-y-3">
              {/* Quick add row */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSingle();
                    }
                  }}
                  placeholder={`Thêm học sinh vào ${activeClass.name}...`}
                  className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                />
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setNewGender('boy')}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      newGender === 'boy'
                        ? 'bg-white text-sky-700 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Nam
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewGender('girl')}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      newGender === 'girl'
                        ? 'bg-white text-rose-700 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Nữ
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAddSingle}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Thêm bạn
                </button>
              </div>

              {/* Editable list with instant Đổi tóc + Đổi kính + Đổi cặp + expandable detailed editor */}
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                {draftList.map((stu, idx) => {
                  const spec = getChibiSpec(stu.chibiVariant, stu.gender);
                  const curHair = stu.hairDesign ?? spec.hairDesign;
                  const curGlasses = stu.glassesStyle ?? spec.glassesStyle;
                  const curBp = stu.backpackStyle ?? spec.backpackStyle;
                  const hairOptions =
                    stu.gender === 'boy' ? BOY_HAIR_OPTIONS : GIRL_HAIR_OPTIONS;
                  const hairLabel =
                    hairOptions.find((h) => h.value === curHair)?.label ||
                    'Tóc Chibi';
                  const glassesLabel =
                    curGlasses !== 'none'
                      ? GLASSES_OPTIONS.find((g) => g.value === curGlasses)?.label
                      : null;
                  const bpLabel =
                    BACKPACK_STYLE_OPTIONS.find((b) => b.value === curBp)?.label ||
                    'Cặp học sinh';
                  const isExpanded = editingStudentId === stu.id;

                  return (
                    <div key={stu.id} className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingStudentId(isExpanded ? null : stu.id)
                          }
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span className="w-6 text-xs font-semibold tabular-nums text-slate-400">
                            {idx + 1}.
                          </span>
                          <ChibiAvatar profile={stu} size={48} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {stu.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {hairLabel} · {bpLabel}
                              {glassesLabel ? ` · ${glassesLabel}` : ''}
                            </p>
                          </div>
                        </button>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCycleCharacter(stu.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Đổi nhân vật 3D
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCycleHair(stu.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100 whitespace-nowrap"
                          >
                            <Scissors className="h-3 w-3" />
                            Đổi tóc
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCycleGlasses(stu.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-100 whitespace-nowrap"
                          >
                            <Glasses className="h-3 w-3" />
                            Đổi kính
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCycleBackpack(stu.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 whitespace-nowrap"
                          >
                            <Backpack className="h-3 w-3" />
                            Đổi cặp
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleGender(stu.id)}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                          >
                            {stu.gender === 'boy' ? 'Nam' : 'Nữ'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(stu.id)}
                            aria-label={`Xóa ${stu.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Optional inline customization panel for exact 3D Chibi character, hairstyle, glasses, backpack style, & color */}
                      {isExpanded && (
                        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Chọn nhân vật 3D Chibi THCS ({stu.gender === 'boy' ? '10 mẫu Nam' : '10 mẫu Nữ'})
                            </label>
                            <select
                              value={spec.id}
                              onChange={(e) =>
                                handleSetCharacter(stu.id, Number(e.target.value))
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                            >
                              {(stu.gender === 'boy'
                                ? BOY_CHIBI_VARIANTS
                                : GIRL_CHIBI_VARIANTS
                              ).map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Chọn kiểu tóc
                            </label>
                            <select
                              value={curHair}
                              onChange={(e) =>
                                handleSetHair(
                                  stu.id,
                                  e.target.value as ChibiHairDesign
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                            >
                              {hairOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Chọn kính mắt
                            </label>
                            <select
                              value={curGlasses}
                              onChange={(e) =>
                                handleSetGlasses(
                                  stu.id,
                                  e.target.value as GlassesStyle
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                            >
                              {GLASSES_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Chọn kiểu cặp sách
                            </label>
                            <select
                              value={curBp}
                              onChange={(e) =>
                                handleSetBackpackStyle(
                                  stu.id,
                                  e.target.value as BackpackStyle
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                            >
                              {BACKPACK_STYLE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <span className="mb-1 block text-xs font-semibold text-slate-600">
                              Màu cặp sách
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {BACKPACK_COLOR_OPTIONS.map((c) => (
                                <button
                                  key={c.color}
                                  type="button"
                                  title={c.label}
                                  onClick={() =>
                                    handleSetBackpackColor(stu.id, c.color)
                                  }
                                  className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                                    stu.backpackColor === c.color
                                      ? 'border-slate-900 scale-110'
                                      : 'border-white shadow-xs'
                                  }`}
                                  style={{ backgroundColor: c.color }}
                                />
                              ))}
                            </div>
                          </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">
                Mẹo: Bấm nút “Đổi nhân vật 3D” hoặc bấm trực tiếp vào tên học sinh để chọn trong bộ 20 nhân vật Cute 3D Chibi THCS riêng biệt (10 Nam · 10 Nữ).
              </p>
            </div>
          )}

          {tab === 'chibi' && (
            <div className="space-y-5">
              <p className="text-xs text-slate-600">
                Trọn bộ <strong>20 nhân vật học sinh THCS (11–15 tuổi) phong cách Cute 3D Chibi</strong> tách nền trong suốt PNG — áo trắng khăn quàng đỏ, đa dạng khuôn mặt, chiều cao, kiểu tóc, tư thế, biểu cảm và cặp sách. Bấm <strong>Tải PNG</strong> ở từng nhân vật để lưu ảnh riêng biệt.
              </p>

              <div>
                <h3 className="mb-2.5 text-sm font-bold text-sky-800">
                  10 nhân vật 3D Chibi học sinh Nam THCS
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {BOY_CHIBI_VARIANTS.map((spec) => {
                    const sprite = chibiSprites[spec.id];
                    return (
                      <div
                        key={spec.id}
                        className="flex flex-col items-center justify-between rounded-xl border border-slate-200 bg-sky-50/40 p-2.5 text-center"
                      >
                        <div className="flex flex-col items-center">
                          <ChibiAvatar
                            profile={createStudentProfile(
                              spec.label,
                              spec.id,
                              'boy',
                              spec.id
                            )}
                            size={92}
                          />
                          <span className="mt-1.5 text-[11px] font-semibold leading-snug text-slate-700">
                            {spec.label.replace(/^Nam \d+ · /, '')}
                          </span>
                        </div>
                        {sprite?.dataUrl && (
                          <a
                            href={sprite.dataUrl}
                            download={`chibi-thcs-nam-${spec.id + 1}.png`}
                            className="mt-2 inline-flex items-center gap-1 rounded-md border border-sky-200 bg-white px-2 py-1 text-[11px] font-semibold text-sky-700 transition-colors hover:bg-sky-50 whitespace-nowrap"
                          >
                            <Download className="h-3 w-3" />
                            Tải PNG
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="mb-2.5 text-sm font-bold text-rose-800">
                  10 nhân vật 3D Chibi học sinh Nữ THCS
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {GIRL_CHIBI_VARIANTS.map((spec) => {
                    const sprite = chibiSprites[spec.id];
                    return (
                      <div
                        key={spec.id}
                        className="flex flex-col items-center justify-between rounded-xl border border-slate-200 bg-rose-50/40 p-2.5 text-center"
                      >
                        <div className="flex flex-col items-center">
                          <ChibiAvatar
                            profile={createStudentProfile(
                              spec.label,
                              spec.id,
                              'girl',
                              spec.id
                            )}
                            size={92}
                          />
                          <span className="mt-1.5 text-[11px] font-semibold leading-snug text-slate-700">
                            {spec.label.replace(/^Nữ \d+ · /, '')}
                          </span>
                        </div>
                        {sprite?.dataUrl && (
                          <a
                            href={sprite.dataUrl}
                            download={`chibi-thcs-nu-${spec.id - 9}.png`}
                            className="mt-2 inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-50 whitespace-nowrap"
                          >
                            <Download className="h-3 w-3" />
                            Tải PNG
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Exclude already-called students option */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={draftExclude}
              onChange={(e) => setDraftExclude(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
            />
            <span className="text-sm text-slate-700">
              <strong className="font-semibold text-slate-900">
                Không gọi lặp lại bạn đã trả lời ở lượt sau
              </strong>{' '}
              — Giúp mọi học sinh trong lớp đều có cơ hội được chọn trả lời câu hỏi.
            </span>
          </label>

          {errorMsg && (
            <p className="text-sm font-semibold text-rose-600" role="alert">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 whitespace-nowrap shrink-0"
          >
            Lưu danh sách {activeClass.name} ({previewCount} bạn)
          </button>
        </div>
      </div>
    </div>
  );
};
