/**
 * Enterprise Animated Background Grid
 * Subtle neural network / circuit pattern with floating particles
 */

import { useEffect, useRef } from 'react';

export function BackgroundGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      color: string;
    }> = [];

    const colors = [
      'rgba(0, 188, 212, 0.6)',    // Cyan/Teal
      'rgba(59, 130, 246, 0.6)',   // Blue
      'rgba(234, 179, 8, 0.4)',    // Yellow/Gold
    ];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const particleCount = Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 15000);
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.offsetWidth,
          y: Math.random() * canvas.offsetHeight,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.2,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const drawGrid = () => {
      const gridSize = 60;
      ctx.strokeStyle = 'rgba(0, 188, 212, 0.08)';
      ctx.lineWidth = 0.5;

      // Vertical lines
      for (let x = 0; x < canvas.offsetWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.offsetHeight);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y < canvas.offsetHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.offsetWidth, y);
        ctx.stroke();
      }

      // Grid intersections with subtle glow
      ctx.fillStyle = 'rgba(0, 188, 212, 0.15)';
      for (let x = 0; x < canvas.offsetWidth; x += gridSize) {
        for (let y = 0; y < canvas.offsetHeight; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const drawParticles = () => {
      particles.forEach((p) => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.offsetWidth;
        if (p.x > canvas.offsetWidth) p.x = 0;
        if (p.y < 0) p.y = canvas.offsetHeight;
        if (p.y > canvas.offsetHeight) p.y = 0;

        // Draw particle with glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Subtle glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      // Draw connections between nearby particles
      ctx.strokeStyle = 'rgba(0, 188, 212, 0.1)';
      ctx.lineWidth = 0.5;
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.globalAlpha = (1 - dist / 100) * 0.3;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        });
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      drawGrid();
      drawParticles();
      animationId = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.8 }}
      />
      
      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1F]/80 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F1F]/40 via-transparent to-[#0A0F1F]/40" />
      
      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-yellow-500/5 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '3s' }} />
    </>
  );
}
