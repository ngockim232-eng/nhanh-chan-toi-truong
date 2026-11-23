import React, { useEffect, useRef } from 'react';
import { getChibiSpec } from '../data/chibiCatalog';
import {
  CAUGHT_COMIC_QUOTES,
  DOG_BARK_LINES,
  PANIC_SHOUT_LINES,
  SAFE_CHEER_LINES,
  STROLL_CHAT_LINES,
} from '../data/defaults';
import {
  GATE_LINE_X,
  ROAD_BOTTOM,
  ROAD_TOP,
  WORLD_H,
  WORLD_W,
  renderGameScene,
} from '../game/canvasRenderer';
import {
  ProcessedChibiSprite,
  loadChibi3DSprites,
} from '../game/chibiSpriteProcessor';
import {
  ProcessedDogSprite,
  loadTransparentDogSprite,
} from '../game/dogSpriteProcessor';
import { soundEngine } from '../game/soundEngine';
import {
  BirdEntity,
  ButterflyEntity,
  CloudEntity,
  ComicPop,
  ConfettiPiece,
  DogEntity,
  DustPuff,
  FallingPetal,
  FlyingBackpack,
  FlyingPaper,
  FlyingSandal,
  GamePhase,
  GameSettings,
  RoundResult,
  RunnerEntity,
  StudentProfile,
  SunMoteEntity,
} from '../types/game';

import SCHOOL_3D_BACKDROP_URL from '../assets/images/vietnam_realistic_horizontal_school_1795420419486.jpg';

interface GameStageProps {
  participants: StudentProfile[];
  className: string;
  phase: GamePhase;
  settings: GameSettings;
  roundNumber: number;
  resetToken: number;
  triggerChaseToken: number;
  isFullscreen?: boolean;
  onPhaseChange: (phase: GamePhase) => void;
  onRoundComplete: (result: RoundResult) => void;
}

const SPEED_MULTIPLIER: Record<GameSettings['speedPreset'], number> = {
  slow: 0.78,
  normal: 1.0,
  fast: 1.32,
};

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createInitialClouds(): CloudEntity[] {
  return [
    { x: 85, y: 60, scale: 1.08, speed: 12.0, opacity: 0.72 },
    { x: 270, y: 102, scale: 0.86, speed: 8.5, opacity: 0.62 },
    { x: 480, y: 52, scale: 1.28, speed: 14.5, opacity: 0.76 },
    { x: 705, y: 118, scale: 0.94, speed: 9.8, opacity: 0.62 },
    { x: 915, y: 66, scale: 1.18, speed: 13.0, opacity: 0.72 },
    { x: 1125, y: 124, scale: 0.84, speed: 8.0, opacity: 0.58 },
    { x: 180, y: 158, scale: 0.74, speed: 7.2, opacity: 0.52 },
    { x: 610, y: 162, scale: 0.78, speed: 7.8, opacity: 0.52 },
  ];
}

function createInitialBirds(): BirdEntity[] {
  return [
    { x: 240, y: 118, speed: 34, wingPhase: 0, scale: 0.95 },
    { x: 280, y: 134, speed: 32, wingPhase: 1.4, scale: 0.78 },
    { x: 640, y: 102, speed: 28, wingPhase: 2.6, scale: 0.85 },
  ];
}

function createInitialButterflies(): ButterflyEntity[] {
  return [
    { x: 165, y: 684, baseY: 684, vx: 22, phase: 0.4, color: '#FACC15' },
    { x: 540, y: 694, baseY: 694, vx: -18, phase: 1.9, color: '#F472B6' },
    { x: 960, y: 680, baseY: 680, vx: 20, phase: 3.1, color: '#38BDF8' },
  ];
}

function createInitialPetals(): FallingPetal[] {
  const foliage: FallingPetal[] = [];
  const leafColors = ['#22C55E', '#4ADE80', '#65A30D', '#84CC16', '#FACC15', '#EAB308'];
  const petalColors = ['#EF4444', '#F97316', '#FB7185', '#FB923C'];

  for (let i = 0; i < 36; i++) {
    const isLeaf = i % 3 !== 0;
    const zone = i % 3;
    const spawnX =
      zone === 0
        ? 15 + Math.random() * 540
        : zone === 1
          ? 520 + Math.random() * 340
          : 980 + Math.random() * 290;

    foliage.push({
      x: spawnX,
      y: 155 + Math.random() * 485,
      vx: 11 + Math.random() * 16,
      vy: isLeaf ? 16 + Math.random() * 14 : 19 + Math.random() * 14,
      phase: Math.random() * Math.PI * 2,
      size: isLeaf ? 6.8 + Math.random() * 3.8 : 4.8 + Math.random() * 2.8,
      color: isLeaf
        ? leafColors[i % leafColors.length]
        : petalColors[i % petalColors.length],
      kind: isLeaf ? 'leaf' : 'petal',
      rotation: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.9),
      swayAmp: 16 + Math.random() * 22,
    });
  }
  return foliage;
}

function createInitialSunMotes(): SunMoteEntity[] {
  const motes: SunMoteEntity[] = [];
  const colors = ['#FFFBEB', '#FEF08A', '#FDE047', '#FFFFFF'];
  for (let i = 0; i < 36; i++) {
    const t = Math.random();
    motes.push({
      x: 35 + t * 1020 + (Math.random() - 0.5) * 260,
      y: 35 + t * 520 + (Math.random() - 0.5) * 190,
      vx: 6 + Math.random() * 11,
      vy: 3 + Math.random() * 7,
      size: 2.0 + Math.random() * 3.0,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: 1.9 + Math.random() * 3.0,
      color: colors[i % colors.length],
    });
  }
  return motes;
}

