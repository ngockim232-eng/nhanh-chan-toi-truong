import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Eye,
  Flag,
  GraduationCap,
  Maximize2,
  Minimize2,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Shuffle,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { GameStage } from './components/GameStage';
import {
  QuestionBankModal,
  QuestionModalInitialTab,
} from './components/QuestionBankModal';
import { RoundResultModal } from './components/RoundResultModal';
import { SessionSummaryModal } from './components/SessionSummaryModal';
import { StudentRosterModal } from './components/StudentRosterModal';
import { getChibiSpec } from './data/chibiCatalog';
import { DEFAULT_CLASSROOMS, DEFAULT_SCHOOL_NAME } from './data/defaults';
import { DEFAULT_QUESTION_SETS } from './data/defaultQuestions';
import { soundEngine } from './game/soundEngine';
import {
  AnswerStatus,
  ClassRoom,
  DogDelayOption,
  GamePhase,
  GameSettings,
  QuestionItem,
  QuestionSet,
  RaceDurationOption,
  RoundResult,
  RunSpeedPreset,
  StudentProfile,
  WeatherPreset,
} from './types/game';

const MAX_ON_ROAD = 45;
const STORAGE_KEY_CLASSES = 'ltt_school_classes_v3';
const STORAGE_KEY_SCHOOL = 'ltt_school_name_v3';
const STORAGE_KEY_QUESTION_SETS = 'ltt_question_sets_v1';
const STORAGE_KEY_ACTIVE_QSET = 'ltt_active_qset_v1';
const STORAGE_KEY_QSET_BY_CLASS = 'ltt_qset_by_class_v1';

function loadSavedClassrooms(): ClassRoom[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_CLASSES);
    if (!raw) return DEFAULT_CLASSROOMS;
    const parsed = JSON.parse(raw) as ClassRoom[];
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].students?.length >= 2) {
      return parsed;
    }
  } catch {
    // Ignore storage read issues
  }
  return DEFAULT_CLASSROOMS;
}

function loadSavedSchoolName(): string {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_SCHOOL);
    if (raw && raw.trim().length > 0) return raw.trim();
  } catch {
    // Ignore storage read issues
  }
  return DEFAULT_SCHOOL_NAME;
}

function loadSavedQuestionSets(): QuestionSet[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_QUESTION_SETS);
    if (!raw) return DEFAULT_QUESTION_SETS;
    const parsed = JSON.parse(raw) as QuestionSet[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Ignore storage read issues
  }
  return DEFAULT_QUESTION_SETS;
}

function loadSavedActiveQuestionSetId(sets: QuestionSet[]): string {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_ACTIVE_QSET);
    if (raw === 'none') return 'none';
    if (raw && sets.some((s) => s.id === raw)) return raw;
  } catch {
    // Ignore storage read issues
  }
  return sets[0]?.id || 'none';
}

function loadSavedQuestionSetByClass(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_QSET_BY_CLASS);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore storage read issues
  }
  return {};
}

function pickRandomParticipants(
  roster: StudentProfile[],
  count: number,
  excludeIds: Set<string>
): StudentProfile[] {
  const eligible = roster.filter((s) => !excludeIds.has(s.id));
  const pool = eligible.length >= 2 ? [...eligible] : [...roster];
  const targetCount = Math.max(2, Math.min(count, pool.length, MAX_ON_ROAD));

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, targetCount);
}

const SPEED_OPTIONS: { value: RunSpeedPreset; label: string }[] = [
  { value: 'slow', label: 'Chậm' },
  { value: 'normal', label: 'Vừa' },
  { value: 'fast', label: 'Nhanh' },
];

const DELAY_OPTIONS: { value: DogDelayOption; label: string }[] = [
  { value: '2', label: '2 giây' },
  { value: '3', label: '3 giây' },
  { value: '5', label: '5 giây' },
  { value: 'random', label: 'Ngẫu nhiên' },
];

const RACE_DURATION_OPTIONS: { value: RaceDurationOption; label: string }[] = [
  { value: '5', label: '5s' },
  { value: '8', label: '8s' },
  { value: '12', label: '12s' },
  { value: '15', label: '15s' },
  { value: '20', label: '20s' },
  { value: '25', label: '25s' },
  { value: '30', label: '30s' },
];

const WEATHER_OPTIONS: { value: WeatherPreset; label: string }[] = [
  { value: 'sunny_all', label: 'Nắng sớm' },
  { value: 'breezy_leaves', label: 'Lá rơi' },
  { value: 'drifting_clouds', label: 'Mây trôi' },
  { value: 'off', label: 'Tắt' },
];

