import { ChibiVariantSpec, getChibiSpec } from '../data/chibiCatalog';
import {
  BackpackStyle,
  ChibiHairDesign,
  GlassesStyle,
  RunnerState,
  StudentProfile,
} from '../types/game';

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

function drawMiniStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  color: string
) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / 5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < 5; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Draws a rich, 3D-shaded adorable Chibi backpack (8 distinct styles) centered at (0, 0).
 */
export function drawCuteBackpack(
  ctx: CanvasRenderingContext2D,
  style: BackpackStyle,
  color: string,
  trimColor: string
): void {
  const outline = 'rgba(42, 28, 20, 0.68)';

  if (style === 'bunny') {
    ctx.fillStyle = color;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-6, -18, 3.6, 8.5, -0.22, 0, Math.PI * 2);
    ctx.ellipse(2, -18, 3.6, 8.5, 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FECDD3';
    ctx.beginPath();
    ctx.ellipse(-6, -18, 1.7, 5.2, -0.22, 0, Math.PI * 2);
    ctx.ellipse(2, -18, 1.7, 5.2, 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'bear') {
    ctx.fillStyle = color;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-8, -11, 4.4, 0, Math.PI * 2);
    ctx.arc(3, -11, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = trimColor;
    ctx.beginPath();
    ctx.arc(-8, -11, 2.1, 0, Math.PI * 2);
    ctx.arc(3, -11, 2.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'dino') {
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.25;
    for (const sy of [-8, 0, 8]) {
      ctx.beginPath();
      ctx.moveTo(-11, sy - 3.5);
      ctx.lineTo(-17, sy);
      ctx.lineTo(-11, sy + 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // Main backpack shell with soft 3D depth shading
  ctx.fillStyle = color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.65;
  drawRoundedRect(ctx, -12, -12, 20, 26, 7);
  ctx.fill();

  const shellShade = ctx.createLinearGradient(-12, -12, 8, 14);
  shellShade.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
  shellShade.addColorStop(0.45, 'rgba(255, 255, 255, 0)');
  shellShade.addColorStop(1, 'rgba(15, 23, 42, 0.26)');
  ctx.fillStyle = shellShade;
  drawRoundedRect(ctx, -12, -12, 20, 26, 7);
  ctx.fill();
  ctx.stroke();

  // Top glossy bevel highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  drawRoundedRect(ctx, -9.5, -9.5, 13.5, 4.5, 2.5);
  ctx.fill();

  // Front zipped pocket with soft shadow
  ctx.fillStyle = trimColor;
  drawRoundedRect(ctx, -9, 1, 13.5, 10, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.2)';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  if (style === 'bear' || style === 'bunny') {
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(-5.5, 5, 1.3, 0, Math.PI * 2);
    ctx.arc(0.5, 5, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FB7185';
    ctx.beginPath();
    ctx.arc(-2.5, 7.2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'star') {
    drawMiniStar(ctx, -2.5, 6, 4.4, 2.0, '#FACC15');
  } else if (style === 'heart') {
    ctx.fillStyle = '#E11D48';
    ctx.beginPath();
    ctx.arc(-4.3, 5, 2.4, 0, Math.PI * 2);
    ctx.arc(-0.7, 5, 2.4, 0, Math.PI * 2);
    ctx.moveTo(-6.5, 5.8);
    ctx.lineTo(-2.5, 10);
    ctx.lineTo(1.5, 5.8);
    ctx.closePath();
    ctx.fill();
  } else if (style === 'rainbow') {
    const rbColors = ['#EF4444', '#FACC15', '#22C55E', '#3B82F6'];
    rbColors.forEach((rc, i) => {
      ctx.strokeStyle = rc;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(-2.5, 9.5, 6.2 - i * 1.4, Math.PI, Math.PI * 2);
      ctx.stroke();
    });
  } else if (style === 'space') {
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(-2.5, 6, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(-2.5, 6, 6.2, 2.1, -0.3, 0, Math.PI * 2);
    ctx.stroke();
  } else if (style === 'classic') {
    ctx.fillStyle = '#F59E0B';
    drawRoundedRect(ctx, -4.5, 2.5, 4, 4, 1);
    ctx.fill();
  } else {
    drawMiniStar(ctx, -2.5, -5, 3.2, 1.5, '#FEF08A');
  }
}

export interface ChibiDrawOptions {
  profile: StudentProfile;
  x: number;
  y: number;
  state: RunnerState;
  animTime: number;
  globalTime: number;
  hasDroppedSandal?: boolean;
  hasDroppedBackpack?: boolean;
  cheerPhase?: number;
  laneSeed?: number;
  scale?: number;
  showShadow?: boolean;
}

/**
 * Draws a rich, volumetric 3D-shaded realistic Chibi student with articulated
 * multi-joint arms & legs, natural secondary follow-through motion (head lag,
 * streaming hair, fluttering red scarf), expressive jewel eyes & eyebrows,
 * lively IDLE bounce, 12 girl & 7 boy hairstyles, cute glasses, and 8 backpacks.
 */
export function drawChibiStudent(
  ctx: CanvasRenderingContext2D,
  opts: ChibiDrawOptions
): void {
  const {
    profile,
    x,
    y,
    state,
    animTime,
    globalTime,
    hasDroppedSandal = false,
    hasDroppedBackpack = false,
    cheerPhase = 0,
    laneSeed = 0,
    scale = 1,
    showShadow = true,
  } = opts;

  const baseSpec = getChibiSpec(profile.chibiVariant, profile.gender);
  const resolvedGlasses: GlassesStyle =
    profile.glassesStyle ?? baseSpec.glassesStyle;
  const spec: ChibiVariantSpec = {
    ...baseSpec,
    gender: profile.gender,
    hairDesign: profile.hairDesign ?? baseSpec.hairDesign,
    backpackStyle: profile.backpackStyle ?? baseSpec.backpackStyle,
    backpackColor: profile.backpackColor || baseSpec.backpackColor,
    hairColor: profile.hairColor || baseSpec.hairColor,
    glassesStyle: resolvedGlasses,
  };

  const isRunning = state === 'running';
  const isStrolling = state === 'strolling';
  const isShocked = state === 'shocked';
  const isSafe = state === 'safe';
  const isCaught = state === 'caught';
  const isIdle = state === 'idle';

  // --- FLUID, SPRINGY FULL-BODY KINEMATICS ---
  let bobY = 0;
  let lean = 0;
  let squashX = 1;
  let squashY = 1;
  let headTilt = 0;
  let headLagY = 0;
  let stridePhase = 0;
  let hairTrail = 0;

  if (isStrolling) {
    stridePhase = animTime * 7.2;
    const stepWave = Math.abs(Math.sin(stridePhase));
    bobY = -Math.pow(stepWave, 0.85) * 5.2;
    lean = 0.045 + Math.sin(stridePhase) * 0.025;
    squashX = 1 + (1 - stepWave) * 0.022;
    squashY = 1 - (1 - stepWave) * 0.02;
    headTilt = Math.sin(stridePhase * 0.5 + laneSeed) * 0.06;
    headLagY = -Math.abs(Math.sin(stridePhase - 0.45)) * 1.4;
    hairTrail = 0.12;
  } else if (isShocked) {
    const shockOsc = Math.abs(Math.sin(animTime * 22));
    bobY = -14 - shockOsc * 6.5;
    lean = -0.11 + Math.sin(animTime * 32) * 0.03;
    squashX = 0.93;
    squashY = 1.08;
    headTilt = -0.09;
    headLagY = -2;
    hairTrail = -0.15;
  } else if (isRunning) {
    stridePhase = animTime * 19.5;
    const bounceWave = Math.abs(Math.sin(stridePhase));
    // Smooth athletic running arc with springy squash on foot strike
    bobY = -Math.pow(bounceWave, 0.78) * 10.5;
    lean = 0.23 + Math.sin(stridePhase * 2) * 0.035;
    squashX = 1.04 - bounceWave * 0.075;
    squashY = 0.96 + bounceWave * 0.075;
    headTilt = -0.09 + Math.sin(stridePhase - 0.55) * 0.055;
    headLagY = -Math.sin(stridePhase * 2 - 0.6) * 1.6;
    hairTrail = 1.0;
  } else if (isSafe) {
    const cheerWave = Math.abs(Math.sin(globalTime * 7.2 + cheerPhase));
    const smoothCheer = Math.pow(cheerWave, 1.15);
    bobY = -smoothCheer * 13.5;
    lean = Math.sin(globalTime * 3.6 + cheerPhase) * 0.065;
    squashX = 1.04 - smoothCheer * 0.07;
    squashY = 0.96 + smoothCheer * 0.075;
    headTilt = Math.sin(globalTime * 3.6 + cheerPhase) * 0.08;
    headLagY = -smoothCheer * 1.5;
    hairTrail = 0.15;
  } else if (isCaught) {
    bobY = 6.5;
    lean = -0.15 + Math.sin(globalTime * 7) * 0.025;
    squashX = 1.04;
    squashY = 0.96;
    headTilt = 0.08 + Math.sin(globalTime * 5) * 0.05;
    hairTrail = 0;
  } else {
    // Fluid, joyful IDLE bounce ('nảy lên') with soft anticipation, stretch, and playful head sway!
    const idleClock = globalTime * 3.45 + laneSeed * 1.18;
    const rawSine = Math.sin(idleClock);
    const bounceWave = Math.abs(rawSine);
    const smoothHop = Math.pow(bounceWave, 1.38);
    // Gentle micro-crouch right at the bottom of the bounce
    const anticipation = Math.max(0, 0.25 - bounceWave) * 3.2;
    bobY = -smoothHop * 9.8 + anticipation;
    squashX = 1.035 - smoothHop * 0.065 + anticipation * 0.015;
    squashY = 0.965 + smoothHop * 0.07 - anticipation * 0.015;
    lean = Math.sin(globalTime * 1.7 + laneSeed * 1.3) * 0.048;
    headTilt = Math.sin(globalTime * 2.15 + laneSeed * 1.6) * 0.075;
    headLagY = -Math.pow(Math.abs(Math.sin(idleClock - 0.35)), 1.4) * 1.6;
    hairTrail = 0.05;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // --- REALISTIC DIRECTIONAL GROUND CONTACT SHADOW (Morning sun from upper-left) ---
  if (showShadow) {
    const heightRatio = Math.min(1, Math.abs(bobY) / 16);
    const shadowScale = 1 - heightRatio * 0.24;
    // Soft directional cast shadow slightly to the right-bottom
    const castGrad = ctx.createRadialGradient(
      4,
      4.5,
      2,
      4,
      4.5,
      (isCaught ? 30 : 23) * shadowScale
    );
    castGrad.addColorStop(0, `rgba(18, 28, 42, ${0.34 - heightRatio * 0.1})`);
    castGrad.addColorStop(0.65, `rgba(18, 28, 42, ${0.14 - heightRatio * 0.05})`);
    castGrad.addColorStop(1, 'rgba(18, 28, 42, 0)');
    ctx.fillStyle = castGrad;
    ctx.beginPath();
    ctx.ellipse(
      4,
      4.5,
      (isCaught ? 30 : 23) * shadowScale,
      7.2 * shadowScale,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Tight dark ambient occlusion right under shoes
    ctx.fillStyle = `rgba(15, 23, 42, ${0.22 - heightRatio * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(0, 3.5, 11.5 * shadowScale, 3.4 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.translate(0, bobY);
  ctx.scale(squashX, squashY);
  ctx.rotate(lean);

  // --- 1. CUTE 3D BACKPACK (with elastic lag bounce) ---
  if (!hasDroppedBackpack) {
    const packLag = isRunning
      ? Math.sin(stridePhase * 2 - 0.7) * 3.2
      : isIdle
        ? bobY * 0.18
        : isStrolling
          ? Math.sin(stridePhase * 2 - 0.5) * 1.4
          : 0;
    ctx.save();
    ctx.translate(-13.5, -33 + packLag * 0.55);
    ctx.rotate(
      isRunning
        ? -0.22 + packLag * 0.035
        : isStrolling
          ? -0.08 + packLag * 0.02
          : -0.05
    );
    drawCuteBackpack(ctx, spec.backpackStyle, spec.backpackColor, spec.backpackTrim);
    ctx.restore();
  }

  // --- 2. BACK ARM (drawn behind torso for true 3D depth!) ---
  drawLimbArm(ctx, 'back', {
    state,
    stridePhase,
    globalTime,
    bobY,
    laneSeed,
    skinTone: spec.skinTone,
  });

  // --- 3. ARTICULATED MULTI-JOINT LEGS & REALISTIC SNEAKERS ---
  drawArticulatedLegs(ctx, {
    state,
    stridePhase,
    globalTime,
    bobY,
    skinTone: spec.skinTone,
    shoeColor: spec.shoeColor,
    hasDroppedSandal,
  });

  // --- 4. LOWER UNIFORM (3D-shaded pleated skirt or tailored trousers) ---
  const skirtSway = isRunning
    ? Math.sin(stridePhase) * 2.6
    : isStrolling
      ? Math.sin(stridePhase) * 1.2
      : Math.sin(globalTime * 2 + laneSeed) * 0.5;

  const bottomGrad = ctx.createLinearGradient(-15, -23, 15, -6);
  bottomGrad.addColorStop(0, '#33486E');
  bottomGrad.addColorStop(0.42, spec.uniformBottomColor);
  bottomGrad.addColorStop(1, '#111B2E');
  ctx.fillStyle = bottomGrad;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.lineWidth = 1.5;

  if (spec.gender === 'girl') {
    ctx.beginPath();
    ctx.moveTo(-10, -23);
    ctx.lineTo(10, -23);
    ctx.lineTo(16.8 + skirtSway * 0.6, -7.5);
    ctx.quadraticCurveTo(skirtSway * 0.3, -4, -16.8 + skirtSway * 0.4, -7.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Realistic alternating light & shadow skirt pleats
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-5.5, -21.5);
    ctx.lineTo(-8.5 + skirtSway * 0.35, -8);
    ctx.moveTo(0, -22);
    ctx.lineTo(skirtSway * 0.3, -6.5);
    ctx.moveTo(5.5, -21.5);
    ctx.lineTo(8.5 + skirtSway * 0.45, -8);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.32)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-2.8, -21.5);
    ctx.lineTo(-4.2 + skirtSway * 0.35, -7.2);
    ctx.moveTo(2.8, -21.5);
    ctx.lineTo(4.2 + skirtSway * 0.38, -7.2);
    ctx.stroke();
  } else {
    drawRoundedRect(ctx, -11, -23, 22, 13.8, 4.2);
    ctx.fill();
    ctx.stroke();
    // Subtle trouser crease & belt line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-9, -21);
    ctx.lineTo(9, -21);
    ctx.stroke();
  }

  // --- 5. TAILORED 3D-SHADED WHITE SCHOOL SHIRT ---
  const shirtGrad = ctx.createLinearGradient(-12, -43, 12, -20);
  shirtGrad.addColorStop(0, '#FFFFFF');
  shirtGrad.addColorStop(0.55, '#F8FAFC');
  shirtGrad.addColorStop(1, '#CBD5E1');
  ctx.fillStyle = shirtGrad;
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.58)';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, -11.5, -43, 23, 23, 7);
  ctx.fill();
  ctx.stroke();

  // Subtle shirt placket & tiny pearl buttons
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0.8, -34);
  ctx.lineTo(0.8, -21.5);
  ctx.stroke();
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.arc(0.8, -29.5, 1.0, 0, Math.PI * 2);
  ctx.arc(0.8, -24.5, 1.0, 0, Math.PI * 2);
  ctx.fill();

  // Crisp folded white shirt collar lapels
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.55)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-9, -42.5);
  ctx.lineTo(-3, -36.5);
  ctx.lineTo(-0.5, -41.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(9, -42.5);
  ctx.lineTo(3, -36.5);
  ctx.lineTo(0.5, -41.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Backpack straps wrapping over shoulders
  if (!hasDroppedBackpack) {
    ctx.strokeStyle = spec.backpackColor;
    ctx.lineWidth = 3.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6.8, -41);
    ctx.quadraticCurveTo(-7.6, -34, -6.5, -26.5);
    ctx.moveTo(6.8, -41);
    ctx.quadraticCurveTo(7.6, -34, 6.5, -26.5);
    ctx.stroke();
  }

  // --- 6. SILKY FLUTTERING RED PIONEER SCARF (KHĂN QUÀNG ĐỎ) ---
  const scarfGrad = ctx.createLinearGradient(-10, -43, 8, -23);
  scarfGrad.addColorStop(0, '#F87171');
  scarfGrad.addColorStop(0.45, '#EF4444');
  scarfGrad.addColorStop(1, '#B91C1C');
  ctx.fillStyle = scarfGrad;
  ctx.strokeStyle = 'rgba(127, 29, 29, 0.65)';
  ctx.lineWidth = 1.15;

  // Collar band
  ctx.beginPath();
  ctx.moveTo(-8.8, -42);
  ctx.lineTo(8.8, -42);
  ctx.lineTo(0.8, -34.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Smooth multi-wave flowing scarf tails
  const windBase = isRunning ? -15.5 : isStrolling ? -3.5 : 0;
  const wave1 = isRunning
    ? Math.sin(animTime * 24 + laneSeed) * 4.5
    : Math.sin(globalTime * 4.2 + laneSeed) * 2.1;
  const wave2 = isRunning
    ? Math.cos(animTime * 21 + laneSeed) * 3.5
    : Math.cos(globalTime * 3.5 + laneSeed) * 1.4;

  ctx.beginPath();
  ctx.moveTo(-1, -35.8);
  ctx.quadraticCurveTo(-3 + windBase * 0.5, -30 + wave2 * 0.4, -4.5 + windBase + wave1, -23.5);
  ctx.lineTo(1.2 + windBase * 0.72 + wave1 * 0.7, -26.2);
  ctx.lineTo(4.2 + windBase * 0.45 + wave2 * 0.6, -23.2);
  ctx.quadraticCurveTo(3.5 + windBase * 0.2, -30, 3.2, -35.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3D scarf knot highlight
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.ellipse(0.8, -35.8, 3.0, 2.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.arc(0.1, -36.5, 1.0, 0, Math.PI * 2);
  ctx.fill();

  // --- 7. FRONT ARM (articulated upper arm + elbow + cute hand + shirt sleeve) ---
  drawLimbArm(ctx, 'front', {
    state,
    stridePhase,
    globalTime,
    bobY,
    laneSeed,
    skinTone: spec.skinTone,
  });

  // --- 8. VOLUMETRIC NECK WITH SOFT CHIN SHADOW ---
  ctx.fillStyle = spec.skinTone;
  drawRoundedRect(ctx, -4.2, -46.5, 8.4, 6.2, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(154, 92, 58, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, -44.2, 4.3, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- 9. VOLUMETRIC 3D ROUND-FACED REALISTIC CHIBI HEAD (with spring lag & tilt) ---
  ctx.save();
  ctx.translate(0, -64.5 + headLagY);
  ctx.rotate(headTilt);

  drawBackHair(
    ctx,
    spec.hairDesign,
    spec.hairColor,
    spec.hairHighlight,
    spec.accentColor,
    isRunning ? animTime : globalTime,
    hairTrail
  );

  // Cute 3D-shaded round ears with warm inner ear fold
  for (const side of [-1, 1]) {
    const earGrad = ctx.createRadialGradient(
      side * 22.8,
      2,
      1,
      side * 23.5,
      3.2,
      5.2
    );
    earGrad.addColorStop(0, '#FFF2E5');
    earGrad.addColorStop(0.65, spec.skinTone);
    earGrad.addColorStop(1, '#E7B08A');
    ctx.fillStyle = earGrad;
    ctx.strokeStyle = 'rgba(92, 58, 33, 0.58)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(side * 23.4, 3.2, 4.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(217, 119, 87, 0.34)';
    ctx.beginPath();
    ctx.arc(side * 23.2, 3.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Volumetric 3D Plump Round Chibi Face (lit naturally from upper-left morning sun)
  const faceGrad = ctx.createRadialGradient(-7.5, -7.5, 3, 2, 3, 29);
  faceGrad.addColorStop(0, '#FFF8F0');
  faceGrad.addColorStop(0.38, '#FFEBD8');
  faceGrad.addColorStop(0.75, spec.skinTone);
  faceGrad.addColorStop(1, '#E9B18A');
  ctx.fillStyle = faceGrad;
  ctx.strokeStyle = 'rgba(92, 58, 33, 0.56)';
  ctx.lineWidth = 1.65;
  ctx.beginPath();
  ctx.ellipse(0, 1.2, 24.5, 22.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Soft chin bounce-light rim & lower cheek volume
  const chinGlow = ctx.createRadialGradient(0, 19, 1, 0, 17, 11);
  chinGlow.addColorStop(0, 'rgba(255, 247, 237, 0.45)');
  chinGlow.addColorStop(1, 'rgba(255, 247, 237, 0)');
  ctx.fillStyle = chinGlow;
  ctx.beginPath();
  ctx.ellipse(0, 16, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Natural feathered rosy cheeks with subtle soft gloss dot
  for (const cx of [-13.8, 13.8]) {
    const blush = ctx.createRadialGradient(cx, 8.6, 0.5, cx, 8.6, 7.2);
    blush.addColorStop(0, 'rgba(244, 114, 134, 0.52)');
    blush.addColorStop(0.55, 'rgba(251, 146, 158, 0.24)');
    blush.addColorStop(1, 'rgba(251, 146, 158, 0)');
    ctx.fillStyle = blush;
    ctx.beginPath();
    ctx.ellipse(cx, 8.6, 7.2, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft realistic cheek specular shimmer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.beginPath();
    ctx.ellipse(cx - 2.1, 7.1, 1.7, 0.95, -0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  if (spec.hasFreckles) {
    ctx.fillStyle = 'rgba(180, 83, 9, 0.36)';
    for (const fx of [-14, -11.5, 11.5, 14]) {
      ctx.beginPath();
      ctx.arc(fx, 7.8, 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Soft cast shadow from front bangs onto the upper forehead (key realistic 3D cue!)
  const bangShadow = ctx.createLinearGradient(0, -11, 0, -2.5);
  bangShadow.addColorStop(0, 'rgba(92, 52, 32, 0.22)');
  bangShadow.addColorStop(1, 'rgba(92, 52, 32, 0)');
  ctx.fillStyle = bangShadow;
  ctx.beginPath();
  ctx.ellipse(0, -6.5, 22, 6.2, 0, 0, Math.PI);
  ctx.fill();

  drawChibiFace(ctx, spec, state, animTime, globalTime, laneSeed);
  drawFrontHair(ctx, spec.hairDesign, spec.hairColor, spec.hairHighlight);
  drawChibiGlasses(ctx, spec.glassesStyle);
  drawChibiAccessory(ctx, spec);

  if (isShocked) {
    ctx.fillStyle = '#EF4444';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.font = '900 24px "Baloo 2", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText('?!', 0, -32);
    ctx.fillText('?!', 0, -32);
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Draws articulated 2-segment arms (upper arm + bent elbow + forearm + hand + shirt sleeve).
 */
function drawLimbArm(
  ctx: CanvasRenderingContext2D,
  which: 'back' | 'front',
  params: {
    state: RunnerState;
    stridePhase: number;
    globalTime: number;
    bobY: number;
    laneSeed: number;
    skinTone: string;
  }
) {
  const { state, stridePhase, globalTime, bobY, laneSeed, skinTone } = params;
  const isBack = which === 'back';
  const sx = isBack ? 10 : -10;
  const sy = -36.5;

  let ex = sx;
  let ey = sy + 7;
  let hx = sx;
  let hy = sy + 13;

  if (state === 'safe') {
    const wave = Math.sin(globalTime * 11 + laneSeed + (isBack ? 1.2 : 0)) * 3.5;
    ex = sx + (isBack ? 7 : -7);
    ey = sy - 7;
    hx = sx + (isBack ? 11 + wave : -11 + wave);
    hy = sy - 17;
  } else if (state === 'shocked') {
    ex = sx + (isBack ? 7 : -7);
    ey = sy - 4;
    hx = sx + (isBack ? 11 : -11);
    hy = sy - 13;
  } else if (state === 'running') {
    // True pumping athletic sprint arms with 90-degree bent elbows!
    const phase = isBack ? stridePhase + Math.PI : stridePhase;
    const swing = Math.sin(phase);
    const lift = Math.cos(phase);
    ex = sx + swing * 8.5 - 1.5;
    ey = sy + 6.5 - Math.max(0, lift) * 2.5;
    hx = ex + 6.5 + swing * 3.5;
    hy = ey - 3.5 - swing * 3.5;
  } else if (state === 'caught') {
    if (isBack) {
      const wave = Math.sin(globalTime * 10) * 4.5;
      ex = sx + 6;
      ey = sy - 4;
      hx = sx + 10 + wave;
      hy = sy - 13;
    } else {
      ex = sx - 5;
      ey = sy + 5;
      hx = sx - 9;
      hy = sy + 11;
    }
  } else if (state === 'idle') {
    // Soft, joyful bounce arm movement & subtle playful sway
    const lift = Math.abs(bobY) * 0.52;
    const sway = Math.sin(globalTime * 2.4 + laneSeed + (isBack ? 0.6 : 0)) * 2.2;
    ex = sx + (isBack ? 4.2 : -4.2) + sway * 0.4;
    ey = sy + 6.2 - lift * 0.5;
    hx = sx + (isBack ? 7.2 : -7.2) + sway;
    hy = sy + 11.5 - lift;
  } else {
    // Relaxed natural strolling arm swing with gentle elbow bend
    const phase = isBack ? stridePhase + Math.PI : stridePhase;
    const swing = Math.sin(phase) * 7.2;
    ex = sx + swing * 0.55;
    ey = sy + 6.8;
    hx = ex + swing * 0.65 + 1.5;
    hy = ey + 5.8 - Math.max(0, swing) * 0.35;
  }

  ctx.save();
  // Soft limb outline + warm skin fill
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Subtle shadow tint on back arm for genuine 3D depth separation
  ctx.strokeStyle = 'rgba(92, 58, 33, 0.5)';
  ctx.lineWidth = 7.0;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.lineTo(hx, hy);
  ctx.stroke();

  ctx.strokeStyle = isBack ? '#F5C49E' : skinTone;
  ctx.lineWidth = 5.2;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.lineTo(hx, hy);
  ctx.stroke();

  // Cute rounded Chibi hand
  ctx.fillStyle = isBack ? '#F5C49E' : '#FFE8D4';
  ctx.strokeStyle = 'rgba(92, 58, 33, 0.45)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(hx, hy, 3.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Crisp 3D-shaded white shirt short sleeve cuff over shoulder
  const sleeveGrad = ctx.createRadialGradient(sx - 1.5, sy - 1.5, 1, sx, sy, 5.5);
  sleeveGrad.addColorStop(0, '#FFFFFF');
  sleeveGrad.addColorStop(1, '#CBD5E1');
  ctx.fillStyle = sleeveGrad;
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.55)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 4.9, 4.6, isBack ? 0.25 : -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws articulated 2-segment legs (thigh -> knee -> calf -> sock -> 3D sneaker)
 * for smooth walking, energetic high-knee sprinting, and springy idle bounces.
 */
function drawArticulatedLegs(
  ctx: CanvasRenderingContext2D,
  params: {
    state: RunnerState;
    stridePhase: number;
    globalTime: number;
    bobY: number;
    skinTone: string;
    shoeColor: string;
    hasDroppedSandal: boolean;
  }
) {
  const { state, stridePhase, bobY, skinTone, shoeColor, hasDroppedSandal } = params;

  if (state === 'caught') {
    drawSingleArticulatedLeg(ctx, {
      hipX: -4.5,
      hipY: -12,
      kneeX: 4,
      kneeY: -4,
      footX: 13,
      footY: 2.5,
      footAngle: 0.3,
      skinTone: '#F4C19B',
      shoeColor,
      missingShoe: false,
      isBack: true,
    });
    drawSingleArticulatedLeg(ctx, {
      hipX: 4.5,
      hipY: -12,
      kneeX: 13,
      kneeY: -6,
      footX: 21,
      footY: -1.5,
      footAngle: -0.25,
      skinTone,
      shoeColor,
      missingShoe: hasDroppedSandal,
      isBack: false,
    });
    return;
  }

  if (state === 'running') {
    // Subtle cartoon speed-blur arc under sprinting shoes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, -4, 15, 0.2, Math.PI * 1.35);
    ctx.stroke();

    const drawSprintLeg = (phaseOffset: number, isBack: boolean, missingShoe: boolean) => {
      const p = stridePhase + phaseOffset;
      const sinP = Math.sin(p);
      const cosP = Math.cos(p);
      const hipX = isBack ? 3.5 : -3.5;
      const hipY = -12.5;
      // Knee drives forward & high on front swing, bends back on recovery
      const kneeX = hipX + sinP * 8.5 + 3.2;
      const kneeY = hipY + 6.2 - Math.max(0, cosP) * 3.8;
      const footX = hipX + sinP * 14.5 - Math.max(0, -cosP) * 3.5;
      const footY = 2.2 - Math.max(0, cosP) * 7.8;
      const footAngle = -sinP * 0.42;

      drawSingleArticulatedLeg(ctx, {
        hipX,
        hipY,
        kneeX,
        kneeY,
        footX,
        footY,
        footAngle,
        skinTone: isBack ? '#F4C19B' : skinTone,
        shoeColor,
        missingShoe,
        isBack,
      });
    };

    drawSprintLeg(Math.PI, true, false);
    drawSprintLeg(0, false, hasDroppedSandal);
    return;
  }

  if (state === 'strolling') {
    const drawWalkLeg = (phaseOffset: number, isBack: boolean) => {
      const p = stridePhase + phaseOffset;
      const sinP = Math.sin(p);
      const cosP = Math.cos(p);
      const hipX = isBack ? 4 : -4;
      const hipY = -12;
      const kneeX = hipX + sinP * 4.8 + 1.4;
      const kneeY = hipY + 6.8 - Math.max(0, cosP) * 1.6;
      const footX = hipX + sinP * 9.2;
      const footY = 2.4 - Math.max(0, cosP) * 3.4;
      const footAngle = -sinP * 0.2;

      drawSingleArticulatedLeg(ctx, {
        hipX,
        hipY,
        kneeX,
        kneeY,
        footX,
        footY,
        footAngle,
        skinTone: isBack ? '#F4C19B' : skinTone,
        shoeColor,
        missingShoe: false,
        isBack,
      });
    };

    drawWalkLeg(Math.PI, true);
    drawWalkLeg(0, false);
    return;
  }

  // IDLE / SAFE / SHOCKED: springy natural knee bend synced to bounce height!
  const airBend = Math.min(1, Math.abs(bobY) / 11);
  const crouchOut = bobY > 0.3 ? bobY * 0.8 : 0;

  drawSingleArticulatedLeg(ctx, {
    hipX: -4.5,
    hipY: -12,
    kneeX: -5.2 - crouchOut,
    kneeY: -5.2 - airBend * 1.2,
    footX: -4.8 - airBend * 1.2,
    footY: 2.2 - airBend * 1.8,
    footAngle: airBend * 0.14,
    skinTone: '#F4C19B',
    shoeColor,
    missingShoe: false,
    isBack: true,
  });

  drawSingleArticulatedLeg(ctx, {
    hipX: 4.5,
    hipY: -12,
    kneeX: 5.2 + crouchOut,
    kneeY: -5.2 - airBend * 1.2,
    footX: 4.8 + airBend * 1.2,
    footY: 2.2 - airBend * 1.8,
    footAngle: -airBend * 0.14,
    skinTone,
    shoeColor,
    missingShoe: false,
    isBack: false,
  });
}

function drawSingleArticulatedLeg(
  ctx: CanvasRenderingContext2D,
  leg: {
    hipX: number;
    hipY: number;
    kneeX: number;
    kneeY: number;
    footX: number;
    footY: number;
    footAngle: number;
    skinTone: string;
    shoeColor: string;
    missingShoe: boolean;
    isBack: boolean;
  }
) {
  const { hipX, hipY, kneeX, kneeY, footX, footY, footAngle, skinTone, shoeColor, missingShoe } =
    leg;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Soft warm contour around leg
  ctx.strokeStyle = 'rgba(92, 58, 33, 0.45)';
  ctx.lineWidth = 7.0;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.quadraticCurveTo(kneeX, kneeY, footX, footY);
  ctx.stroke();

  // Warm shaded skin leg
  ctx.strokeStyle = skinTone;
  ctx.lineWidth = 5.4;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.quadraticCurveTo(kneeX, kneeY, footX, footY);
  ctx.stroke();

  // Ribbed white school sock at ankle
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(footX, footY - 1.6, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Tilted foot / realistic 3D school sneaker!
  ctx.translate(footX + 2.4, footY + 1.6);
  ctx.rotate(footAngle);

  if (missingShoe) {
    // Cute bare sock foot when sandal flew off!
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.8, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Realistic 3D sneaker body
    ctx.fillStyle = shoeColor;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7.6, 4.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Crisp white rubber sole & toe cap
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.ellipse(0.4, 2.3, 7.1, 1.5, 0, 0, Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(5.1, 0.4, 2.3, 2.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tiny white shoe lace marks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.moveTo(-1, -2.5);
    ctx.lineTo(1.5, -1.8);
    ctx.moveTo(1.2, -2.2);
    ctx.lineTo(3.4, -1.4);
    ctx.stroke();
  }

  ctx.restore();
}

function drawChibiFace(
  ctx: CanvasRenderingContext2D,
  spec: ChibiVariantSpec,
  state: RunnerState,
  animTime: number,
  globalTime: number,
  laneSeed: number
) {
  const isShocked = state === 'shocked';
  const isRunning = state === 'running';
  const isCaught = state === 'caught';
  const isSafe = state === 'safe';

  // Soft 3D sculpted button nose (tiny warm shadow + bright tip highlight)
  ctx.fillStyle = 'rgba(194, 110, 78, 0.55)';
  ctx.beginPath();
  ctx.ellipse(0.4, 6.2, 1.7, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 250, 245, 0.75)';
  ctx.beginPath();
  ctx.arc(-0.1, 5.4, 0.85, 0, Math.PI * 2);
  ctx.fill();

  // Expressive soft-shaded eyebrows
  ctx.strokeStyle = spec.hairColor;
  ctx.lineWidth = 1.9;
  ctx.lineCap = 'round';
  if (isShocked) {
    ctx.beginPath();
    ctx.arc(-8.2, -5.2, 4.2, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(8.2, -5.2, 4.2, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (isRunning) {
    // Determined/panicked tilted brows
    ctx.beginPath();
    ctx.moveTo(-12, -5.8);
    ctx.lineTo(-4.5, -4.2);
    ctx.moveTo(12, -5.8);
    ctx.lineTo(4.5, -4.2);
    ctx.stroke();
  } else {
    // Warm gentle arched brows
    ctx.beginPath();
    ctx.moveTo(-11.8, -6.0);
    ctx.quadraticCurveTo(-8.2, -8.2, -4.6, -6.2);
    ctx.moveTo(4.6, -6.2);
    ctx.quadraticCurveTo(8.2, -8.2, 11.8, -6.0);
    ctx.stroke();
  }

  if (isShocked || isRunning) {
    // Wide comedic panic eyes with 3D sclera shadow & iris ring
    for (const ex of [-8, 8]) {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#2B1B12';
      ctx.lineWidth = 1.65;
      ctx.beginPath();
      ctx.arc(ex, 1.5, 6.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const lookX = isShocked ? -1.7 : 1.9;
      ctx.fillStyle = spec.eyeColor;
      ctx.beginPath();
      ctx.arc(ex + lookX, 1.5, 3.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(ex + lookX, 1.5, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ex + lookX - 1.1, 0.3, 1.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Open shouting mouth with tongue & tiny tooth glint
    ctx.fillStyle = '#881337';
    ctx.beginPath();
    ctx.ellipse(0.5, 13.2, 5.4, isShocked ? 6.1 : 4.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FB7185';
    ctx.beginPath();
    ctx.ellipse(0.5, 15.3, 3.3, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-2.6, 8.6, 6.2, 1.6);

    // Flying cartoon sweat droplet
    const sweatY = -11 + ((animTime * 26) % 11);
    const sweatGrad = ctx.createRadialGradient(-24.5, sweatY + 4, 0.5, -24, sweatY + 5, 5);
    sweatGrad.addColorStop(0, '#E0F2FE');
    sweatGrad.addColorStop(1, '#0284C7');
    ctx.fillStyle = sweatGrad;
    ctx.beginPath();
    ctx.moveTo(-24, sweatY);
    ctx.quadraticCurveTo(-28, sweatY + 7, -24, sweatY + 8.5);
    ctx.quadraticCurveTo(-20, sweatY + 7, -24, sweatY);
    ctx.fill();
  } else if (isCaught) {
    drawDizzySpiral(ctx, -8, 2);
    drawDizzySpiral(ctx, 8, 2);

    ctx.strokeStyle = '#7C2D12';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-5.5, 12.6);
    ctx.quadraticCurveTo(-2, 9.6, 0.5, 12.6);
    ctx.quadraticCurveTo(3, 15.6, 6.5, 12.6);
    ctx.stroke();

    for (let s = 0; s < 3; s++) {
      const a = globalTime * 4 + (s * Math.PI * 2) / 3;
      drawMiniStar(ctx, Math.cos(a) * 21, -29 + Math.sin(a) * 5, 5.5, 2.5, '#FACC15');
    }
  } else if (isSafe) {
    ctx.strokeStyle = '#2B1B12';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-8, 2.6, 4.7, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(8, 2.6, 4.7, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    ctx.fillStyle = '#E11D48';
    ctx.beginPath();
    ctx.arc(0.5, 9.8, 6.3, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FDA4AF';
    ctx.beginPath();
    ctx.ellipse(0.5, 13.7, 3.6, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Deep, luminous 3D jewel-like Chibi eyes with natural periodic blink!
    const blinkCycle = (globalTime + laneSeed * 1.37) % 4.2;
    const isBlinking = blinkCycle > 4.06;

    if (isBlinking) {
      ctx.strokeStyle = '#2B1B12';
      ctx.lineWidth = 2.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-8, 2.6, 4.5, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(8, 2.6, 4.5, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    } else {
      for (const ex of [-8.2, 8.2]) {
        // Sclera with soft top shadow from upper eyelid
        const scleraGrad = ctx.createLinearGradient(ex, -4.5, ex, 8);
        scleraGrad.addColorStop(0, '#E2E8F0');
        scleraGrad.addColorStop(0.32, '#FFFFFF');
        scleraGrad.addColorStop(1, '#FFFFFF');
        ctx.fillStyle = scleraGrad;
        ctx.beginPath();
        ctx.ellipse(ex, 2.1, 6.0, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Volumetric radial iris gradient (deep espresso top -> warm luminous amber/hazel lower rim)
        const irisGrad = ctx.createRadialGradient(ex, 4.2, 1.0, ex, 1.5, 6.2);
        irisGrad.addColorStop(0, '#D97706');
        irisGrad.addColorStop(0.42, spec.eyeColor);
        irisGrad.addColorStop(1, '#1A0F0A');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.ellipse(ex, 2.2, 5.1, 5.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Crisp dark pupil
        ctx.fillStyle = '#0F0A08';
        ctx.beginPath();
        ctx.ellipse(ex, 2.0, 2.6, 3.0, 0, 0, Math.PI * 2);
        ctx.fill();

        // Warm lower iris bounce-light crescent
        ctx.fillStyle = 'rgba(253, 224, 71, 0.36)';
        ctx.beginPath();
        ctx.arc(ex, 4.6, 2.8, 0.08 * Math.PI, 0.92 * Math.PI);
        ctx.fill();

        // Dual glossy 3D eye catchlights
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(ex - 2.0, -0.4, 2.2, 1.8, -0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex + 2.0, 4.1, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // Sculpted dark upper lash line & subtle double-eyelid crease
        ctx.strokeStyle = '#1E140E';
        ctx.lineWidth = spec.gender === 'girl' ? 2.1 : 1.75;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ex, 2.2, 5.8, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();

        // Delicate upper eyelid fold line
        ctx.strokeStyle = 'rgba(120, 74, 48, 0.35)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(ex, 1.6, 7.2, Math.PI * 1.22, Math.PI * 1.78);
        ctx.stroke();

        if (spec.gender === 'girl') {
          ctx.strokeStyle = '#1E140E';
          ctx.lineWidth = 1.6;
          const dir = ex < 0 ? -1 : 1;
          ctx.beginPath();
          ctx.moveTo(ex + dir * 4.8, -1.5);
          ctx.lineTo(ex + dir * 7.4, -3.4);
          ctx.moveTo(ex + dir * 5.2, 0.3);
          ctx.lineTo(ex + dir * 7.2, -0.8);
          ctx.stroke();
        }
      }
    }

    // Sweet natural smile with soft coral lip tint & glossy highlight
    ctx.fillStyle = '#E11D48';
    ctx.beginPath();
    ctx.arc(0.4, 9.8, 5.4, 0.06 * Math.PI, 0.94 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FDA4AF';
    ctx.beginPath();
    ctx.ellipse(0.4, 13.0, 3.1, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tiny white smile tooth line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(-3.4, 9.9, 7.6, 1.4);
  }
}

function drawChibiGlasses(ctx: CanvasRenderingContext2D, style: GlassesStyle) {
  if (style === 'none') return;

  ctx.save();
  // Soft realistic glass lens sheen gradient
  const lensGrad = ctx.createLinearGradient(-15, -5, 15, 10);
  lensGrad.addColorStop(0, 'rgba(255, 255, 255, 0.34)');
  lensGrad.addColorStop(0.5, 'rgba(224, 242, 254, 0.14)');
  lensGrad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
  ctx.fillStyle = lensGrad;

  if (style === 'round_dark' || style === 'round_gold' || style === 'pink_cute') {
    const strokeCol =
      style === 'round_gold'
        ? '#D97706'
        : style === 'pink_cute'
          ? '#EC4899'
          : '#1E293B';
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = style === 'pink_cute' ? 2.15 : 1.85;

    for (const gx of [-8.2, 8.2]) {
      ctx.beginPath();
      ctx.arc(gx, 2.2, 7.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Subtle diagonal realistic lens glint
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(gx - 4.2, -1.6);
      ctx.lineTo(gx - 1.2, -4.0);
      ctx.stroke();
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = style === 'pink_cute' ? 2.15 : 1.85;
    }

    ctx.beginPath();
    ctx.moveTo(-1, 2);
    ctx.quadraticCurveTo(0, 0.5, 1, 2);
    ctx.stroke();

    if (style === 'pink_cute') {
      ctx.beginPath();
      ctx.moveTo(-14.8, -1);
      ctx.lineTo(-17.4, -3.2);
      ctx.moveTo(14.8, -1);
      ctx.lineTo(17.4, -3.2);
      ctx.stroke();
    }
  } else if (style === 'square_dark') {
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.95;
    drawRoundedRect(ctx, -15.2, -3.8, 13.4, 11.8, 2.8);
    ctx.fill();
    ctx.stroke();
    drawRoundedRect(ctx, 1.8, -3.8, 13.4, 11.8, 2.8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-1.8, 1.5);
    ctx.lineTo(1.8, 1.5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawDizzySpiral(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 4.2; a += 0.35) {
    const r = a * 0.44;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (a === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function drawBackHair(
  ctx: CanvasRenderingContext2D,
  hairDesign: ChibiHairDesign,
  hairColor: string,
  hairHighlight: string,
  accentColor: string,
  t: number,
  hairTrail: number
) {
  const bounce = Math.sin(t * 12) * (1.8 + hairTrail * 2.4);
  const trailX = -hairTrail * 7.5;
  const trailTilt = hairTrail * 0.28;

  const backGrad = ctx.createLinearGradient(-26, -24, 24, 30);
  backGrad.addColorStop(0, hairHighlight);
  backGrad.addColorStop(0.28, hairColor);
  backGrad.addColorStop(1, '#120C08');
  ctx.fillStyle = backGrad;
  ctx.strokeStyle = 'rgba(24, 16, 10, 0.72)';
  ctx.lineWidth = 1.4;

  switch (hairDesign) {
    case 'girl_pigtails': {
      ctx.beginPath();
      ctx.ellipse(-26 + trailX * 0.6, 7 + bounce, 8.6, 13.4, 0.34 + trailTilt, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(26 + trailX * 0.45, 7 - bounce, 8.6, 13.4, -0.32 + trailTilt * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'girl_ponytail': {
      ctx.beginPath();
      ctx.ellipse(-24 + trailX, -4 + bounce, 10.8, 16.5, 0.5 + trailTilt * 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(-18, -12, 5.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'girl_bob': {
      ctx.beginPath();
      ctx.ellipse(trailX * 0.2, 6, 27.5, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'girl_buns': {
      ctx.beginPath();
      ctx.arc(-21, -18 + bounce * 0.25, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(21, -18 - bounce * 0.25, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'girl_braids': {
      for (const side of [-1, 1]) {
        const bx = side * 22;
        for (let k = 0; k < 3; k++) {
          ctx.fillStyle = backGrad;
          ctx.beginPath();
          ctx.arc(
            bx + side * k * 1.5 + trailX * (k * 0.28),
            6 + k * 7 + bounce * 0.4,
            5.4 - k * 0.6,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.stroke();
        }
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(bx + side * 3.5 + trailX * 0.85, 22 + bounce * 0.4, 3.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'girl_long':
    case 'girl_hime': {
      ctx.beginPath();
      ctx.moveTo(-26, -6);
      ctx.quadraticCurveTo(-30 + trailX * 0.5, 16, -24 + trailX, 30 + bounce * 0.45);
      ctx.lineTo(24 + trailX * 0.7, 30 - bounce * 0.45);
      ctx.quadraticCurveTo(30 + trailX * 0.3, 16, 26, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'girl_half_up': {
      ctx.beginPath();
      ctx.moveTo(-26, -5);
      ctx.quadraticCurveTo(-29 + trailX * 0.5, 16, -23 + trailX, 27 + bounce * 0.4);
      ctx.lineTo(23 + trailX * 0.65, 27 - bounce * 0.4);
      ctx.quadraticCurveTo(29 + trailX * 0.25, 16, 26, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Cute top bun
      ctx.beginPath();
      ctx.arc(0, -25, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Ribbon bow around top bun
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.ellipse(-7, -20, 5.5, 3.4, -0.25, 0, Math.PI * 2);
      ctx.ellipse(7, -20, 5.5, 3.4, 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'girl_twin_loops': {
      for (const side of [-1, 1]) {
        ctx.strokeStyle = hairColor;
        ctx.lineWidth = 6.6;
        ctx.beginPath();
        ctx.ellipse(
          side * 25 + trailX * 0.45,
          8 + side * bounce * 0.4,
          7.6,
          11.6,
          side * -0.25 + trailTilt * 0.5,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(side * 21, -2, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'girl_side_braid': {
      ctx.beginPath();
      ctx.ellipse(0, 5, 26, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.arc(
          20 + k * 1.2 + trailX * (k * 0.22),
          10 + k * 5.5 + bounce * 0.5,
          5.2 - k * 0.5,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'girl_wavy': {
      ctx.beginPath();
      ctx.arc(-23 + trailX * 0.5, 10 + bounce * 0.4, 10.6, 0, Math.PI * 2);
      ctx.arc(-20 + trailX * 0.8, 22 + bounce * 0.4, 9.3, 0, Math.PI * 2);
      ctx.arc(23 + trailX * 0.35, 10 - bounce * 0.4, 10.6, 0, Math.PI * 2);
      ctx.arc(20 + trailX * 0.6, 22 - bounce * 0.4, 9.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'girl_mini_tails': {
      ctx.beginPath();
      ctx.ellipse(-24 + trailX * 0.5, 10 + bounce, 6.8, 9.6, 0.28 + trailTilt, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(24 + trailX * 0.35, 10 - bounce, 6.8, 9.6, -0.28 + trailTilt * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    default:
      break;
  }
}

function drawFrontHair(
  ctx: CanvasRenderingContext2D,
  hairDesign: ChibiHairDesign,
  hairColor: string,
  hairHighlight: string
) {
  // Volumetric 3D hair gradient lit from upper-left sunlight
  const hairGrad = ctx.createLinearGradient(-16, -28, 18, 6);
  hairGrad.addColorStop(0, hairHighlight);
  hairGrad.addColorStop(0.32, hairColor);
  hairGrad.addColorStop(1, '#120C08');

  ctx.fillStyle = hairGrad;
  ctx.strokeStyle = 'rgba(24, 16, 10, 0.72)';
  ctx.lineWidth = 1.4;

  // Wider sculptural crown matching the round Chibi head
  ctx.beginPath();
  ctx.ellipse(0, -4.5, 25.3, 20.6, 0, Math.PI * 0.94, Math.PI * 2.06);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  if (hairDesign === 'boy_spiky') {
    ctx.moveTo(-23, -7);
    ctx.lineTo(-16, -28);
    ctx.lineTo(-7, -18);
    ctx.lineTo(1, -30);
    ctx.lineTo(9, -17);
    ctx.lineTo(18, -27);
    ctx.lineTo(24, -6);
    ctx.quadraticCurveTo(10, -14, 0, -6);
    ctx.quadraticCurveTo(-10, -14, -23, -7);
  } else if (hairDesign === 'boy_curly') {
    ctx.arc(-16, -14, 9.8, 0, Math.PI * 2);
    ctx.arc(-5, -20, 10.8, 0, Math.PI * 2);
    ctx.arc(6, -20, 10.8, 0, Math.PI * 2);
    ctx.arc(17, -13, 9.5, 0, Math.PI * 2);
  } else if (hairDesign === 'boy_tuft') {
    ctx.moveTo(-23, -6);
    ctx.quadraticCurveTo(0, -15, 23, -6);
    ctx.lineTo(23, -14);
    ctx.lineTo(5, -22);
    ctx.quadraticCurveTo(2, -35, -3, -33);
    ctx.quadraticCurveTo(-5, -26, -6, -22);
    ctx.lineTo(-23, -14);
  } else if (hairDesign === 'boy_bowl' || hairDesign === 'girl_hime') {
    ctx.moveTo(-24, -5);
    ctx.quadraticCurveTo(0, -9.5, 24, -5);
    ctx.ellipse(0, -5, 24.8, 19.5, 0, 0, Math.PI, true);
  } else if (hairDesign === 'boy_parted' || hairDesign === 'boy_swept') {
    ctx.moveTo(-24, -5);
    ctx.quadraticCurveTo(-11, -14, -3, -6);
    ctx.quadraticCurveTo(9, -16, 24, -5);
    ctx.ellipse(0, -5, 24.8, 19.5, 0, 0, Math.PI, true);
  } else {
    ctx.moveTo(-24, -5);
    ctx.quadraticCurveTo(-14, -12, -8, -5);
    ctx.quadraticCurveTo(0, -13, 8, -5);
    ctx.quadraticCurveTo(15, -12, 24, -5);
    ctx.ellipse(0, -5, 24.8, 19.5, 0, 0, Math.PI, true);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hime princess cheek sidelocks framing the round face!
  if (hairDesign === 'girl_hime') {
    ctx.fillStyle = hairGrad;
    drawRoundedRect(ctx, -25.5, -5, 5.5, 22, 2.5);
    ctx.fill();
    drawRoundedRect(ctx, 20, -5, 5.5, 22, 2.5);
    ctx.fill();
  }

  // Soft 3D silky angel-ring hair sheen band (realistic glossy specular!)
  ctx.save();
  ctx.globalAlpha = 0.52;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, -5.5, 16.5, Math.PI * 1.18, Math.PI * 1.45);
  ctx.stroke();
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, -5.5, 16.5, Math.PI * 1.54, Math.PI * 1.72);
  ctx.stroke();

  // Subtle individual hair strand lines near forehead bangs for realism
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = '#0F0A06';
  ctx.lineWidth = 1.0;
  for (const sx of [-11, -3, 5, 13]) {
    ctx.beginPath();
    ctx.moveTo(sx * 0.7, -21);
    ctx.quadraticCurveTo(sx * 0.9, -14, sx, -7);
    ctx.stroke();
  }
  ctx.restore();
}

function drawChibiAccessory(ctx: CanvasRenderingContext2D, spec: ChibiVariantSpec) {
  switch (spec.accessory) {
    case 'cap_back': {
      ctx.fillStyle = spec.accentColor;
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, -12, 23, 15, 0, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      drawRoundedRect(ctx, -31, -14, 14, 5, 2.5);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'cap_front': {
      ctx.fillStyle = spec.accentColor;
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, -12, 23.5, 15, 0, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(16, -12, 14, 4.2, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'headband': {
      ctx.strokeStyle = spec.accentColor;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.ellipse(0, -4, 23.2, 18.5, 0, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
      break;
    }
    case 'twin_bows': {
      for (const sx of [-21, 21]) {
        ctx.fillStyle = spec.accentColor;
        ctx.strokeStyle = 'rgba(127, 29, 29, 0.65)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(sx - 4, -7, 4.5, 3, -0.3, 0, Math.PI * 2);
        ctx.ellipse(sx + 4, -7, 4.5, 3, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sx, -7, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'flower_clip': {
      const fx = 15;
      const fy = -11;
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * 4, fy + Math.sin(a) * 4, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = spec.accentColor;
      ctx.beginPath();
      ctx.arc(fx, fy, 2.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'bun_ribbons': {
      ctx.fillStyle = spec.accentColor;
      for (const sx of [-20, 20]) {
        ctx.beginPath();
        ctx.arc(sx, -11, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'cat_ears': {
      ctx.strokeStyle = spec.accentColor;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, -4, 24, 19, 0, Math.PI * 1.14, Math.PI * 1.86);
      ctx.stroke();
      for (const side of [-1, 1]) {
        ctx.fillStyle = spec.accentColor;
        ctx.beginPath();
        ctx.moveTo(side * 9, -23);
        ctx.lineTo(side * 17, -34);
        ctx.lineTo(side * 20, -20);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FECDD3';
        ctx.beginPath();
        ctx.moveTo(side * 11.5, -23);
        ctx.lineTo(side * 16, -30);
        ctx.lineTo(side * 18, -21.5);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'butterfly_clips': {
      for (const side of [-1, 1]) {
        const bx = side * 15;
        const by = -11;
        ctx.fillStyle = spec.accentColor;
        ctx.beginPath();
        ctx.ellipse(bx - 2.5, by - 1.5, 3.6, 2.5, -0.4, 0, Math.PI * 2);
        ctx.ellipse(bx + 2.5, by - 1.5, 3.6, 2.5, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'cherry_clip': {
      ctx.strokeStyle = '#16A34A';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(14, -16);
      ctx.lineTo(11, -10);
      ctx.moveTo(14, -16);
      ctx.lineTo(17, -9);
      ctx.stroke();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(11, -9, 3.2, 0, Math.PI * 2);
      ctx.arc(17, -8.5, 3.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'beret': {
      ctx.fillStyle = spec.accentColor;
      ctx.strokeStyle = 'rgba(146, 64, 14, 0.72)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(-2, -21, 23, 10, -0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, -30);
      ctx.lineTo(-2, -34);
      ctx.stroke();
      break;
    }
    case 'star_pin': {
      drawMiniStar(ctx, 14, -12, 5.2, 2.4, spec.accentColor);
      break;
    }
    default:
      break;
  }
}
