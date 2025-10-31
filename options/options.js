class LavioOptions {
  constructor() {
    this.defaultSettings = {
      voiceEnabled: true,
      autoSummarize: false,
      showFloatingButton: true,
      preferredLanguage: 'en',
      responseLength: 'medium',
      contextAwareness: true,
      conversationMemory: true,
      maxHistory: 20,
      saveHistory: true,
      clearOnExit: false,
      debugMode: false,
      experimentalFeatures: false
    };
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(this.defaultSettings);
      this.settings = { ...this.defaultSettings, ...result };
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = { ...this.defaultSettings };
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set(this.settings);
      this.showStatus('Settings saved successfully!', 'success');
      
      // Notify background script of settings change
      chrome.runtime.sendMessage({
        type: 'SETTINGS_UPDATED',
        settings: this.settings
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showStatus('Error saving settings. Please try again.', 'error');
    }
  }

  setupEventListeners() {
    // Toggle switches
    const toggles = [
      'voice-enabled',
      'auto-summarize', 
      'show-floating-button',
      'context-awareness',
      'conversation-memory',
      'save-history',
      'clear-on-exit',
      'debug-mode',
      'experimental-features'
    ];

    toggles.forEach(id => {
      const toggle = document.getElementById(id);
      if (toggle) {
        toggle.addEventListener('click', () => this.handleToggle(id));
      }
    });

    // Select dropdowns
    const selects = ['preferred-language', 'response-length'];
    selects.forEach(id => {
      const select = document.getElementById(id);
      if (select) {
        select.addEventListener('change', (e) => this.handleSelectChange(id, e.target.value));
      }
    });

    // Number inputs
    const numberInput = document.getElementById('max-history');
    if (numberInput) {
      numberInput.addEventListener('change', (e) => {
        this.handleNumberChange('maxHistory', parseInt(e.target.value));
      });
    }

    // Action buttons
    document.getElementById('save-settings')?.addEventListener('click', () => this.saveSettings());
    document.getElementById('reset-settings')?.addEventListener('click', () => this.resetSettings());
    document.getElementById('export-settings')?.addEventListener('click', () => this.exportSettings());
    document.getElementById('clear-history')?.addEventListener('click', () => this.clearHistory());
  }

  handleToggle(toggleId) {
    const toggle = document.getElementById(toggleId);
    const isActive = toggle.classList.contains('active');
    
    // Toggle visual state
    if (isActive) {
      toggle.classList.remove('active');
    } else {
      toggle.classList.add('active');
    }

    // Update settings
    const settingKey = this.toggleIdToSettingKey(toggleId);
    this.settings[settingKey] = !isActive;
  }

  handleSelectChange(selectId, value) {
    const settingKey = this.selectIdToSettingKey(selectId);
    this.settings[settingKey] = value;
  }

  handleNumberChange(settingKey, value) {
    if (value >= 5 && value <= 100) {
      this.settings[settingKey] = value;
    }
  }

  toggleIdToSettingKey(toggleId) {
    const mapping = {
      'voice-enabled': 'voiceEnabled',
      'auto-summarize': 'autoSummarize',
      'show-floating-button': 'showFloatingButton',
      'context-awareness': 'contextAwareness',
      'conversation-memory': 'conversationMemory',
      'save-history': 'saveHistory',
      'clear-on-exit': 'clearOnExit',
      'debug-mode': 'debugMode',
      'experimental-features': 'experimentalFeatures'
    };
    return mapping[toggleId];
  }

  selectIdToSettingKey(selectId) {
    const mapping = {
      'preferred-language': 'preferredLanguage',
      'response-length': 'responseLength'
    };
    return mapping[selectId];
  }

  updateUI() {
    // Update toggles
    Object.keys(this.settings).forEach(key => {
      const toggleId = this.settingKeyToToggleId(key);
      if (toggleId) {
        const toggle = document.getElementById(toggleId);
        if (toggle) {
          if (this.settings[key]) {
            toggle.classList.add('active');
          } else {
            toggle.classList.remove('active');
          }
        }
      }
    });

    // Update selects
    const languageSelect = document.getElementById('preferred-language');
    if (languageSelect) {
      languageSelect.value = this.settings.preferredLanguage;
    }

    const lengthSelect = document.getElementById('response-length');
    if (lengthSelect) {
      lengthSelect.value = this.settings.responseLength;
    }

    // Update number inputs
    const historyInput = document.getElementById('max-history');
    if (historyInput) {
      historyInput.value = this.settings.maxHistory;
    }
  }

  settingKeyToToggleId(settingKey) {
    const mapping = {
      'voiceEnabled': 'voice-enabled',
      'autoSummarize': 'auto-summarize',
      'showFloatingButton': 'show-floating-button',
      'contextAwareness': 'context-awareness',
      'conversationMemory': 'conversation-memory',
      'saveHistory': 'save-history',
      'clearOnExit': 'clear-on-exit',
      'debugMode': 'debug-mode',
      'experimentalFeatures': 'experimental-features'
    };
    return mapping[settingKey];
  }

  async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      this.settings = { ...this.defaultSettings };
      this.updateUI();
      await this.saveSettings();
      this.showStatus('Settings reset to defaults!', 'success');
    }
  }

  exportSettings() {
    const settingsJson = JSON.stringify(this.settings, null, 2);
    const blob = new Blob([settingsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lavio-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showStatus('Settings exported successfully!', 'success');
  }

  async clearHistory() {
    if (confirm('Are you sure you want to clear all conversation history? This cannot be undone.')) {
      try {
        await chrome.storage.local.remove(['conversations', 'conversationHistory']);
        
        // Notify background script
        chrome.runtime.sendMessage({
          type: 'CLEAR_HISTORY'
        });
        
        this.showStatus('Conversation history cleared!', 'success');
      } catch (error) {
        console.error('Error clearing history:', error);
        this.showStatus('Error clearing history. Please try again.', 'error');
      }
    }
  }

  showStatus(message, type) {
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-message ${type}`;
      statusElement.style.display = 'block';
      
      // Hide after 3 seconds
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 3000);
    }
  }

  // Import settings from file
  async importSettings(file) {
    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text);
      
      // Validate imported settings
      const validSettings = {};
      Object.keys(this.defaultSettings).forEach(key => {
        if (importedSettings.hasOwnProperty(key)) {
          validSettings[key] = importedSettings[key];
        }
      });
      
      this.settings = { ...this.defaultSettings, ...validSettings };
      this.updateUI();
      await this.saveSettings();
      this.showStatus('Settings imported successfully!', 'success');
    } catch (error) {
      console.error('Error importing settings:', error);
      this.showStatus('Error importing settings. Please check the file format.', 'error');
    }
  }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new LavioOptions();
});

// Handle file import (if we add this feature later)
document.addEventListener('dragover', (e) => {
  e.preventDefault();
});

document.addEventListener('drop', async (e) => {
  e.preventDefault();
  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type === 'application/json') {
    const options = new LavioOptions();
    await options.importSettings(files[0]);
  }
});