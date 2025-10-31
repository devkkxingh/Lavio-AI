// Lavio AI Assistant - Content Script
// Handles page interaction, context extraction, and UI injection

// Define LavioContent at top-level to avoid block scoping issues

class LavioContent {
  constructor() {
    this.isInitialized = false;
    this.voiceButton = null;
    this.voicePanel = null;
    this.voiceRecorder = null;
    this.isRecording = false;
    this.currentConversation = [];
    this.messageListenersSetup = false;
    this.selectedTextForTranslation = ""; // Store selected text for translation

    // Text-to-speech functionality
    this.speechSynthesis = window.speechSynthesis;
    this.isSpeaking = false;

    // Speech recognition functionality
    this.recognition = null;
    this.recognizedText = "";
    this.initializeSpeechRecognition();

    this.init();
  }

  async init() {
    if (this.isInitialized) return;

    try {
      // Load voice recorder module
      await this.loadVoiceRecorder();

      // Ensure message listeners are ready as early as possible
      if (!this.messageListenersSetup) {
        this.setupMessageListeners();
        this.messageListenersSetup = true;
      }

      console.log("Lavio Content: Initializing on", window.location.href);

      // Wait for page to be fully loaded
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.setup());
      } else {
        this.setup();
      }

      this.isInitialized = true;
      console.log("Lavio Content Script initialized");
    } catch (error) {
      console.error("Failed to initialize Lavio:", error);
    }
  }

  initializeSpeechRecognition() {
    // Initialize Web Speech API for speech recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn(
        "Lavio Content: Speech Recognition not supported in this browser."
      );
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false; // Stop after one phrase
    this.recognition.interimResults = true; // Get interim results
    this.recognition.lang = "en-US"; // Default language
    this.recognition.maxAlternatives = 1;

    // Set up event handlers
    this.recognition.onstart = () => {
      console.log("Speech recognition started");
      this.isRecording = true;
      this.recognizedText = "";
      this.updateVoiceButtonState();
      this.updateStatus("Listening... Speak now");
      this.sendActivityUpdate("listening", 0);

      // Update UI
      const recordBtn = this.voicePanel?.querySelector("#lavio-record");
      if (recordBtn) {
        recordBtn.classList.add("recording");
        recordBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="8"/>
          </svg>
          Listening...
        `;
      }
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Show interim results
      if (interimTranscript) {
        this.updateStatus(`Hearing: "${interimTranscript}"`);
      }

      // Store final results
      if (finalTranscript) {
        this.recognizedText = finalTranscript;
        console.log("Final transcript:", finalTranscript);
      }
    };

    this.recognition.onend = () => {
      console.log("Speech recognition ended");
      this.isRecording = false;
      this.updateVoiceButtonState();

      // Update UI
      const recordBtn = this.voicePanel?.querySelector("#lavio-record");
      if (recordBtn) {
        recordBtn.classList.remove("recording");
        recordBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mic-icon lucide-mic">
            <path d="M12 19v3"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <rect x="9" y="2" width="6" height="13" rx="3"/>
          </svg>
          Hold to Talk
        `;
      }

      // Process the recognized text
      if (this.recognizedText) {
        this.processRecognizedSpeech(this.recognizedText);
      } else {
        this.updateStatus("No speech detected. Please try again.");
        this.sendActivityUpdate("idle");
      }
    };

    this.recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      this.isRecording = false;
      this.updateVoiceButtonState();

      let errorMessage = "Speech recognition error";
      switch (event.error) {
        case "no-speech":
          errorMessage = "No speech detected. Please try again.";
          break;
        case "audio-capture":
          errorMessage = "No microphone found. Please check your microphone.";
          break;
        case "not-allowed":
          errorMessage =
            "Microphone permission denied. Please allow microphone access.";
          break;
        case "network":
          errorMessage = "Network error. Please check your connection.";
          break;
        default:
          errorMessage = `Error: ${event.error}`;
      }

      this.updateStatus(errorMessage);
      this.sendActivityUpdate("idle");

      // Reset button UI
      const recordBtn = this.voicePanel?.querySelector("#lavio-record");
      if (recordBtn) {
        recordBtn.classList.remove("recording");
        recordBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mic-icon lucide-mic">
            <path d="M12 19v3"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <rect x="9" y="2" width="6" height="13" rx="3"/>
          </svg>
          Hold to Talk
        `;
      }
    };
  }

  async loadVoiceRecorder() {
    // Keep for backward compatibility but not used for hold-to-talk
    // Speech Recognition API is used instead
    console.log("Lavio Content: Using Web Speech API for voice recognition");
  }

  setup() {
    // Create UI elements
    this.createFloatingButton();

    // Set up event listeners
    this.setupMessageListeners();
    this.setupKeyboardShortcuts();
  }

  createFloatingButton() {
    // Create floating voice button
    this.floatingButton = document.createElement("div");
    this.floatingButton.id = "lavio-floating-btn";
    this.floatingButton.innerHTML = `
    <svg width="160" height="160" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Base circle fill -->
    <linearGradient id="baseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9C88FF"/>
      <stop offset="100%" stop-color="#6D6CFF"/>
    </linearGradient>

    <!-- White flower glow -->
    <radialGradient id="flowerGlow" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="white" stop-opacity="0.9"/>
      <stop offset="35%" stop-color="white" stop-opacity="0.55"/>
      <stop offset="65%" stop-color="white" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>

    <!-- Petal mask shape -->
    <mask id="petalMask">
      <rect width="160" height="160" fill="black"/>
      <!-- 6 circular petals -->
      <circle cx="80" cy="34" r="28" fill="white"/>
      <circle cx="120" cy="60" r="28" fill="white"/>
      <circle cx="120" cy="100" r="28" fill="white"/>
      <circle cx="80" cy="126" r="28" fill="white"/>
      <circle cx="40" cy="100" r="28" fill="white"/>
      <circle cx="40" cy="60" r="28" fill="white"/>
    </mask>
  </defs>

  <!-- Base circle -->
  <circle cx="80" cy="80" r="75" fill="url(#baseGrad)"/>

  <!-- Rotating flower glow -->
  <g style="transform-origin: 80px 80px; animation: rotateFlower 9s linear infinite;">
    <circle cx="80" cy="80" r="75" fill="url(#flowerGlow)" mask="url(#petalMask)"/>
  </g>

  <style>
    @keyframes rotateFlower {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  </style>
</svg>
    `;

    // Style the floating button
    Object.assign(this.floatingButton.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: "60px",
      height: "60px",
      backgroundColor: "#9C88FF",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      zIndex: "10000",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      color: "white",
      transition: "all 0.3s ease",
      border: "none",
    });

    // Add hover effects
    this.floatingButton.addEventListener("mouseenter", () => {
      this.floatingButton.style.transform = "scale(1.1)";
      this.floatingButton.style.backgroundColor = "#6D6CFF";
    });

    this.floatingButton.addEventListener("mouseleave", () => {
      this.floatingButton.style.transform = "scale(1)";
      this.floatingButton.style.backgroundColor = "#9C88FF";
    });

    // Add click handler
    this.floatingButton.addEventListener("click", () =>
      this.toggleVoicePanel()
    );

    document.body.appendChild(this.floatingButton);
  }

  toggleVoicePanel() {
    if (this.voicePanel) {
      this.closeVoicePanel();
    } else {
      this.openVoicePanel();
    }
  }

  openVoicePanel() {
    this.voicePanel = document.createElement("div");
    this.voicePanel.id = "lavio-panel";

    this.voicePanel.innerHTML = `
      <div class="lavio-header">
        <h3>Lavio AI Assistant</h3>
        <button id="lavio-close">×</button>
      </div>
      <div class="lavio-content">
        <div id="lavio-status">Ready to listen...</div>
        <div id="lavio-conversation"></div>
        <div class="lavio-controls">
          <button id="lavio-record" class="record-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mic-icon lucide-mic">
              <path d="M12 19v3"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <rect x="9" y="2" width="6" height="13" rx="3"/>
            </svg>
            Hold to Talk
          </button>
          <button id="lavio-stop-speaking" style="display: none;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h12v12H6z"/>
            </svg>
            Stop Speaking
          </button>
          <button id="lavio-summarize">Summarize Page</button>
          <div class="translate-container">
            <button id="lavio-translate">Translate Selection</button>
            <div id="language-dropdown" class="language-dropdown" style="display: none;">
              <div class="dropdown-header">Select Target Language:</div>
              <div class="language-options">
                <div class="language-option" data-lang="en" data-name="English">🇺🇸 English</div>
                <div class="language-option" data-lang="es" data-name="Spanish">🇪🇸 Spanish</div>
                <div class="language-option" data-lang="fr" data-name="French">🇫🇷 French</div>
                <div class="language-option" data-lang="de" data-name="German">🇩🇪 German</div>
                <div class="language-option" data-lang="it" data-name="Italian">🇮🇹 Italian</div>
                <div class="language-option" data-lang="pt" data-name="Portuguese">🇵🇹 Portuguese</div>
                <div class="language-option" data-lang="ru" data-name="Russian">🇷🇺 Russian</div>
                <div class="language-option" data-lang="ja" data-name="Japanese">🇯🇵 Japanese</div>
                <div class="language-option" data-lang="ko" data-name="Korean">🇰🇷 Korean</div>
                <div class="language-option" data-lang="zh" data-name="Chinese">🇨🇳 Chinese</div>
                <div class="language-option" data-lang="ar" data-name="Arabic">🇸🇦 Arabic</div>
                <div class="language-option" data-lang="hi" data-name="Hindi">🇮🇳 Hindi</div>
                <div class="language-option" data-lang="nl" data-name="Dutch">🇳🇱 Dutch</div>
                <div class="language-option" data-lang="sv" data-name="Swedish">🇸🇪 Swedish</div>
                <div class="language-option" data-lang="no" data-name="Norwegian">🇳🇴 Norwegian</div>
                <div class="language-option" data-lang="pl" data-name="Polish">🇵🇱 Polish</div>
                <div class="language-option" data-lang="tr" data-name="Turkish">🇹🇷 Turkish</div>
                <div class="language-option" data-lang="th" data-name="Thai">🇹🇭 Thai</div>
                <div class="language-option" data-lang="vi" data-name="Vietnamese">🇻🇳 Vietnamese</div>
                <div class="language-option" data-lang="uk" data-name="Ukrainian">🇺🇦 Ukrainian</div>
                <div class="language-option" data-lang="cs" data-name="Czech">🇨🇿 Czech</div>
                <div class="language-option" data-lang="da" data-name="Danish">🇩🇰 Danish</div>
                <div class="language-option" data-lang="fi" data-name="Finnish">🇫🇮 Finnish</div>
                <div class="language-option" data-lang="el" data-name="Greek">🇬🇷 Greek</div>
                <div class="language-option" data-lang="he" data-name="Hebrew">🇮🇱 Hebrew</div>
                <div class="language-option" data-lang="hu" data-name="Hungarian">🇭🇺 Hungarian</div>
                <div class="language-option" data-lang="id" data-name="Indonesian">🇮🇩 Indonesian</div>
                <div class="language-option" data-lang="ms" data-name="Malay">🇲🇾 Malay</div>
                <div class="language-option" data-lang="ro" data-name="Romanian">🇷🇴 Romanian</div>
                <div class="language-option" data-lang="sk" data-name="Slovak">🇸🇰 Slovak</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Style the panel
    Object.assign(this.voicePanel.style, {
      position: "fixed",
      bottom: "90px",
      right: "20px",
      width: "420px",
      minHeight: "300px",
      maxHeight: "80vh",
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      zIndex: "10001",
      border: "1px solid #e0e0e0",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      transition: "height 0.3s ease-in-out, max-height 0.3s ease-in-out",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    });

    // Add panel styles
    const style = document.createElement("style");
    style.textContent = `
      #lavio-panel .lavio-header {
        padding: 16px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      #lavio-panel .lavio-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }
      
      #lavio-panel .lavio-content {
        padding: 20px;
        height: calc(100% - 60px);
        display: flex;
        flex-direction: column;
      }
      
      #lavio-status {
        padding: 10px 16px;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 8px;
        font-size: 14px;
        color: #495057;
        margin-bottom: 16px;
        border: 1px solid #e9ecef;
        font-weight: 500;
      }
      
      #lavio-conversation {
        flex: 1;
        overflow-y: auto;
        margin-bottom: 16px;
        padding: 16px;
        background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.6;
        min-height: 200px;
        max-height: none;
        transition: height 0.3s ease-in-out;
        border: 1px solid #e9ecef;
        scroll-behavior: smooth;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e0 transparent;
      }
      
      #lavio-conversation::-webkit-scrollbar {
        width: 6px;
      }
      
      #lavio-conversation::-webkit-scrollbar-track {
        background: transparent;
      }
      
      #lavio-conversation::-webkit-scrollbar-thumb {
        background-color: #cbd5e0;
        border-radius: 3px;
      }
      
      #lavio-conversation::-webkit-scrollbar-thumb:hover {
        background-color: #a0aec0;
      }
      
      .lavio-controls {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding-bottom: 20px;
      }
      
      .lavio-controls button {
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .record-btn {
        background: linear-gradient(135deg, #9C88FF 0%, #6D6CFF 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      
      .record-btn:hover {
        background: linear-gradient(135deg, #8A7AFF 0%, #5D5CFF 100%);
      }
      
      .record-btn.recording {
        background: #ea4335;
        animation: pulse 1s infinite;
      }
      
      #lavio-stop-speaking {
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      
      #lavio-stop-speaking:hover {
        background: linear-gradient(135deg, #ff5252 0%, #e53935 100%);
      }
      
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
      }
      
      @keyframes shimmer {
        0% { background-position: -200px 0; }
        100% { background-position: calc(200px + 100%) 0; }
      }
      
      .skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200px 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 4px;
        max-width: 100%;
        box-sizing: border-box;
      }
      
      .skeleton-text {
        height: 16px;
        margin-bottom: 8px;
        max-width: 100%;
        box-sizing: border-box;
      }
      
      .skeleton-text.short {
        width: 60%;
        max-width: 60%;
      }
      
      .skeleton-text.medium {
        width: 80%;
        max-width: 80%;
      }
      
      .skeleton-text.long {
        width: 100%;
        max-width: 100%;
      }
      
      .skeleton-container {
        padding: 12px;
        background: linear-gradient(135deg, #9C88FF20, #6D6CFF20);
        max-width: 100%;
        box-sizing: border-box;
        overflow: hidden;
      }
      
      .skeleton-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .skeleton-avatar {
        width: 20px;
        height: 20px;
        border-radius: 50%;
      }
      
      #lavio-summarize, #lavio-translate {
        background: #f8f9fa;
        color: #333;
        border: 1px solid #e0e0e0;
        width:100%;
      }
      
      #lavio-summarize:hover, #lavio-translate:hover {
        background: linear-gradient(135deg, #9C88FF15, #6D6CFF15);
        border-color: #6D6CFF;
      }
      
      #lavio-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      #lavio-close:hover {
        color: #333;
      }
      
      .translate-container {
        position: relative;
        display: inline-block;
      }
      
      .language-dropdown {
        position: absolute;
        bottom: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1001;
        max-height: 300px;
        overflow-y: auto;
        margin-bottom: 4px;
        width: 100%;
      }
      
      .dropdown-header {
        padding: 12px 16px;
        border-bottom: 1px solid #e0e0e0;
        font-weight: 600;
        font-size: 14px;
        color: #333;
        background: #f8f9fa;
        border-radius: 8px 8px 0 0;
      }
      
      .language-option {
        padding: 12px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #333;
        transition: background-color 0.2s ease;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
      }
      
      .language-option:hover {
        background-color: #f0f0f0;
      }
      
      .language-option:active {
        background-color: #e0e0e0;
      }
      
      .language-flag {
        font-size: 16px;
        width: 20px;
        text-align: center;
      }
      
      .hidden {
        display: none !important;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(this.voicePanel);

    // Add event listeners
    this.setupPanelEventListeners();

    // Set initial height based on content
    setTimeout(() => this.adjustWidgetHeight(), 100);
  }

  setupPanelEventListeners() {
    // Close button
    const closeBtn = this.voicePanel.querySelector("#lavio-close");
    closeBtn.addEventListener("click", () => this.closeVoicePanel());

    // Record button
    const recordBtn = this.voicePanel.querySelector("#lavio-record");
    recordBtn.addEventListener("mousedown", () => this.startRecording());
    recordBtn.addEventListener("mouseup", () => this.stopRecording());
    recordBtn.addEventListener("mouseleave", () => this.stopRecording());

    // Summarize button
    const summarizeBtn = this.voicePanel.querySelector("#lavio-summarize");
    summarizeBtn.addEventListener("click", () => this.summarizePage());

    // Stop speaking button
    const stopSpeakingBtn = this.voicePanel.querySelector(
      "#lavio-stop-speaking"
    );
    stopSpeakingBtn.addEventListener("click", () => this.stopSpeaking());

    // Translate button - now toggles dropdown
    const translateBtn = this.voicePanel.querySelector("#lavio-translate");
    translateBtn.addEventListener("click", () => this.toggleLanguageDropdown());

    // Language dropdown options - use event delegation for better reliability
    const languageDropdown =
      this.voicePanel.querySelector(".language-dropdown");
    languageDropdown.addEventListener("click", (e) => {
      if (e.target.classList.contains("language-option")) {
        const languageCode = e.target.dataset.lang;
        console.log("Language selected:", languageCode); // Debug log
        this.translateToLanguage(languageCode);
        this.hideLanguageDropdown();
      }
    });

    // Hide dropdown when clicking outside
    document.addEventListener("click", (e) => {
      const dropdown = this.voicePanel.querySelector(".language-dropdown");
      const translateContainer = this.voicePanel.querySelector(
        ".translate-container"
      );
      if (dropdown && !translateContainer.contains(e.target)) {
        this.hideLanguageDropdown();
      }
    });
  }

  closeVoicePanel() {
    if (this.voicePanel) {
      this.voicePanel.remove();
      this.voicePanel = null;
    }
  }

  async startRecording() {
    if (this.isRecording) return;

    try {
      if (!this.recognition) {
        this.updateStatus("Speech recognition unavailable in this browser");
        console.warn(
          "Lavio Content: Speech Recognition not initialized or not supported"
        );
        return;
      }

      // Start speech recognition
      this.recognition.start();
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      this.updateStatus("Error: Could not start speech recognition");
    }
  }

  stopRecording() {
    if (!this.isRecording) return;

    try {
      if (!this.recognition) return;
      // Stop speech recognition - this will trigger onend event
      this.recognition.stop();
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
      this.updateStatus("Error stopping speech recognition");
    }
  }

  // Voice recording event handlers
  onRecordingStart() {
    this.isRecording = true;
    this.updateVoiceButtonState();
    this.updateStatus("Recording... Release to send");
    this.sendActivityUpdate("recording", 0);

    // Update UI
    const recordBtn = this.voicePanel?.querySelector("#lavio-record");
    if (recordBtn) {
      recordBtn.classList.add("recording");
      recordBtn.textContent = "Listening...";
    }
  }

  async onRecordingStop(audioBlob) {
    this.isRecording = false;
    this.updateVoiceButtonState();
    this.updateStatus("Processing...");
    this.sendActivityUpdate("processing", 25);

    // Update UI
    const recordBtn = this.voicePanel?.querySelector("#lavio-record");
    if (recordBtn) {
      recordBtn.classList.remove("recording");
      recordBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z"/>
          <path d="M17 11C17 14.53 14.39 17.44 11 17.93V21H13V23H11H9V21H11V17.93C7.61 17.44 5 14.53 5 11H7C7 13.76 9.24 16 12 16C14.76 16 17 13.76 17 11H17Z"/>
        </svg>
        Hold to Talk
      `;
    }

    try {
      // Convert audio blob to data URL for transmission
      const reader = new FileReader();
      reader.onload = async () => {
        this.sendActivityUpdate("processing", 75);
        const audioDataURL = reader.result;
        const pageContext = this.getPageContext();

        // Send to background script for processing
        const response = await chrome.runtime.sendMessage({
          type: "PROCESS_AUDIO",
          audioData: audioDataURL,
          context: pageContext,
          conversationHistory: this.currentConversation,
        });

        if (response.success) {
          let aiResponse = "";

          // Check if this is a fallback response (no multimodal support)
          if (
            response.response &&
            typeof response.response === "object" &&
            response.response.fallback
          ) {
            this.addToConversation(
              "You",
              "[Voice message - transcription not available]"
            );
            this.addToConversation("AI", response.response.response);
            aiResponse = response.response.response;
          } else if (
            response.response &&
            typeof response.response === "object" &&
            response.response.transcription
          ) {
            // Use the actual transcription if available
            this.addToConversation("You", response.response.transcription);
            this.addToConversation("AI", response.response.response);
            aiResponse = response.response.response;
          } else {
            // Fallback to showing the full response
            this.addToConversation("You", "[Voice message]");
            const fullResponse =
              typeof response.response === "object"
                ? response.response.fullResponse || response.response.response
                : response.response;
            this.addToConversation("AI", fullResponse);
            aiResponse = fullResponse;
          }

          this.updateStatus("Ready to listen...");
          this.sendActivityUpdate("idle");
          this.updateStats("conversations");

          // Automatically speak the AI response in English
          try {
            await this.speakText(aiResponse, "en-US");
          } catch (error) {
            console.error("Error speaking response:", error);
            // Continue even if speech fails
          }
        } else {
          this.updateStatus("Error: " + response.error);
          this.sendActivityUpdate("idle");
        }
      };

      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error("Error processing audio:", error);
      this.updateStatus("Error processing voice input");
      this.sendActivityUpdate("idle");
    }
  }

  onRecordingPause() {
    this.updateStatus("Recording paused");
  }

  onRecordingResume() {
    this.updateStatus("Recording resumed...");
  }

  onRecordingError(error) {
    this.isRecording = false;
    this.updateVoiceButtonState();
    this.updateStatus("Recording error: " + error.message);
    console.error("Recording error:", error);
  }

  onAudioDataAvailable(data) {
    // Update recording visualization if needed
    this.updateRecordingVisualization();
  }

  async processRecognizedSpeech(text) {
    try {
      this.updateStatus("Processing your question...");
      this.sendActivityUpdate("processing", 25);

      // Add user message to conversation
      this.addToConversation("You", text);

      // Get page context with full content
      const pageContext = this.getPageContext();
      const pageContent = this.extractPageContent();

      // Create enhanced prompt with page context
      const enhancedPrompt = `You are viewing a webpage titled "${pageContext.title}" at ${pageContext.url}.

PAGE CONTENT:
${pageContent}

USER QUESTION: ${text}

Instructions: 
- If the question is about the current page, website, or its content, answer based on the PAGE CONTENT above.
- If the question is general knowledge or unrelated to the page, answer it normally.
- Be specific and reference the page content when relevant.
- Keep responses concise but informative.`;

      // Send to background script for AI processing
      this.sendActivityUpdate("processing", 50);
      const response = await chrome.runtime.sendMessage({
        type: "SEND_PROMPT",
        prompt: enhancedPrompt,
        context: {
          ...pageContext,
          pageContent: pageContent,
          conversationHistory: this.currentConversation,
        },
      });

      if (response.success) {
        // Add AI response to conversation
        this.addToConversation("AI", response.response);
        this.updateStatus("Ready to listen...");
        this.sendActivityUpdate("idle");
        this.updateStats("conversations");

        // Automatically speak the AI response in English
        try {
          await this.speakText(response.response, "en-US");
        } catch (error) {
          console.error("Error speaking response:", error);
          // Continue even if speech fails
        }
      } else {
        this.updateStatus("Error: " + response.error);
        this.sendActivityUpdate("idle");
        this.addToConversation(
          "AI",
          "Sorry, I encountered an error processing your request. Please try again."
        );
      }
    } catch (error) {
      console.error("Error processing recognized speech:", error);
      this.updateStatus("Error processing your question");
      this.sendActivityUpdate("idle");
      this.addToConversation(
        "AI",
        "Sorry, I encountered an error. Please try again."
      );
    }
  }

  updateVoiceButtonState() {
    if (this.floatingButton) {
      if (this.isRecording) {
        this.floatingButton.style.backgroundColor = "#ea4335";
        this.floatingButton.style.animation = "pulse 1s infinite";
      } else {
        this.floatingButton.style.backgroundColor = "#9C88FF";
        this.floatingButton.style.animation = "none";
      }
    }
  }

  updateRecordingVisualization() {
    // Placeholder for recording visualization updates
    // Could add audio level indicators or waveform display
  }

  // Text-to-speech functionality
  async speakText(text, language = "en-US") {
    if (this.isSpeaking) {
      this.speechSynthesis.cancel();
    }

    return new Promise((resolve, reject) => {
      if (!this.speechSynthesis) {
        console.error("Speech synthesis not supported");
        reject(new Error("Speech synthesis not supported"));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.updateStatus("Speaking...");
        // Show stop speaking button
        const stopBtn = this.voicePanel?.querySelector("#lavio-stop-speaking");
        if (stopBtn) stopBtn.style.display = "block";
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.updateStatus("Ready to listen...");
        // Hide stop speaking button
        const stopBtn = this.voicePanel?.querySelector("#lavio-stop-speaking");
        if (stopBtn) stopBtn.style.display = "none";
        resolve();
      };

      utterance.onerror = (error) => {
        this.isSpeaking = false;
        this.updateStatus("Speech error");
        // Hide stop speaking button
        const stopBtn = this.voicePanel?.querySelector("#lavio-stop-speaking");
        if (stopBtn) stopBtn.style.display = "none";
        console.error("Speech synthesis error:", error);
        reject(error);
      };

      this.speechSynthesis.speak(utterance);
    });
  }

  stopSpeaking() {
    if (this.speechSynthesis && this.isSpeaking) {
      this.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.updateStatus("Ready to listen...");
      // Hide stop speaking button
      const stopBtn = this.voicePanel?.querySelector("#lavio-stop-speaking");
      if (stopBtn) stopBtn.style.display = "none";
    }
  }

  async summarizePage() {
    this.updateStatus("Analyzing page content...");
    this.showSkeletonLoading("summary");
    this.sendActivityUpdate("summarizing", 0);

    try {
      const content = this.extractPageContent();
      this.sendActivityUpdate("summarizing", 50);

      const response = await chrome.runtime.sendMessage({
        type: "GET_PAGE_SUMMARY",
        content: content,
      });

      this.hideSkeletonLoading();

      if (response.success) {
        // Remove the "Page Summary:" heading - directly add AI response
        this.addToConversation("AI", response.summary);
        this.updateStatus("Summary complete");
        this.sendActivityUpdate("idle");
        this.updateStats("summaries");
      } else {
        this.updateStatus("Error: " + response.error);
        this.sendActivityUpdate("idle");
      }
    } catch (error) {
      this.hideSkeletonLoading();
      console.error("Error summarizing page:", error);
      this.updateStatus("Error summarizing page");
      this.sendActivityUpdate("idle");
    }
  }

  async translateSelection() {
    const selectedText = window.getSelection().toString().trim();

    if (!selectedText) {
      this.updateStatus("Please select text to translate");
      return;
    }

    this.updateStatus("Processing translation...");
    this.showSkeletonLoading("translation");
    this.sendActivityUpdate("translating", 0);

    try {
      this.sendActivityUpdate("translating", 50);
      const response = await chrome.runtime.sendMessage({
        type: "TRANSLATE_TEXT",
        text: selectedText,
        targetLanguage: "en", // Default to English, can be made configurable
      });

      this.hideSkeletonLoading();

      if (response.success) {
        this.addToConversation("Selected Text", selectedText);
        this.addToConversation("Translation", response.translation);
        this.updateStatus("Translation complete");
        this.sendActivityUpdate("idle");
        this.updateStats("translations");
      } else {
        this.updateStatus("Error: " + response.error);
        this.sendActivityUpdate("idle");
      }
    } catch (error) {
      this.hideSkeletonLoading();
      console.error("Error translating text:", error);
      this.updateStatus("Error translating text");
      this.sendActivityUpdate("idle");
    } finally {
      // Clear stored text after translation attempt
      this.selectedTextForTranslation = "";
    }
  }

  toggleLanguageDropdown() {
    // Store the selected text before showing dropdown to prevent losing selection
    this.selectedTextForTranslation = window.getSelection().toString().trim();
    console.log("Stored selected text:", this.selectedTextForTranslation); // Debug log

    const dropdown = this.voicePanel.querySelector(".language-dropdown");
    if (dropdown.style.display === "none" || dropdown.style.display === "") {
      // Only show dropdown if there's selected text
      if (this.selectedTextForTranslation) {
        this.showLanguageDropdown();
      } else {
        this.updateStatus("Please select text to translate");
      }
    } else {
      this.hideLanguageDropdown();
    }
  }

  showLanguageDropdown() {
    const dropdown = this.voicePanel.querySelector(".language-dropdown");
    dropdown.style.display = "block";
  }

  hideLanguageDropdown() {
    const dropdown = this.voicePanel.querySelector(".language-dropdown");
    dropdown.style.display = "none";
  }

  async translateToLanguage(targetLanguage) {
    // Use stored selected text instead of getting selection again
    const selectedText = this.selectedTextForTranslation;
    console.log("Using stored text for translation:", selectedText); // Debug log

    if (!selectedText) {
      this.updateStatus("Please select text to translate");
      return;
    }

    // Hide the dropdown after selection
    this.hideLanguageDropdown();

    this.updateStatus("Processing translation...");
    this.showSkeletonLoading("translation");
    this.sendActivityUpdate("translating", 0);

    try {
      this.sendActivityUpdate("translating", 50);
      const response = await chrome.runtime.sendMessage({
        type: "TRANSLATE_TEXT",
        text: selectedText,
        targetLanguage: targetLanguage,
      });

      this.hideSkeletonLoading();

      if (response.success) {
        this.addToConversation("Selected Text", selectedText);
        this.addToConversation("Translation", response.translation);
        this.updateStatus("Translation complete");
        this.sendActivityUpdate("idle");
        this.updateStats("translations");
      } else {
        this.updateStatus("Error: " + response.error);
        this.sendActivityUpdate("idle");
      }
    } catch (error) {
      this.hideSkeletonLoading();
      console.error("Error translating text:", error);
      this.updateStatus("Error translating text");
      this.sendActivityUpdate("idle");
    }
  }

  getPageContext() {
    return {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
    };
  }

  extractPageContent() {
    // Extract main content from the page
    const content = [];

    // Try to get main content areas
    const mainSelectors = [
      "main",
      "article",
      ".content",
      "#content",
      ".post",
      ".entry",
    ];
    let mainContent = null;

    for (const selector of mainSelectors) {
      mainContent = document.querySelector(selector);
      if (mainContent) break;
    }

    if (mainContent) {
      content.push(mainContent.textContent.trim());
    } else {
      // Fallback to body content, excluding navigation and footer
      const excludeSelectors = [
        "nav",
        "header",
        "footer",
        ".nav",
        ".menu",
        ".sidebar",
      ];
      const bodyText = document.body.textContent.trim();
      content.push(bodyText.substring(0, 5000)); // Limit content length
    }

    return content.join("\n\n");
  }

  addToConversation(sender, message) {
    const conversation = this.voicePanel?.querySelector("#lavio-conversation");
    if (!conversation) return;

    // Store conversation history for context
    this.currentConversation.push({
      type: sender === "AI" ? "assistant" : "user",
      message: message,
      timestamp: Date.now(),
    });

    // Keep only last 10 messages to prevent memory bloat
    if (this.currentConversation.length > 10) {
      this.currentConversation = this.currentConversation.slice(-10);
    }

    if (sender === "AI") {
      // Create rich text content display for AI responses
      const contentDiv = document.createElement("div");
      contentDiv.style.cssText = `
        margin-bottom: 20px;
        padding: 0;
        background: transparent;
        position: relative;
      `;

      // Add speaker button in top-right corner
      const speakBtn = document.createElement("button");
      speakBtn.innerHTML = `
 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mic-icon lucide-mic">
              <path d="M12 19v3"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <rect x="9" y="2" width="6" height="13" rx="3"/>
      </svg>


      `;
      speakBtn.style.cssText = `
        position: absolute;
        top: 0;
        right: 0;
        background: #f8f9fa;
        color: #495057;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        padding: 8px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        z-index: 10;
      `;
      speakBtn.title = "Listen to this content";

      speakBtn.addEventListener("click", async () => {
        try {
          const originalHTML = speakBtn.innerHTML;
          speakBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 12l4 4 4-4"/>
            </svg>
          `;
          speakBtn.disabled = true;
          speakBtn.style.background = "#e3f2fd";

          const response = await chrome.runtime.sendMessage({
            type: "TEXT_TO_SPEECH",
            text: message,
            language: "en",
          });

          if (!response.success) {
            throw new Error(response.error || "Failed to speak text");
          }

          speakBtn.innerHTML = originalHTML;
          speakBtn.disabled = false;
          speakBtn.style.background = "#f8f9fa";
        } catch (error) {
          console.error("Text-to-speech error:", error);
          speakBtn.innerHTML = originalHTML;
          speakBtn.disabled = false;
          speakBtn.style.background = "#f8f9fa";
        }
      });

      speakBtn.addEventListener("mouseenter", () => {
        if (!speakBtn.disabled) {
          speakBtn.style.background = "#e3f2fd";
          speakBtn.style.transform = "translateY(-1px)";
          speakBtn.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
        }
      });

      speakBtn.addEventListener("mouseleave", () => {
        if (!speakBtn.disabled) {
          speakBtn.style.background = "#f8f9fa";
          speakBtn.style.transform = "translateY(0)";
          speakBtn.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
        }
      });

      contentDiv.appendChild(speakBtn);

      // Create rich text content
      const textContent = document.createElement("div");
      textContent.style.cssText = `
        color: #2c3e50;
        line-height: 1.7;
        font-size: 15px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        white-space: pre-wrap;
        word-wrap: break-word;
        padding-right: 50px;
        margin: 0;
      `;

      // Format the message content for better readability
      const formattedMessage = this.formatRichTextContent(message);
      textContent.innerHTML = formattedMessage;

      contentDiv.appendChild(textContent);
      conversation.appendChild(contentDiv);
    } else {
      // For user messages, keep them minimal and clean
      const userDiv = document.createElement("div");
      userDiv.style.cssText = `
        margin-bottom: 16px;
        padding: 12px 16px;
        background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
        border-radius: 8px;
        border-left: 3px solid #4285f4;
        font-size: 14px;
        color: #495057;
        font-style: italic;
      `;
      userDiv.textContent = message;
      conversation.appendChild(userDiv);
    }

    conversation.scrollTop = conversation.scrollHeight;

    // Dynamically adjust widget height based on content
    this.adjustWidgetHeight();
  }

  formatRichTextContent(content) {
    // Enhanced formatting for rich text display
    let formatted = content
      // Convert markdown-style headers
      .replace(
        /^### (.*$)/gm,
        '<h3 style="color: #2c3e50; font-size: 18px; font-weight: 600; margin: 16px 0 8px 0; border-bottom: 2px solid #e9ecef; padding-bottom: 4px;">$1</h3>'
      )
      .replace(
        /^## (.*$)/gm,
        '<h2 style="color: #2c3e50; font-size: 20px; font-weight: 600; margin: 20px 0 10px 0; border-bottom: 2px solid #4285f4; padding-bottom: 6px;">$1</h2>'
      )
      .replace(
        /^# (.*$)/gm,
        '<h1 style="color: #2c3e50; font-size: 22px; font-weight: 700; margin: 24px 0 12px 0; border-bottom: 3px solid #4285f4; padding-bottom: 8px;">$1</h1>'
      )

      // Convert bullet points
      .replace(
        /^\* (.*$)/gm,
        '<div style="margin: 6px 0; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; color: #4285f4; font-weight: bold;">•</span>$1</div>'
      )
      .replace(
        /^- (.*$)/gm,
        '<div style="margin: 6px 0; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; color: #4285f4; font-weight: bold;">•</span>$1</div>'
      )

      // Convert numbered lists (fixed)
      .replace(
        /^(\d+)\. (.*$)/gm,
        '<div style="margin: 6px 0; padding-left: 24px; position: relative;"><span style="position: absolute; left: 0; color: #4285f4; font-weight: bold;">$1.</span>$2</div>'
      )

      // Convert bold text
      .replace(
        /\*\*(.*?)\*\*/g,
        '<strong style="color: #2c3e50; font-weight: 600;">$1</strong>'
      )

      // Convert italic text
      .replace(
        /\*(.*?)\*/g,
        '<em style="color: #495057; font-style: italic;">$1</em>'
      )

      // Add paragraph spacing for double line breaks
      .replace(/\n\n/g, '</p><p style="margin: 12px 0; line-height: 1.7;">')

      // Convert single line breaks to <br>
      .replace(/\n/g, "<br>");

    // Wrap in paragraph tags if not already formatted
    if (
      !formatted.includes("<h1>") &&
      !formatted.includes("<h2>") &&
      !formatted.includes("<h3>") &&
      !formatted.includes("<div")
    ) {
      formatted = `<p style="margin: 0; line-height: 1.7;">${formatted}</p>`;
    }

    return formatted;
  }

  adjustWidgetHeight() {
    if (!this.voicePanel) return;

    const conversation = this.voicePanel.querySelector("#lavio-conversation");
    const header = this.voicePanel.querySelector(".lavio-header");
    const content = this.voicePanel.querySelector(".lavio-content");
    const controls = this.voicePanel.querySelector(".lavio-controls");
    const status = this.voicePanel.querySelector("#lavio-status");

    if (!conversation || !header || !content || !controls) return;

    // Calculate the height of non-conversation elements
    const headerHeight = header.offsetHeight;
    const controlsHeight = controls.offsetHeight;
    const statusHeight = status ? status.offsetHeight : 0;
    const contentPadding = 40; // 20px top + 20px bottom padding
    const conversationMargin = 16; // margin-bottom

    // Get the natural height of the conversation content
    const conversationScrollHeight = conversation.scrollHeight;

    // Calculate minimum and maximum heights - increased to 90% for better content display
    const minPanelHeight = 320;
    const maxPanelHeight = Math.min(window.innerHeight * 0.9, 1000); // Increased to 90% and higher max

    // Calculate the ideal panel height
    const idealPanelHeight =
      headerHeight +
      contentPadding +
      statusHeight +
      conversationScrollHeight +
      conversationMargin +
      controlsHeight;

    // Constrain to min/max bounds
    const newPanelHeight = Math.max(
      minPanelHeight,
      Math.min(idealPanelHeight, maxPanelHeight)
    );

    // Apply the new height with smooth transition
    this.voicePanel.style.height = `${newPanelHeight}px`;

    // Always enable scrolling in conversation area for better UX
    const availableConversationHeight =
      newPanelHeight -
      headerHeight -
      contentPadding -
      statusHeight -
      conversationMargin -
      controlsHeight;
    conversation.style.maxHeight = `${Math.max(
      availableConversationHeight,
      200
    )}px`; // Minimum 200px for conversation
    conversation.style.overflowY = "auto";
    conversation.style.scrollBehavior = "smooth";
  }

  showSkeletonLoading(type = "summary") {
    const conversation = this.voicePanel?.querySelector("#lavio-conversation");
    if (!conversation) return;

    // Create skeleton container with rich text styling
    const skeletonContainer = document.createElement("div");
    skeletonContainer.className = "skeleton-container";
    skeletonContainer.id = "skeleton-loading";
    skeletonContainer.style.cssText = `
      margin-bottom: 20px;
      padding: 0;
      background: transparent;
      position: relative;
      max-width: 100%;
      box-sizing: border-box;
    `;

    // Create skeleton content based on type
    const contentDiv = document.createElement("div");
    contentDiv.style.cssText = `
      padding: 0;
      margin: 0;
      max-width: 100%;
      box-sizing: border-box;
    `;

    if (type === "summary") {
      // Create multiple skeleton lines for summary with varied lengths
      const lines = [
        {
          className: "skeleton skeleton-text long",
          height: "20px",
          marginBottom: "12px",
        }, // Title-like
        {
          className: "skeleton skeleton-text medium",
          height: "16px",
          marginBottom: "8px",
        },
        {
          className: "skeleton skeleton-text long",
          height: "16px",
          marginBottom: "8px",
        },
        {
          className: "skeleton skeleton-text short",
          height: "16px",
          marginBottom: "8px",
        },
        {
          className: "skeleton skeleton-text medium",
          height: "16px",
          marginBottom: "8px",
        },
        {
          className: "skeleton skeleton-text long",
          height: "16px",
          marginBottom: "0px",
        },
      ];

      lines.forEach((lineConfig) => {
        const line = document.createElement("div");
        line.className = lineConfig.className;
        line.style.height = lineConfig.height;
        line.style.marginBottom = lineConfig.marginBottom;
        line.style.maxWidth = "100%";
        line.style.boxSizing = "border-box";
        contentDiv.appendChild(line);
      });
    } else if (type === "translation") {
      // Create skeleton lines for translation
      const lines = [
        {
          className: "skeleton skeleton-text medium",
          height: "18px",
          marginBottom: "10px",
        },
        {
          className: "skeleton skeleton-text long",
          height: "16px",
          marginBottom: "8px",
        },
        {
          className: "skeleton skeleton-text short",
          height: "16px",
          marginBottom: "0px",
        },
      ];

      lines.forEach((lineConfig) => {
        const line = document.createElement("div");
        line.className = lineConfig.className;
        line.style.height = lineConfig.height;
        line.style.marginBottom = lineConfig.marginBottom;
        line.style.maxWidth = "100%";
        line.style.boxSizing = "border-box";
        contentDiv.appendChild(line);
      });
    }

    skeletonContainer.appendChild(contentDiv);
    conversation.appendChild(skeletonContainer);
    conversation.scrollTop = conversation.scrollHeight;

    // Adjust widget height to ensure proper spacing
    this.adjustWidgetHeight();
  }

  hideSkeletonLoading() {
    const skeleton = this.voicePanel?.querySelector("#skeleton-loading");
    if (skeleton) {
      skeleton.remove();
      this.adjustWidgetHeight();
    }
  }

  updateStatus(message) {
    const status = this.voicePanel?.querySelector("#lavio-status");
    if (status) {
      status.textContent = message;
    }
  }

  // Widget visibility management
  toggleWidgetVisibility() {
    if (this.floatingButton) {
      const isVisible = this.floatingButton.style.display !== "none";
      this.floatingButton.style.display = isVisible ? "none" : "flex";

      // Also hide the voice panel if it's open
      if (this.voicePanel && !isVisible) {
        this.voicePanel.style.display = "none";
      }

      // Send status update to popup
      this.sendStatusUpdate();
    }
  }

  // Handle setting updates from popup
  handleSettingUpdate(setting, value) {
    switch (setting) {
      case "widgetEnabled":
        if (this.floatingButton) {
          this.floatingButton.style.display = value ? "block" : "none";
          if (!value && this.voicePanel) {
            this.voicePanel.style.display = "none";
          }
        }
        break;
      case "voiceInputEnabled":
        // Update voice input functionality
        this.voiceInputEnabled = value;
        break;
      case "autoSummarize":
        // Update auto-summarize functionality
        this.autoSummarize = value;
        break;
      case "showNotifications":
        // Update notification settings
        this.showNotifications = value;
        break;
    }

    // Send status update to popup
    this.sendStatusUpdate();
  }

  // Send status updates to popup
  sendStatusUpdate() {
    try {
      const widgetVisible =
        this.floatingButton && this.floatingButton.style.display !== "none";
      const panelOpen =
        this.voicePanel && this.voicePanel.style.display !== "none";

      chrome.runtime.sendMessage({
        type: "WIDGET_STATUS_CHANGED",
        status: {
          widgetVisible,
          panelOpen,
          pageUrl: window.location.href,
          pageTitle: document.title,
        },
      });
    } catch (error) {
      console.log(
        "Lavio Content: Could not send status update:",
        error.message
      );
    }
  }

  // Send activity updates to popup
  sendActivityUpdate(activity, progress = null) {
    try {
      chrome.runtime.sendMessage({
        type: "ACTIVITY_UPDATE",
        activity: {
          type: activity,
          progress: progress,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.log(
        "Lavio Content: Could not send activity update:",
        error.message
      );
    }
  }

  // Send usage statistics to popup
  sendStatsUpdate() {
    try {
      // Get stats from localStorage or initialize
      const stats = JSON.parse(
        localStorage.getItem("lavio_stats") ||
          '{"summaries": 0, "translations": 0, "conversations": 0}'
      );

      chrome.runtime.sendMessage({
        type: "STATS_UPDATE",
        stats: stats,
      });
    } catch (error) {
      console.log("Lavio Content: Could not send stats update:", error.message);
    }
  }

  // Update usage statistics
  updateStats(type) {
    try {
      const stats = JSON.parse(
        localStorage.getItem("lavio_stats") ||
          '{"summaries": 0, "translations": 0, "conversations": 0}'
      );
      if (stats[type] !== undefined) {
        stats[type]++;
        localStorage.setItem("lavio_stats", JSON.stringify(stats));
        this.sendStatsUpdate();
      }
    } catch (error) {
      console.log("Lavio Content: Could not update stats:", error.message);
    }
  }

  setupMessageListeners() {
    // Listen for messages from background script and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("Lavio Content: Received message:", message.type);

      if (message.type === "PING") {
        console.log("Lavio Content: Responding to PING");
        sendResponse({ status: "PONG" });
        return true; // Indicate that we want to send a response asynchronously
      }

      if (message.type === "GET_PAGE_CONTENT") {
        console.log("Lavio Content: Getting page content");
        const content = window.lavioContent.extractPageContent();
        sendResponse({ content: content });
        return true;
      }

      if (message.type === "GET_SELECTED_TEXT") {
        console.log("Lavio Content: Getting selected text");
        const selectedText = window.getSelection().toString().trim();
        sendResponse({ text: selectedText });
        return true;
      }

      // Handle popup messages
      if (message.type === "TOGGLE_WIDGET") {
        console.log("Lavio Content: Toggling widget visibility");
        this.toggleWidgetVisibility();
        sendResponse({ success: true });
        return true;
      }

      if (message.type === "SETTING_UPDATED") {
        console.log(
          "Lavio Content: Setting updated:",
          message.setting,
          message.value
        );
        this.handleSettingUpdate(message.setting, message.value);
        sendResponse({ success: true });
        return true;
      }

      // Handle any other messages from background if needed
      return true;
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (event) => {
      // Ctrl/Cmd + Shift + V to toggle voice panel
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === "V"
      ) {
        event.preventDefault();
        this.toggleVoicePanel();
      }
    });
  }
}

// Initialize Lavio on page load with proper error handling
(function initializeLavio() {
  try {
    // Add a timestamp to track when this script runs
    const initTime = new Date().toISOString();
    console.log(`Lavio Content: Script execution started at ${initTime}`);
    console.log("Lavio Content: Document ready state:", document.readyState);
    console.log("Lavio Content: URL:", window.location.href);

    if (typeof window.lavioContent === "undefined") {
      console.log("Lavio Content: Initializing new instance");
      window.lavioContent = new LavioContent();
      console.log(
        "Lavio Content: Successfully initialized and ready to receive messages"
      );

      // Add a flag to indicate successful initialization
      window.lavioContentReady = true;

      // Send a ready signal to any waiting popup
      setTimeout(() => {
        console.log("Lavio Content: Sending ready signal...");
        try {
          chrome.runtime.sendMessage({ type: "CONTENT_SCRIPT_READY" });
          // Send initial status updates
          window.lavioContent.sendStatusUpdate();
          window.lavioContent.sendActivityUpdate("idle");
          window.lavioContent.sendStatsUpdate();
        } catch (error) {
          console.log(
            "Lavio Content: Could not send ready signal:",
            error.message
          );
        }
      }, 100);
    } else {
      console.log(
        "Lavio Content: Instance already exists, ensuring message listeners are active"
      );
      // Re-setup message listeners in case they were lost
      if (window.lavioContent.setupMessageListeners) {
        window.lavioContent.setupMessageListeners();
      }
      window.lavioContentReady = true;
    }

    // Test the message listener immediately
    console.log("Lavio Content: Testing message listener setup...");
  } catch (error) {
    console.error("Lavio Content: Failed to initialize:", error);
    window.lavioContentReady = false;
  }
})();
