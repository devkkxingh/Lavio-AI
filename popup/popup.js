// Lavio AI Assistant - Popup Script
// Handles popup UI status display and settings management

class LavioPopup {
  constructor() {
    this.isInitialized = false;
    this.currentTab = null;
    this.settings = {};
    this.contentScriptReady = false;
    this.widgetVisible = true;
    this.currentActivity = 'idle';
    this.stats = {
      summaries: 0,
      translations: 0,
      conversations: 0
    };

    // Listen for content script messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });

    this.initialize();
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case "CONTENT_SCRIPT_READY":
        if (sender.tab?.id === this.currentTab?.id) {
          this.contentScriptReady = true;
          this.updatePageStatus('ready');
        }
        break;
      
      case "WIDGET_STATUS_CHANGED":
        this.widgetVisible = message.status.widgetVisible;
        this.updateWidgetStatus();
        break;
      
      case "ACTIVITY_UPDATE":
        this.updateActivity(message.activity, message.description, message.progress);
        break;
      
      case "STATS_UPDATE":
        this.updateStats(message.stats);
        break;
    }
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log("Lavio Popup: Initializing status monitor...");

    // Get current tab
    await this.getCurrentTab();

    // Load settings and stats
    await this.loadSettings();
    await this.loadStats();

    // Check AI status
    await this.checkAIStatus();

    // Setup event listeners
    this.setupEventListeners();

    // Initialize UI
    this.initializeUI();

