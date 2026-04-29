class UIManager {
  constructor() {
    this.languageScreen = document.getElementById("language-screen");
    this.languageGrid = document.getElementById("language-grid");
    this.gameScreen = document.getElementById("game-screen");
    this.scoreEl = document.getElementById("score");
    this.languageBadge = document.getElementById("language-badge");
    this.muteButton = document.getElementById("mute-button");
    this.changeLanguageButton = document.getElementById("change-language-button");
    this.tryAgainButton = document.getElementById("try-again-button");
    this.deathLanguageButton = document.getElementById("death-language-button");
    this.deathOverlay = document.getElementById("death-overlay");
    this.finalScore = document.getElementById("final-score");
    this.highScore = document.getElementById("high-score");
    this.roastSubtitle = document.getElementById("roast-subtitle");
    this.startHint = document.getElementById("start-hint");
    this.particleCanvas = document.getElementById("particle-canvas");
    this.onLanguageSelected = null;
    this.onTryAgain = null;
    this.onChangeLanguage = null;
    this.onMute = null;
    this.particles = [];
    this.renderLanguageCards();
    this.bindButtons();
    this.initParticles();
  }

  renderLanguageCards() {
    this.languageGrid.innerHTML = "";
    Object.entries(CONFIG.languages).forEach(([code, language]) => {
      const button = document.createElement("button");
      button.className = "language-card";
      button.type = "button";
      button.innerHTML = `<span class="flag">${language.flag}</span><span class="name">${language.name}</span><span class="tag">${language.tag}</span>`;
      button.addEventListener("click", event => {
        this.addRipple(button, event);
        setTimeout(() => this.onLanguageSelected?.(code), 170);
      });
      this.languageGrid.appendChild(button);
    });
  }

  addRipple(button, event) {
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 560);
  }

  bindButtons() {
    this.tryAgainButton.addEventListener("click", () => this.onTryAgain?.());
    this.changeLanguageButton.addEventListener("click", () => this.onChangeLanguage?.());
    this.deathLanguageButton.addEventListener("click", () => this.onChangeLanguage?.());
    this.muteButton.addEventListener("click", () => {
      const muted = this.onMute?.();
      this.muteButton.textContent = muted ? "🔇" : "🔊";
    });
  }

  showLanguageScreen() {
    this.gameScreen.classList.add("hidden");
    this.languageScreen.classList.remove("hidden");
  }

  showGame(language) {
    this.languageBadge.textContent = CONFIG.languages[language].flag;
    this.languageScreen.classList.add("hidden");
    this.gameScreen.classList.remove("hidden");
  }

  updateScore(score) {
    this.scoreEl.textContent = score;
    this.scoreEl.animate([
      { transform: "translateX(-50%) scale(1.22)", filter: "brightness(1.55)" },
      { transform: "translateX(-50%) scale(1)", filter: "brightness(1)" }
    ], { duration: 180, easing: "cubic-bezier(.2,.9,.2,1.2)" });
  }

  showStartHint() {
    this.startHint.style.opacity = "1";
  }

  hideStartHint() {
    this.startHint.style.opacity = "0";
  }

  showDeathOverlay(score, highScore, roast) {
    this.finalScore.textContent = score;
    this.highScore.textContent = highScore;
    this.roastSubtitle.textContent = roast;
    this.deathOverlay.classList.remove("hidden");
  }

  hideDeathOverlay() {
    this.deathOverlay.classList.add("hidden");
  }

  setRoast(text) {
    if (text) this.roastSubtitle.textContent = text;
  }

  initParticles() {
    const ctx = this.particleCanvas.getContext("2d");
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.particleCanvas.width = Math.floor(innerWidth * dpr);
      this.particleCanvas.height = Math.floor(innerHeight * dpr);
      this.particleCanvas.style.width = `${innerWidth}px`;
      this.particleCanvas.style.height = `${innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.particles = Array.from({ length: Math.min(120, Math.max(55, Math.floor(innerWidth / 10))) }, () => this.createParticle(true));
    };
    window.addEventListener("resize", resize);
    resize();

    const animate = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      this.particles.forEach(p => {
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < -20 || p.x < -30 || p.x > innerWidth + 30) Object.assign(p, this.createParticle(false));
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.color}, ${0.42 + Math.sin((p.x + p.y + performance.now() * 0.002) * 0.03) * 0.2})`;
        ctx.shadowColor = `rgba(${p.color}, .9)`;
        ctx.shadowBlur = 12;
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      requestAnimationFrame(animate);
    };
    animate();
  }

  createParticle(anywhere) {
    return {
      x: Math.random() * innerWidth,
      y: anywhere ? Math.random() * innerHeight : innerHeight + 20,
      radius: Math.random() * 2.4 + 0.6,
      speed: Math.random() * 0.55 + 0.18,
      drift: (Math.random() - 0.5) * 0.35,
      color: Math.random() > 0.5 ? "0,255,204" : "255,0,255"
    };
  }
}