export default function App() {
  const [classrooms, setClassrooms] = useState<ClassRoom[]>(loadSavedClassrooms);
  const [activeClassId, setActiveClassId] = useState<string>(
    () => loadSavedClassrooms()[0].id
  );

  const activeClass = useMemo(
    () => classrooms.find((c) => c.id === activeClassId) || classrooms[0],
    [classrooms, activeClassId]
  );
  const roster = activeClass.students;

  const [questionSets, setQuestionSets] = useState<QuestionSet[]>(loadSavedQuestionSets);
  const [questionSetByClass, setQuestionSetByClass] = useState<Record<string, string>>(
    loadSavedQuestionSetByClass
  );
  const [activeQuestionSetId, setActiveQuestionSetId] = useState<string>(() => {
    const savedSets = loadSavedQuestionSets();
    const initialClassId = loadSavedClassrooms()[0].id;
    const byClass = loadSavedQuestionSetByClass();
    const mapped = byClass[initialClassId];
    if (mapped === 'none' || (mapped && savedSets.some((s) => s.id === mapped))) {
      return mapped;
    }
    return loadSavedActiveQuestionSetId(savedSets);
  });
  const [usedQuestionIdsBySet, setUsedQuestionIdsBySet] = useState<
    Record<string, string[]>
  >({});

  const activeQuestionSet = useMemo(
    () =>
      activeQuestionSetId === 'none'
        ? null
        : questionSets.find((s) => s.id === activeQuestionSetId) || null,
    [questionSets, activeQuestionSetId]
  );

  const usedQuestionIdsForActiveSet = useMemo(
    () =>
      new Set(
        activeQuestionSet ? usedQuestionIdsBySet[activeQuestionSet.id] || [] : []
      ),
    [usedQuestionIdsBySet, activeQuestionSet]
  );

  const [settings, setSettings] = useState<GameSettings>(() => {
    const initialStudents = loadSavedClassrooms()[0].students;
    return {
      participantCount: Math.max(2, Math.min(initialStudents.length, MAX_ON_ROAD)),
      speedPreset: 'normal',
      dogDelay: '3',
      raceDuration: '8',
      weatherPreset: 'sunny_all',
      soundEnabled: true,
      schoolName: loadSavedSchoolName(),
      excludePreviouslyCaught: true,
      avoidRepeatQuestions: true,
    };
  });

  const [caughtIdsByClass, setCaughtIdsByClass] = useState<
    Record<string, string[]>
  >({});

  const caughtIds = useMemo(
    () => new Set(caughtIdsByClass[activeClass.id] || []),
    [caughtIdsByClass, activeClass.id]
  );

  const [participants, setParticipants] = useState<StudentProfile[]>(() => {
    const initialStudents = loadSavedClassrooms()[0].students;
    return initialStudents.slice(0, MAX_ON_ROAD);
  });

  const [phase, setPhase] = useState<GamePhase>('IDLE');
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [resetToken, setResetToken] = useState<number>(0);
  const [triggerChaseToken, setTriggerChaseToken] = useState<number>(0);

  const [latestResult, setLatestResult] = useState<RoundResult | null>(null);
  const [resultModalHidden, setResultModalHidden] = useState<boolean>(false);
  const [history, setHistory] = useState<RoundResult[]>([]);

  const [isRosterOpen, setIsRosterOpen] = useState<boolean>(false);
  const [isQuestionBankOpen, setIsQuestionBankOpen] = useState<boolean>(false);
  const [questionBankTab, setQuestionBankTab] =
    useState<QuestionModalInitialTab>('manage');
  const [isSummaryOpen, setIsSummaryOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const maxAllowedParticipants = Math.min(roster.length, MAX_ON_ROAD);

  // Sync with native browser Fullscreen (F11 / requestFullscreen) & Escape key
  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const handleToggleFullscreen = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {
            // Gracefully stay in full-viewport theater mode inside iframe
          });
        }
      } catch {
        // Gracefully stay in full-viewport theater mode
      }
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch {
        // Ignore
      }
    }
  }, [isFullscreen]);

  // Sync audio mute setting with Web Audio engine
  useEffect(() => {
    soundEngine.setEnabled(settings.soundEnabled);
    if (settings.soundEnabled) {
      if (phase === 'STROLLING') soundEngine.startBgm('stroll');
      else if (phase === 'ALERT' || phase === 'CHASING')
        soundEngine.startBgm('chase');
    }
  }, [settings.soundEnabled, phase]);

  useEffect(() => {
    return () => {
      soundEngine.stopBgm();
    };
  }, []);

  const isRunningRace =
    phase === 'ALERT' || phase === 'CHASING' || phase === 'CAUGHT_SCENE';

  const activeExclusions = useMemo(
    () => (settings.excludePreviouslyCaught ? caughtIds : new Set<string>()),
    [settings.excludePreviouslyCaught, caughtIds]
  );

  const resolveQuestionSetForClass = useCallback(
    (
      classId: string,
      sets: QuestionSet[],
      mapByClass: Record<string, string>,
      fallbackId: string
    ): string => {
      const explicit = mapByClass[classId];
      if (explicit === 'none') return 'none';
      if (explicit && sets.some((s) => s.id === explicit)) return explicit;

      const targeted = sets.find((s) => s.targetClassIds?.includes(classId));
      if (targeted) return targeted.id;

      if (fallbackId === 'none' || sets.some((s) => s.id === fallbackId)) {
        return fallbackId;
      }
      return sets[0]?.id || 'none';
    },
    []
  );

  // Switch active class from main bar
  const handleSwitchClass = (nextClassId: string) => {
    if (isRunningRace) return;
    const found = classrooms.find((c) => c.id === nextClassId);
    if (!found) return;

    soundEngine.unlock();
    soundEngine.playClick();
    soundEngine.stopBgm();

    const nextExcluded = settings.excludePreviouslyCaught
      ? new Set(caughtIdsByClass[found.id] || [])
      : new Set<string>();
    const allCount = Math.max(2, Math.min(found.students.length, MAX_ON_ROAD));

    setActiveClassId(found.id);
    const nextQSetId = resolveQuestionSetForClass(
      found.id,
      questionSets,
      questionSetByClass,
      activeQuestionSetId
    );
    setActiveQuestionSetId(nextQSetId);
    setSettings((prev) => ({ ...prev, participantCount: allCount }));
    const eligible = found.students.filter((s) => !nextExcluded.has(s.id));
    const displayList = (eligible.length >= 2 ? eligible : found.students).slice(
      0,
      allCount
    );
    setParticipants(displayList);
    setLatestResult(null);
    setResultModalHidden(false);
    setPhase('IDLE');
    setResetToken((t) => t + 1);
  };

  // Button: Bắt đầu
  const handleStartStroll = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();

    if (phase === 'ROUND_OVER' || phase === 'SESSION_ENDED') {
      const nextParticipants = settings.excludePreviouslyCaught
        ? pickRandomParticipants(roster, settings.participantCount, activeExclusions)
        : participants;
      setParticipants(nextParticipants);
      setLatestResult(null);
      setResultModalHidden(false);
      setResetToken((t) => t + 1);
      setRoundNumber((r) => r + 1);
      setPhase('STROLLING');
      return;
    }

    if (phase === 'IDLE') {
      setLatestResult(null);
      setResultModalHidden(false);
      setPhase('STROLLING');
    }
  }, [
    phase,
    settings.excludePreviouslyCaught,
    settings.participantCount,
    roster,
    activeExclusions,
    participants,
  ]);

  // Button: Chạy thôi
  const handleRunNow = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();

    if (phase === 'STROLLING') {
      setTriggerChaseToken((t) => t + 1);
      return;
    }

    if (phase === 'ROUND_OVER' || phase === 'SESSION_ENDED') {
      const nextParticipants = settings.excludePreviouslyCaught
        ? pickRandomParticipants(roster, settings.participantCount, activeExclusions)
        : participants;
      setParticipants(nextParticipants);
      setLatestResult(null);
      setResultModalHidden(false);
      setResetToken((t) => t + 1);
      setRoundNumber((r) => r + 1);
      setPhase('IDLE');
      window.setTimeout(() => {
        setTriggerChaseToken((t) => t + 1);
      }, 25);
      return;
    }

    if (phase === 'IDLE') {
      setLatestResult(null);
      setResultModalHidden(false);
      setTriggerChaseToken((t) => t + 1);
    }
  }, [
    phase,
    settings.excludePreviouslyCaught,
    settings.participantCount,
    roster,
    activeExclusions,
    participants,
  ]);

  // Button: Chọn lại
  const handleReshuffle = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();
    soundEngine.stopBgm();

    const nextGroup = pickRandomParticipants(
      roster,
      settings.participantCount,
      activeExclusions
    );
    setParticipants(nextGroup);
    setLatestResult(null);
    setResultModalHidden(false);
    setPhase('IDLE');
    setResetToken((t) => t + 1);
  }, [roster, settings.participantCount, activeExclusions]);

  // Quick fun button: Đổi nhân vật Cute 3D Chibi THCS ngẫu nhiên (không lặp mặt) cho các bạn trên đường
  const handleShuffleStyles = useCallback(() => {
    if (isRunningRace) return;
    soundEngine.unlock();
    soundEngine.playClick();

    const shuffleIds = (ids: number[]) => {
      const copy = [...ids];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const boyPool = shuffleIds([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const girlPool = shuffleIds([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    let boyCursor = 0;
    let girlCursor = 0;

    const updatedMap = new Map<string, StudentProfile>();
    const nextParticipants = participants.map((stu) => {
      const pool = stu.gender === 'boy' ? boyPool : girlPool;
      let nextVariant =
        stu.gender === 'boy'
          ? pool[boyCursor++ % pool.length]
          : pool[girlCursor++ % pool.length];
      if (nextVariant === stu.chibiVariant) {
        nextVariant =
          stu.gender === 'boy'
            ? (nextVariant + 1) % 10
            : 10 + ((nextVariant - 10 + 1) % 10);
      }
      const spec = getChibiSpec(nextVariant, stu.gender);
      const updated: StudentProfile = {
        ...stu,
        chibiVariant: spec.id,
        hairDesign: spec.hairDesign,
        backpackStyle: spec.backpackStyle,
        backpackColor: spec.backpackColor,
        glassesStyle: spec.glassesStyle,
        hasGlasses: spec.glassesStyle !== 'none',
      };
      updatedMap.set(updated.id, updated);
      return updated;
    });

    setParticipants(nextParticipants);
    setClassrooms((prev) =>
      prev.map((cls) =>
        cls.id === activeClass.id
          ? {
              ...cls,
              students: cls.students.map((s) => updatedMap.get(s.id) || s),
            }
          : cls
      )
    );
  }, [isRunningRace, participants, activeClass.id]);

  // Button: Làm mới
  const handleResetAll = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();
    soundEngine.stopBgm();

    setCaughtIdsByClass((prev) => ({ ...prev, [activeClass.id]: [] }));
    if (activeQuestionSet) {
      setUsedQuestionIdsBySet((prev) => ({ ...prev, [activeQuestionSet.id]: [] }));
    }
    setHistory([]);
    setLatestResult(null);
    setResultModalHidden(false);
    setRoundNumber(1);
    setPhase('IDLE');
    setParticipants(
      pickRandomParticipants(roster, settings.participantCount, new Set())
    );
    setResetToken((t) => t + 1);
    setIsSummaryOpen(false);
  }, [activeClass.id, activeQuestionSet, roster, settings.participantCount]);

  // Button: Kết thúc
  const handleEndSession = useCallback(() => {
    soundEngine.playClick();
    soundEngine.stopBgm();
    setResultModalHidden(true);
    setPhase('SESSION_ENDED');
    setIsSummaryOpen(true);
  }, []);

  // Stepper: Số học sinh tham gia
  const handleChangeParticipantCount = (delta: number) => {
    soundEngine.unlock();
    soundEngine.playClick();
    const nextCount = Math.max(
      2,
      Math.min(maxAllowedParticipants, settings.participantCount + delta)
    );
    if (nextCount === settings.participantCount) return;

    setSettings((prev) => ({ ...prev, participantCount: nextCount }));
    if (!isRunningRace) {
      soundEngine.stopBgm();
      setParticipants(
        pickRandomParticipants(roster, nextCount, activeExclusions)
      );
      setLatestResult(null);
      setResultModalHidden(false);
      setPhase('IDLE');
      setResetToken((t) => t + 1);
    }
  };

  // Save Classes & Roster from Modal
  const handleSaveRoster = (
    nextClassrooms: ClassRoom[],
    nextActiveClassId: string,
    nextSchoolName: string,
    excludeCaught: boolean
  ) => {
    soundEngine.stopBgm();

    try {
      window.localStorage.setItem(
        STORAGE_KEY_CLASSES,
        JSON.stringify(nextClassrooms)
      );
      window.localStorage.setItem(STORAGE_KEY_SCHOOL, nextSchoolName);
    } catch {
      // Ignore storage quota errors
    }

    const chosenClass =
      nextClassrooms.find((c) => c.id === nextActiveClassId) || nextClassrooms[0];
    // Show ALL newly entered students on the main screen immediately (up to MAX_ON_ROAD)
    const showAllCount = Math.max(
      2,
      Math.min(chosenClass.students.length, MAX_ON_ROAD)
    );

    setClassrooms(nextClassrooms);
    setActiveClassId(chosenClass.id);
    setActiveQuestionSetId(
      resolveQuestionSetForClass(
        chosenClass.id,
        questionSets,
        questionSetByClass,
        activeQuestionSetId
      )
    );
    setCaughtIdsByClass((prev) => ({ ...prev, [chosenClass.id]: [] }));
    setSettings((prev) => ({
      ...prev,
      participantCount: showAllCount,
      schoolName: nextSchoolName,
      excludePreviouslyCaught: excludeCaught,
    }));
    setParticipants(chosenClass.students.slice(0, showAllCount));
    setLatestResult(null);
    setResultModalHidden(false);
    setPhase('IDLE');
    setResetToken((t) => t + 1);
  };

  const drawQuestionFromSet = useCallback(
    (
      set: QuestionSet | null,
      currentUsedIds: Set<string>,
      avoidRepeat: boolean,
      excludeQuestionId?: string
    ): { question?: QuestionItem; resetUsed: boolean } => {
      if (!set || set.questions.length === 0) {
        return { question: undefined, resetUsed: false };
      }

      const poolWithoutCurrent = excludeQuestionId
        ? set.questions.filter((q) => q.id !== excludeQuestionId)
        : set.questions;
      const basePool =
        poolWithoutCurrent.length > 0 ? poolWithoutCurrent : set.questions;

      if (!avoidRepeat) {
        return {
          question: basePool[Math.floor(Math.random() * basePool.length)],
          resetUsed: false,
        };
      }

      const unused = basePool.filter((q) => !currentUsedIds.has(q.id));
      if (unused.length > 0) {
        return {
          question: unused[Math.floor(Math.random() * unused.length)],
          resetUsed: false,
        };
      }

      // All questions in the set were used — start a fresh cycle cleanly
      return {
        question: basePool[Math.floor(Math.random() * basePool.length)],
        resetUsed: true,
      };
    },
    []
  );

  // Save Question Sets & Per-Class Assignment from Modal
  const handleSaveQuestionSets = (
    nextSets: QuestionSet[],
    nextActiveId: string,
    nextSetByClass: Record<string, string>,
    avoidRepeat: boolean
  ) => {
    const resolvedForCurrentClass = resolveQuestionSetForClass(
      activeClass.id,
      nextSets,
      nextSetByClass,
      nextActiveId
    );
    const finalMap: Record<string, string> = {
      ...nextSetByClass,
      [activeClass.id]: resolvedForCurrentClass,
    };

    try {
      window.localStorage.setItem(
        STORAGE_KEY_QUESTION_SETS,
        JSON.stringify(nextSets)
      );
      window.localStorage.setItem(
        STORAGE_KEY_ACTIVE_QSET,
        resolvedForCurrentClass
      );
      window.localStorage.setItem(
        STORAGE_KEY_QSET_BY_CLASS,
        JSON.stringify(finalMap)
      );
    } catch {
      // Ignore storage quota errors
    }

    setQuestionSets(nextSets);
    setQuestionSetByClass(finalMap);
    setActiveQuestionSetId(resolvedForCurrentClass);
    setSettings((prev) => ({ ...prev, avoidRepeatQuestions: avoidRepeat }));

    // If a round result modal is currently open without a valid question, immediately draw one from the chosen set
    if (latestResult && resolvedForCurrentClass !== 'none') {
      const chosenSet =
        nextSets.find((s) => s.id === resolvedForCurrentClass) || null;
      const hasCurrentStill =
        chosenSet &&
        latestResult.question &&
        chosenSet.questions.some((q) => q.id === latestResult.question?.id);
      if (chosenSet && !hasCurrentStill && chosenSet.questions.length > 0) {
        const usedSet = new Set(usedQuestionIdsBySet[chosenSet.id] || []);
        const { question, resetUsed } = drawQuestionFromSet(
          chosenSet,
          usedSet,
          avoidRepeat
        );
        if (question) {
          setUsedQuestionIdsBySet((prev) => ({
            ...prev,
            [chosenSet.id]: resetUsed
              ? [question.id]
              : Array.from(new Set([...(prev[chosenSet.id] || []), question.id])),
          }));
          setLatestResult((prev) =>
            prev
              ? { ...prev, question, questionSetTitle: chosenSet.title }
              : prev
          );
          setHistory((prev) =>
            prev.map((item) =>
              item.timestamp === latestResult.timestamp
                ? { ...item, question, questionSetTitle: chosenSet.title }
                : item
            )
          );
        }
      }
    }
  };

  // Switch active question set from main bottom dock (auto-saves for active class!)
  const handleSwitchQuestionSet = (nextSetId: string) => {
    soundEngine.playClick();
    setActiveQuestionSetId(nextSetId);
    setQuestionSetByClass((prev) => {
      const nextMap = { ...prev, [activeClass.id]: nextSetId };
      try {
        window.localStorage.setItem(
          STORAGE_KEY_QSET_BY_CLASS,
          JSON.stringify(nextMap)
        );
      } catch {
        // Ignore storage errors
      }
      return nextMap;
    });
    try {
      window.localStorage.setItem(STORAGE_KEY_ACTIVE_QSET, nextSetId);
    } catch {
      // Ignore storage errors
    }
  };

  // Draw another question for the current student inside RoundResultModal
  const handleDrawAnotherQuestion = useCallback(() => {
    if (!latestResult || !activeQuestionSet || activeQuestionSet.questions.length <= 1) {
      return;
    }
    const { question, resetUsed } = drawQuestionFromSet(
      activeQuestionSet,
      usedQuestionIdsForActiveSet,
      settings.avoidRepeatQuestions,
      latestResult.question?.id
    );
    if (!question) return;

    setUsedQuestionIdsBySet((prev) => ({
      ...prev,
      [activeQuestionSet.id]: resetUsed
        ? [question.id]
        : Array.from(new Set([...(prev[activeQuestionSet.id] || []), question.id])),
    }));

    setLatestResult((prev) =>
      prev
        ? {
            ...prev,
            question,
            questionSetTitle: activeQuestionSet.title,
            answerStatus: 'pending',
          }
        : prev
    );
    setHistory((prev) =>
      prev.map((item) =>
        item.timestamp === latestResult.timestamp
          ? {
              ...item,
              question,
              questionSetTitle: activeQuestionSet.title,
              answerStatus: 'pending',
            }
          : item
      )
    );
  }, [
    latestResult,
    activeQuestionSet,
    usedQuestionIdsForActiveSet,
    settings.avoidRepeatQuestions,
    drawQuestionFromSet,
  ]);

  // Round Finished Callback
  const handleRoundComplete = useCallback(
    (result: RoundResult) => {
      const { question, resetUsed } = drawQuestionFromSet(
        activeQuestionSet,
        usedQuestionIdsForActiveSet,
        settings.avoidRepeatQuestions
      );

      if (activeQuestionSet && question) {
        setUsedQuestionIdsBySet((prev) => ({
          ...prev,
          [activeQuestionSet.id]: resetUsed
            ? [question.id]
            : Array.from(
                new Set([...(prev[activeQuestionSet.id] || []), question.id])
              ),
        }));
      }

      const enrichedResult: RoundResult = {
        ...result,
        question,
        questionSetTitle: activeQuestionSet?.title,
      };

      setLatestResult(enrichedResult);
      setResultModalHidden(false);
      setHistory((prev) => [enrichedResult, ...prev]);
      setCaughtIdsByClass((prev) => {
        const current = new Set(prev[activeClass.id] || []);
        current.add(result.caughtStudent.id);
        return { ...prev, [activeClass.id]: Array.from(current) };
      });
    },
    [
      activeClass.id,
      activeQuestionSet,
      usedQuestionIdsForActiveSet,
      settings.avoidRepeatQuestions,
      drawQuestionFromSet,
    ]
  );

  // Teacher evaluates selected student's answer
  const handleRateAnswer = useCallback(
    (timestamp: number, status: AnswerStatus) => {
      setLatestResult((prev) =>
        prev && prev.timestamp === timestamp
          ? { ...prev, answerStatus: status }
          : prev
      );
      setHistory((prev) =>
        prev.map((item) =>
          item.timestamp === timestamp
            ? { ...item, answerStatus: status }
            : item
        )
      );
    },
    []
  );

  const toggleSound = () => {
    const next = !settings.soundEnabled;
    if (next) soundEngine.unlock();
    setSettings((prev) => ({ ...prev, soundEnabled: next }));
    if (next) soundEngine.playClick();
  };

  const phaseLabel =
    phase === 'IDLE'
      ? 'Sẵn sàng'
      : phase === 'STROLLING'
        ? 'Đang đi học vui vẻ'
        : phase === 'ALERT'
          ? 'Chó xuất hiện!'
          : phase === 'CHASING'
            ? 'Đang chạy nước rút!'
            : phase === 'CAUGHT_SCENE'
              ? 'Đã chọn bạn trả lời!'
              : phase === 'ROUND_OVER'
                ? 'Mời trả lời câu hỏi'
                : 'Đã kết thúc';

  return (
    <div className="flex min-h-screen flex-col bg-[#F2F7FA] text-[#182230]">
      {/* Clean Single-Row Top Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Zone 1: Brand Title */}
          <h1 className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 sm:text-xl lg:text-2xl">
            Đến Trường Thôi Nào –{' '}
            <span className="text-orange-600">Chạy Nhanh Kẻo Chó Đuổi!</span>
          </h1>

          {/* Zone 2: Clean Unboxed Metadata */}
          <div className="hidden items-center gap-2 text-sm font-medium text-slate-600 xl:flex whitespace-nowrap">
            <span className="font-semibold text-sky-800">{activeClass.name}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="tabular-nums">
              {participants.length}/{roster.length} bạn
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="tabular-nums">Lượt {roundNumber}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>{phaseLabel}</span>
          </div>

          {/* Zone 3: Sound, Question Sets & Roster Utility */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleSound}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 whitespace-nowrap shrink-0"
              aria-pressed={settings.soundEnabled}
            >
              {settings.soundEnabled ? (
                <Volume2 className="h-4 w-4 text-sky-600" />
              ) : (
                <VolumeX className="h-4 w-4 text-slate-400" />
              )}
              <span className="hidden lg:inline">
                {settings.soundEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setQuestionBankTab('manage');
                setIsQuestionBankOpen(true);
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-amber-600 whitespace-nowrap shrink-0"
            >
              <BookOpen className="h-4 w-4 text-amber-700" />
              <span>Bộ câu hỏi</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setIsRosterOpen(true);
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-600 whitespace-nowrap shrink-0"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Danh sách học sinh</span>
              <span className="sm:hidden">Học sinh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Game Workspace */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
        {/* Dominant 2D Animated Canvas Stage (supports Fullscreen Theater Mode with On-Screen Action Bar) */}
        <section
          aria-label="Sân chơi hoạt hình"
          className={
            isFullscreen
              ? 'fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950 p-2 sm:p-3'
              : 'relative'
          }
        >
          <div
            className={
              isFullscreen
                ? 'relative flex h-full w-full items-center justify-center'
                : 'relative w-full'
            }
          >
            <GameStage
              participants={participants}
              className={activeClass.name}
              phase={phase}
              settings={settings}
              roundNumber={roundNumber}
              resetToken={resetToken}
              triggerChaseToken={triggerChaseToken}
              isFullscreen={isFullscreen}
              onPhaseChange={setPhase}
              onRoundComplete={handleRoundComplete}
            />

            {/* Normal Mode: Top-Right Phóng to (Fullscreen) trigger */}
            {!isFullscreen && (
              <button
                type="button"
                onClick={handleToggleFullscreen}
                title="Phóng to toàn màn hình"
                className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-xl border border-white/70 bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm backdrop-blur-xs transition-colors hover:bg-white whitespace-nowrap"
              >
                <Maximize2 className="h-3.5 w-3.5 text-sky-700" />
                Phóng to
              </button>
            )}

            {/* Fullscreen Mode: Clean Floating On-Screen Action Buttons (Bắt đầu, Chạy thôi, Chọn lại, Làm mới) */}
            {isFullscreen && (
              <>
                <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSound}
                    aria-label={settings.soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/40 bg-white/90 text-slate-800 shadow-lg backdrop-blur-md transition-colors hover:bg-white"
                  >
                    {settings.soundEnabled ? (
                      <Volume2 className="h-4 w-4 text-sky-600" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/40 bg-white/90 px-3.5 text-xs font-bold text-slate-900 shadow-lg backdrop-blur-md transition-colors hover:bg-white whitespace-nowrap shrink-0"
                  >
                    <Minimize2 className="h-4 w-4 text-slate-700" />
                    Thu nhỏ
                  </button>
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
                  <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/50 bg-white/90 px-3 py-2 shadow-2xl backdrop-blur-md">
                    <button
                      type="button"
                      onClick={handleStartStroll}
                      disabled={isRunningRace || phase === 'STROLLING'}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white shadow-xs transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Bắt đầu
                    </button>

                    <button
                      type="button"
                      onClick={handleRunNow}
                      disabled={isRunningRace}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <Zap className="h-4 w-4 fill-current" />
                      Chạy thôi
                    </button>

                    <button
                      type="button"
                      onClick={handleReshuffle}
                      disabled={isRunningRace}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <Shuffle className="h-4 w-4 text-sky-700" />
                      Chọn lại
                    </button>

                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="h-4 w-4 text-slate-600" />
                      Làm mới
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Reopen Banner when peeking at the funny scene */}
          {!isFullscreen && phase === 'ROUND_OVER' && latestResult && resultModalHidden && (
            <div className="mt-2.5 flex items-center justify-between gap-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5">
              <p className="truncate text-sm font-semibold text-orange-950">
                Học sinh được chọn trả lời ({latestResult.className}):{' '}
                <span className="font-bold text-rose-700">
                  {latestResult.caughtStudent.name}
                </span>{' '}
                — “{latestResult.caughtQuote}”
              </p>
              <button
                type="button"
                onClick={() => setResultModalHidden(false)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-orange-700 whitespace-nowrap shrink-0"
              >
                <Eye className="h-3.5 w-3.5" />
                Mở bảng gọi trả lời
              </button>
            </div>
          )}

          {/* Fullscreen Quick Reopen Banner if peeking at scene */}
          {isFullscreen && phase === 'ROUND_OVER' && latestResult && resultModalHidden && (
            <div className="absolute left-3 top-3 z-20 flex items-center gap-3 rounded-xl border border-orange-200 bg-white/95 px-3.5 py-2 shadow-lg backdrop-blur-md">
              <span className="text-xs font-bold text-rose-700">
                {latestResult.caughtStudent.name}
              </span>
              <button
                type="button"
                onClick={() => setResultModalHidden(false)}
                className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1 text-xs font-bold text-white hover:bg-orange-700 whitespace-nowrap shrink-0"
              >
                <Eye className="h-3.5 w-3.5" />
                Mở bảng trả lời
              </button>
            </div>
          )}
        </section>

        {/* Bottom Classroom Control Dock */}
        <section
          aria-label="Bảng điều khiển trò chơi"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
        >
          {/* Row 1: Primary Game Action Buttons + Class Selector + Participant Count */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Bắt đầu */}
              <button
                type="button"
                onClick={handleStartStroll}
                disabled={isRunningRace || phase === 'STROLLING'}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-sky-600 px-4.5 text-sm font-bold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-sky-600 whitespace-nowrap shrink-0"
              >
                <Play className="h-4 w-4 fill-current" />
                Bắt đầu
              </button>

              {/* Chạy thôi */}
              <button
                type="button"
                onClick={handleRunNow}
                disabled={isRunningRace}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-600 px-5.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-orange-600 whitespace-nowrap shrink-0"
              >
                <Zap className="h-4 w-4 fill-current" />
                Chạy thôi
              </button>

              {/* Chọn lại */}
              <button
                type="button"
                onClick={handleReshuffle}
                disabled={isRunningRace}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Shuffle className="h-4 w-4 text-sky-700" />
                Chọn lại
              </button>

              {/* Đổi nhân vật 3D */}
              <button
                type="button"
                onClick={handleShuffleStyles}
                disabled={isRunningRace}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Sparkles className="h-4 w-4 text-amber-600" />
                Đổi nhân vật 3D
              </button>

              {/* Làm mới */}
              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-4 w-4 text-slate-600" />
                Làm mới
              </button>

              {/* Kết thúc */}
              <button
                type="button"
                onClick={handleEndSession}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 whitespace-nowrap shrink-0"
              >
                <Flag className="h-4 w-4" />
                Kết thúc
              </button>
            </div>

            {/* Right Group: Chọn lớp + Bộ câu hỏi + Số học sinh tham gia */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Chọn lớp */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="main-class-select"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 whitespace-nowrap"
                >
                  <GraduationCap className="h-4 w-4 text-sky-700" />
                  Chọn lớp
                </label>
                <select
                  id="main-class-select"
                  value={activeClass.id}
                  disabled={isRunningRace}
                  onChange={(e) => handleSwitchClass(e.target.value)}
                  className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-bold text-slate-900 transition-colors hover:border-sky-400 focus:border-sky-600 focus:bg-white focus:outline-none disabled:opacity-50"
                >
                  {classrooms.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.students.length} HS)
                    </option>
                  ))}
                </select>
              </div>

              {/* Bộ câu hỏi theo lớp */}
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="main-question-set-select"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 whitespace-nowrap"
                >
                  <BookOpen className="h-4 w-4 text-amber-700" />
                  Câu hỏi {activeClass.name}
                </label>
                <select
                  id="main-question-set-select"
                  value={activeQuestionSetId}
                  onChange={(e) => handleSwitchQuestionSet(e.target.value)}
                  className="h-10 max-w-[240px] rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-900 transition-colors hover:border-amber-400 focus:border-amber-600 focus:bg-white focus:outline-none"
                >
                  {(() => {
                    const forClass = questionSets.filter((s) =>
                      s.targetClassIds?.includes(activeClass.id)
                    );
                    const others = questionSets.filter(
                      (s) => !s.targetClassIds?.includes(activeClass.id)
                    );
                    if (forClass.length > 0) {
                      return (
                        <>
                          <optgroup label={`Dành riêng cho ${activeClass.name}`}>
                            {forClass.map((set) => (
                              <option key={set.id} value={set.id}>
                                {set.title} ({set.questions.length} câu)
                              </option>
                            ))}
                          </optgroup>
                          {others.length > 0 && (
                            <optgroup label="Bộ câu hỏi khác">
                              {others.map((set) => (
                                <option key={set.id} value={set.id}>
                                  {set.title} ({set.questions.length} câu)
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </>
                      );
                    }
                    return questionSets.map((set) => (
                      <option key={set.id} value={set.id}>
                        {set.title} ({set.questions.length} câu)
                      </option>
                    ));
                  })()}
                  <option value="none">Không hiện câu hỏi (Hỏi trực tiếp)</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setQuestionBankTab('ai');
                    setIsQuestionBankOpen(true);
                  }}
                  title="Đưa nội dung bài dạy lên để AI tạo bộ câu hỏi tự động"
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-sky-900 transition-colors hover:bg-sky-100 whitespace-nowrap shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                  AI tạo câu hỏi
                </button>
              </div>

              {/* Số học sinh tham gia */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                  Số học sinh tham gia
                </span>
                <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => handleChangeParticipantCount(-1)}
                    disabled={isRunningRace || settings.participantCount <= 2}
                    aria-label="Giảm số học sinh tham gia"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 shadow-2xs transition-colors hover:bg-slate-100 disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-9 text-center text-sm font-bold tabular-nums text-slate-900">
                    {settings.participantCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleChangeParticipantCount(1)}
                    disabled={
                      isRunningRace ||
                      settings.participantCount >= maxAllowedParticipants
                    }
                    aria-label="Tăng số học sinh tham gia"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 shadow-2xs transition-colors hover:bg-slate-100 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {settings.participantCount < maxAllowedParticipants && (
                  <button
                    type="button"
                    disabled={isRunningRace}
                    onClick={() => {
                      soundEngine.unlock();
                      soundEngine.playClick();
                      soundEngine.stopBgm();
                      setSettings((prev) => ({
                        ...prev,
                        participantCount: maxAllowedParticipants,
                      }));
                      setParticipants(roster.slice(0, maxAllowedParticipants));
                      setLatestResult(null);
                      setResultModalHidden(false);
                      setPhase('IDLE');
                      setResetToken((t) => t + 1);
                    }}
                    className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-800 transition-colors hover:bg-sky-100 disabled:opacity-40 whitespace-nowrap shrink-0"
                  >
                    Cả lớp ({maxAllowedParticipants})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Race Duration, Speed, Dog Delay, & Participating Names */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t border-slate-100 pt-3.5">
            <div className="flex flex-wrap items-center gap-4">
              {/* Thời gian diễn ra */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                  Thời gian diễn ra
                </span>
                <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  {RACE_DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSettings((prev) => ({
                          ...prev,
                          raceDuration: opt.value,
                        }));
                      }}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        settings.raceDuration === opt.value
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tốc độ chạy */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                  Tốc độ chạy
                </span>
                <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  {SPEED_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSettings((prev) => ({
                          ...prev,
                          speedPreset: opt.value,
                        }));
                      }}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        settings.speedPreset === opt.value
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thời gian chó xuất hiện */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                  Chó xuất hiện sau
                </span>
                <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  {DELAY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSettings((prev) => ({
                          ...prev,
                          dogDelay: opt.value,
                        }));
                      }}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        settings.dogDelay === opt.value
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Thời tiết động */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                  Thời tiết
                </span>
                <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  {WEATHER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSettings((prev) => ({
                          ...prev,
                          weatherPreset: opt.value,
                        }));
                      }}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        settings.weatherPreset === opt.value
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Full wrapping roster readout so every participating student is clearly shown */}
            <div className="w-full border-t border-slate-100 pt-2.5 text-xs leading-relaxed text-slate-600">
              <span className="mr-2 font-semibold text-slate-800">
                {activeClass.name} đang trên đường ({participants.length}/{roster.length} bạn):
              </span>
              <span>
                {participants.map((p, idx) => `${idx + 1}. ${p.name}`).join(' · ')}
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Modals */}
      <StudentRosterModal
        isOpen={isRosterOpen}
        classrooms={classrooms}
        activeClassId={activeClass.id}
        schoolName={settings.schoolName}
        excludePreviouslyCaught={settings.excludePreviouslyCaught}
        onClose={() => setIsRosterOpen(false)}
        onSave={handleSaveRoster}
      />

      <QuestionBankModal
        isOpen={isQuestionBankOpen}
        initialTab={questionBankTab}
        classrooms={classrooms}
        activeClassId={activeClass.id}
        questionSets={questionSets}
        activeSetId={activeQuestionSetId}
        questionSetByClass={questionSetByClass}
        usedQuestionIds={usedQuestionIdsForActiveSet}
        avoidRepeatQuestions={settings.avoidRepeatQuestions}
        onClose={() => setIsQuestionBankOpen(false)}
        onSave={handleSaveQuestionSets}
        onResetUsedQuestions={(setId) =>
          setUsedQuestionIdsBySet((prev) => ({ ...prev, [setId]: [] }))
        }
      />

      <RoundResultModal
        result={latestResult}
        isHidden={resultModalHidden}
        canDrawAnotherQuestion={
          Boolean(activeQuestionSet && activeQuestionSet.questions.length > 1)
        }
        onRateAnswer={handleRateAnswer}
        onDrawAnotherQuestion={handleDrawAnotherQuestion}
        onOpenQuestionBank={() => {
          setQuestionBankTab('manage');
          setIsQuestionBankOpen(true);
        }}
        onHideToPeek={() => setResultModalHidden(true)}
        onPlayNextRound={handleRunNow}
        onReshuffle={handleReshuffle}
        onEndSession={handleEndSession}
      />

      <SessionSummaryModal
        isOpen={isSummaryOpen}
        schoolName={settings.schoolName}
        history={history}
        onClose={() => {
          setIsSummaryOpen(false);
          if (phase === 'SESSION_ENDED') {
            setPhase(latestResult ? 'ROUND_OVER' : 'IDLE');
          }
        }}
        onStartNewSession={handleResetAll}
      />
    </div>
  );
}