    this.isInitialized = true;
    console.log("Lavio Popup: Status monitor initialized");
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      console.log("Lavio Popup: Current tab:", tab?.url);
    } catch (error) {
      console.error("Lavio Popup: Error getting current tab:", error);
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get([
        'widgetEnabled', 'voiceEnabled', 'autoSummarize', 'notificationsEnabled'
      ]);
      
      this.settings = {
        widgetEnabled: result.widgetEnabled !== false,
        voiceEnabled: result.voiceEnabled !== false,
        autoSummarize: result.autoSummarize || false,
        notificationsEnabled: result.notificationsEnabled !== false
      };

      this.updateSettingsUI();
    } catch (error) {
      console.error("Lavio Popup: Error loading settings:", error);
    }
  }

  async loadStats() {
    try {
      const result = await chrome.storage.local.get(['usageStats']);
      this.stats = result.usageStats || { summaries: 0, translations: 0, conversations: 0 };
      this.updateStatsUI();
    } catch (error) {
      console.error("Lavio Popup: Error loading stats:", error);
    }
  }

  async checkAIStatus() {
    try {
      const statusElement = document.getElementById('status-text');
      const statusDot = document.querySelector('.status-dot');
      const aiServiceStatus = document.getElementById('ai-service-status');

      // Check if AI service is available
      const response = await chrome.runtime.sendMessage({ type: "CHECK_AI_STATUS" });
      
      if (response && response.available) {
        statusElement.textContent = 'Ready';
        statusDot.className = 'status-dot';
        aiServiceStatus.textContent = 'Connected';
        aiServiceStatus.className = 'status-value active';
      } else {
        statusElement.textContent = 'Unavailable';
        statusDot.className = 'status-dot error';
        aiServiceStatus.textContent = 'Disconnected';
        aiServiceStatus.className = 'status-value inactive';
      }
    } catch (error) {
      console.error("Lavio Popup: Error checking AI status:", error);
      const statusElement = document.getElementById('status-text');
      const statusDot = document.querySelector('.status-dot');
      const aiServiceStatus = document.getElementById('ai-service-status');
      
      statusElement.textContent = 'Error';
      statusDot.className = 'status-dot error';
      aiServiceStatus.textContent = 'Error';
      aiServiceStatus.className = 'status-value inactive';
    }
  }

  setupEventListeners() {
    // Widget toggle
    const toggleWidget = document.getElementById('toggle-widget');
    if (toggleWidget) {
      toggleWidget.addEventListener('click', () => this.toggleWidget());
    }

    // Settings toggles
    const settingsToggles = {
      'widget-enabled': 'widgetEnabled',
      'voice-enabled': 'voiceEnabled',
      'auto-summarize': 'autoSummarize',
      'notifications-enabled': 'notificationsEnabled'
    };

    Object.entries(settingsToggles).forEach(([elementId, settingKey]) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.addEventListener('change', (e) => {
          this.updateSetting(settingKey, e.target.checked);
        });
      }
    });

    // Footer buttons
    const openOptions = document.getElementById('open-options');
    if (openOptions) {
      openOptions.addEventListener('click', () => this.openOptions());
    }

    const showHelp = document.getElementById('show-help');
    if (showHelp) {
      showHelp.addEventListener('click', () => this.showHelp());
    }
  }

  initializeUI() {
    this.updateWidgetStatus();
    this.updatePageStatus('checking');
    this.updateActivity('idle', 'Widget is ready for use');
    this.updateSettingsUI();
    this.updateStatsUI();
  }

  updateWidgetStatus() {
    const widgetStatus = document.getElementById('widget-status');
    const toggleBtn = document.getElementById('toggle-widget');
    
    if (this.widgetVisible && this.settings.widgetEnabled) {
      widgetStatus.textContent = 'Active';
      widgetStatus.className = 'status-value active';
      toggleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
        </svg>
        Hide Widget
      `;
    } else {
      widgetStatus.textContent = 'Hidden';
      widgetStatus.className = 'status-value inactive';
      toggleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
        </svg>
        Show Widget
      `;
    }
  }

  updatePageStatus(status) {
    const pageStatus = document.getElementById('page-status');
    
    switch (status) {
      case 'ready':
        pageStatus.textContent = 'Ready';
        pageStatus.className = 'status-value active';
        break;
      case 'loading':
        pageStatus.textContent = 'Loading';
        pageStatus.className = 'status-value warning';
        break;
      case 'error':
        pageStatus.textContent = 'Error';
        pageStatus.className = 'status-value inactive';
        break;
      default:
        pageStatus.textContent = 'Checking';
        pageStatus.className = 'status-value';
    }
  }

  updateActivity(activity, description, progress = null) {
    this.currentActivity = activity;
    
    const activityTitle = document.getElementById('activity-title');
    const activityDescription = document.getElementById('activity-description');
    const activityProgress = document.getElementById('activity-progress');
    const progressFill = document.getElementById('progress-fill');
    const activityIcon = document.querySelector('.activity-icon');

    // Update title and description
    activityTitle.textContent = this.formatActivityTitle(activity);
    activityDescription.textContent = description;

    // Update icon based on activity
    activityIcon.innerHTML = this.getActivityIcon(activity);

    // Update progress bar
    if (progress !== null && progress >= 0) {
      activityProgress.style.display = 'block';
      progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    } else {
      activityProgress.style.display = 'none';
    }
  }

  formatActivityTitle(activity) {
    const titles = {
      'idle': 'Idle',
      'summarizing': 'Summarizing',
      'translating': 'Translating',
      'listening': 'Listening',
      'processing': 'Processing',
      'speaking': 'Speaking'
    };
    return titles[activity] || 'Active';
  }

  getActivityIcon(activity) {
    const icons = {
      'idle': '<path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6Z"/>',
      'summarizing': '<path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>',
      'translating': '<path d="M12.87,15.07L10.33,12.56L10.36,12.53C12.1,10.59 13.34,8.36 14.07,6H17V4H10V2H8V4H1V6H12.17C11.5,7.92 10.44,9.75 9,11.35C8.07,10.32 7.3,9.19 6.69,8H4.69C5.42,9.63 6.42,11.17 7.67,12.56L2.58,17.58L4,19L9,14L12.11,17.11L12.87,15.07Z"/>',
      'listening': '<path d="M12 2c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2s-2-.9-2-2V4c0-1.1.9-2 2-2zm5.3 6c0 3-2.54 5.1-5.3 5.1S6.7 11 6.7 8H5c0 3.41 2.72 6.23 6 6.72V17h2v-2.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>',
      'processing': '<path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>',
      'speaking': '<path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>'
    };
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">${icons[activity] || icons.idle}</svg>`;
  }

  updateSettingsUI() {
    Object.entries(this.settings).forEach(([key, value]) => {
      const elementId = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      const element = document.getElementById(elementId);
      if (element) {
        element.checked = value;
      }
    });
  }

  updateStatsUI() {
    document.getElementById('summaries-count').textContent = this.stats.summaries;
    document.getElementById('translations-count').textContent = this.stats.translations;
    document.getElementById('conversations-count').textContent = this.stats.conversations;
  }

  updateStats(newStats) {
    this.stats = { ...this.stats, ...newStats };
    this.updateStatsUI();
    this.saveStats();
  }

  async saveStats() {
    try {
      await chrome.storage.local.set({ usageStats: this.stats });
    } catch (error) {
      console.error("Lavio Popup: Error saving stats:", error);
    }
  }

  async toggleWidget() {
    try {
      // Send message to content script to toggle widget
      await chrome.tabs.sendMessage(this.currentTab.id, {
        type: "TOGGLE_WIDGET"
      });
    } catch (error) {
      console.error("Lavio Popup: Error toggling widget:", error);
    }
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    
    try {
      await chrome.storage.sync.set({ [key]: value });
      
      // Send setting update to content script
      if (this.currentTab) {
        chrome.tabs.sendMessage(this.currentTab.id, {
          type: "SETTING_UPDATED",
          setting: key,
          value: value
        }).catch(() => {
          // Content script might not be ready, ignore error
        });
      }
      
      // Update UI if needed
      if (key === 'widgetEnabled') {
        this.updateWidgetStatus();
      }
    } catch (error) {
      console.error("Lavio Popup: Error updating setting:", error);
    }
  }

  openOptions() {
    chrome.runtime.openOptionsPage();
  }

  showHelp() {
    chrome.tabs.create({
      url: 'https://github.com/your-repo/lavio-ai-assistant#help'
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new LavioPopup();
});

// Add custom styles for animations
const style = document.createElement("style");
style.textContent = `
  @keyframes slideDown {
    from { transform: translateY(-100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .activity-icon svg {
    animation: none;
  }
  
  .activity-icon svg[data-activity="processing"] {
    animation: spin 1s linear infinite;
  }
  
  .status-dot.warning {
    background-color: #ff9800;
  }
`;
document.head.appendChild(style);
