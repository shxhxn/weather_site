// ============================================================
// AMBIENT WEATHER EFFECTS
// Fullscreen canvas particle rendering matching weather states
// ============================================================

class AmbientEffects {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.weatherType = 'default';
    this.animationId = null;
    this.lightningFlash = 0; // opacity of white flash

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.startLoop();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setWeatherType(type) {
    // Standardize types
    const validTypes = ['clear', 'rain', 'snow', 'clouds', 'thunderstorm', 'default'];
    const normType = validTypes.includes(type) ? type : 'default';

    if (this.weatherType === normType) return;
    this.weatherType = normType;
    this.particles = []; // Clear existing particles

    // Pre-populate particles for specific types
    if (this.weatherType === 'clouds') {
      for (let i = 0; i < 8; i++) {
        this.particles.push(this.createCloudParticle(true));
      }
    }
  }

  createParticle() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    switch (this.weatherType) {
      case 'clear':
        return {
          x: Math.random() * w,
          y: h + 10,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -(Math.random() * 0.8 + 0.3),
          size: Math.random() * 3 + 1,
          alpha: Math.random() * 0.4 + 0.1,
          color: '251, 191, 36' // Golden
        };
      case 'rain':
      case 'thunderstorm':
        return {
          x: Math.random() * w,
          y: -20,
          vx: (Math.random() - 0.2) * 1, // slight angle
          vy: Math.random() * 15 + 12, // fast fall
          len: Math.random() * 20 + 15,
          width: Math.random() * 1.5 + 0.8,
          alpha: Math.random() * 0.25 + 0.15
        };
      case 'snow':
        return {
          x: Math.random() * w,
          y: -10,
          vx: (Math.random() - 0.5) * 0.8,
          vy: Math.random() * 1.5 + 0.5,
          size: Math.random() * 4 + 1.5,
          alpha: Math.random() * 0.5 + 0.2,
          swing: Math.random() * 0.02,
          swingRange: Math.random() * 30 + 10,
          swingOffset: Math.random() * 100
        };
      default:
        return null;
    }
  }

  createCloudParticle(randomizeY = false) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    return {
      x: randomizeY ? Math.random() * w : w + 200,
      y: Math.random() * h * 0.6,
      vx: -(Math.random() * 0.3 + 0.1),
      vy: (Math.random() - 0.5) * 0.05,
      size: Math.random() * 150 + 100,
      alpha: Math.random() * 0.08 + 0.02
    };
  }

  update() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Trigger lightning for thunderstorms
    if (this.weatherType === 'thunderstorm') {
      if (Math.random() < 0.005 && this.lightningFlash <= 0) {
        this.lightningFlash = Math.random() * 0.4 + 0.2;
      }
      if (this.lightningFlash > 0) {
        this.lightningFlash -= 0.03;
      }
    } else {
      this.lightningFlash = 0;
    }

    // Spawn new particles
    if (this.weatherType === 'clear' && this.particles.length < 40) {
      this.particles.push(this.createParticle());
    } else if ((this.weatherType === 'rain' || this.weatherType === 'thunderstorm') && this.particles.length < 150) {
      this.particles.push(this.createParticle());
    } else if (this.weatherType === 'snow' && this.particles.length < 80) {
      this.particles.push(this.createParticle());
    } else if (this.weatherType === 'clouds' && this.particles.length < 10) {
      this.particles.push(this.createCloudParticle());
    }

    // Update and filter particles
    this.particles = this.particles.map(p => {
      if (!p) return null;

      if (this.weatherType === 'clear') {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.001;
        if (p.y < -10 || p.alpha <= 0) return null;
      } else if (this.weatherType === 'rain' || this.weatherType === 'thunderstorm') {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > h + 10) return null;
      } else if (this.weatherType === 'snow') {
        p.x += p.vx + Math.sin(p.y * p.swing + p.swingOffset) * 0.3;
        p.y += p.vy;
        if (p.y > h + 10) return null;
      } else if (this.weatherType === 'clouds') {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -p.size * 2) return null;
      }

      return p;
    }).filter(Boolean);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Draw base ambient sun flare for 'clear'
    if (this.weatherType === 'clear') {
      const gradient = this.ctx.createRadialGradient(w * 0.8, h * 0.15, 0, w * 0.8, h * 0.15, w * 0.6);
      gradient.addColorStop(0, 'rgba(251, 191, 36, 0.06)');
      gradient.addColorStop(0.5, 'rgba(251, 146, 60, 0.02)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, w, h);
    }

    // Draw lightning overlay
    if (this.lightningFlash > 0) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.lightningFlash})`;
      this.ctx.fillRect(0, 0, w, h);
    }

    // Draw particles
    this.particles.forEach(p => {
      this.ctx.beginPath();
      if (this.weatherType === 'clear') {
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
        this.ctx.fill();
      } else if (this.weatherType === 'rain' || this.weatherType === 'thunderstorm') {
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(p.x + p.vx, p.y + p.len);
        this.ctx.strokeStyle = `rgba(226, 232, 240, ${p.alpha})`;
        this.ctx.lineWidth = p.width;
        this.ctx.stroke();
      } else if (this.weatherType === 'snow') {
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        this.ctx.fill();
      } else if (this.weatherType === 'clouds') {
        const cloudGrad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        cloudGrad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
        cloudGrad.addColorStop(0.7, `rgba(241, 245, 249, ${p.alpha * 0.4})`);
        cloudGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = cloudGrad;
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
  }

  startLoop() {
    const loop = () => {
      this.update();
      this.draw();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  stopLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

// Attach to window
window.AmbientEffects = AmbientEffects;
