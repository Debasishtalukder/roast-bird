class Game {
  constructor(canvas, ui, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;
    this.audio = audio;
    this.width = CONFIG.canvasWidth;
    this.height = CONFIG.canvasHeight;
    this.language = "en";
    this.state = "WAITING";
    this.highScore = Number(localStorage.getItem("roastBirdHighScore") || 0);
    this.lastFrame = 0;
    this.animationId = null;
    this.reset();
  }

  setLanguage(language) {
    this.language = language;
  }

  randomLine(key) {
    const pool = ROAST_SCRIPTS[this.language][key];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  speakKey(key) {
    const line = this.randomLine(key);
    this.lastRoast = line;
    this.ui.setRoast(line);
    this.audio.speak(line, this.language);
    return line;
  }

  reset() {
    this.state = "WAITING";
    this.score = 0;
    this.speed = 2.5;
    this.gap = 160;
    this.pipeWidth = 70;
    this.pipeTimer = 0;
    this.pipeInterval = 1450;
    this.bgOffset = 0;
    this.groundOffset = 0;
    this.lastEventAt = performance.now();
    this.lastIdleAt = performance.now();
    this.milestones = new Set();
    this.screenShakeFrames = 0;
    this.particles = [];
    this.pipes = [];
    this.lastRoast = "Don't embarrass yourself.";
    this.bird = {
      x: 128,
      y: 286,
      radius: 18,
      velocity: 0,
      gravity: 0.5,
      jumpForce: -9,
      rotation: 0,
      wing: 0,
      squish: 1,
      blink: 0,
      dead: false
    };
    this.spawnPipe(true);
    this.ui.updateScore(0);
    this.ui.hideDeathOverlay();
    this.ui.showStartHint();
  }

  startLoop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.lastFrame = performance.now();
    const loop = timestamp => {
      const dt = Math.min((timestamp - this.lastFrame) / 16.6667, 2.25);
      this.lastFrame = timestamp;
      this.update(dt);
      this.draw();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  handleInput() {
    if (this.state === "DEAD") return;
    this.audio.startMusic();
    if (this.state === "WAITING") {
      this.state = "PLAYING";
      this.ui.hideStartHint();
      this.pipes = [];
      this.pipeTimer = 640;
      this.lastEventAt = performance.now();
    }
    this.flap();
  }

  flap() {
    this.bird.velocity = this.bird.jumpForce;
    this.bird.wing = 1;
    this.bird.squish = 1.25;
  }

  spawnPipe(initial = false) {
    const margin = 80;
    const gapY = initial ? 312 : margin + Math.random() * (this.height - 160 - this.gap - margin);
    this.pipes.push({
      x: initial ? this.width + 220 : this.width + 36,
      width: this.pipeWidth,
      gap: this.gap,
      gapY,
      passed: false,
      tilt: (Math.random() - 0.5) * 0.1,
      pulse: Math.random() * Math.PI * 2
    });
  }

  update(dt) {
    this.bgOffset += this.speed * 0.2 * dt;
    this.groundOffset += this.speed * 1.1 * dt;
    this.bird.blink += dt;
    this.bird.wing = Math.max(0, this.bird.wing - 0.09 * dt);
    this.bird.squish += (1 - this.bird.squish) * 0.16 * dt;
    this.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.25 * dt;
      p.life -= 0.03 * dt;
    });
    this.particles = this.particles.filter(p => p.life > 0);

    if (this.state === "WAITING") {
      this.bird.y = 286 + Math.sin(performance.now() * 0.005) * 12;
      this.bird.rotation = Math.sin(performance.now() * 0.004) * 0.08;
      return;
    }

    if (this.state !== "PLAYING") return;

    this.bird.velocity += this.bird.gravity * dt;
    this.bird.velocity = Math.min(this.bird.velocity, 12);
    this.bird.y += this.bird.velocity * dt;
    this.bird.rotation = clamp(this.bird.velocity * 0.075, -0.65, 1.15);

    this.pipeTimer += 16.6667 * dt;
    if (this.pipeTimer > this.pipeInterval) {
      this.spawnPipe();
      this.pipeTimer = 0;
    }

    this.pipes.forEach(pipe => {
      pipe.x -= this.speed * dt;
      pipe.pulse += 0.06 * dt;
      if (!pipe.passed && pipe.x + pipe.width < this.bird.x - this.bird.radius) {
        pipe.passed = true;
        this.addScore(pipe);
      }
    });
    this.pipes = this.pipes.filter(pipe => pipe.x + pipe.width > -90);

    if (this.checkCollision()) this.die();

    const time = performance.now();
    if (time - this.lastEventAt > 5000 && time - this.lastIdleAt > 5000) {
      this.lastIdleAt = time;
      this.speakKey("IDLE");
    }
  }

  addScore(pipe) {
    this.score += 1;
    this.ui.updateScore(this.score);
    this.lastEventAt = performance.now();
    this.updateDifficulty();

    const topMargin = this.bird.y - (pipe.gapY - pipe.gap / 2) - this.bird.radius;
    const bottomMargin = (pipe.gapY + pipe.gap / 2) - this.bird.y - this.bird.radius;
    if (Math.min(topMargin, bottomMargin) < 20) {
      this.speakKey("NEAR_MISS");
      return;
    }

    const milestoneKey = `MILESTONE_${this.score}`;
    if (ROAST_SCRIPTS[this.language][milestoneKey] && !this.milestones.has(this.score)) {
      this.milestones.add(this.score);
      this.speakKey(milestoneKey);
    }
  }

  updateDifficulty() {
    const level = Math.floor(this.score / 5);
    this.speed = 2.5 + level * 0.3;
    this.gap = Math.max(118, 160 - level * 7);
    this.pipeInterval = Math.max(1020, 1450 - level * 55);
  }

  checkCollision() {
    const b = this.bird;
    if (b.y - b.radius < 0 || b.y + b.radius > this.height - 58) return true;
    return this.pipes.some(pipe => {
      const overlapX = b.x + b.radius > pipe.x && b.x - b.radius < pipe.x + pipe.width;
      if (!overlapX) return false;
      const gapTop = pipe.gapY - pipe.gap / 2;
      const gapBottom = pipe.gapY + pipe.gap / 2;
      return b.y - b.radius < gapTop || b.y + b.radius > gapBottom;
    });
  }

  die() {
    if (this.state === "DEAD") return;
    this.state = "DEAD";
    this.bird.dead = true;
    this.screenShakeFrames = 5;
    this.highScore = Math.max(this.highScore, this.score);
    localStorage.setItem("roastBirdHighScore", String(this.highScore));
    this.createExplosion();

    const key = this.score <= 3 ? "DEATH_LOW" : this.score <= 9 ? "DEATH_MID" : "DEATH_HIGH";
    const line = this.speakKey(key);
    this.ui.showDeathOverlay(this.score, this.highScore, line);
  }

  createExplosion() {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x: this.bird.x,
        y: this.bird.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4,
        color: Math.random() > 0.5 ? "#ffff00" : "#ff00ff",
        life: 1
      });
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    if (this.screenShakeFrames > 0) {
      this.screenShakeFrames -= 1;
      ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    }
    ctx.clearRect(-20, -20, this.width + 40, this.height + 40);
    this.drawBackground(ctx);
    this.drawPipes(ctx);
    this.drawParticles(ctx);
    this.drawBird(ctx);
    this.drawGround(ctx);
    ctx.restore();
  }

  drawBackground(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#070826");
    gradient.addColorStop(0.52, "#15104a");
    gradient.addColorStop(1, "#070816");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    for (let i = 0; i < 60; i++) {
      const x = (i * 81 - this.bgOffset * 0.25) % (this.width + 90) - 45;
      const y = 34 + ((i * 47) % 220);
      ctx.fillStyle = i % 2 ? "rgba(0,255,204,.65)" : "rgba(255,0,255,.55)";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, (i % 3) + 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    this.drawCity(ctx, 430, 0.35, "rgba(22,18,78,.88)", "rgba(0,255,204,.17)");
    this.drawCity(ctx, 492, 0.7, "rgba(13,11,46,.97)", "rgba(255,0,255,.16)");
  }

  drawCity(ctx, baseY, factor, fill, glow) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 16;
    const offset = (this.bgOffset * factor) % 148;
    for (let i = -1; i < 7; i++) {
      const x = i * 148 - offset;
      const w = 58 + (i % 3) * 18;
      const h = 70 + ((i * 31 + 90) % 108);
      ctx.fillRect(x, baseY - h, w, h);
      ctx.fillRect(x + w + 13, baseY - h * 0.72, w * 0.7, h * 0.72);
      ctx.fillStyle = "rgba(0,255,204,.32)";
      for (let wy = baseY - h + 14; wy < baseY - 12; wy += 22) {
        for (let wx = x + 10; wx < x + w - 8; wx += 18) {
          if ((Math.floor(wx + wy) + i) % 3 !== 0) ctx.fillRect(wx, wy, 5, 8);
        }
      }
      ctx.fillStyle = fill;
    }
    ctx.restore();
  }

  drawPipes(ctx) {
    this.pipes.forEach(pipe => {
      const glow = 16 + Math.sin(pipe.pulse) * 5;
      this.drawPipe(ctx, pipe, 0, pipe.gapY - pipe.gap / 2, true, glow);
      this.drawPipe(ctx, pipe, pipe.gapY + pipe.gap / 2, this.height - 58, false, glow);
    });
  }

  drawPipe(ctx, pipe, y1, y2, top, glow) {
    const height = y2 - y1;
    if (height <= 0) return;
    ctx.save();
    ctx.translate(pipe.x + pipe.width / 2, y1 + height / 2);
    ctx.rotate(pipe.tilt);
    const gradient = ctx.createLinearGradient(-pipe.width / 2, 0, pipe.width / 2, 0);
    gradient.addColorStop(0, "#00d47a");
    gradient.addColorStop(0.48, "#b7ff40");
    gradient.addColorStop(1, "#00a35b");
    ctx.fillStyle = gradient;
    ctx.shadowColor = "rgba(0,255,204,.85)";
    ctx.shadowBlur = glow;
    roundRect(ctx, -pipe.width / 2, -height / 2, pipe.width, height, 14);
    ctx.fill();
    const capH = 25;
    ctx.fillStyle = "#ddff45";
    roundRect(ctx, -pipe.width / 2 - 8, top ? height / 2 - capH : -height / 2, pipe.width + 16, capH, 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,.18)";
    ctx.fillRect(-pipe.width / 2 + 11, -height / 2 + 12, 7, height - 24);
    ctx.restore();
  }

  drawBird(ctx) {
    const b = this.bird;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rotation);
    ctx.scale(1 + (b.squish - 1) * 0.35, 1 - (b.squish - 1) * 0.22);
    ctx.shadowColor = "rgba(255,255,0,.8)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#ffff00";
    ctx.beginPath();
    ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.rotate(-0.45 - b.wing * 0.82 + Math.sin(performance.now() * 0.03) * 0.1);
    ctx.fillStyle = "#ff9d2e";
    ctx.beginPath();
    ctx.ellipse(-8, 5, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#ff8d37";
    ctx.beginPath();
    ctx.moveTo(15, -2);
    ctx.lineTo(29, 4);
    ctx.lineTo(15, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(8, -8, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#10131f";
    ctx.fillStyle = "#10131f";
    if (b.dead) {
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(4, -12); ctx.lineTo(12, -4);
      ctx.moveTo(12, -12); ctx.lineTo(4, -4);
      ctx.stroke();
    } else if (b.blink % 180 > 170) {
      ctx.fillRect(2, -8, 12, 2.5);
    } else {
      ctx.beginPath();
      ctx.arc(10 + clamp(b.velocity * 0.18, -2, 2), -8, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(2, -16);
      ctx.lineTo(13, -18);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawParticles(ctx) {
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawGround(ctx) {
    const y = this.height - 58;
    const gradient = ctx.createLinearGradient(0, y, 0, this.height);
    gradient.addColorStop(0, "#23104f");
    gradient.addColorStop(1, "#080519");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, this.width, 58);
    ctx.strokeStyle = "rgba(0,255,204,.85)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(0,255,204,.85)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, y + 2);
    ctx.lineTo(this.width, y + 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,0,255,.42)";
    for (let x = -80 - (this.groundOffset % 80); x < this.width + 80; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, this.height);
      ctx.lineTo(x + 38, y + 4);
      ctx.lineTo(x + 52, y + 4);
      ctx.lineTo(x + 14, this.height);
      ctx.fill();
    }
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