function buildRunners(participants: StudentProfile[]): RunnerEntity[] {
  const count = participants.length;
  // 4 distinct road lanes matching the painted 3D road markings (2 lanes above yellow median, 2 lanes below)
  const roadTopY = ROAD_TOP - 4;
  const roadBotY = ROAD_BOTTOM + 8;
  const roadMidY = (roadTopY + roadBotY) / 2;
  const upperSub = roadTopY + (roadMidY - roadTopY) * 0.5;
  const lowerSub = roadMidY + (roadBotY - roadMidY) * 0.52;
  const laneYs = [
    (roadTopY + upperSub) / 2 + 6,
    (upperSub + roadMidY) / 2 + 5,
    (roadMidY + lowerSub) / 2 + 5,
    (lowerSub + roadBotY) / 2 + 3,
  ];

  const slowestIndex = Math.floor(Math.random() * Math.max(1, count));
  const cols = Math.max(1, Math.ceil(count / laneYs.length));
  // Spread students smoothly across the road width so all entered students remain visible on screen
  const minStartX = count > 16 ? 54 : 88;
  const maxStartX = count > 24 ? 430 : count > 12 ? 360 : 275;
  const colSpan = cols > 1 ? (maxStartX - minStartX) / (cols - 1) : 0;

  return participants.map((profile, idx) => {
    const laneIdx = idx % laneYs.length;
    const colIdx = Math.floor(idx / laneYs.length);
    // Subtle vertical sub-offset only if a lane has many columns so heads/names never overlap cleanly
    const subJitterY = cols > 3 ? ((colIdx % 2 === 0 ? -2.2 : 2.2)) : 0;
    const baseY = laneYs[laneIdx] + subJitterY;
    const laneStaggerX = (laneIdx % 2) * Math.min(26, colSpan * 0.35 + 10);
    const startX =
      cols === 1
        ? 150 + laneIdx * 24
        : minStartX + colIdx * colSpan + laneStaggerX;

    const isSlowest = idx === slowestIndex;

    return {
      profile,
      lane: idx,
      x: Math.min(460, startX),
      y: baseY,
      baseY,
      strollSpeed: 28 + Math.random() * 11,
      baseRunSpeed: isSlowest
        ? 152 + Math.random() * 10
        : 196 + Math.random() * 40,
      sprintPhaseOffset: Math.random() * Math.PI * 2,
      sprintWaveFreq: 2.2 + Math.random() * 1.6,
      sprintWaveAmp: 24 + Math.random() * 22,
      isDesignatedSlowest: isSlowest,
      state: 'idle',
      animTime: Math.random() * 4,
      speechText: null,
      speechTimer: 0,
      hasDroppedSandal: false,
      hasDroppedBackpack: false,
      stumbleTimer: 0,
      safeOrder: 0,
      cheerPhase: Math.random() * Math.PI * 2,
    };
  });
}

function createHiddenDog(): DogEntity {
  return {
    x: -95,
    y: (ROAD_TOP + ROAD_BOTTOM) / 2,
    state: 'hidden',
    animTime: 0,
    barkText: null,
    barkTimer: 0,
    nextBarkAt: 0,
    scuffleTimer: 0,
    targetId: null,
  };
}

