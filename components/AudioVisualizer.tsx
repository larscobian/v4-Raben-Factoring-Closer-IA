
import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  color?: string;
  mode?: 'bars' | 'orb';
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, color = '#10b981', mode = 'bars' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State for physics and animation
  const stateRef = useRef({
    rotationX: 0,
    rotationY: 0,
    time: 0,
    currentAmplitude: 0,
    barHeights: new Array(20).fill(0), 
  });

  const isActiveRef = useRef(isActive);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- ORB CONFIG ---
    const particleCount = 1200; 
    const perspective = 800;
    const baseColor = { r: 255, g: 255, b: 255 }; // White for high-end glass feel
    
    // Orb Initialization using Golden Ratio for uniform distribution
    const particles: { x: number; y: number; z: number; theta: number; phi: number }[] = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    
    if (mode === 'orb') {
      for (let i = 0; i < particleCount; i++) {
        // Uniform distribution (Golden Ratio)
        const theta = (2 * Math.PI * i) / goldenRatio;
        const phi = Math.acos(1 - (2 * (i + 0.5)) / particleCount);
        
        particles.push({
          x: 0, // Calculated in render
          y: 0,
          z: 0,
          theta,
          phi
        });
      }
    }

    let animationId: number;

    const render = () => {
      const state = stateRef.current;
      const active = isActiveRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // Smooth Physics for Amplitude
      const targetAmplitude = active ? 1.4 : 0.2;
      state.currentAmplitude += (targetAmplitude - state.currentAmplitude) * 0.12;
      state.time += 0.012;

      if (mode === 'orb') {
        state.rotationY += 0.004;
        state.rotationX += 0.002;
        const baseRadius = 340; // Enlarged from 240

        particles.forEach((p) => {
          // Distorsión reactiva
          const distortion = (Math.sin(p.theta * 6 + state.time * 3) + Math.cos(p.phi * 5 + state.time * 4)) 
                             * 20 * state.currentAmplitude;
          
          const r = baseRadius + distortion;

          // Spherical to Cartesian
          const px = r * Math.sin(p.phi) * Math.cos(p.theta);
          const py = r * Math.sin(p.phi) * Math.sin(p.theta);
          const pz = r * Math.cos(p.phi);

          // Rotation Y
          const cosY = Math.cos(state.rotationY);
          const sinY = Math.sin(state.rotationY);
          let x1 = px * cosY - pz * sinY;
          let z1 = pz * cosY + px * sinY;

          // Rotation X
          const cosX = Math.cos(state.rotationX);
          const sinX = Math.sin(state.rotationX);
          let y2 = py * cosX - z1 * sinX;
          let z2 = z1 * cosX + py * sinX;

          // Proyección
          const offset = 400;
          const scale = perspective / (perspective + z2 + offset);
          const x2d = centerX + x1 * scale;
          const y2d = centerY + y2 * scale;

          // Visual properties based on depth
          const alpha = Math.max(0.1, (scale - 0.4) * 1.5); 
          const size = scale * (1.5 + state.currentAmplitude * 3.5); // Slightly larger particles too

          // Color variance based on amplitude
          const rCol = Math.floor(255 - state.currentAmplitude * 50);
          const gCol = Math.floor(255);
          const bCol = Math.floor(255 - state.currentAmplitude * 20);

          ctx.fillStyle = `rgba(${rCol}, ${gCol}, ${bCol}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
          ctx.fill();
          
          // Subtle glow for front particles
          if (z2 < -150 && active) {
             ctx.shadowBlur = 10 * state.currentAmplitude;
             ctx.shadowColor = `rgba(16, 185, 129, ${alpha * 0.5})`;
          } else {
             ctx.shadowBlur = 0;
          }
        });

      } else {
        // --- BARS RENDERER ---
        const barCount = 21; 
        const barWidth = 12; 
        const spacing = 8;
        const totalWidth = (barCount * barWidth) + ((barCount - 1) * spacing);
        const startX = centerX - (totalWidth / 2);
        
        for (let i = 0; i < barCount; i++) {
          const relIndex = (i - (barCount - 1) / 2) / ((barCount - 1) / 2);
          const envelope = Math.exp(-2.5 * relIndex * relIndex);
          const t = state.time;
          const noise = Math.sin(t * 4 + i * 0.4) + Math.sin(t * 7.1 + i * 1.1) * 0.5;
          const rawHeight = Math.abs(noise) * 0.6 + 0.2; 
          
          const maxBarHeight = 60; // Reduced from 160
          const minBarHeight = 10;
          let targetH = minBarHeight + (rawHeight * maxBarHeight * state.currentAmplitude * envelope);
          
          if (!active) {
             targetH = minBarHeight + (Math.sin(t * 2 + i) * 4 + 4) * envelope;
          }

          if (!state.barHeights[i]) state.barHeights[i] = minBarHeight;
          state.barHeights[i] += (targetH - state.barHeights[i]) * 0.15;

          const h = state.barHeights[i];
          const x = startX + i * (barWidth + spacing);
          const y = centerY - h / 2;

          ctx.fillStyle = active ? `rgba(255, 255, 255, ${0.4 + envelope * 0.5})` : `rgba(255, 255, 255, 0.2)`;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, barWidth, h, 100);
          } else {
            ctx.rect(x, y, barWidth, h);
          }
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [mode]); 

  const canvasHeight = mode === 'orb' ? 800 : 120; // Reduced from 300

  return (
    <canvas 
      ref={canvasRef} 
      width={1200} 
      height={canvasHeight}
      className="w-full h-full object-contain pointer-events-none"
    />
  );
};

export default AudioVisualizer;
