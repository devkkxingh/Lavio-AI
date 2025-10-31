/**
 * Lavio Onboarding System
 * Displays a 5-screen interactive walkthrough for first-time users
 */

class LavioOnboarding {
  constructor() {
    this.currentScreen = 0;
    this.totalScreens = 5;
    this.overlay = null;
    this.container = null;
  }

  /**
   * Check if onboarding should be shown
   * @returns {Promise<boolean>}
   */
  async shouldShow() {
    try {
      const result = await chrome.storage.local.get("lavioHasSeenOnboarding");
      return !result.lavioHasSeenOnboarding;
    } catch (error) {
      console.error("Lavio Onboarding: Error checking storage:", error);
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   */
  async markAsCompleted() {
    try {
      await chrome.storage.local.set({ lavioHasSeenOnboarding: true });
      console.log("Lavio Onboarding: Marked as completed");
    } catch (error) {
      console.error("Lavio Onboarding: Error saving to storage:", error);
    }
  }

  /**
   * Reset onboarding (for testing or "view again")
   */
  async reset() {
    try {
      await chrome.storage.local.remove("lavioHasSeenOnboarding");
      console.log("Lavio Onboarding: Reset completed");
    } catch (error) {
      console.error("Lavio Onboarding: Error resetting:", error);
    }
  }

  /**
   * Show the onboarding overlay
   */
  show() {
    this.createOverlay();
    this.renderScreen(0);
    this.addStyles();
  }

  /**
   * Create the overlay and container elements
   */
  createOverlay() {
    // Create overlay backdrop
    this.overlay = document.createElement("div");
    this.overlay.className = "lavio-onboarding-overlay";

    // Create container for content
    this.container = document.createElement("div");
    this.container.className = "lavio-onboarding-container";

    this.overlay.appendChild(this.container);
    document.body.appendChild(this.overlay);

    // Animate in
    setTimeout(() => {
      this.overlay.style.opacity = "1";
    }, 10);
  }

  /**
   * Render a specific screen
   * @param {number} index - Screen index (0-4)
   */
  renderScreen(index) {
    this.currentScreen = index;

    const screens = [
      this.renderWelcome.bind(this),
      this.renderVoiceInteraction.bind(this),
      this.renderSmartActions.bind(this),
      this.renderPageTools.bind(this),
      this.renderGetStarted.bind(this),
    ];

    // Clear container
    this.container.innerHTML = "";

    // Render the screen
    const screenContent = screens[index]();
    this.container.appendChild(screenContent);

    // Add navigation
    this.addNavigation();

    // Animate in
    this.container.style.animation = "none";
    setTimeout(() => {
      this.container.style.animation = "lavioOnboardingSlideUp 0.4s ease";
    }, 10);
  }

  /**
   * Screen 1: Welcome
   */
  renderWelcome() {
    const screen = document.createElement("div");
    screen.className = "lavio-onboarding-screen";
    screen.innerHTML = `
      <div class="lavio-onboarding-icon-container">
        <div class="lavio-onboarding-logo">✨</div>
      </div>
      <h1 class="lavio-onboarding-title">Welcome to Lavio!</h1>
      <p class="lavio-onboarding-subtitle">Your AI-Powered Browsing Assistant</p>
      <p class="lavio-onboarding-text">
        Control the web with your voice, get instant answers, and browse hands-free.
      </p>
      <div class="lavio-onboarding-feature-list">
        <div class="lavio-onboarding-feature">
          <span class="lavio-onboarding-feature-icon">🎤</span>
          <span>Voice Control</span>
        </div>
        <div class="lavio-onboarding-feature">
          <span class="lavio-onboarding-feature-icon">⚡</span>
          <span>Smart Actions</span>
        </div>
        <div class="lavio-onboarding-feature">
          <span class="lavio-onboarding-feature-icon">🧠</span>
          <span>AI Intelligence</span>
        </div>
      </div>
    `;
    return screen;
  }

  /**
   * Screen 2: Voice Interaction
   */
  renderVoiceInteraction() {
    const screen = document.createElement("div");
    screen.className = "lavio-onboarding-screen";
    screen.innerHTML = `
      <div class="lavio-onboarding-icon-container">
        <div class="lavio-onboarding-mic-demo">
          <svg class="lavio-onboarding-mic-icon" viewBox="0 0 24 24" width="48" height="48">
            <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path fill="currentColor" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
          <div class="lavio-onboarding-wave-container">
            <div class="lavio-onboarding-wave-bar"></div>
            <div class="lavio-onboarding-wave-bar"></div>
            <div class="lavio-onboarding-wave-bar"></div>
            <div class="lavio-onboarding-wave-bar"></div>
            <div class="lavio-onboarding-wave-bar"></div>
          </div>
        </div>
      </div>
      <h2 class="lavio-onboarding-title">Talk to the Web</h2>
      <p class="lavio-onboarding-text">
        Hold the mic button and speak naturally. Lavio understands questions, commands, and requests.
      </p>
      <div class="lavio-onboarding-examples">
        <div class="lavio-onboarding-example">
          <span class="lavio-onboarding-example-icon">💬</span>
          <span>"What is this page about?"</span>
        </div>
        <div class="lavio-onboarding-example">
          <span class="lavio-onboarding-example-icon">📝</span>
          <span>"Summarize this article"</span>
        </div>
        <div class="lavio-onboarding-example">
          <span class="lavio-onboarding-example-icon">🌍</span>
          <span>"Translate to Spanish"</span>
        </div>
      </div>
      <p class="lavio-onboarding-caption">Get instant AI-powered answers with voice responses</p>
    `;
    return screen;
  }

  /**
   * Screen 3: Smart Actions
   */
  renderSmartActions() {
    const screen = document.createElement("div");
    screen.className = "lavio-onboarding-screen";
    screen.innerHTML = `
      <div class="lavio-onboarding-icon-container">
        <div class="lavio-onboarding-action-demo">
          <div class="lavio-onboarding-demo-button">
            <span>Search</span>
          </div>
          <div class="lavio-onboarding-cursor"></div>
        </div>
      </div>
      <h2 class="lavio-onboarding-title">Control Any Website</h2>
      <p class="lavio-onboarding-text">
        Browse hands-free! Lavio can interact with any element on the page.
      </p>
      <div class="lavio-onboarding-examples">
        <div class="lavio-onboarding-example">
          <span class="lavio-onboarding-example-icon">👆</span>
          <span>"Click on the search bar"</span>
        </div>
        <div class="lavio-onboarding-example">
          <span class="lavio-onboarding-example-icon">⌨️</span>
          <span>"Type hello world"</span>
        </div>
        <div class="lavio-onboarding-example">
          <span class="lavio-onboarding-example-icon">📜</span>
          <span>"Scroll down"</span>
        </div>
        <div class="lavio-onboarding-example">
          <span class="lavio-onboarding-example-icon">◀️</span>
          <span>"Go back"</span>
        </div>
      </div>
      <p class="lavio-onboarding-caption">Hands-free browsing made easy!</p>
    `;
    return screen;
  }

  /**
   * Screen 4: Page Tools
   */
  renderPageTools() {
    const screen = document.createElement("div");
    screen.className = "lavio-onboarding-screen";
    screen.innerHTML = `
      <div class="lavio-onboarding-icon-container">
        <div class="lavio-onboarding-tools-grid">
          <div class="lavio-onboarding-tool-icon">📝</div>
          <div class="lavio-onboarding-tool-icon">🌍</div>
          <div class="lavio-onboarding-tool-icon">🔍</div>
          <div class="lavio-onboarding-tool-icon">🎨</div>
        </div>
      </div>
      <h2 class="lavio-onboarding-title">Powerful Page Tools</h2>
      <p class="lavio-onboarding-text">
        Everything you need to enhance your browsing experience.
      </p>
      <div class="lavio-onboarding-tool-list">
        <div class="lavio-onboarding-tool-item">
          <span class="lavio-onboarding-tool-emoji">📝</span>
          <div>
            <strong>Summarize</strong>
            <p>Get key points from any page instantly</p>
          </div>
        </div>
        <div class="lavio-onboarding-tool-item">
          <span class="lavio-onboarding-tool-emoji">🌍</span>
          <div>
            <strong>Translate</strong>
            <p>Convert text to 30+ languages</p>
          </div>
        </div>
        <div class="lavio-onboarding-tool-item">
          <span class="lavio-onboarding-tool-emoji">🔍</span>
          <div>
            <strong>Analyze</strong>
            <p>Understand any page with AI</p>
          </div>
        </div>
        <div class="lavio-onboarding-tool-item">
          <span class="lavio-onboarding-tool-emoji">🎨</span>
          <div>
            <strong>Customize</strong>
            <p>Change page style <em>(Coming Soon)</em></p>
          </div>
        </div>
      </div>
    `;
    return screen;
  }

  /**
   * Screen 5: Get Started
   */
  renderGetStarted() {
    const screen = document.createElement("div");
    screen.className = "lavio-onboarding-screen";
    screen.innerHTML = `
      <div class="lavio-onboarding-icon-container">
        <div class="lavio-onboarding-success-icon">🚀</div>
      </div>
      <h2 class="lavio-onboarding-title">Ready to Start!</h2>
      <p class="lavio-onboarding-text">
        Try your first command to experience the magic of voice-controlled browsing.
      </p>
      <div class="lavio-onboarding-first-command">
        <div class="lavio-onboarding-command-box">
          <p><strong>Hold 🎤 and say:</strong></p>
          <p class="lavio-onboarding-command-text">"What can you do?"</p>
        </div>
      </div>
      <div class="lavio-onboarding-tips">
        <p><strong>Pro Tips:</strong></p>
        <ul>
          <li>Hold the button while speaking</li>
          <li>Release when you're done</li>
          <li>Be specific with your commands</li>
          <li>Try asking about the current page</li>
        </ul>
      </div>
    `;
    return screen;
  }

  /**
   * Add navigation buttons and progress indicators
   */
  addNavigation() {
    const nav = document.createElement("div");
    nav.className = "lavio-onboarding-nav";

    // Progress dots
    const progress = document.createElement("div");
    progress.className = "lavio-onboarding-progress";
    for (let i = 0; i < this.totalScreens; i++) {
      const dot = document.createElement("div");
      dot.className = "lavio-onboarding-dot";
      if (i === this.currentScreen) {
        dot.classList.add("active");
      }
      progress.appendChild(dot);
    }

    // Navigation buttons container
    const buttons = document.createElement("div");
    buttons.className = "lavio-onboarding-buttons";

    // Back button (not shown on first screen)
    if (this.currentScreen > 0) {
      const backBtn = document.createElement("button");
      backBtn.className =
        "lavio-onboarding-button lavio-onboarding-button-secondary";
      backBtn.textContent = "← Back";
      backBtn.onclick = () => this.back();
      buttons.appendChild(backBtn);
    } else {
      // Skip button on first screen
      const skipBtn = document.createElement("button");
      skipBtn.className =
        "lavio-onboarding-button lavio-onboarding-button-secondary";
      skipBtn.textContent = "Skip";
      skipBtn.onclick = () => this.skip();
      buttons.appendChild(skipBtn);
    }

    // Next/Complete button
    const nextBtn = document.createElement("button");
    nextBtn.className =
      "lavio-onboarding-button lavio-onboarding-button-primary";
    if (this.currentScreen === this.totalScreens - 1) {
      nextBtn.textContent = "Let's Go! 🚀";
      nextBtn.classList.add("lavio-onboarding-button-pulse");
    } else {
      nextBtn.textContent = "Next →";
    }
    nextBtn.onclick = () => this.next();
    buttons.appendChild(nextBtn);

    nav.appendChild(progress);
    nav.appendChild(buttons);
    this.container.appendChild(nav);
  }

  /**
   * Navigate to next screen
   */
  next() {
    if (this.currentScreen < this.totalScreens - 1) {
      this.renderScreen(this.currentScreen + 1);
    } else {
      this.complete();
    }
  }

  /**
   * Navigate to previous screen
   */
  back() {
    if (this.currentScreen > 0) {
      this.renderScreen(this.currentScreen - 1);
    }
  }

  /**
   * Skip onboarding
   */
  skip() {
    if (confirm("Skip the tour? You can view it again from settings.")) {
      this.complete();
    }
  }

  /**
   * Complete onboarding
   */
  complete() {
    this.markAsCompleted();

    // Fade out animation
    this.overlay.style.opacity = "0";
    setTimeout(() => {
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.remove();
      }
      console.log("Lavio Onboarding: Completed and removed");
    }, 300);
  }

  /**
   * Add CSS styles for onboarding
   */
  addStyles() {
    if (document.getElementById("lavio-onboarding-styles")) {
      return; // Already added
    }

    const style = document.createElement("style");
    style.id = "lavio-onboarding-styles";
    style.textContent = `
      /* Overlay */
      .lavio-onboarding-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(5px);
        z-index: 2147483645;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      /* Container */
      .lavio-onboarding-container {
        background: white;
        border-radius: 20px;
        padding: 40px;
        max-width: 550px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        position: relative;
      }

      /* Screen */
      .lavio-onboarding-screen {
        text-align: center;
        margin-bottom: 30px;
      }

      /* Icon Container */
      .lavio-onboarding-icon-container {
        margin-bottom: 24px;
      }

      .lavio-onboarding-logo {
        font-size: 72px;
        animation: lavioOnboardingBounce 2s infinite;
      }

      /* Title */
      .lavio-onboarding-title {
        font-size: 28px;
        font-weight: bold;
        color: #333;
        margin: 0 0 12px 0;
      }

      /* Subtitle */
      .lavio-onboarding-subtitle {
        font-size: 18px;
        color: #9C88FF;
        font-weight: 600;
        margin: 0 0 20px 0;
      }

      /* Text */
      .lavio-onboarding-text {
        font-size: 16px;
        color: #666;
        line-height: 1.6;
        margin: 0 0 24px 0;
      }

      /* Caption */
      .lavio-onboarding-caption {
        font-size: 14px;
        color: #999;
        font-style: italic;
        margin-top: 16px;
      }

      /* Feature List */
      .lavio-onboarding-feature-list {
        display: flex;
        justify-content: center;
        gap: 24px;
        margin-top: 32px;
      }

      .lavio-onboarding-feature {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #666;
      }

      .lavio-onboarding-feature-icon {
        font-size: 32px;
      }

      /* Mic Demo */
      .lavio-onboarding-mic-demo {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      .lavio-onboarding-mic-icon {
        color: #9C88FF;
        animation: lavioOnboardingPulse 2s infinite;
      }

      .lavio-onboarding-wave-container {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        height: 40px;
      }

      .lavio-onboarding-wave-bar {
        width: 4px;
        background: #9C88FF;
        border-radius: 2px;
        animation: lavioOnboardingWave 1s infinite ease-in-out;
      }

      .lavio-onboarding-wave-bar:nth-child(1) { animation-delay: 0s; }
      .lavio-onboarding-wave-bar:nth-child(2) { animation-delay: 0.1s; }
      .lavio-onboarding-wave-bar:nth-child(3) { animation-delay: 0.2s; }
      .lavio-onboarding-wave-bar:nth-child(4) { animation-delay: 0.3s; }
      .lavio-onboarding-wave-bar:nth-child(5) { animation-delay: 0.4s; }

      /* Action Demo */
      .lavio-onboarding-action-demo {
        position: relative;
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .lavio-onboarding-demo-button {
        padding: 12px 24px;
        background: #9C88FF;
        color: white;
        border-radius: 8px;
        font-weight: 600;
        animation: lavioOnboardingHighlight 2s infinite;
      }

      .lavio-onboarding-cursor {
        position: absolute;
        width: 20px;
        height: 20px;
        border: 2px solid #333;
        border-radius: 50%;
        top: 30px;
        right: 40%;
        animation: lavioOnboardingCursorMove 2s infinite;
      }

      /* Tools Grid */
      .lavio-onboarding-tools-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        max-width: 300px;
        margin: 0 auto;
      }

      .lavio-onboarding-tool-icon {
        font-size: 36px;
        animation: lavioOnboardingFadeIn 0.5s ease forwards;
        opacity: 0;
      }

      .lavio-onboarding-tool-icon:nth-child(1) { animation-delay: 0.1s; }
      .lavio-onboarding-tool-icon:nth-child(2) { animation-delay: 0.2s; }
      .lavio-onboarding-tool-icon:nth-child(3) { animation-delay: 0.3s; }
      .lavio-onboarding-tool-icon:nth-child(4) { animation-delay: 0.4s; }

      /* Success Icon */
      .lavio-onboarding-success-icon {
        font-size: 64px;
        animation: lavioOnboardingBounce 1s infinite;
      }

      /* Examples */
      .lavio-onboarding-examples {
        background: #f8f8f8;
        border-radius: 12px;
        padding: 20px;
        margin: 20px 0;
        text-align: left;
      }

      .lavio-onboarding-example {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        margin: 8px 0;
        background: white;
        border-radius: 8px;
        transition: transform 0.2s;
        font-size: 15px;
        color: #333;
      }

      .lavio-onboarding-example:hover {
        transform: translateX(5px);
      }

      .lavio-onboarding-example-icon {
        font-size: 20px;
        flex-shrink: 0;
      }

      /* Tool List */
      .lavio-onboarding-tool-list {
        text-align: left;
        margin-top: 24px;
      }

      .lavio-onboarding-tool-item {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 16px;
        margin: 12px 0;
        background: #f8f8f8;
        border-radius: 12px;
      }

      .lavio-onboarding-tool-emoji {
        font-size: 28px;
        flex-shrink: 0;
      }

      .lavio-onboarding-tool-item strong {
        font-size: 16px;
        color: #333;
        display: block;
        margin-bottom: 4px;
      }

      .lavio-onboarding-tool-item p {
        font-size: 14px;
        color: #666;
        margin: 0;
      }

      .lavio-onboarding-tool-item em {
        color: #999;
        font-size: 13px;
      }

      /* First Command */
      .lavio-onboarding-first-command {
        margin: 24px 0;
      }

      .lavio-onboarding-command-box {
        background: linear-gradient(135deg, #9C88FF 0%, #8b75ff 100%);
        color: white;
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(156, 136, 255, 0.3);
      }

      .lavio-onboarding-command-box p {
        margin: 0 0 8px 0;
      }

      .lavio-onboarding-command-text {
        font-size: 20px;
        font-weight: bold;
        margin: 12px 0 0 0 !important;
      }

      /* Tips */
      .lavio-onboarding-tips {
        text-align: left;
        background: #f8f8f8;
        padding: 20px;
        border-radius: 12px;
        margin-top: 24px;
      }

      .lavio-onboarding-tips strong {
        color: #333;
        font-size: 15px;
      }

      .lavio-onboarding-tips ul {
        margin: 12px 0 0 0;
        padding-left: 24px;
      }

      .lavio-onboarding-tips li {
        color: #666;
        font-size: 14px;
        margin: 8px 0;
        line-height: 1.5;
      }

      /* Navigation */
      .lavio-onboarding-nav {
        display: flex;
        flex-direction: column;
        gap: 20px;
        margin-top: 32px;
      }

      .lavio-onboarding-progress {
        display: flex;
        justify-content: center;
        gap: 8px;
      }

      .lavio-onboarding-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ddd;
        transition: all 0.3s ease;
      }

      .lavio-onboarding-dot.active {
        background: #9C88FF;
        width: 24px;
        border-radius: 4px;
      }

      .lavio-onboarding-buttons {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }

      .lavio-onboarding-button {
        flex: 1;
        padding: 14px 28px;
        border: none;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .lavio-onboarding-button-primary {
        background: #9C88FF;
        color: white;
      }

      .lavio-onboarding-button-primary:hover {
        background: #8b75ff;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(156, 136, 255, 0.4);
      }

      .lavio-onboarding-button-secondary {
        background: transparent;
        color: #666;
        border: 2px solid #ddd;
      }

      .lavio-onboarding-button-secondary:hover {
        border-color: #9C88FF;
        color: #9C88FF;
      }

      .lavio-onboarding-button-pulse {
        animation: lavioOnboardingButtonPulse 1.5s infinite;
      }

      /* Animations */
      @keyframes lavioOnboardingSlideUp {
        from {
          opacity: 0;
          transform: translateY(30px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes lavioOnboardingBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }

      @keyframes lavioOnboardingPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
      }

      @keyframes lavioOnboardingWave {
        0%, 100% { height: 10px; }
        50% { height: 30px; }
      }

      @keyframes lavioOnboardingHighlight {
        0%, 100% { box-shadow: 0 0 0 0 rgba(156, 136, 255, 0.4); }
        50% { box-shadow: 0 0 0 10px rgba(156, 136, 255, 0); }
      }

      @keyframes lavioOnboardingCursorMove {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(-20px, 10px); }
      }

      @keyframes lavioOnboardingFadeIn {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
      }

      @keyframes lavioOnboardingButtonPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .lavio-onboarding-container {
          padding: 30px 24px;
          max-width: 95%;
        }

        .lavio-onboarding-title {
          font-size: 24px;
        }

        .lavio-onboarding-text {
          font-size: 15px;
        }

        .lavio-onboarding-feature-list {
          gap: 16px;
        }

        .lavio-onboarding-buttons {
          flex-direction: column;
        }

        .lavio-onboarding-button {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Export for use in content.js
if (typeof window !== "undefined") {
  window.LavioOnboarding = LavioOnboarding;
}
