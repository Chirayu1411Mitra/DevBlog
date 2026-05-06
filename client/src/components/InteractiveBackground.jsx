import React, { useEffect, useRef } from 'react';

const InteractiveBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    let particles = [];
    // Start way off-screen so they don't jump to 0,0
    const mouse = { x: -10000, y: -10000, radius: 150 };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    const handleMouseMove = (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);

    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.size = Math.random() * 1.5 + 1;
        this.density = (Math.random() * 25) + 5;
      }

      draw() {
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distanceSq = dx * dx + dy * dy;
        let mouseRadiusSq = mouse.radius * mouse.radius;
        
        if (distanceSq < mouseRadiusSq) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }

      update() {
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distanceSq = dx * dx + dy * dy;
        let mouseRadiusSq = mouse.radius * mouse.radius;

        if (distanceSq < mouseRadiusSq) {
          let distance = Math.sqrt(distanceSq);
          let force = (mouse.radius - distance) / mouse.radius;
          let directionX = (dx / distance) * force * this.density;
          let directionY = (dy / distance) * force * this.density;
          
          // Repel (the "lift up" feel as you move cursor through them)
          this.x -= directionX;
          this.y -= directionY;
        } else {
          if (this.x !== this.baseX) {
            this.x -= (this.x - this.baseX) * 0.1;
          }
          if (this.y !== this.baseY) {
            this.y -= (this.y - this.baseY) * 0.1;
          }
        }
      }
    }

    const init = () => {
      particles = [];
      const densityValue = 4500;
      const numberOfParticles = Math.min((canvas.width * canvas.height) / densityValue, 500); 
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle(Math.random() * canvas.width, Math.random() * canvas.height));
      }
    };

    const animate = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        background: '#000000'
      }}
    />
  );
};

export default InteractiveBackground;
