"use client";

import { useEffect, useRef } from "react";

import { useNeedtReducedMotion } from "@/components/providers/MotionRuntime";

import { shouldAnimateSpaceParticles } from "@/lib/space-particles";

const PARTICLE_COUNT = 36;

type Particle = {
  drift: number;
  phase: number;
  radius: number;
  speed: number;
  x: number;
  y: number;
};

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
    drift: 4 + ((index * 13) % 11),
    phase: (index * 1.73) % (Math.PI * 2),
    radius: 0.7 + ((index * 7) % 5) * 0.14,
    speed: 0.00012 + ((index * 17) % 7) * 0.000018,
    x: ((index * 37) % 97) / 100,
    y: ((index * 53) % 89) / 100,
  }));
}

export function SpaceParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useNeedtReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const particles = createParticles();
    let animationFrame: number | null = null;
    let width = 0;
    let height = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const clear = () => context.clearRect(0, 0, width, height);
    const stop = () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
      clear();
    };
    const draw = (timestamp: number) => {
      if (
        !shouldAnimateSpaceParticles({
          documentHidden: document.hidden,
          reducedMotion,
        })
      ) {
        stop();
        return;
      }

      clear();
      context.fillStyle = getComputedStyle(canvas).color;

      for (const particle of particles) {
        const offset = Math.sin(timestamp * particle.speed + particle.phase);
        context.globalAlpha = 0.14 + ((offset + 1) / 2) * 0.2;
        context.beginPath();
        context.arc(
          particle.x * width + offset * particle.drift,
          particle.y * height + Math.cos(timestamp * particle.speed + particle.phase) * particle.drift,
          particle.radius,
          0,
          Math.PI * 2
        );
        context.fill();
      }

      context.globalAlpha = 1;
      animationFrame = window.requestAnimationFrame(draw);
    };
    const start = () => {
      if (
        shouldAnimateSpaceParticles({
          documentHidden: document.hidden,
          reducedMotion,
        }) &&
        animationFrame === null
      ) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    start();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observer.disconnect();
      stop();
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full text-[var(--space-particle)]"
      data-testid="space-particles"
    />
  );
}
