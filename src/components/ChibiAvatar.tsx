import React, { useEffect, useRef, useState } from 'react';
import { drawChibiStudent } from '../game/chibiRenderer';
import {
  getCachedChibi3DSprite,
  loadChibi3DSprites,
  subscribeChibi3DSprites,
} from '../game/chibiSpriteProcessor';
import { RunnerState, StudentProfile } from '../types/game';

interface ChibiAvatarProps {
  profile: StudentProfile;
  size?: number;
  state?: RunnerState;
  className?: string;
}

export const ChibiAvatar: React.FC<ChibiAvatarProps> = ({
  profile,
  size = 56,
  state = 'idle',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [spriteTick, setSpriteTick] = useState(0);

  useEffect(() => {
    loadChibi3DSprites();
    return subscribeChibi3DSprites(() => setSpriteTick((t) => t + 1));
  }, []);

  const sprite = getCachedChibi3DSprite(profile.chibiVariant);

  useEffect(() => {
    if (sprite) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const drawScale = size / 112;
    drawChibiStudent(ctx, {
      profile,
      x: size / 2 + 2 * drawScale,
      y: size * 0.91,
      state,
      animTime: 0,
      globalTime: 0,
      scale: drawScale,
      showShadow: false,
    });

    ctx.restore();
  }, [profile, size, state, sprite, spriteTick]);

  if (sprite) {
    return (
      <img
        src={sprite.dataUrl}
        alt={profile.name}
        style={{ width: size, height: size }}
        className={`block shrink-0 object-contain select-none ${className}`}
        draggable={false}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={`block shrink-0 ${className}`}
      aria-hidden="true"
    />
  );
};
