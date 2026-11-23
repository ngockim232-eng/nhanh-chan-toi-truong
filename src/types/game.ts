export type Gender = 'boy' | 'girl';

export type ChibiHairDesign =
  | 'boy_spiky'
  | 'boy_parted'
  | 'boy_curly'
  | 'boy_bowl'
  | 'boy_tuft'
  | 'boy_swept'
  | 'boy_tousled'
  | 'girl_pigtails'
  | 'girl_ponytail'
  | 'girl_bob'
  | 'girl_buns'
  | 'girl_braids'
  | 'girl_long'
  | 'girl_side_braid'
  | 'girl_wavy'
  | 'girl_mini_tails'
  | 'girl_half_up'
  | 'girl_hime'
  | 'girl_twin_loops';

export type BackpackStyle =
  | 'bear'
  | 'bunny'
  | 'star'
  | 'heart'
  | 'rainbow'
  | 'dino'
  | 'space'
  | 'classic';

export type GlassesStyle =
  | 'none'
  | 'round_dark'
  | 'round_gold'
  | 'pink_cute'
  | 'square_dark';

export interface StudentProfile {
  id: string;
  name: string;
  gender: Gender;
  /** 0..9 for boys (10 Chibi Nam), 10..19 for girls (10 Chibi Nữ) */
  chibiVariant: number;
  /** Optional custom hairstyle override */
  hairDesign?: ChibiHairDesign;
  /** Optional custom backpack style override */
  backpackStyle?: BackpackStyle;
  /** Optional custom glasses override */
  glassesStyle?: GlassesStyle;
  hairStyle: number;
  hairColor: string;
  backpackColor: string;
  shoeColor: string;
  hasGlasses: boolean;
  ribbonColor: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  students: StudentProfile[];
}

export type QuestionType = 'multiple_choice' | 'open';

export interface QuestionItem {
  id: string;
  prompt: string;
  type: QuestionType;
  /** Four options [A, B, C, D] when type === 'multiple_choice' */
  options?: string[];
  /** Index 0..3 of the correct option when type === 'multiple_choice' */
  correctOptionIndex?: number;
  /** Suggested answer or explanation text */
  answerText?: string;
}

export interface QuestionSet {
  id: string;
  title: string;
  subject?: string;
  /** Empty or undefined means suitable for all classes; otherwise scoped/recommended for those class IDs */
  targetClassIds?: string[];
  questions: QuestionItem[];
}

export type GamePhase =
  | 'IDLE'
  | 'STROLLING'
  | 'ALERT'
  | 'CHASING'
  | 'CAUGHT_SCENE'
  | 'ROUND_OVER'
  | 'SESSION_ENDED';

export type RunSpeedPreset = 'slow' | 'normal' | 'fast';
export type DogDelayOption = '2' | '3' | '5' | 'random';
export type RaceDurationOption = '5' | '8' | '12' | '15' | '20' | '25' | '30';
export type WeatherPreset = 'sunny_all' | 'breezy_leaves' | 'drifting_clouds' | 'off';

export interface GameSettings {
  participantCount: number;
  speedPreset: RunSpeedPreset;
  raceDuration: RaceDurationOption;
  dogDelay: DogDelayOption;
  weatherPreset: WeatherPreset;
  soundEnabled: boolean;
  schoolName: string;
  excludePreviouslyCaught: boolean;
  avoidRepeatQuestions: boolean;
}

export type AnswerStatus = 'pending' | 'correct' | 'encouraged';

export interface RoundResult {
  roundNumber: number;
  className: string;
  caughtStudent: StudentProfile;
  escapedStudents: StudentProfile[];
  caughtQuote: string;
  answerStatus: AnswerStatus;
  question?: QuestionItem;
  questionSetTitle?: string;
  timestamp: number;
}

export type RunnerState =
  | 'idle'
  | 'strolling'
  | 'shocked'
  | 'running'
  | 'safe'
  | 'caught';

export interface RunnerEntity {
  profile: StudentProfile;
  lane: number;
  x: number;
  y: number;
  baseY: number;
  strollSpeed: number;
  baseRunSpeed: number;
  sprintPhaseOffset: number;
  sprintWaveFreq: number;
  sprintWaveAmp: number;
  isDesignatedSlowest: boolean;
  state: RunnerState;
  animTime: number;
  speechText: string | null;
  speechTimer: number;
  hasDroppedSandal: boolean;
  hasDroppedBackpack: boolean;
  stumbleTimer: number;
  safeOrder: number;
  cheerPhase: number;
}

export type DogState = 'hidden' | 'ambush' | 'chasing' | 'scuffle' | 'tugging';

export interface DogEntity {
  x: number;
  y: number;
  state: DogState;
  animTime: number;
  barkText: string | null;
  barkTimer: number;
  nextBarkAt: number;
  scuffleTimer: number;
  targetId: string | null;
}

export interface FlyingSandal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  color: string;
  grounded: boolean;
  bounces: number;
  groundY: number;
}

export interface FlyingBackpack {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  color: string;
  trimColor: string;
  style: BackpackStyle;
  grounded: boolean;
  bounces: number;
  groundY: number;
}

export interface FlyingPaper {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  phase: number;
  alpha: number;
}

export interface FallingPetal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
  color: string;
  kind?: 'leaf' | 'petal';
  rotation?: number;
  spinSpeed?: number;
  swayAmp?: number;
}

export interface SunMoteEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  twinkleSpeed: number;
  color: string;
}

export interface DustPuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  maxAlpha: number;
  color: string;
  kind?: 'puff' | 'speck' | 'swirl';
  strokeColor?: string;
  rotation?: number;
  vRot?: number;
  growRate?: number;
  fadeRate?: number;
  gravity?: number;
  sortY?: number;
}

export interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  size: number;
  color: string;
  alpha: number;
}

export interface ComicPop {
  x: number;
  y: number;
  text: string;
  color: string;
  scale: number;
  alpha: number;
  vy: number;
}

export interface CloudEntity {
  x: number;
  y: number;
  scale: number;
  speed: number;
  opacity?: number;
}

export interface BirdEntity {
  x: number;
  y: number;
  speed: number;
  wingPhase: number;
  scale: number;
}

export interface ButterflyEntity {
  x: number;
  y: number;
  baseY: number;
  vx: number;
  phase: number;
  color: string;
}
