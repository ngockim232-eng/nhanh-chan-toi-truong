import { drawChibiStudent, drawCuteBackpack } from './chibiRenderer';
import { ProcessedChibiSprite } from './chibiSpriteProcessor';
import { DogPartCanvas, ProcessedDogSprite } from './dogSpriteProcessor';
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
  RunnerEntity,
  SunMoteEntity,
  WeatherPreset,
} from '../types/game';

export const WORLD_W = 1280;
export const WORLD_H = 720;
// Tuned to the photorealistic sunlit horizontal stone road & brick school gate
export const ROAD_TOP = 546;
export const ROAD_BOTTOM = 640;
export const GATE_LINE_X = 846;
const STUDENT_BASE_HEIGHT = 170;

export interface SceneRenderState {
  phase: GamePhase;
  time: number;
  schoolName: string;
  className: string;
  runners: RunnerEntity[];
  dog: DogEntity;
  sandals: FlyingSandal[];
  backpacks: FlyingBackpack[];
  papers: FlyingPaper[];
  petals: FallingPetal[];
  sunMotes?: SunMoteEntity[];
  dust: DustPuff[];
  confetti: ConfettiPiece[];
  pops: ComicPop[];
  clouds: CloudEntity[];
  birds: BirdEntity[];
  butterflies: ButterflyEntity[];
  shakeIntensity: number;
  dogSprite: ProcessedDogSprite | null;
  chibiSprites?: Record<number, ProcessedChibiSprite>;
  backdropImage: HTMLImageElement | null;
  backdropLoaded: boolean;
  weatherPreset?: WeatherPreset;
  countdownText: string | null;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function renderGameScene(
  ctx: CanvasRenderingContext2D,
  state: SceneRenderState
): void {
  const { time, shakeIntensity } = state;

  ctx.save();

  if (shakeIntensity > 0.2) {
    const sx = Math.sin(time * 74) * shakeIntensity * 0.9;
    const sy = Math.cos(time * 59) * shakeIntensity * 0.65;
    const overscan = 1 + (shakeIntensity * 2.2) / WORLD_W;
    ctx.translate(WORLD_W / 2 + sx, WORLD_H / 2 + sy);
    ctx.scale(overscan, overscan);
    ctx.translate(-WORLD_W / 2, -WORLD_H / 2);
  }

  const weather = state.weatherPreset ?? 'sunny_all';

  // 1. Wide, Ultra-Aesthetic 3D Vietnamese Highland School & Morning Road Backdrop
  if (
    state.backdropImage &&
    state.backdropLoaded &&
    state.backdropImage.naturalWidth > 0
  ) {
    ctx.drawImage(state.backdropImage, 0, 0, WORLD_W, WORLD_H);
    if (weather !== 'off') {
      drawDriftingSkyClouds(ctx, state.clouds, time, weather === 'drifting_clouds' ? 1.2 : 1);
    }
    drawAmbientSkyLife(ctx, state.birds);
  } else {
    drawFallbackBackdrop(ctx, time, state.clouds, state.birds);
  }

  // 2. Luxurious 3D Marble & Metallic-Gold School Gate Monument (stands proudly along the upper gate line)
  draw3DSchoolGateSignArch(ctx, state.schoolName, time);

  // 3. 3D Road Lane Markings, Yellow Center Median Divider & Safe Gate Threshold
  draw3DRoadLaneMarkings(ctx);
  drawGateFinishThreshold(ctx);

  // 4. Depth-sorted larger Chibi students, BIG transparent dog, foot/paw dust particles, flying sandals & flying backpacks!
  type DrawItem = { y: number; draw: () => void };
  const drawables: DrawItem[] = [];

  for (const puff of state.dust) {
    drawables.push({
      y: puff.sortY ?? puff.y + 1,
      draw: () => drawSingleDustParticle(ctx, puff),
    });
  }

  for (const sandal of state.sandals) {
    drawables.push({
      y: sandal.grounded ? sandal.groundY - 2 : sandal.y + 42,
      draw: () => drawFlyingSandal(ctx, sandal),
    });
  }

  for (const bp of state.backpacks) {
    drawables.push({
      y: bp.grounded ? bp.groundY - 1 : bp.y + 44,
      draw: () => drawFlyingBackpack(ctx, bp),
    });
  }

  const totalRunners = state.runners.length;
  const densityScale =
    totalRunners > 32 ? 0.88 : totalRunners > 22 ? 0.94 : 1;

  for (const runner of state.runners) {
    if (
      state.dog.state === 'scuffle' &&
      state.dog.targetId === runner.profile.id
    ) {
      continue;
    }
    const sprite3D = state.chibiSprites?.[runner.profile.chibiVariant];
    drawables.push({
      y: runner.y,
      draw: () => {
        if (sprite3D && sprite3D.width > 0) {
          drawChibi3DRunner(ctx, runner, sprite3D, time, densityScale);
        } else {
          drawChibiStudent(ctx, {
            profile: runner.profile,
            x: runner.x,
            y: runner.y,
            state: runner.state,
            animTime: runner.animTime,
            globalTime: time,
            hasDroppedSandal: runner.hasDroppedSandal,
            hasDroppedBackpack: runner.hasDroppedBackpack,
            cheerPhase: runner.cheerPhase,
            laneSeed: runner.lane,
            scale: 1.58 * densityScale,
            showShadow: true,
          });
        }
      },
    });
  }

  if (state.dog.state !== 'hidden') {
    drawables.push({
      y: state.dog.y + 4,
      draw: () => drawBigDog(ctx, state.dog, time, state.dogSprite, state.runners),
    });
  }

  drawables.sort((a, b) => a.y - b.y);
  for (const item of drawables) {
    item.draw();
  }

  // 6. Fluttering Notebook Papers, Gently Falling Leaves/Blossoms, Butterflies & Shimmering Morning Light Flare
  drawFlyingPapers(ctx, state.papers);
  if (weather !== 'off') {
    const foliageLimit =
      weather === 'breezy_leaves'
        ? state.petals.length
        : weather === 'sunny_all'
          ? Math.ceil(state.petals.length * 0.8)
          : Math.ceil(state.petals.length * 0.35);
    drawFallingPetals(ctx, state.petals.slice(0, foliageLimit));
  }
  drawForegroundButterflies(ctx, state.butterflies);
  if (weather !== 'off') {
    const flareStrength =
      weather === 'sunny_all' ? 1.1 : weather === 'breezy_leaves' ? 0.88 : 0.72;
    drawMorningSunFlare(ctx, time, state.sunMotes || [], flareStrength, weather === 'breezy_leaves');
  }

  // 7. Action Speed Lines during Chase
  if (state.phase === 'CHASING') {
    drawChaseSpeedLines(ctx, time);
  }

  // 8. Crisp Student Name Tags & Speech Bubbles
  for (const runner of state.runners) {
    if (
      state.dog.state === 'scuffle' &&
      state.dog.targetId === runner.profile.id
    ) {
      continue;
    }
    const sprite3D = state.chibiSprites?.[runner.profile.chibiVariant];
    drawStudentLabels(ctx, runner, sprite3D, densityScale);
  }

  if (
    state.dog.state !== 'hidden' &&
    state.dog.barkText &&
    state.dog.barkTimer > 0
  ) {
    drawSpeechBubble(
      ctx,
      state.dog.x + 12,
      state.dog.y - 104,
      state.dog.barkText,
      '#FEF2F2',
      '#DC2626',
      '#991B1B'
    );
  }

  // 9. Celebratory Confetti & Comic Pop Texts ("BAY DÉP!", "BAY CẶP!")
  drawConfetti(ctx, state.confetti);
  drawComicPops(ctx, state.pops);

  // 10. Top Banner / Alert
  if (state.phase === 'ALERT') {
    drawAlertBanner(ctx, time);
  } else if (state.countdownText) {
    drawTopHintBanner(ctx, state.countdownText);
  }

  ctx.restore();
}

function drawDriftingSkyClouds(
  ctx: CanvasRenderingContext2D,
  clouds: CloudEntity[],
  time: number,
  densityBoost = 1
) {
  ctx.save();
  // Confine clouds cleanly to the upper morning sky band above the school roofline
  ctx.beginPath();
  ctx.rect(0, 0, WORLD_W, 248);
  ctx.clip();

  for (let i = 0; i < clouds.length; i++) {
    const c = clouds[i];
    const baseOpacity = Math.min(0.92, (c.opacity ?? 0.68) * densityBoost);
    const breathe = 1 + Math.sin(time * 0.45 + i * 1.7) * 0.03;
    const s = c.scale * breathe;

    ctx.save();
    ctx.translate(c.x, c.y);

    // 1. Soft cool sky-blue / misty-slate cloud belly shadow (creates unmistakable 3D depth against bright morning sky)
    const bellyGrad = ctx.createRadialGradient(4 * s, 12 * s, 6 * s, 4 * s, 12 * s, 82 * s);
    bellyGrad.addColorStop(0, `rgba(125, 175, 226, ${baseOpacity * 0.48})`);
    bellyGrad.addColorStop(0.55, `rgba(148, 194, 238, ${baseOpacity * 0.28})`);
    bellyGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.save();
    ctx.scale(1, 0.34);
    ctx.fillStyle = bellyGrad;
    ctx.beginPath();
    ctx.arc(4 * s, 38 * s, 82 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Sculpted multi-lobe sunlit cumulus cloud puffs (warm sunlit upper crest + soft white body)
    const puffs = [
      { ox: -54 * s, oy: 7 * s, rx: 42 * s, ry: 18 * s, a: 0.78 },
      { ox: -22 * s, oy: -8 * s, rx: 52 * s, ry: 27 * s, a: 0.96 },
      { ox: 20 * s, oy: -11 * s, rx: 58 * s, ry: 29 * s, a: 1.0 },
      { ox: 58 * s, oy: 3 * s, rx: 44 * s, ry: 20 * s, a: 0.82 },
      { ox: 4 * s, oy: 8 * s, rx: 74 * s, ry: 19 * s, a: 0.85 },
    ];

    for (const p of puffs) {
      const grad = ctx.createRadialGradient(
        p.ox - p.rx * 0.22,
        p.oy - p.ry * 0.36,
        p.ry * 0.1,
        p.ox,
        p.oy,
        p.rx
      );
      grad.addColorStop(0, `rgba(255, 254, 246, ${Math.min(0.96, baseOpacity * p.a)})`);
      grad.addColorStop(0.58, `rgba(241, 248, 255, ${baseOpacity * p.a * 0.78})`);
      grad.addColorStop(0.86, `rgba(191, 219, 254, ${baseOpacity * p.a * 0.32})`);
      grad.addColorStop(1, 'rgba(191, 219, 254, 0)');

      ctx.save();
      ctx.translate(p.ox, p.oy);
      ctx.scale(1, p.ry / p.rx);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, p.rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  ctx.restore();
}

function drawMorningSunFlare(
  ctx: CanvasRenderingContext2D,
  time: number,
  sunMotes: SunMoteEntity[],
  strength = 1,
  extraBreeze = false
) {
  const sunX = 128;
  const sunY = 64;
  const shimmer = (0.88 + Math.sin(time * 2.1) * 0.12) * strength;
  const shimmer2 = (0.86 + Math.cos(time * 2.9 + 1.1) * 0.14) * strength;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // 1. Diagonal Volumetric Morning Sunbeams (God Rays) clearly sweeping across hills, trees & sunlit road
  const rays = [
    { angle: 0.36, spread: 0.13, len: 860, alpha: 0.19 * shimmer },
    { angle: 0.54, spread: 0.17, len: 980, alpha: 0.24 * shimmer2 },
    { angle: 0.74, spread: 0.14, len: 860, alpha: 0.2 * shimmer },
    { angle: 0.94, spread: 0.13, len: 760, alpha: 0.16 * shimmer2 },
    { angle: 1.14, spread: 0.11, len: 640, alpha: 0.13 * shimmer },
  ];

  for (let i = 0; i < rays.length; i++) {
    const r = rays[i];
    const drift = Math.sin(time * 0.45 + i * 1.8) * 0.032;
    const a0 = r.angle + drift - r.spread / 2;
    const a1 = r.angle + drift + r.spread / 2;
    const endX = sunX + Math.cos(r.angle + drift) * r.len;
    const endY = sunY + Math.sin(r.angle + drift) * r.len;

    const beamGrad = ctx.createLinearGradient(sunX, sunY, endX, endY);
    beamGrad.addColorStop(0, `rgba(255, 248, 200, ${Math.min(0.45, r.alpha * 1.45)})`);
    beamGrad.addColorStop(0.42, `rgba(253, 224, 110, ${r.alpha * 0.85})`);
    beamGrad.addColorStop(0.78, `rgba(254, 215, 130, ${r.alpha * 0.3})`);
    beamGrad.addColorStop(1, 'rgba(254, 240, 180, 0)');

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(sunX, sunY);
    ctx.lineTo(sunX + Math.cos(a0) * r.len, sunY + Math.sin(a0) * r.len);
    ctx.lineTo(sunX + Math.cos(a1) * r.len, sunY + Math.sin(a1) * r.len);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Radiant Golden Morning Sun Core & Halo
  const outerGlow = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 310);
  outerGlow.addColorStop(0, `rgba(255, 255, 244, ${Math.min(0.95, 0.9 * shimmer)})`);
  outerGlow.addColorStop(0.16, `rgba(254, 240, 138, ${Math.min(0.75, 0.62 * shimmer)})`);
  outerGlow.addColorStop(0.42, `rgba(251, 191, 36, ${0.24 * shimmer2})`);
  outerGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 310, 0, Math.PI * 2);
  ctx.fill();

  // 3. Sparkling 8-Point Starburst Light Spikes rotating slowly at the Morning Sun Core
  ctx.save();
  ctx.translate(sunX, sunY);
  ctx.rotate(time * 0.09);
  for (let s = 0; s < 8; s++) {
    const spikeAngle = (s * Math.PI) / 4;
    const spikeLen = (s % 2 === 0 ? 155 : 95) * (0.9 + Math.sin(time * 3.4 + s) * 0.16);
    ctx.save();
    ctx.rotate(spikeAngle);
    const spikeGrad = ctx.createLinearGradient(-spikeLen, 0, spikeLen, 0);
    spikeGrad.addColorStop(0, 'rgba(255, 251, 235, 0)');
    spikeGrad.addColorStop(0.5, `rgba(255, 250, 210, ${Math.min(0.75, 0.64 * shimmer)})`);
    spikeGrad.addColorStop(1, 'rgba(255, 251, 235, 0)');
    ctx.fillStyle = spikeGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, spikeLen, s % 2 === 0 ? 3.2 : 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // 4. Cinematic Translucent Lens-Flare Bokeh Rings along the Sun Axis
  const axisDx = 720 - sunX;
  const axisDy = 435 - sunY;
  const flares = [
    { t: 0.24, r: 28, color: 'rgba(254, 240, 138, 0.34)', ring: 'rgba(255, 251, 235, 0.42)' },
    { t: 0.42, r: 15, color: 'rgba(251, 146, 60, 0.28)', ring: null },
    { t: 0.58, r: 42, color: 'rgba(125, 211, 252, 0.22)', ring: 'rgba(254, 249, 195, 0.35)' },
    { t: 0.76, r: 20, color: 'rgba(253, 186, 116, 0.26)', ring: 'rgba(255, 255, 255, 0.26)' },
    { t: 0.96, r: 34, color: 'rgba(110, 231, 183, 0.19)', ring: 'rgba(255, 253, 240, 0.25)' },
  ];

  for (let i = 0; i < flares.length; i++) {
    const f = flares[i];
    const pulse = 0.74 + Math.sin(time * 2.4 + i * 1.4) * 0.26;
    const fx = sunX + axisDx * f.t + Math.sin(time * 0.75 + i) * 7;
    const fy = sunY + axisDy * f.t + Math.cos(time * 0.65 + i) * 5;
    const fr = f.r * (0.94 + pulse * 0.08);

    const fg = ctx.createRadialGradient(fx, fy, fr * 0.1, fx, fy, fr);
    fg.addColorStop(0, f.color);
    fg.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.save();
    ctx.globalAlpha = pulse * strength;
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fill();

    if (f.ring) {
      ctx.strokeStyle = f.ring;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(fx, fy, fr * 0.88, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 5. Shimmering Sunlit Morning Dust / Sparkling Diamond Glints ("lấp lánh")
  for (let i = 0; i < sunMotes.length; i++) {
    const m = sunMotes[i];
    const twinkle = Math.pow(0.5 + 0.5 * Math.sin(m.phase * m.twinkleSpeed), 2);
    const alpha = (0.24 + twinkle * 0.74) * Math.min(1, strength);
    ctx.save();
    ctx.globalAlpha = alpha;
    const mg = ctx.createRadialGradient(m.x, m.y, 0.2, m.x, m.y, m.size * 3.1);
    mg.addColorStop(0, '#FFFFFF');
    mg.addColorStop(0.45, m.color);
    mg.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size * 3.1, 0, Math.PI * 2);
    ctx.fill();

    // Crisp 4-point sparkling diamond glints on bright motes
    if (twinkle > 0.56) {
      const gLen = m.size * (2.6 + twinkle * 2.1);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(Math.sin(m.phase * 1.4) * 0.35);
      ctx.strokeStyle = 'rgba(255, 253, 235, 0.92)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(-gLen, 0);
      ctx.lineTo(gLen, 0);
      ctx.moveTo(0, -gLen);
      ctx.lineTo(0, gLen);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // 6. Subtle Silky Morning Breeze Ribbons drifting gently across trees & sky
  const ribbonCount = extraBreeze ? 4 : 2;
  ctx.lineCap = 'round';
  for (let b = 0; b < ribbonCount; b++) {
    const cycle = (time * (0.22 + b * 0.04) + b * 0.37) % 1;
    const bx = -140 + cycle * (WORLD_W + 280);
    const by = 225 + b * 76 + Math.sin(time * 1.2 + b * 2) * 14;
    const fade = Math.sin(cycle * Math.PI);
    ctx.strokeStyle = `rgba(255, 255, 255, ${fade * (extraBreeze ? 0.32 : 0.2)})`;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(bx - 75, by);
    ctx.bezierCurveTo(
      bx - 30,
      by - 14,
      bx + 25,
      by + 14,
      bx + 75,
      by - 5
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawAmbientSkyLife(ctx: CanvasRenderingContext2D, birds: BirdEntity[]) {
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.72)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const b of birds) {
    const flap = Math.sin(b.wingPhase) * 5.5 * b.scale;
    ctx.beginPath();
    ctx.moveTo(b.x - 9 * b.scale, b.y + flap);
    ctx.quadraticCurveTo(b.x - 3.5 * b.scale, b.y - 4.5 * b.scale, b.x, b.y);
    ctx.quadraticCurveTo(
      b.x + 3.5 * b.scale,
      b.y - 4.5 * b.scale,
      b.x + 9 * b.scale,
      b.y + flap
    );
    ctx.stroke();
  }
}

function drawFallbackBackdrop(
  ctx: CanvasRenderingContext2D,
  _time: number,
  clouds: CloudEntity[],
  birds: BirdEntity[]
) {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 460);
  skyGrad.addColorStop(0, '#5EC2F6');
  skyGrad.addColorStop(0.65, '#BAE6FD');
  skyGrad.addColorStop(1, '#FEF3C7');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  for (const c of clouds) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 24 * c.scale, 0, Math.PI * 2);
    ctx.arc(c.x + 24 * c.scale, c.y - 8 * c.scale, 28 * c.scale, 0, Math.PI * 2);
    ctx.arc(c.x + 48 * c.scale, c.y, 22 * c.scale, 0, Math.PI * 2);
    ctx.fill();
  }
  drawAmbientSkyLife(ctx, birds);

  ctx.fillStyle = '#4ADE80';
  ctx.fillRect(0, 420, WORLD_W, 300);
  ctx.fillStyle = '#F5E6C8';
  ctx.fillRect(0, ROAD_TOP - 8, WORLD_W, ROAD_BOTTOM - ROAD_TOP + 18);
}

function draw3DRoadLaneMarkings(ctx: CanvasRenderingContext2D) {
  const roadTopY = ROAD_TOP - 4;
  const roadBotY = ROAD_BOTTOM + 8;
  const roadMidY = (roadTopY + roadBotY) / 2;
  const upperSubLaneY = roadTopY + (roadMidY - roadTopY) * 0.5;
  const lowerSubLaneY = roadMidY + (roadBotY - roadMidY) * 0.52;
  const endX = GATE_LINE_X - 4;

  ctx.save();

  // Subtle sunlit depth gradient across the road surface (slightly darker far edge -> brighter foreground)
  const depthTint = ctx.createLinearGradient(0, roadTopY, 0, roadBotY);
  depthTint.addColorStop(0, 'rgba(30, 41, 59, 0.1)');
  depthTint.addColorStop(0.48, 'rgba(15, 23, 42, 0.03)');
  depthTint.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
  ctx.fillStyle = depthTint;
  ctx.fillRect(0, roadTopY, endX + 4, roadBotY - roadTopY);

  // 1. Crisp Painted White Outer Edge Lines (thinner far kerb -> thicker foreground kerb for 3D perspective)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.fillRect(0, roadTopY + 1, endX, 2.4);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillRect(0, roadBotY - 3.5, endX, 3.6);

  // 2. Subtle White Dashed Sub-Lane Guides (dividing road cleanly into 4 running lanes!)
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([18, 22]);
  ctx.beginPath();
  ctx.moveTo(8, upperSubLaneY);
  ctx.lineTo(endX - 10, upperSubLaneY);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2.0;
  ctx.setLineDash([22, 24]);
  ctx.beginPath();
  ctx.moveTo(8, lowerSubLaneY);
  ctx.lineTo(endX - 10, lowerSubLaneY);
  ctx.stroke();
  ctx.restore();

  // 3. Bold Golden-Yellow 3D Center Median Divider ("dải phân cách giữa đường") + subtle reflective road studs
  const dashW = 46;
  const dashGap = 28;
  const dashH = 5.2;
  for (let x = 14; x < endX - 24; x += dashW + dashGap) {
    const w = Math.min(dashW, endX - 14 - x);
    if (w < 12) break;

    // Grounded road-paint shadow underneath dash
    ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.beginPath();
    ctx.moveTo(x + 2, roadMidY - dashH / 2 + 1.2);
    ctx.lineTo(x + w + 2, roadMidY - dashH / 2 + 1.2);
    ctx.lineTo(x + w + 4, roadMidY + dashH / 2 + 1.4);
    ctx.lineTo(x, roadMidY + dashH / 2 + 1.4);
    ctx.closePath();
    ctx.fill();

    // Slightly trapezoidal yellow painted median block for 3D ground foreshortening
    const dashGrad = ctx.createLinearGradient(x, roadMidY - dashH / 2, x, roadMidY + dashH / 2);
    dashGrad.addColorStop(0, '#FEF08A');
    dashGrad.addColorStop(0.45, '#FACC15');
    dashGrad.addColorStop(1, '#EAB308');
    ctx.fillStyle = dashGrad;
    ctx.beginPath();
    ctx.moveTo(x + 1.5, roadMidY - dashH / 2);
    ctx.lineTo(x + w - 1.5, roadMidY - dashH / 2);
    ctx.lineTo(x + w + 1.5, roadMidY + dashH / 2);
    ctx.lineTo(x - 1.5, roadMidY + dashH / 2);
    ctx.closePath();
    ctx.fill();

    // Reflective morning-sun road stud ("mắt mèo") centered in gap
    const studX = x + w + dashGap / 2;
    if (studX < endX - 18) {
      ctx.fillStyle = 'rgba(254, 249, 195, 0.85)';
      ctx.beginPath();
      ctx.ellipse(studX, roadMidY, 3.2, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(234, 88, 12, 0.55)';
      ctx.beginPath();
      ctx.ellipse(studX, roadMidY, 1.5, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. Subtle Painted Forward Lane Direction Chevrons pointing toward the school gate
  const chevronXs = [210, 490, 745];
  const laneCenters = [
    (roadTopY + upperSubLaneY) / 2,
    (upperSubLaneY + roadMidY) / 2,
    (roadMidY + lowerSubLaneY) / 2,
    (lowerSubLaneY + roadBotY) / 2,
  ];
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.34)';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let li = 0; li < laneCenters.length; li++) {
    const cy = laneCenters[li];
    const sz = 4.5 + li * 0.65;
    ctx.lineWidth = 1.6 + li * 0.25;
    for (const cx of chevronXs) {
      ctx.beginPath();
      ctx.moveTo(cx - sz, cy - sz * 0.65);
      ctx.lineTo(cx + sz * 0.4, cy);
      ctx.lineTo(cx - sz, cy + sz * 0.65);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawGateFinishThreshold(ctx: CanvasRenderingContext2D) {
  // Subtle clean safe-zone finish checker spanning the wide stone road at the school entrance
  ctx.save();
  ctx.globalAlpha = 0.68;
  const sq = 12;
  const rows = Math.ceil((ROAD_BOTTOM - ROAD_TOP + 10) / sq);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 2; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#FFFFFF' : '#DC2626';
      ctx.fillRect(
        GATE_LINE_X + c * sq,
        ROAD_TOP - 4 + r * sq,
        sq,
        Math.min(sq, ROAD_BOTTOM + 6 - (ROAD_TOP - 4 + r * sq))
      );
    }
  }
  ctx.restore();
}

/**
 * Draws a prestigious, luxurious 3D ceremonial marble-and-gold school gate signboard
 * aligned directly over the photorealistic school courtyard entrance with sculpted pillars,
 * glowing globe lanterns, golden star crest, metallic gold bevels, and terracotta-gold eaves
 * for "TRƯỜNG PTDTBT TIỂU HỌC VÀ TRUNG HỌC CƠ SỞ LÝ TỰ TRỌNG".
 */
function draw3DSchoolGateSignArch(
  ctx: CanvasRenderingContext2D,
  schoolName: string,
  time: number
) {
  const boardW = 412;
  const boardH = 88;
  const boardX = 796;
  const boardY = 314;
  const centerX = boardX + boardW / 2;

  ctx.save();

  // --- 1. Twin Sculpted 3D Cream-Marble & Gold Gate Pillars grounded on the real brick gate piers ---
  const pillarPositions = [boardX + 38, boardX + boardW - 64];
  const pillarW = 26;
  const pillarTop = boardY + boardH - 4;
  const pillarBottom = 532;
  const pillarH = pillarBottom - pillarTop;

  for (const px of pillarPositions) {
    // Pillar shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.fillRect(px + 5, pillarTop + 4, pillarW, pillarH);

    // Sculpted cream marble shaft gradient
    const marbleGrad = ctx.createLinearGradient(px, 0, px + pillarW, 0);
    marbleGrad.addColorStop(0, '#FFFDF7');
    marbleGrad.addColorStop(0.35, '#F5ECD8');
    marbleGrad.addColorStop(0.75, '#E2D0B1');
    marbleGrad.addColorStop(1, '#C5AD87');
    ctx.fillStyle = marbleGrad;
    ctx.strokeStyle = '#9A7B4F';
    ctx.lineWidth = 1.6;
    ctx.fillRect(px, pillarTop, pillarW, pillarH);
    ctx.strokeRect(px, pillarTop, pillarW, pillarH);

    // Recessed gold ornamental vertical panel on pillar face
    ctx.strokeStyle = 'rgba(180, 130, 42, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(px + 5, pillarTop + 14, pillarW - 10, pillarH - 30);

    // Golden molded capital (top of pillar)
    const capGrad = ctx.createLinearGradient(px - 5, pillarTop, px + pillarW + 5, pillarTop);
    capGrad.addColorStop(0, '#FEF08A');
    capGrad.addColorStop(0.5, '#D97706');
    capGrad.addColorStop(1, '#92400E');
    ctx.fillStyle = capGrad;
    drawRoundedRect(ctx, px - 5, pillarTop, pillarW + 10, 10, 3);
    ctx.fill();
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Marble & gold base plinth (grounded cleanly above the wide road kerb)
    ctx.fillStyle = '#D6C29F';
    drawRoundedRect(ctx, px - 6, pillarBottom - 16, pillarW + 12, 16, 3);
    ctx.fill();
    ctx.strokeStyle = '#8C6D3F';
    ctx.stroke();
    ctx.fillStyle = '#EAB308';
    ctx.fillRect(px - 5, pillarBottom - 16, pillarW + 10, 3);

    // Ornamental glowing warm glass lantern globe perched on the outer bracket of each pillar
    const lampX = px < centerX ? px - 12 : px + pillarW + 12;
    const lampY = pillarTop + 26;
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(px < centerX ? px : px + pillarW, lampY + 6);
    ctx.lineTo(lampX, lampY + 6);
    ctx.lineTo(lampX, lampY);
    ctx.stroke();

    const glowAlpha = 0.24 + Math.sin(time * 3.2) * 0.05;
    const glow = ctx.createRadialGradient(lampX, lampY - 5, 2, lampX, lampY - 5, 16);
    glow.addColorStop(0, `rgba(254, 240, 138, ${glowAlpha + 0.35})`);
    glow.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lampX, lampY - 5, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FEF9C3';
    ctx.strokeStyle = '#CA8A04';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(lampX, lampY - 5, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // --- 2. Deep 3D Architectural Drop Shadow Behind Signboard ---
  ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
  drawRoundedRect(ctx, boardX + 6, boardY + 8, boardW, boardH, 12);
  ctx.fill();

  // --- 3. Sculpted Ceremonial Terracotta Roof with Golden Upturned Eaves ---
  const roofGrad = ctx.createLinearGradient(boardX, boardY - 30, boardX, boardY + 6);
  roofGrad.addColorStop(0, '#DC2626');
  roofGrad.addColorStop(0.5, '#B91C1C');
  roofGrad.addColorStop(1, '#7F1D1D');
  ctx.fillStyle = roofGrad;
  ctx.strokeStyle = '#641212';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(boardX - 18, boardY + 3);
  ctx.quadraticCurveTo(boardX - 6, boardY - 2, boardX + 26, boardY - 24);
  ctx.lineTo(boardX + boardW - 26, boardY - 24);
  ctx.quadraticCurveTo(boardX + boardW + 6, boardY - 2, boardX + boardW + 18, boardY + 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ceramic roof tile ribs
  ctx.strokeStyle = 'rgba(254, 226, 226, 0.24)';
  ctx.lineWidth = 1.5;
  for (let rx = boardX + 18; rx < boardX + boardW - 14; rx += 20) {
    ctx.beginPath();
    ctx.moveTo(rx + 6, boardY - 23);
    ctx.lineTo(rx, boardY + 2);
    ctx.stroke();
  }

  // Metallic gold roof ridge bar & eave trim
  const goldRidge = ctx.createLinearGradient(boardX, boardY - 27, boardX + boardW, boardY - 27);
  goldRidge.addColorStop(0, '#B45309');
  goldRidge.addColorStop(0.25, '#FEF08A');
  goldRidge.addColorStop(0.5, '#F59E0B');
  goldRidge.addColorStop(0.75, '#FEF08A');
  goldRidge.addColorStop(1, '#B45309');
  ctx.fillStyle = goldRidge;
  drawRoundedRect(ctx, boardX + 22, boardY - 27, boardW - 44, 5.5, 2.5);
  ctx.fill();
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 1;
  ctx.stroke();

  // --- 4. Royal Golden Star Crest Medallion at Top Center ---
  const crestY = boardY - 24;
  ctx.fillStyle = '#991B1B';
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(centerX, crestY, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, crestY, 13.5, 0, Math.PI * 2);
  ctx.stroke();

  drawStar(ctx, centerX, crestY, 5, 10.5, 4.5, '#FEF08A');

  // Subtle decorative golden laurel curls flanking the crest
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(centerX - 24, crestY + 2, 9, Math.PI * 0.2, Math.PI * 1.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(centerX + 24, crestY + 2, 9, -Math.PI * 0.1, Math.PI * 0.8);
  ctx.stroke();

  // --- 5. Luxurious Metallic-Gold Outer Bevel & Imperial Royal-Navy Velvet Plaque ---
  const goldFrameGrad = ctx.createLinearGradient(boardX, boardY, boardX + boardW, boardY + boardH);
  goldFrameGrad.addColorStop(0, '#FEF08A');
  goldFrameGrad.addColorStop(0.22, '#EAB308');
  goldFrameGrad.addColorStop(0.5, '#FFFBEB');
  goldFrameGrad.addColorStop(0.78, '#CA8A04');
  goldFrameGrad.addColorStop(1, '#FDE047');

  ctx.fillStyle = goldFrameGrad;
  drawRoundedRect(ctx, boardX - 3, boardY - 3, boardW + 6, boardH + 6, 12);
  ctx.fill();
  ctx.strokeStyle = '#854D0E';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Deep imperial sapphire-navy satin interior
  const signGrad = ctx.createLinearGradient(boardX, boardY, boardX, boardY + boardH);
  signGrad.addColorStop(0, '#102A6B');
  signGrad.addColorStop(0.45, '#1D3E8F');
  signGrad.addColorStop(1, '#0F2152');
  ctx.fillStyle = signGrad;
  drawRoundedRect(ctx, boardX + 3, boardY + 3, boardW - 6, boardH - 6, 8);
  ctx.fill();

  // Subtle top satin sheen across the plaque
  const sheenGrad = ctx.createLinearGradient(boardX, boardY + 3, boardX, boardY + boardH * 0.45);
  sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
  sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheenGrad;
  drawRoundedRect(ctx, boardX + 4, boardY + 4, boardW - 8, boardH * 0.42, 7);
  ctx.fill();

  // Double inner gold hairline filigree frame
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
  ctx.lineWidth = 1.25;
  drawRoundedRect(ctx, boardX + 7.5, boardY + 7.5, boardW - 15, boardH - 15, 5);
  ctx.stroke();

  // Four ornate metallic gold corner rosettes
  const corners = [
    [boardX + 12, boardY + 12],
    [boardX + boardW - 12, boardY + 12],
    [boardX + 12, boardY + boardH - 12],
    [boardX + boardW - 12, boardY + boardH - 12],
  ];
  for (const [cx, cy] of corners) {
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  // --- 6. Crisp Embossed Gold & Ivory 2-Line Typography ---
  const cleanTitle = (
    schoolName || 'TRƯỜNG PTDTBT TIỂU HỌC VÀ TRUNG HỌC CƠ SỞ LÝ TỰ TRỌNG'
  )
    .trim()
    .toUpperCase();
  let line1 = cleanTitle;
  let line2 = '';

  const lyTuTrongIdx = cleanTitle.indexOf('LÝ TỰ TRỌNG');
  if (lyTuTrongIdx > 0) {
    line1 = cleanTitle.slice(0, lyTuTrongIdx).trim();
    line2 = cleanTitle.slice(lyTuTrongIdx).trim();
  } else if (cleanTitle.length > 26) {
    const words = cleanTitle.split(/\s+/);
    const mid = Math.ceil(words.length / 2);
    line1 = words.slice(0, mid).join(' ');
    line2 = words.slice(mid).join(' ');
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const maxWidth = boardW - 34;

  if (line2) {
    let f1 = 13.5;
    ctx.font = `700 ${f1}px "Plus Jakarta Sans", sans-serif`;
    while (ctx.measureText(line1).width > maxWidth && f1 > 8.5) {
      f1 -= 0.4;
      ctx.font = `700 ${f1}px "Plus Jakarta Sans", sans-serif`;
    }
    // Soft dark emboss shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.58)';
    ctx.fillText(line1, centerX, boardY + 28);
    ctx.fillStyle = '#FDE68A';
    ctx.fillText(line1, centerX, boardY + 26.5);

    // Delicate golden accent divider rule with tiny diamond
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 88, boardY + 41);
    ctx.lineTo(centerX - 9, boardY + 41);
    ctx.moveTo(centerX + 9, boardY + 41);
    ctx.lineTo(centerX + 88, boardY + 41);
    ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(centerX, boardY + 37.8);
    ctx.lineTo(centerX + 3.8, boardY + 41);
    ctx.lineTo(centerX, boardY + 44.2);
    ctx.lineTo(centerX - 3.8, boardY + 41);
    ctx.closePath();
    ctx.fill();

    let f2 = 26;
    ctx.font = `800 ${f2}px "Baloo 2", "Plus Jakarta Sans", sans-serif`;
    while (ctx.measureText(line2).width > maxWidth && f2 > 13) {
      f2 -= 0.5;
      ctx.font = `800 ${f2}px "Baloo 2", "Plus Jakarta Sans", sans-serif`;
    }
    ctx.fillStyle = 'rgba(15, 23, 42, 0.68)';
    ctx.fillText(line2, centerX, boardY + 64);
    const titleGrad = ctx.createLinearGradient(centerX, boardY + 48, centerX, boardY + 74);
    titleGrad.addColorStop(0, '#FFFFFF');
    titleGrad.addColorStop(0.6, '#FEF9C3');
    titleGrad.addColorStop(1, '#FDE047');
    ctx.fillStyle = titleGrad;
    ctx.fillText(line2, centerX, boardY + 62.5);
  } else {
    let f = 20;
    ctx.font = `800 ${f}px "Baloo 2", "Plus Jakarta Sans", sans-serif`;
    while (ctx.measureText(line1).width > maxWidth && f > 11) {
      f -= 0.5;
      ctx.font = `800 ${f}px "Baloo 2", "Plus Jakarta Sans", sans-serif`;
    }
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.fillText(line1, centerX, boardY + boardH / 2 + 2.5);
    ctx.fillStyle = '#FEF08A';
    ctx.fillText(line1, centerX, boardY + boardH / 2 + 1);
  }

  ctx.restore();
}

function getRunnerDepthScale(y: number): number {
  const t = Math.max(0, Math.min(1, (y - ROAD_TOP) / Math.max(1, ROAD_BOTTOM - ROAD_TOP)));
  return 0.9 + t * 0.16;
}

/**
 * Renders a full-body transparent Cute 3D Chibi THCS student sprite with smooth,
 * articulated 3-part stepping motion (independently swinging left & right legs +
 * rhythmic upper-body walk/run cadence, IDLE bounce, startle jump, and victory kicks).
 */
function drawChibi3DRunner(
  ctx: CanvasRenderingContext2D,
  runner: RunnerEntity,
  sprite: ProcessedChibiSprite,
  globalTime: number,
  densityScale = 1
) {
  const { x, y, state, animTime, cheerPhase, lane } = runner;

  const depthScale = getRunnerDepthScale(y);
  const drawH = STUDENT_BASE_HEIGHT * sprite.heightRatio * depthScale * densityScale;
  const drawW = (sprite.width / sprite.height) * drawH;

  let bobY = 0;
  let bodyTilt = 0;
  let bodyScaleX = 1;
  let bodyScaleY = 1;

  // Articulated stepping parameters for Left & Right legs (in character local coords before flipX)
  let leftLegAngle = 0;
  let rightLegAngle = 0;
  let leftLegLift = 0;
  let rightLegLift = 0;
  let leftLegSlide = 0;
  let rightLegSlide = 0;
  let upperBounceExtra = 0;
  let shadowShiftX = 0;

  if (state === 'idle') {
    // Cheerful gentle IDLE "nảy lên" bounce with softly planted feet & subtle weight sway
    const phase = globalTime * 3.8 + lane * 0.9 + cheerPhase;
    const rawSine = Math.sin(phase);
    const hop = Math.max(0, rawSine);
    const smoothHop = hop * hop * (3 - 2 * hop);
    const crouch = Math.max(0, -rawSine);
    bobY = -smoothHop * 8.5 + crouch * 1.2;
    bodyTilt = Math.sin(phase * 0.5) * 0.032;
    bodyScaleY = 1 + smoothHop * 0.042 - crouch * 0.022;
    bodyScaleX = 1 - smoothHop * 0.032 + crouch * 0.018;
    // Tiny lively toe-step shift on bounce peak
    leftLegAngle = Math.sin(phase * 0.5) * 0.055;
    rightLegAngle = -Math.sin(phase * 0.5) * 0.055;
  } else if (state === 'strolling') {
    // Smooth, rhythmic walking stride: alternating left-right footsteps + gentle shoulder cadence
    const stride = animTime * 7.2 + lane * 0.75;
    const s = Math.sin(stride);
    const c = Math.cos(stride);
    const doubleStep = Math.abs(s); // Peaks twice per full stride cycle (mid-stance on each foot!)

    bobY = -doubleStep * 4.8;
    upperBounceExtra = -doubleStep * 1.6;
    bodyTilt = 0.03 + c * 0.038;
    bodyScaleY = 1 + doubleStep * 0.024;
    bodyScaleX = 1 - doubleStep * 0.018;

    // Alternating stepping arcs: swinging leg lifts cleanly, planted leg pushes back smoothly
    leftLegAngle = s * 0.27;
    rightLegAngle = -s * 0.27;
    leftLegLift = Math.max(0, c) * 5.6;
    rightLegLift = Math.max(0, -c) * 5.6;
    leftLegSlide = s * 4.2;
    rightLegSlide = -s * 4.2;
    shadowShiftX = s * 2.2;
  } else if (state === 'shocked') {
    const shudder = Math.sin(globalTime * 42) * 0.055;
    bobY = -17 + Math.abs(Math.sin(globalTime * 22)) * 5;
    bodyTilt = -0.1 + shudder;
    bodyScaleY = 1.07;
    bodyScaleX = 0.94;
    leftLegAngle = 0.22;
    rightLegAngle = -0.22;
    leftLegLift = 4;
    rightLegLift = 4;
  } else if (state === 'running') {
    // Athletic, fluid high-cadence sprinting steps with wide scissor swing & energetic forward lean
    const stride = animTime * 16.8 + lane * 0.65;
    const s = Math.sin(stride);
    const c = Math.cos(stride);
    const doubleStep = Math.abs(s);

    bobY = -doubleStep * 9.5;
    upperBounceExtra = -doubleStep * 2.4;
    bodyTilt = 0.135 + c * 0.052;
    bodyScaleY = 1 + (doubleStep - 0.35) * 0.055;
    bodyScaleX = 1 - (doubleStep - 0.35) * 0.045;

    leftLegAngle = s * 0.44;
    rightLegAngle = -s * 0.44;
    leftLegLift = Math.max(0, c) * 9.2;
    rightLegLift = Math.max(0, -c) * 9.2;
    leftLegSlide = s * 6.8;
    rightLegSlide = -s * 6.8;
    shadowShiftX = s * 4.0;
  } else if (state === 'safe') {
    const cheer = globalTime * 6.8 + cheerPhase;
    const hop = Math.max(0, Math.sin(cheer));
    const kick = Math.sin(cheer * 0.5);
    bobY = -hop * 13.5;
    bodyTilt = kick * 0.065;
    bodyScaleY = 1 + hop * 0.055;
    bodyScaleX = 1 - hop * 0.04;
    leftLegAngle = hop * 0.24 * (kick >= 0 ? 1 : -0.6);
    rightLegAngle = -hop * 0.24 * (kick >= 0 ? 0.6 : -1);
    leftLegLift = hop * 4.5;
    rightLegLift = hop * 4.5;
  } else if (state === 'caught') {
    const wobble = Math.sin(globalTime * 11) * 0.055;
    bobY = -2 + Math.sin(globalTime * 14) * 2.5;
    bodyTilt = -0.17 + wobble;
    bodyScaleY = 0.96;
    bodyScaleX = 1.04;
    leftLegAngle = Math.sin(globalTime * 12) * 0.14;
    rightLegAngle = -Math.sin(globalTime * 12) * 0.14;
  }

  ctx.save();
  ctx.translate(x, y);

  // Layered directional morning ground shadow + tight contact AO shadow
  const liftFactor = Math.max(0.62, 1 + bobY / 42);
  const shadowRx = Math.max(20, drawW * 0.32) * liftFactor;
  const shadowRy = 7.5 * liftFactor;

  const ambientShadow = ctx.createRadialGradient(
    3 + shadowShiftX,
    3,
    2,
    3 + shadowShiftX,
    3,
    shadowRx * 1.15
  );
  ambientShadow.addColorStop(0, 'rgba(15, 23, 42, 0.3)');
  ambientShadow.addColorStop(0.65, 'rgba(15, 23, 42, 0.12)');
  ambientShadow.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = ambientShadow;
  ctx.beginPath();
  ctx.ellipse(3 + shadowShiftX, 3, shadowRx * 1.15, shadowRy * 1.18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
  ctx.beginPath();
  ctx.ellipse(shadowShiftX * 0.6, 2, shadowRx * 0.65, shadowRy * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Expressive cartoon running-foot speed arcs underneath sprinting feet
  if (state === 'running') {
    const spin = animTime * 22;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-9, -7, 13, spin, spin + Math.PI * 0.95);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(9, -6, 11, spin + Math.PI, spin + Math.PI * 1.85);
    ctx.stroke();
    ctx.restore();
  }

  // Anchor smoothly at ground contact (0, 0) + overall vertical bob
  ctx.translate(0, bobY);

  // Articulated 3-layer drawing (Left Leg + Right Leg tucked cleanly beneath Upper Body/Skirt/Waist)
  const splitYRatio = sprite.legSplitYRatio ?? 0.71;
  const splitXRatio = sprite.legCenterXRatio ?? 0.5;

  const srcW = sprite.width;
  const srcH = sprite.height;
  const srcSplitY = Math.round(srcH * splitYRatio);
  const srcSplitX = Math.round(srcW * splitXRatio);
  const overlapSrc = Math.max(4, Math.round(srcH * 0.028));

  const drawTopY = -drawH + 3;
  const drawSplitY = drawTopY + drawH * splitYRatio;
  const drawOverlap = drawH * (overlapSrc / srcH);

  const leftSrcW = srcSplitX;
  const rightSrcW = srcW - srcSplitX;
  const leftDrawW = drawW * (leftSrcW / srcW);
  const rightDrawW = drawW - leftDrawW;

  const legSrcY = Math.max(0, srcSplitY - overlapSrc);
  const legSrcH = srcH - legSrcY;
  const legDrawH = drawH * (legSrcH / srcH);

  ctx.save();
  if (sprite.flipX) {
    ctx.scale(-1, 1);
  }
  ctx.scale(bodyScaleX, bodyScaleY);

  const flipSign = sprite.flipX ? -1 : 1;

  // Helper to render one articulated leg pivoting smoothly at its hip joint
  const drawArticulatedLeg = (
    sx: number,
    sw: number,
    dxStart: number,
    dw: number,
    pivotOffsetX: number,
    angle: number,
    liftY: number,
    slideX: number
  ) => {
    const pivotX = dxStart + pivotOffsetX;
    const pivotY = drawSplitY - drawOverlap * 0.35;
    ctx.save();
    ctx.translate(pivotX + slideX * flipSign, pivotY - liftY);
    ctx.rotate(angle * flipSign);
    ctx.drawImage(
      sprite.canvas,
      sx,
      legSrcY,
      sw,
      legSrcH,
      -pivotOffsetX,
      -drawOverlap * 0.65,
      dw,
      legDrawH
    );
    ctx.restore();
  };

  // Draw back-swinging leg first so front-stepping leg naturally overlaps in front
  const leftIsForward = leftLegSlide >= rightLegSlide;
  const drawLeftLeg = () =>
    drawArticulatedLeg(
      0,
      leftSrcW,
      -drawW / 2,
      leftDrawW,
      leftDrawW * 0.62,
      leftLegAngle,
      leftLegLift,
      leftLegSlide
    );
  const drawRightLeg = () =>
    drawArticulatedLeg(
      srcSplitX,
      rightSrcW,
      -drawW / 2 + leftDrawW,
      rightDrawW,
      rightDrawW * 0.38,
      rightLegAngle,
      rightLegLift,
      rightLegSlide
    );

  if (leftIsForward) {
    drawRightLeg();
    drawLeftLeg();
  } else {
    drawLeftLeg();
    drawRightLeg();
  }

  // Draw Upper Body (head, torso, arms, backpack, skirt/waist) cleanly over hip joints with natural walk/run tilt!
  const hipPivotX = -drawW / 2 + leftDrawW;
  const hipPivotY = drawSplitY;
  ctx.save();
  ctx.translate(hipPivotX, hipPivotY + upperBounceExtra);
  ctx.rotate(bodyTilt * flipSign);
  const upperDrawH = drawH * splitYRatio;
  ctx.drawImage(
    sprite.canvas,
    0,
    0,
    srcW,
    srcSplitY,
    -leftDrawW,
    -upperDrawH,
    drawW,
    upperDrawH
  );
  ctx.restore();

  ctx.restore();

  // Animated comic expressions on top of the 3D Chibi character
  if (state === 'shocked') {
    ctx.save();
    ctx.font = '800 22px "Baloo 2", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4.5;
    ctx.strokeText('?!', drawW * 0.3, -drawH + 8);
    ctx.fillStyle = '#EF4444';
    ctx.fillText('?!', drawW * 0.3, -drawH + 8);
    ctx.restore();

    drawComicSweatDrop(ctx, -drawW * 0.3, -drawH + 26 + Math.sin(globalTime * 18) * 3);
  } else if (state === 'running') {
    // Flying cartoon panic sweat droplets trailing behind sprinting head
    const dropPhase = (globalTime * 4.5 + lane * 0.7) % 1;
    drawComicSweatDrop(
      ctx,
      -drawW * 0.34 - dropPhase * 12,
      -drawH + 22 + dropPhase * 10
    );
    if (runner.isDesignatedSlowest) {
      const dropPhase2 = (globalTime * 4.5 + lane * 0.7 + 0.5) % 1;
      drawComicSweatDrop(
        ctx,
        -drawW * 0.42 - dropPhase2 * 14,
        -drawH + 36 + dropPhase2 * 8
      );
    }
  } else if (state === 'caught') {
    // Orbiting golden dizzy stars above head!
    for (let s = 0; s < 3; s++) {
      const a = globalTime * 6 + (s * Math.PI * 2) / 3;
      const sx = Math.cos(a) * 24;
      const sy = -drawH - 2 + Math.sin(a) * 7;
      drawStar(ctx, sx, sy, 5, 6.5, 2.8, s % 2 === 0 ? '#FACC15' : '#FB923C');
    }
  }

  ctx.restore();
}

function drawComicSweatDrop(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.fillStyle = '#38BDF8';
  ctx.strokeStyle = '#0284C7';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.quadraticCurveTo(4.5, 1, 0, 5.5);
  ctx.quadraticCurveTo(-4.5, 1, 0, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#E0F2FE';
  ctx.beginPath();
  ctx.arc(-1, 1, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawArticulatedDogPart(
  ctx: CanvasRenderingContext2D,
  part: DogPartCanvas,
  w: number,
  h: number,
  angle: number,
  dx = 0,
  dy = 0,
  scaleX = 1,
  scaleY = 1
) {
  const px = -w / 2 + part.pivotX * w;
  const py = -h + 6 + part.pivotY * h;
  ctx.save();
  ctx.translate(px + dx, py + dy);
  ctx.rotate(angle);
  if (scaleX !== 1 || scaleY !== 1) {
    ctx.scale(scaleX, scaleY);
  }
  ctx.drawImage(part.canvas, -part.pivotX * w, -part.pivotY * h, w, h);
  ctx.restore();
}

function drawBigDog(
  ctx: CanvasRenderingContext2D,
  dog: DogEntity,
  time: number,
  dogSprite: ProcessedDogSprite | null,
  runners: RunnerEntity[]
) {
  if (dog.state === 'scuffle') {
    drawSlapstickScuffleCloud(ctx, dog.x + 12, dog.y - 42, time);
    return;
  }

  const isChasing = dog.state === 'chasing' || dog.state === 'ambush';
  const isTugging = dog.state === 'tugging';
  const isBarking = dog.barkTimer > 0;

  let drawX = dog.x;
  let drawY = dog.y;
  if (isTugging && dog.targetId) {
    const target = runners.find((r) => r.profile.id === dog.targetId);
    if (target) {
      drawX = target.x - 58 + Math.sin(time * 16) * 4;
      drawY = target.y + 4;
    }
  }

  // Smooth bounding quadruped gallop cycle
  const gallopPhase = dog.animTime * 17.5;
  const gSin = Math.sin(gallopPhase);
  const gCos = Math.cos(gallopPhase);

  const gallopBob = isChasing
    ? -Math.abs(gSin) * 12.5
    : Math.sin(time * 11) * -3.2;
  const bodyTilt = isChasing
    ? gCos * 0.115
    : isTugging
      ? -0.05 + Math.sin(time * 15) * 0.06
      : 0;
  const stretchX = isChasing ? 1 + gSin * 0.065 : 1;
  const stretchY = isChasing ? 1 - gSin * 0.05 : 1;

  ctx.save();
  ctx.translate(drawX, drawY);

  // Balanced 3D ground shadow under the playful chasing dog (compresses slightly on airborne gallop peak)
  const liftScale = Math.max(0.74, 1 + gallopBob / 48);
  const shadowGrad = ctx.createRadialGradient(0, 5, 5, 0, 5, 44 * liftScale);
  shadowGrad.addColorStop(0, 'rgba(15, 23, 42, 0.34)');
  shadowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(0, 5, 44 * liftScale, 11 * liftScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Expressive white paw-blur speed arcs underneath galloping paws
  if (isChasing) {
    const spin = dog.animTime * 24;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.68)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-26, -6, 12, spin, spin + Math.PI * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(24, -6, 12, spin + Math.PI, spin + Math.PI * 1.85);
    ctx.stroke();
    ctx.restore();
  }

  ctx.translate(0, gallopBob);
  ctx.rotate(bodyTilt);
  ctx.scale(stretchX, stretchY);

  if (dogSprite && dogSprite.width > 0) {
    // Slightly smaller, balanced playful cartoon dog (116px wide relative to 3D THCS students)
    const w = 116;
    const h = (dogSprite.height / dogSprite.width) * w;
    const { parts } = dogSprite;

    // Articulated leg, tail & head kinematics
    let flAngle = 0;
    let frAngle = 0;
    let blAngle = 0;
    let brAngle = 0;
    let flLift = 0;
    let frLift = 0;
    let blLift = 0;
    let brLift = 0;
    let tailAngle = Math.sin(time * 16) * 0.2;
    let headAngle = 0;
    let headDx = 0;
    let headDy = 0;
    let headScaleX = 1;
    let headScaleY = 1;

    if (isChasing) {
      // Classic rotary gallop: front pair swings opposite to hind pair, with slight stagger between left/right
      const fLeft = Math.sin(gallopPhase);
      const fRight = Math.sin(gallopPhase + 0.65);
      const bLeft = Math.sin(gallopPhase + Math.PI);
      const bRight = Math.sin(gallopPhase + Math.PI + 0.65);

      flAngle = -fLeft * 0.48;
      frAngle = -fRight * 0.48;
      blAngle = -bLeft * 0.44;
      brAngle = -bRight * 0.42;

      flLift = Math.max(0, Math.cos(gallopPhase)) * 7.5;
      frLift = Math.max(0, Math.cos(gallopPhase + 0.65)) * 7.5;
      blLift = Math.max(0, Math.cos(gallopPhase + Math.PI)) * 6.5;
      brLift = Math.max(0, Math.cos(gallopPhase + Math.PI + 0.65)) * 6.0;

      // Brisk tail wag while sprinting
      tailAngle = Math.sin(gallopPhase * 1.4) * 0.34;

      // Energetic head stabilization + forward barking/snapping bob
      const barkPulse = isBarking ? Math.abs(Math.sin(time * 22)) : 0;
      headAngle = -gCos * 0.1 + Math.sin(gallopPhase - 0.5) * 0.09 - barkPulse * 0.1;
      headDx = 2.5 + gSin * 2.2 + barkPulse * 3.0;
      headDy = -Math.abs(gCos) * 2.4 - barkPulse * 1.8;
      headScaleX = 1 + barkPulse * 0.045;
      headScaleY = 1 + barkPulse * 0.065;
    } else if (isTugging) {
      // Playful energetic stance & rhythmic head-shake while tugging
      const tug = Math.sin(time * 17);
      flAngle = 0.16 + tug * 0.07;
      frAngle = -0.14 - tug * 0.07;
      blAngle = -0.18 + tug * 0.06;
      brAngle = -0.12 - tug * 0.06;
      tailAngle = Math.sin(time * 24) * 0.38;
      headAngle = tug * 0.16;
      headDx = tug * 2.5;
      headDy = -Math.abs(tug) * 2.4;
      headScaleY = 1 + Math.abs(tug) * 0.05;
    }

    // Draw 7 articulated layers cleanly back-to-front
    drawArticulatedDogPart(ctx, parts.tail, w, h, tailAngle);
    drawArticulatedDogPart(ctx, parts.backRightLeg, w, h, brAngle, brAngle * -4, -brLift);
    drawArticulatedDogPart(ctx, parts.backLeftLeg, w, h, blAngle, blAngle * -4, -blLift);
    drawArticulatedDogPart(ctx, parts.torso, w, h, 0);
    drawArticulatedDogPart(ctx, parts.frontRightLeg, w, h, frAngle, frAngle * -5, -frLift);
    drawArticulatedDogPart(ctx, parts.frontLeftLeg, w, h, flAngle, flAngle * -5, -flLift);
    drawArticulatedDogPart(
      ctx,
      parts.head,
      w,
      h,
      headAngle,
      headDx,
      headDy,
      headScaleX,
      headScaleY
    );
  } else {
    ctx.scale(1.18, 1.18);
    drawFallbackCartoonDog(ctx, dog.animTime);
  }

  if (isTugging) {
    ctx.fillStyle = '#F59E0B';
    ctx.font = '800 18px "Baloo 2", sans-serif';
    ctx.fillText('♪', -46, -74 + Math.sin(time * 8) * 4);
  }

  ctx.restore();
}

function drawFallbackCartoonDog(ctx: CanvasRenderingContext2D, t: number) {
  const swing = Math.sin(t * 20) * 10;
  ctx.strokeStyle = '#C2410C';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-26, -34);
  ctx.quadraticCurveTo(-42, -50 + Math.sin(t * 25) * 6, -36, -62);
  ctx.stroke();

  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-18, -20);
  ctx.lineTo(-22 - swing, 2);
  ctx.moveTo(16, -20);
  ctx.lineTo(22 + swing, 2);
  ctx.stroke();

  ctx.fillStyle = '#EA580C';
  ctx.strokeStyle = '#7C2D12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -32, 30, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(6, -26, 20, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(16, -44);
  ctx.lineTo(24, -24);
  ctx.stroke();

  ctx.fillStyle = '#EA580C';
  ctx.beginPath();
  ctx.arc(28, -44, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawSlapstickScuffleCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number
) {
  ctx.save();
  ctx.translate(x, y);

  for (let i = 0; i < 9; i++) {
    const angle = time * 7 + (i * Math.PI * 2) / 9;
    const dist = 34 + Math.sin(time * 18 + i) * 10;
    const r = 30 + Math.cos(time * 14 + i) * 6;
    ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#FEF3C7';
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(
      Math.cos(angle) * dist,
      Math.sin(angle) * dist * 0.72,
      r,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.fill();

  for (let s = 0; s < 6; s++) {
    const a = -time * 5 + (s * Math.PI * 2) / 6;
    drawStar(
      ctx,
      Math.cos(a) * 68,
      Math.sin(a) * 48,
      5,
      11,
      5,
      s % 2 === 0 ? '#FACC15' : '#FB7185'
    );
  }

  ctx.fillStyle = '#EA580C';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 5.5;
  ctx.font = '800 30px "Baloo 2", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = Math.floor(time * 8) % 2 === 0 ? 'CHỌN BẠN!' : 'GÂU GÂU!';
  ctx.strokeText(label, 0, 0);
  ctx.fillText(label, 0, 0);

  ctx.restore();
}

function drawFlyingSandal(ctx: CanvasRenderingContext2D, s: FlyingSandal) {
  ctx.save();
  ctx.translate(s.x, s.y);

  // Comic motion swirl ring while airborne
  if (!s.grounded) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 17, s.rotation, s.rotation + Math.PI * 1.1);
    ctx.stroke();
  }

  ctx.rotate(s.rotation);

  // Bigger, more visible funny cartoon sandal/flip-flop
  ctx.fillStyle = s.color;
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(2.5, -1, 5.8, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();

  ctx.restore();
}

function drawFlyingBackpack(ctx: CanvasRenderingContext2D, bp: FlyingBackpack) {
  ctx.save();
  ctx.translate(bp.x, bp.y);

  // Ground shadow under grounded backpack
  if (bp.grounded) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Comic spinning arc while tumbling through the air!
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 24, bp.rotation, bp.rotation + Math.PI * 1.25);
    ctx.stroke();
  }

  ctx.rotate(bp.rotation);
  ctx.scale(1.18, 1.18);
  drawCuteBackpack(ctx, bp.style, bp.color, bp.trimColor);
  ctx.restore();
}

function drawFlyingPapers(ctx: CanvasRenderingContext2D, papers: FlyingPaper[]) {
  for (const p of papers) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation + Math.sin(p.phase * 6) * 0.45);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.2;
    ctx.fillRect(-8, -10, 16, 20);
    ctx.strokeRect(-8, -10, 16, 20);
    // Cute blue notebook lines
    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.lineTo(5, -5);
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.moveTo(-5, 5);
    ctx.lineTo(3, 5);
    ctx.stroke();
    ctx.restore();
  }
}

function drawFallingPetals(ctx: CanvasRenderingContext2D, petals: FallingPetal[]) {
  for (const pt of petals) {
    ctx.save();
    ctx.translate(pt.x, pt.y);
    const rot =
      pt.rotation !== undefined
        ? pt.rotation + Math.sin(pt.phase * 2.4) * 0.48
        : Math.sin(pt.phase * 3) * 0.8;
    ctx.rotate(rot);

    // Gentle 3D breeze tumble squash so leaves & petals visibly flip in the air
    const flipScale = 0.42 + 0.58 * Math.abs(Math.cos(pt.phase * 2.3));
    ctx.scale(1, flipScale);

    if (pt.kind === 'leaf') {
      const sz = pt.size;
      // Soft drop shadow for 3D floating depth
      ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
      ctx.beginPath();
      ctx.moveTo(-sz * 1.15 + 1.5, 2);
      ctx.quadraticCurveTo(1.5, -sz * 0.85 + 2, sz * 1.15 + 1.5, 2);
      ctx.quadraticCurveTo(1.5, sz * 0.85 + 2, -sz * 1.15 + 1.5, 2);
      ctx.closePath();
      ctx.fill();

      // Crisp sunlit leaf silhouette
      ctx.fillStyle = pt.color;
      ctx.strokeStyle = 'rgba(20, 83, 45, 0.5)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-sz * 1.15, 0);
      ctx.quadraticCurveTo(0, -sz * 0.85, sz * 1.15, 0);
      ctx.quadraticCurveTo(0, sz * 0.85, -sz * 1.15, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Delicate leaf stem & sunlit central vein
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-sz * 1.35, 0);
      ctx.lineTo(sz * 0.9, 0);
      ctx.stroke();
    } else {
      ctx.fillStyle = pt.color;
      ctx.strokeStyle = 'rgba(153, 27, 27, 0.32)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, pt.size * 1.08, pt.size * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 241, 242, 0.48)';
      ctx.beginPath();
      ctx.ellipse(-pt.size * 0.22, -pt.size * 0.14, pt.size * 0.45, pt.size * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawForegroundButterflies(
  ctx: CanvasRenderingContext2D,
  butterflies: ButterflyEntity[]
) {
  for (const bf of butterflies) {
    const flap = Math.abs(Math.sin(bf.phase * 10));
    ctx.save();
    ctx.translate(bf.x, bf.y);
    ctx.fillStyle = bf.color;
    ctx.beginPath();
    ctx.ellipse(-4.5, -2, 6 * flap + 1.5, 4.5, -0.4, 0, Math.PI * 2);
    ctx.ellipse(4.5, -2, 6 * flap + 1.5, 4.5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.4, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawStudentLabels(
  ctx: CanvasRenderingContext2D,
  runner: RunnerEntity,
  sprite3D?: ProcessedChibiSprite,
  densityScale = 1
) {
  const { profile, x, y, state, speechText, speechTimer } = runner;

  const depthScale = getRunnerDepthScale(y);
  const spriteHeight = (sprite3D ? STUDENT_BASE_HEIGHT * sprite3D.heightRatio : 156) * depthScale * densityScale;
  const labelY =
    state === 'caught' ? y - spriteHeight - 8 : y - spriteHeight - 14;
  const fontSize = densityScale < 0.9 ? 12 : 13;
  ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
  const textWidth = ctx.measureText(profile.name).width;
  const padX = 9;
  const boxW = textWidth + padX * 2;
  const boxH = 22;

  const isCaught = state === 'caught';
  const isSafe = state === 'safe';

  ctx.fillStyle = isCaught
    ? '#FEF2F2'
    : isSafe
      ? '#ECFDF5'
      : 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = isCaught ? '#DC2626' : isSafe ? '#16A34A' : '#334155';
  ctx.lineWidth = 1.6;

  drawRoundedRect(ctx, x - boxW / 2, labelY - boxH / 2, boxW, boxH, 7);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isCaught ? '#991B1B' : isSafe ? '#166534' : '#0F172A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(profile.name, x, labelY + 0.5);

  if (speechText && speechTimer > 0) {
    const bg = state === 'running' || state === 'shocked' ? '#FFFBEB' : '#FFFFFF';
    const border =
      state === 'running' || state === 'shocked' ? '#EA580C' : '#0284C7';
    const textCol =
      state === 'running' || state === 'shocked' ? '#9A3412' : '#0F172A';
    drawSpeechBubble(ctx, x, labelY - 30, speechText, bg, border, textCol);
  }
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  bgColor: string,
  borderColor: string,
  textColor: string
) {
  ctx.save();
  ctx.font = '700 12.5px "Plus Jakarta Sans", sans-serif';
  const textW = ctx.measureText(text).width;
  const w = textW + 22;
  const h = 28;

  const clampedX = Math.max(w / 2 + 12, Math.min(WORLD_W - w / 2 - 12, x));

  ctx.fillStyle = bgColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2.2;
  drawRoundedRect(ctx, clampedX - w / 2, y - h / 2, w, h, 10);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(clampedX - 5, y + h / 2 - 1);
  ctx.lineTo(clampedX, y + h / 2 + 6);
  ctx.lineTo(clampedX + 5, y + h / 2 - 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = bgColor;
  ctx.fillRect(clampedX - 4.5, y + h / 2 - 3, 9, 3);

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, clampedX, y + 0.5);
  ctx.restore();
}

function drawSingleDustParticle(ctx: CanvasRenderingContext2D, p: DustPuff) {
  const alpha = Math.max(0, Math.min(1, p.alpha));
  if (alpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x, p.y);
  if (p.rotation) ctx.rotate(p.rotation);

  const kind = p.kind ?? 'puff';

  if (kind === 'speck') {
    // Tiny crisp sand/dirt pebble kicked sharply up from shoes & dog paws
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.radius * 1.25, p.radius * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'swirl') {
    // Whimsical cartoon dust-whirl curling behind high-speed runners & paws
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(1.5, p.radius * 0.24);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0.2, Math.PI * 1.45);
    ctx.stroke();
  } else {
    // Expressive multi-lobe billowing cartoon dust puff with warm sandy rim for crisp road contrast
    const r = p.radius;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.strokeColor || 'rgba(161, 120, 72, 0.42)';
    ctx.lineWidth = 1.4;

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.arc(-r * 0.58, r * 0.18, r * 0.72, 0, Math.PI * 2);
    ctx.arc(r * 0.52, r * 0.22, r * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Soft bright sunlit puff core
    ctx.fillStyle = 'rgba(255, 253, 245, 0.65)';
    ctx.beginPath();
    ctx.arc(-r * 0.14, -r * 0.22, r * 0.48, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawConfetti(ctx: CanvasRenderingContext2D, pieces: ConfettiPiece[]) {
  for (const c of pieces) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, c.alpha);
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rotation);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.size / 2, -c.size / 3, c.size, c.size * 0.65);
    ctx.restore();
  }
}

function drawComicPops(ctx: CanvasRenderingContext2D, pops: ComicPop[]) {
  for (const pop of pops) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pop.alpha);
    ctx.translate(pop.x, pop.y);
    ctx.scale(pop.scale, pop.scale);
    ctx.font = '800 22px "Baloo 2", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4.5;
    ctx.strokeText(pop.text, 0, 0);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, 0, 0);
    ctx.restore();
  }
}

function drawChaseSpeedLines(ctx: CanvasRenderingContext2D, time: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.34)';
  ctx.lineWidth = 2.6;
  for (let i = 0; i < 8; i++) {
    const y = ROAD_TOP + 10 + ((i * 19) % (ROAD_BOTTOM - ROAD_TOP));
    const x = WORLD_W - (((time * 820 + i * 210) % (WORLD_W + 180)) - 90);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 82, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAlertBanner(ctx: CanvasRenderingContext2D, time: number) {
  const pulse = 1 + Math.sin(time * 26) * 0.04;
  ctx.save();
  ctx.translate(WORLD_W / 2, 74);
  ctx.scale(pulse, pulse);

  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, -246, -32, 492, 64, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 30px "Baloo 2", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CHÓ TỚI RỒI! CHẠY MAU LÊN!', 0, 2);
  ctx.restore();
}

function drawTopHintBanner(ctx: CanvasRenderingContext2D, text: string) {
  ctx.save();
  ctx.font = '700 15.5px "Plus Jakarta Sans", sans-serif';
  const tw = ctx.measureText(text).width;
  const w = tw + 38;
  const h = 40;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, WORLD_W / 2 - w / 2, 18, w, h, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1E293B';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, WORLD_W / 2, 38.5);
  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number,
  color: string
) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