export const GameStage: React.FC<GameStageProps> = ({
  participants,
  className,
  phase,
  settings,
  roundNumber,
  resetToken,
  triggerChaseToken,
  isFullscreen = false,
  onPhaseChange,
  onRoundComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);

  const simRef = useRef({
    phase: phase as GamePhase,
    time: 0,
    phaseTimer: 0,
    raceElapsedSec: 0,
    dogDelaySeconds: 3,
    runners: buildRunners(participants),
    dog: createHiddenDog(),
    sandals: [] as FlyingSandal[],
    backpacks: [] as FlyingBackpack[],
    papers: [] as FlyingPaper[],
    petals: createInitialPetals(),
    sunMotes: createInitialSunMotes(),
    dust: [] as DustPuff[],
    confetti: [] as ConfettiPiece[],
    pops: [] as ComicPop[],
    clouds: createInitialClouds(),
    birds: createInitialBirds(),
    butterflies: createInitialButterflies(),
    shakeIntensity: 0,
    stageShakeElapsed: 0,
    stageShakeDuration: 0,
    stageShakeAmplitude: 0,
    safeCounter: 0,
    nextChatTimer: 0.6,
    nextFootstepSound: 0,
    resultEmitted: false,
    dogSprite: null as ProcessedDogSprite | null,
    chibiSprites: {} as Record<number, ProcessedChibiSprite>,
    backdropImage: null as HTMLImageElement | null,
    backdropLoaded: false,
  });

  const propsRef = useRef({
    settings,
    className,
    roundNumber,
    onPhaseChange,
    onRoundComplete,
  });
  propsRef.current = {
    settings,
    className,
    roundNumber,
    onPhaseChange,
    onRoundComplete,
  };

  // Preload realistic 3D school backdrop & transparent dog sprite
  useEffect(() => {
    let active = true;

    const bgImg = new Image();
    bgImg.onload = () => {
      if (active) {
        simRef.current.backdropImage = bgImg;
        simRef.current.backdropLoaded = true;
      }
    };
    bgImg.src = SCHOOL_3D_BACKDROP_URL;

    loadTransparentDogSprite('/assets/aistudio/image_185c8ab8.png').then(
      (processed) => {
        if (active && processed) {
          simRef.current.dogSprite = processed;
        }
      }
    );

    loadChibi3DSprites().then((sprites) => {
      if (active) {
        simRef.current.chibiSprites = sprites;
      }
    });

    return () => {
      active = false;
    };
  }, []);

  // Re-initialize runners when participants or resetToken change
  useEffect(() => {
    const sim = simRef.current;
    sim.runners = buildRunners(participants);
    sim.dog = createHiddenDog();
    sim.sandals = [];
    sim.backpacks = [];
    sim.papers = [];
    sim.dust = [];
    sim.confetti = [];
    sim.pops = [];
    sim.shakeIntensity = 0;
    sim.stageShakeElapsed = 0;
    sim.stageShakeDuration = 0;
    sim.stageShakeAmplitude = 0;
    if (stageContainerRef.current) {
      stageContainerRef.current.style.transform = '';
    }
    sim.safeCounter = 0;
    sim.phaseTimer = 0;
    sim.raceElapsedSec = 0;
    sim.resultEmitted = false;
    sim.nextChatTimer = 0.4;
  }, [participants, resetToken]);

  // Sync phase transitions
  useEffect(() => {
    const sim = simRef.current;
    const prev = sim.phase;
    sim.phase = phase;

    if (phase === 'IDLE') {
      sim.dog = createHiddenDog();
      sim.phaseTimer = 0;
      sim.raceElapsedSec = 0;
      sim.runners.forEach((r) => {
        r.state = 'idle';
        r.speechText = null;
        r.speechTimer = 0;
      });
      soundEngine.stopBgm();
    } else if (phase === 'STROLLING' && prev !== 'STROLLING') {
      sim.phaseTimer = 0;
      sim.raceElapsedSec = 0;
      sim.resultEmitted = false;
      const delayPref = propsRef.current.settings.dogDelay;
      sim.dogDelaySeconds =
        delayPref === 'random'
          ? 2.2 + Math.random() * 2.6
          : Number(delayPref) || 3;

      sim.runners.forEach((r, idx) => {
        r.state = 'strolling';
        if (idx % 3 === 0) {
          r.speechText = randomItem(STROLL_CHAT_LINES);
          r.speechTimer = 2.0;
        }
      });
      soundEngine.startBgm('stroll');
    } else if (phase === 'SESSION_ENDED') {
      soundEngine.stopBgm();
    }
  }, [phase]);

  // Immediate "Chạy thôi!" trigger
  useEffect(() => {
    if (triggerChaseToken === 0) return;
    const sim = simRef.current;
    if (sim.phase === 'STROLLING') {
      triggerDogAmbush(sim);
      propsRef.current.onPhaseChange('ALERT');
    } else if (sim.phase === 'IDLE') {
      sim.phase = 'STROLLING';
      sim.phaseTimer = 0;
      sim.dogDelaySeconds = 0.85;
      sim.runners.forEach((r, idx) => {
        r.state = 'strolling';
        if (idx % 2 === 0) {
          r.speechText = randomItem(STROLL_CHAT_LINES);
          r.speechTimer = 1.2;
        }
      });
      soundEngine.startBgm('stroll');
      propsRef.current.onPhaseChange('STROLLING');
    }
  }, [triggerChaseToken]);

  function triggerDogAmbush(sim: typeof simRef.current) {
    sim.phase = 'ALERT';
    sim.phaseTimer = 0;
    sim.shakeIntensity = 6.5;
    sim.stageShakeElapsed = 0;
    sim.stageShakeDuration = 0.28;
    sim.stageShakeAmplitude = 4.2;

    const avgY =
      sim.runners.reduce((acc, r) => acc + r.y, 0) /
      Math.max(1, sim.runners.length);
    sim.dog.state = 'ambush';
    sim.dog.x = 48;
    sim.dog.y = avgY + 4;
    sim.dog.barkText = 'GÂU GÂU!';
    sim.dog.barkTimer = 1.5;
    sim.dog.nextBarkAt = 1.15;

    sim.runners.forEach((r, idx) => {
      r.state = 'shocked';
      r.animTime = 0;
      if (idx % 2 === 0 || sim.runners.length <= 5) {
        r.speechText = randomItem(PANIC_SHOUT_LINES);
        r.speechTimer = 1.5;
      } else {
        r.speechText = null;
      }
    });

    for (let i = 0; i < 14; i++) {
      sim.dust.push({
        x: 42 + Math.random() * 32,
        y: avgY + (Math.random() - 0.5) * 35,
        vx: 35 + Math.random() * 90,
        vy: (Math.random() - 0.5) * 45,
        radius: 12 + Math.random() * 14,
        alpha: 0.88,
        maxAlpha: 0.88,
        color: '#FEF3C7',
      });
    }

    soundEngine.playDogBark(true);
    soundEngine.playStartle();
    soundEngine.startBgm('chase');
  }

  // 60fps main simulation & render loop
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;

      const sim = simRef.current;
      const {
        settings: curSettings,
        className: curClassName,
        onPhaseChange: notifyPhase,
        onRoundComplete: notifyResult,
      } = propsRef.current;
      const speedMul = SPEED_MULTIPLIER[curSettings.speedPreset];

      sim.time += dt;
      sim.phaseTimer += dt;
      sim.shakeIntensity = Math.max(0, sim.shakeIntensity - dt * 11.5);

      // Smooth damped whole-screen GameStage shake (compositor-only transform, respects reduced motion)
      const stageEl = stageContainerRef.current;
      if (stageEl) {
        const prefersReduced =
          typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        if (
          !prefersReduced &&
          sim.stageShakeDuration > 0 &&
          sim.stageShakeElapsed < sim.stageShakeDuration
        ) {
          sim.stageShakeElapsed += dt;
          const progress = Math.min(1, sim.stageShakeElapsed / sim.stageShakeDuration);
          const decay = Math.pow(1 - progress, 1.65);
          const amp = sim.stageShakeAmplitude * decay;
          const tx = Math.sin(sim.stageShakeElapsed * 62) * amp;
          const ty = Math.cos(sim.stageShakeElapsed * 48) * amp * 0.68;
          const rot = Math.sin(sim.stageShakeElapsed * 38) * (amp * 0.085);
          stageEl.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg)`;
        } else if (stageEl.style.transform) {
          stageEl.style.transform = '';
          sim.stageShakeDuration = 0;
          sim.stageShakeAmplitude = 0;
        }
      }

      // Ambient drifting morning clouds, sky birds, fluttering leaves/petals, sunlit motes, and butterflies
      const breezeGust = Math.sin(sim.time * 0.55) * 14;
      for (const c of sim.clouds) {
        c.x += c.speed * dt;
        if (c.x > WORLD_W + 170) c.x = -190;
      }
      for (const b of sim.birds) {
        b.x += b.speed * dt;
        b.wingPhase += dt * 7.5;
        if (b.x > WORLD_W + 40) {
          b.x = -40;
          b.y = 78 + Math.random() * 72;
        }
      }
      for (const bf of sim.butterflies) {
        bf.phase += dt;
        bf.x += bf.vx * dt;
        bf.y = bf.baseY + Math.sin(bf.phase * 3.4) * 11;
        if (bf.x > WORLD_W + 25) bf.x = -25;
        if (bf.x < -25) bf.x = WORLD_W + 25;
      }
      for (const pt of sim.petals) {
        pt.phase += dt;
        const sway = Math.sin(pt.phase * 2.1) * (pt.swayAmp ?? 18);
        pt.x += (pt.vx + breezeGust + sway) * dt;
        pt.y += (pt.vy + Math.cos(pt.phase * 2.6) * 4.5) * dt;
        if (pt.rotation !== undefined && pt.spinSpeed !== undefined) {
          pt.rotation += pt.spinSpeed * dt;
        }
        if (pt.y > 670 || pt.x > WORLD_W + 40 || pt.x < -40) {
          const rZone = Math.random();
          pt.x =
            rZone < 0.48
              ? 15 + Math.random() * 520
              : rZone < 0.78
                ? 540 + Math.random() * 290
                : 1020 + Math.random() * 250;
          pt.y = 175 + Math.random() * 110;
        }
      }
      for (const m of sim.sunMotes) {
        m.phase += dt;
        m.x += (m.vx + Math.sin(m.phase * 1.1) * 5) * dt;
        m.y += (m.vy + Math.cos(m.phase * 0.9) * 4) * dt;
        if (m.x > WORLD_W + 30 || m.y > 650) {
          m.x = 20 + Math.random() * 780;
          m.y = 20 + Math.random() * 240;
        }
      }

      for (const r of sim.runners) {
        if (r.speechTimer > 0) {
          r.speechTimer -= dt;
          if (r.speechTimer <= 0) r.speechText = null;
        }
      }
      if (sim.dog.barkTimer > 0) {
        sim.dog.barkTimer -= dt;
        if (sim.dog.barkTimer <= 0) sim.dog.barkText = null;
      }

      // --- PHASE LOGIC ---
      const targetDurationSec = Number(curSettings.raceDuration) || 8;
      // Calibrate chase pace so 5s..30s durations match the chosen duration smoothly while legs keep pumping briskly
      const durationScale = 8 / targetDurationSec;
      const chasePace = speedMul * durationScale;

      if (
        sim.phase === 'STROLLING' ||
        sim.phase === 'ALERT' ||
        sim.phase === 'CHASING'
      ) {
        sim.raceElapsedSec += dt;
      }

      if (sim.phase === 'STROLLING') {
        sim.nextChatTimer -= dt;
        if (sim.nextChatTimer <= 0 && sim.runners.length > 0) {
          const chatter = randomItem(sim.runners);
          chatter.speechText = randomItem(STROLL_CHAT_LINES);
          chatter.speechTimer = 1.9;
          sim.nextChatTimer = 1.1 + Math.random() * 0.9;
        }

        for (const r of sim.runners) {
          r.animTime += dt;
          // Rhythmic gentle walking pace synced with subtle stride cadence
          const walkCadence = 1 + Math.sin(r.animTime * 7.2 + r.lane * 0.75) * 0.14;
          r.x += r.strollSpeed * walkCadence * dt;
          // Gentle lane-keeping stroll drift so students walk clearly inside their road lane
          const strollDrift = Math.sin(r.animTime * 2.1 + r.sprintPhaseOffset) * 2.6;
          r.y += (r.baseY + strollDrift - r.y) * Math.min(1, dt * 4);
          if (r.x > 520) r.x = 520;

          // Very light, delicate sunlit dust motes under walking shoes
          if (Math.random() < 0.04) {
            sim.dust.push({
              x: r.x - 8 + (Math.random() - 0.5) * 6,
              y: r.y + 2,
              vx: -18 - Math.random() * 14,
              vy: -7 - Math.random() * 6,
              radius: 2.8 + Math.random() * 2,
              alpha: 0.34,
              maxAlpha: 0.34,
              color: '#F7ECD5',
              strokeColor: 'rgba(161, 120, 72, 0.2)',
              kind: 'puff',
              growRate: 6,
              fadeRate: 1.5,
              sortY: r.y + 1,
            });
          }
        }

        if (sim.phaseTimer >= sim.dogDelaySeconds) {
          triggerDogAmbush(sim);
          notifyPhase('ALERT');
        }
      } else if (sim.phase === 'ALERT') {
        sim.dog.animTime += dt;
        sim.dog.x += 100 * dt;
        for (const r of sim.runners) {
          r.animTime += dt;
        }

        if (sim.phaseTimer >= 0.72) {
          sim.phase = 'CHASING';
          sim.phaseTimer = 0;
          sim.dog.state = 'chasing';
          for (const r of sim.runners) {
            r.state = 'running';
            spawnSprintDustBurst(sim.dust, r.x - 10, r.y + 4, false, true);
          }
          spawnSprintDustBurst(sim.dust, sim.dog.x - 28, sim.dog.y + 6, true, true);
          notifyPhase('CHASING');
        }
      } else if (sim.phase === 'CHASING') {
        sim.dog.animTime += dt;

        sim.nextFootstepSound -= dt;
        if (sim.nextFootstepSound <= 0) {
          soundEngine.playFootstep();
          sim.nextFootstepSound = 0.14 / Math.max(0.8, speedMul);
        }

        sim.dog.nextBarkAt -= dt;
        if (sim.dog.nextBarkAt <= 0) {
          soundEngine.playDogBark(Math.random() > 0.4);
          sim.dog.barkText = randomItem(DOG_BARK_LINES);
          sim.dog.barkTimer = 1.1;
          sim.dog.nextBarkAt = 1.35 + Math.random() * 0.8;
        }

        const activeRunners: RunnerEntity[] = [];
        let designatedSlowest: RunnerEntity | null = null;

        for (const r of sim.runners) {
          if (r.isDesignatedSlowest) designatedSlowest = r;

          if (r.state === 'safe') {
            r.animTime += dt;
            // Settle joyfully right inside the real sunlit terracotta schoolyard in front of the school!
            const yardTargetX = 898 + ((r.safeOrder * 48) % 288);
            const yardTargetY = 496 + ((r.safeOrder * 17) % 48);
            r.x += (yardTargetX - r.x) * Math.min(1, dt * 2.8);
            r.y += (yardTargetY - r.y) * Math.min(1, dt * 2.6);
            continue;
          }

          if (r.state === 'running') {
            activeRunners.push(r);
            // Smooth ramp-up from shock into full stride for fluid takeoff acceleration
            const takeoffEase = Math.min(1, 0.45 + sim.phaseTimer * 1.4);
            // Keep legs pumping fluidly and dynamically
            r.animTime += dt * Math.max(0.95, speedMul) * (0.88 + takeoffEase * 0.2);

            const wave =
              Math.sin(
                sim.phaseTimer * r.sprintWaveFreq * Math.max(0.7, durationScale) +
                  r.sprintPhaseOffset
              ) * r.sprintWaveAmp;

            // Calibrated base sprint speed with smooth takeoff easing
            let speed = ((r.baseRunSpeed * 0.56) + wave * 0.72) * takeoffEase;

            // Crisp lane-keeping sway so students visibly sprint along their own 3D road lane!
            const dodgeTargetY = Math.max(
              ROAD_TOP + 4,
              Math.min(
                ROAD_BOTTOM + 2,
                r.baseY +
                  Math.sin(sim.phaseTimer * 3.1 + r.sprintPhaseOffset * 1.4) * 4.5
              )
            );
            r.y += (dodgeTargetY - r.y) * Math.min(1, dt * 4.2);

            if (r.isDesignatedSlowest) {
              // Slapstick Comedy #1: FLYING SANDAL ("BAY DÉP!") mid-road!
              if (r.x > 435 && !r.hasDroppedSandal) {
                spawnFlyingSandal(sim, r);
                r.hasDroppedSandal = true;
                r.stumbleTimer = 0.55;
                r.speechText = 'Ối! Bay dép rồi!';
                r.speechTimer = 1.5;
                soundEngine.playSandalDrop();
                sim.pops.push({
                  x: r.x,
                  y: r.y - 96,
                  text: 'BAY DÉP!',
                  color: '#EA580C',
                  scale: 1.0,
                  alpha: 1.0,
                  vy: -42,
                });
              }

              // Slapstick Comedy #2: FLYING BACKPACK + NOTEBOOKS ("BAY CẶP!") near gate!
              if (r.x > 575 && !r.hasDroppedBackpack) {
                spawnFlyingBackpack(sim, r);
                r.hasDroppedBackpack = true;
                r.stumbleTimer = 0.65;
                r.speechText = 'Á! Bay cả cặp sách rồi!';
                r.speechTimer = 1.7;
                soundEngine.playBackpackPop();
                sim.pops.push({
                  x: r.x,
                  y: r.y - 112,
                  text: 'BAY CẶP!',
                  color: '#DC2626',
                  scale: 1.1,
                  alpha: 1.0,
                  vy: -46,
                });
              }

              if (r.stumbleTimer > 0) {
                r.stumbleTimer -= dt;
                speed *= 0.56;
              } else if (r.x > 590) {
                speed = Math.min(speed, 76);
              }
              if (r.x > GATE_LINE_X - 92) {
                speed = 16;
              }
            } else {
              // Hilarious chaos: 2-3 other panicked students ALSO kick off sandals or drop backpacks yet escape!
              if (
                !r.hasDroppedSandal &&
                r.x > 345 &&
                r.x < 425 &&
                r.lane % 3 === 1 &&
                Math.random() < 0.06
              ) {
                spawnFlyingSandal(sim, r);
                r.hasDroppedSandal = true;
                soundEngine.playSandalDrop();
                sim.pops.push({
                  x: r.x,
                  y: r.y - 64,
                  text: 'RƠI DÉP!',
                  color: '#F59E0B',
                  scale: 0.92,
                  alpha: 0.95,
                  vy: -36,
                });
              }

              if (
                !r.hasDroppedBackpack &&
                r.x > 505 &&
                r.x < 565 &&
                r.lane % 5 === 2 &&
                Math.random() < 0.05
              ) {
                spawnFlyingBackpack(sim, r);
                r.hasDroppedBackpack = true;
                soundEngine.playBackpackPop();
                sim.pops.push({
                  x: r.x,
                  y: r.y - 74,
                  text: 'BAY CẶP!',
                  color: '#E11D48',
                  scale: 0.95,
                  alpha: 0.95,
                  vy: -40,
                });
              }

              if (r.x > 595) {
                speed += 28;
              }
            }

            r.x += Math.max(16, speed) * chasePace * dt;

            // Lively dust puffs & tiny kicked-up grit specks right beneath running shoes during CHASING!
            const runnerDustChance = Math.min(0.82, (0.48 + (speed / 240) * 0.25) * Math.max(0.85, speedMul));
            if (Math.random() < runnerDustChance) {
              spawnSprintDustBurst(sim.dust, r.x - 14, r.y + 3, false, false);
            }

            if (!r.isDesignatedSlowest && r.x >= GATE_LINE_X + 10) {
              r.state = 'safe';
              sim.safeCounter += 1;
              r.safeOrder = sim.safeCounter;
              r.speechText = randomItem(SAFE_CHEER_LINES);
              r.speechTimer = 1.6;
              soundEngine.playSafeGate();
              spawnGateConfetti(sim, GATE_LINE_X + 26, r.y - 44);
            }
          }
        }

        const target =
          designatedSlowest ||
          activeRunners.sort((a, b) => a.x - b.x)[0] ||
          null;

        if (target) {
          const allOthersSafe = activeRunners.every(
            (r) => r.profile.id === target.profile.id
          );

          const dy = target.y + 4 - sim.dog.y;
          sim.dog.y += dy * Math.min(1, dt * 6.5);

          const distToTarget = target.x - sim.dog.x;
          let dogSpeed = 128 * chasePace;

          if (!allOthersSafe && distToTarget < 142) {
            dogSpeed = Math.max(
              72 * chasePace,
              (target.baseRunSpeed * 0.56 - 8) * chasePace
            );
          } else if (allOthersSafe || target.x > 665) {
            dogSpeed = 195 * chasePace;
          }

          sim.dog.x += dogSpeed * dt;

          // Dense, dramatic billowing dust trail & flying grit specks behind the chasing dog's paws!
          if (Math.random() < 0.88) {
            spawnSprintDustBurst(sim.dust, sim.dog.x - 32, sim.dog.y + 5, true, false);
          }
          if (Math.random() < 0.42) {
            // Front paw kick-up as well for extra speed energy
            spawnSprintDustBurst(sim.dust, sim.dog.x + 8, sim.dog.y + 6, false, false);
          }

          if (
            sim.dog.x >= target.x - 40 &&
            (allOthersSafe || target.x > 695)
          ) {
            for (const r of sim.runners) {
              if (r.profile.id !== target.profile.id && r.state !== 'safe') {
                r.state = 'safe';
                sim.safeCounter += 1;
                r.safeOrder = sim.safeCounter;
                r.x = GATE_LINE_X + 32;
                spawnGateConfetti(sim, GATE_LINE_X + 26, r.y - 44);
              }
            }

            sim.phase = 'CAUGHT_SCENE';
            sim.phaseTimer = 0;
            sim.dog.state = 'scuffle';
            sim.dog.targetId = target.profile.id;
            sim.dog.x = target.x - 14;
            sim.dog.y = target.y;
            sim.dog.barkText = 'GÂU GÂU! CHỌN BẠN NÀY!';
            sim.dog.barkTimer = 1.25;
            target.state = 'caught';
            sim.shakeIntensity = 10.5;
            // Dramatic comedic whole-screen GameStage impact shake synced with the cartoon scuffle!
            sim.stageShakeElapsed = 0;
            sim.stageShakeDuration = 0.85;
            sim.stageShakeAmplitude = 10;
            spawnSprintDustBurst(sim.dust, target.x - 10, target.y + 4, true, true);

            soundEngine.stopBgm();
            soundEngine.playComicCatch();
            notifyPhase('CAUGHT_SCENE');
          }
        }
      } else if (sim.phase === 'CAUGHT_SCENE') {
        sim.dog.animTime += dt;

        for (const r of sim.runners) {
          if (r.state === 'safe') {
            const yardTargetX = 898 + ((r.safeOrder * 48) % 288);
            const yardTargetY = 496 + ((r.safeOrder * 17) % 48);
            r.x += (yardTargetX - r.x) * Math.min(1, dt * 2.8);
            r.y += (yardTargetY - r.y) * Math.min(1, dt * 2.6);
          }
        }

        if (sim.dog.state === 'scuffle' && sim.phaseTimer >= 0.85) {
          sim.dog.state = 'tugging';
          const caughtRunner = sim.runners.find(
            (r) => r.profile.id === sim.dog.targetId
          );
          if (caughtRunner) {
            sim.dog.x = caughtRunner.x - 58;
            sim.dog.y = caughtRunner.y + 4;
            caughtRunner.speechText = 'Để mình trả lời câu hỏi nào!';
            caughtRunner.speechTimer = 4.0;
          }
          sim.dog.barkText = 'Gâu! Mời bạn trả lời nhé!';
          sim.dog.barkTimer = 3.5;
        }

        if (sim.phaseTimer >= 1.8 && !sim.resultEmitted) {
          sim.resultEmitted = true;
          const caughtRunner =
            sim.runners.find((r) => r.profile.id === sim.dog.targetId) ||
            sim.runners[sim.runners.length - 1];
          const escaped = sim.runners
            .filter((r) => r.profile.id !== caughtRunner.profile.id)
            .sort((a, b) => a.safeOrder - b.safeOrder)
            .map((r) => r.profile);

          const quote = randomItem(CAUGHT_COMIC_QUOTES);
          sim.phase = 'ROUND_OVER';
          notifyPhase('ROUND_OVER');
          notifyResult({
            roundNumber: propsRef.current.roundNumber,
            className: curClassName,
            caughtStudent: caughtRunner.profile,
            escapedStudents: escaped,
            caughtQuote: quote,
            answerStatus: 'pending',
            timestamp: Date.now(),
          });
        }
      }

      updateParticles(sim, dt);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const targetW = Math.round(WORLD_W * dpr);
          const targetH = Math.round(WORLD_H * dpr);
          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }

          ctx.save();
          ctx.scale(dpr, dpr);

          let countdownText: string | null = null;
          const targetSec = Number(curSettings.raceDuration) || 8;
          if (sim.phase === 'IDLE') {
            countdownText = `${curClassName} sẵn sàng! Bấm "Bắt đầu" hoặc "Chạy thôi" (${curSettings.raceDuration} giây)`;
          } else if (sim.phase === 'STROLLING') {
            const strollSec = Math.max(0, Math.floor(sim.phaseTimer));
            countdownText = `Các bạn ${curClassName} đang bước đi vui vẻ đến trường... · ${strollSec}s`;
          } else if (sim.phase === 'CHASING') {
            const chaseSec = Math.min(targetSec, Math.max(0, Math.floor(sim.phaseTimer)));
            countdownText = `Đang chạy nhanh về cổng trường! · ${chaseSec}s / ${targetSec}s`;
          }

          renderGameScene(ctx, {
            phase: sim.phase,
            time: sim.time,
            schoolName: curSettings.schoolName,
            className: curClassName,
            runners: sim.runners,
            dog: sim.dog,
            sandals: sim.sandals,
            backpacks: sim.backpacks,
            papers: sim.papers,
            petals: sim.petals,
            sunMotes: sim.sunMotes,
            dust: sim.dust,
            confetti: sim.confetti,
            pops: sim.pops,
            clouds: sim.clouds,
            birds: sim.birds,
            butterflies: sim.butterflies,
            shakeIntensity: sim.shakeIntensity,
            dogSprite: sim.dogSprite,
            chibiSprites: sim.chibiSprites,
            backdropImage: sim.backdropImage,
            backdropLoaded: sim.backdropLoaded,
            weatherPreset: curSettings.weatherPreset,
            countdownText,
          });

          ctx.restore();
        }
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(rafId);
      if (stageContainerRef.current) {
        stageContainerRef.current.style.transform = '';
      }
    };
  }, []);

  return (
    <div
      ref={stageContainerRef}
      className={
        isFullscreen
          ? 'relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-950 will-change-transform'
          : 'relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-[#A7E3FD] shadow-sm will-change-transform'
      }
    >
      <canvas
        ref={canvasRef}
        className={
          isFullscreen
            ? 'block max-h-full max-w-full aspect-[16/9] select-none rounded-xl shadow-2xl'
            : 'block h-auto w-full aspect-[16/9] select-none'
        }
        aria-label="Sân chơi hoạt hình 3D Đến trường thôi nào – Chạy nhanh kẻo chó đuổi"
      />
    </div>
  );
};

function spawnFlyingSandal(
  sim: { sandals: FlyingSandal[] },
  runner: RunnerEntity
) {
  sim.sandals.push({
    x: runner.x - 10,
    y: runner.y - 8,
    vx: -95 - Math.random() * 55,
    vy: -255 - Math.random() * 65,
    rotation: 0,
    vRot: -14 - Math.random() * 6,
    color: runner.profile.backpackColor,
    grounded: false,
    bounces: 0,
    groundY: runner.y + 4,
  });
}

function spawnFlyingBackpack(
  sim: { backpacks: FlyingBackpack[]; papers: FlyingPaper[] },
  runner: RunnerEntity
) {
  const spec = getChibiSpec(runner.profile.chibiVariant, runner.profile.gender);
  const style = runner.profile.backpackStyle ?? spec.backpackStyle;
  const color = runner.profile.backpackColor || spec.backpackColor;

  sim.backpacks.push({
    x: runner.x - 20,
    y: runner.y - 52,
    vx: -110 - Math.random() * 55,
    vy: -290 - Math.random() * 60,
    rotation: 0,
    vRot: -10 - Math.random() * 5,
    color,
    trimColor: spec.backpackTrim,
    style,
    grounded: false,
    bounces: 0,
    groundY: runner.y - 4,
  });

  // Scatter 3 fluttering notebook sheets out of the flying backpack!
  for (let i = 0; i < 3; i++) {
    sim.papers.push({
      x: runner.x - 18 + (Math.random() - 0.5) * 14,
      y: runner.y - 60,
      vx: -60 - Math.random() * 75,
      vy: -120 - Math.random() * 85,
      rotation: Math.random() * Math.PI,
      phase: Math.random() * Math.PI * 2,
      alpha: 1,
    });
  }
}

function spawnGateConfetti(
  sim: { confetti: ConfettiPiece[] },
  x: number,
  y: number
) {
  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#FACC15'];
  for (let i = 0; i < 18; i++) {
    const angle = -Math.PI * 0.85 + Math.random() * Math.PI * 0.7;
    const speed = 80 + Math.random() * 145;
    sim.confetti.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 45,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 12,
      size: 6 + Math.random() * 5,
      color: colors[i % colors.length],
      alpha: 1,
    });
  }
}

function spawnSprintDustBurst(
  dustList: DustPuff[],
  x: number,
  y: number,
  isDog: boolean,
  isTakeoffBurst: boolean
) {
  const puffColors = isDog
    ? ['#E8CFA3', '#DFBE8A', '#F3E3C3']
    : ['#F5E8CD', '#EAD4AE', '#FBF3E2'];
  const speckColors = ['#A8763E', '#C48B4B', '#8C5F2F', '#B77D3D'];

  const puffCount = isTakeoffBurst ? (isDog ? 6 : 3) : isDog ? 2 : 1;
  for (let i = 0; i < puffCount; i++) {
    const baseRadius = isDog
      ? (isTakeoffBurst ? 9 : 7) + Math.random() * 6
      : (isTakeoffBurst ? 6 : 4.2) + Math.random() * 4;
    dustList.push({
      x: x + (Math.random() - 0.5) * (isDog ? 20 : 12),
      y: y + (Math.random() - 0.5) * 6,
      vx: (isDog ? -115 : -72) - Math.random() * (isTakeoffBurst ? 85 : 52),
      vy: (isDog ? -26 : -18) - Math.random() * (isTakeoffBurst ? 34 : 20),
      radius: baseRadius,
      alpha: isDog ? 0.78 : 0.7,
      maxAlpha: isDog ? 0.78 : 0.7,
      color: puffColors[Math.floor(Math.random() * puffColors.length)],
      strokeColor: isDog
        ? 'rgba(138, 96, 48, 0.45)'
        : 'rgba(161, 120, 72, 0.38)',
      kind: 'puff',
      rotation: (Math.random() - 0.5) * 0.6,
      vRot: (Math.random() - 0.5) * 1.4,
      growRate: isDog ? 22 : 15,
      fadeRate: isDog ? 1.35 : 1.55,
      sortY: y + 2,
    });
  }

  // Tiny crisp dirt/grit specks kicked sharply up into the air
  const speckCount = isTakeoffBurst ? (isDog ? 7 : 4) : isDog ? 3 : Math.random() < 0.65 ? 2 : 1;
  for (let i = 0; i < speckCount; i++) {
    dustList.push({
      x: x + (Math.random() - 0.5) * (isDog ? 18 : 10),
      y: y + 1 + (Math.random() - 0.5) * 4,
      vx: (isDog ? -135 : -88) - Math.random() * 75,
      vy: (isDog ? -105 : -78) - Math.random() * 65,
      radius: (isDog ? 2.4 : 1.7) + Math.random() * 1.4,
      alpha: 0.9,
      maxAlpha: 0.9,
      color: speckColors[Math.floor(Math.random() * speckColors.length)],
      kind: 'speck',
      rotation: Math.random() * Math.PI,
      vRot: -10 - Math.random() * 12,
      gravity: 430,
      fadeRate: 1.7,
      sortY: y + 3,
    });
  }

  // Occasional curling cartoon dust swirl behind the big dog or sprinting heels
  if (isTakeoffBurst || (isDog ? Math.random() < 0.42 : Math.random() < 0.16)) {
    dustList.push({
      x: x - 4,
      y: y - 3,
      vx: (isDog ? -105 : -68) - Math.random() * 35,
      vy: -22 - Math.random() * 18,
      radius: isDog ? 8 + Math.random() * 4 : 5.5 + Math.random() * 3,
      alpha: 0.65,
      maxAlpha: 0.65,
      color: isDog ? '#D9B67E' : '#E8D3AD',
      kind: 'swirl',
      rotation: Math.random() * Math.PI * 2,
      vRot: -9 - Math.random() * 6,
      growRate: 12,
      fadeRate: 1.9,
      sortY: y + 3,
    });
  }
}

function updateParticles(
  sim: {
    sandals: FlyingSandal[];
    backpacks: FlyingBackpack[];
    papers: FlyingPaper[];
    dust: DustPuff[];
    confetti: ConfettiPiece[];
    pops: ComicPop[];
  },
  dt: number
) {
  // Bouncy flying sandals
  for (const s of sim.sandals) {
    if (!s.grounded) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 640 * dt;
      s.rotation += s.vRot * dt;
      if (s.y >= s.groundY) {
        s.y = s.groundY;
        if (s.bounces < 1) {
          s.bounces += 1;
          s.vy = -140;
          s.vx *= 0.55;
          s.vRot *= 0.6;
        } else {
          s.grounded = true;
          s.rotation = 0.25;
        }
      }
    }
  }

  // Bouncy flying backpacks!
  for (const bp of sim.backpacks) {
    if (!bp.grounded) {
      bp.x += bp.vx * dt;
      bp.y += bp.vy * dt;
      bp.vy += 620 * dt;
      bp.rotation += bp.vRot * dt;
      if (bp.y >= bp.groundY) {
        bp.y = bp.groundY;
        if (bp.bounces < 1) {
          bp.bounces += 1;
          bp.vy = -155;
          bp.vx *= 0.5;
          bp.vRot *= 0.55;
        } else {
          bp.grounded = true;
          bp.rotation = -0.35;
        }
      }
    }
  }

  // Fluttering notebook papers drifting gently down
  for (let i = sim.papers.length - 1; i >= 0; i--) {
    const p = sim.papers[i];
    p.phase += dt;
    p.x += (p.vx + Math.sin(p.phase * 5) * 28) * dt;
    p.y += p.vy * dt;
    p.vy = Math.min(48, p.vy + 220 * dt);
    p.vx *= 0.98;
    p.alpha -= 0.24 * dt;
    if (p.alpha <= 0) sim.papers.splice(i, 1);
  }

  for (let i = sim.dust.length - 1; i >= 0; i--) {
    const p = sim.dust[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'speck') {
      p.vy += (p.gravity ?? 420) * dt;
      p.vx *= Math.pow(0.45, dt);
    } else {
      // Soft dust clouds billow upward gently and slow down with air drag
      p.vx *= Math.pow(0.28, dt);
      p.vy -= 12 * dt;
      p.radius += (p.growRate ?? 16) * dt;
    }
    if (p.vRot) {
      p.rotation = (p.rotation ?? 0) + p.vRot * dt;
    }
    p.alpha -= (p.fadeRate ?? 1.45) * dt;
    if (p.alpha <= 0) sim.dust.splice(i, 1);
  }
  if (sim.dust.length > 260) {
    sim.dust.splice(0, sim.dust.length - 260);
  }

  for (let i = sim.confetti.length - 1; i >= 0; i--) {
    const c = sim.confetti[i];
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.vy += 260 * dt;
    c.rotation += c.vRot * dt;
    c.alpha -= 0.72 * dt;
    if (c.alpha <= 0) sim.confetti.splice(i, 1);
  }

  for (let i = sim.pops.length - 1; i >= 0; i--) {
    const pop = sim.pops[i];
    pop.y += pop.vy * dt;
    pop.scale += 0.38 * dt;
    pop.alpha -= 1.05 * dt;
    if (pop.alpha <= 0) sim.pops.splice(i, 1);
  }
}
