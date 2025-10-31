/**
 * Lavio Page Manipulator
 * Allows users to customize page appearance via voice commands
 * All changes are reversible and safe
 */

class PageManipulator {
  constructor() {
    // Store original styles for reset functionality
    this.originalStyles = new Map();

    // Track active manipulations
    this.activeManipulations = [];

    // Custom CSS element
    this.customStyleElement = null;

    // Dark mode state
    this.isDarkModeEnabled = false;

    // Text size multiplier
    this.textSizeMultiplier = 1.0;

    // Hidden elements
    this.hiddenElements = [];

    // Initialize
    this.init();
  }

  /**
   * Initialize the manipulator
   */
  init() {
    console.log("Lavio Page Manipulator: Initialized");
    this.createCustomStyleElement();
    this.loadPersistedState();
  }

  /**
   * Create a custom style element for injecting CSS
   */
  createCustomStyleElement() {
    if (!this.customStyleElement) {
      this.customStyleElement = document.createElement("style");
      this.customStyleElement.id = "lavio-custom-styles";
      document.head.appendChild(this.customStyleElement);
    }
  }

  /**
   * Load persisted state from storage
   * DISABLED: Text size should NOT persist across page reloads
   */
  async loadPersistedState() {
    // Persistence disabled - text size resets on page refresh
    // If you want persistence, uncomment the code below:

    /*
    try {
      const result = await chrome.storage.local.get([
        "lavioTextSize",
        "lavioDarkMode",
      ]);

      if (result.lavioTextSize) {
        this.textSizeMultiplier = result.lavioTextSize;
        this.applyTextSize(this.textSizeMultiplier);
      }

      if (result.lavioDarkMode) {
        this.isDarkModeEnabled = true;
        this.applyDarkMode();
      }

      console.log("Lavio Page Manipulator: Loaded persisted state");
    } catch (error) {
      console.error("Lavio Page Manipulator: Error loading state:", error);
    }
    */

    console.log(
      "Lavio Page Manipulator: Persistence disabled - styles reset on refresh"
    );
  }

  /**
   * Save state to storage
   */
  async saveState() {
    try {
      await chrome.storage.local.set({
        lavioTextSize: this.textSizeMultiplier,
        lavioDarkMode: this.isDarkModeEnabled,
      });
      console.log("Lavio Page Manipulator: State saved");
    } catch (error) {
      console.error("Lavio Page Manipulator: Error saving state:", error);
    }
  }

  // ============================================================================
  // TEXT SIZE CONTROL
  // ============================================================================

  /**
   * Adjust text size
   * @param {string} action - "increase", "decrease", "reset", or specific value
   * @param {number} value - Optional specific size multiplier
   * @returns {Object} Result with success status and message
   */
  adjustTextSize(action, value = null) {
    try {
      let newMultiplier = this.textSizeMultiplier;

      switch (action.toLowerCase()) {
        case "increase":
        case "larger":
        case "bigger":
          newMultiplier = Math.min(this.textSizeMultiplier + 0.1, 2.0);
          break;

        case "decrease":
        case "smaller":
          newMultiplier = Math.max(this.textSizeMultiplier - 0.1, 0.5);
          break;

        case "reset":
          newMultiplier = 1.0;
          break;

        case "set":
          if (value && value >= 0.5 && value <= 2.0) {
            newMultiplier = value;
          }
          break;

        default:
          return {
            success: false,
            message: `Unknown text size action: ${action}`,
          };
      }

      this.textSizeMultiplier = newMultiplier;
      this.applyTextSize(newMultiplier);
      // this.saveState(); // Disabled - no persistence

      const percentage = Math.round(newMultiplier * 100);
      return {
        success: true,
        message: `Text size adjusted to ${percentage}%`,
        value: newMultiplier,
      };
    } catch (error) {
      console.error(
        "Lavio Page Manipulator: Error adjusting text size:",
        error
      );
      return {
        success: false,
        message: "Failed to adjust text size",
        error: error.message,
      };
    }
  }

  /**
   * Apply text size multiplier
   * @param {number} multiplier - Size multiplier (0.5 to 2.0)
   */
  applyTextSize(multiplier) {
    // Round to 2 decimal places to avoid floating point precision issues
    const roundedMultiplier = Math.round(multiplier * 100) / 100;

    const css = `
      body *:not([id^="lavio-"]):not([class^="lavio-"]) {
        font-size: calc(1em * ${roundedMultiplier}) !important;
        line-height: calc(1.5 * ${roundedMultiplier}) !important;
      }
    `;
    this.updateCustomStyles("textSize", css);
    this.addManipulation(
      "textSize",
      `Text size: ${Math.round(roundedMultiplier * 100)}%`
    );
  }

  // ============================================================================
  // DARK MODE
  // ============================================================================

  /**
   * Toggle dark mode
   * @param {boolean} enable - True to enable, false to disable
   * @returns {Object} Result with success status and message
   */
  toggleDarkMode(enable = null) {
    try {
      // If enable is null, toggle current state
      if (enable === null) {
        enable = !this.isDarkModeEnabled;
      }

      this.isDarkModeEnabled = enable;

      if (enable) {
        this.applyDarkMode();
      } else {
        this.removeDarkMode();
      }

      // this.saveState(); // Disabled - no persistence

      return {
        success: true,
        message: enable ? "Dark mode enabled" : "Dark mode disabled",
        enabled: enable,
      };
    } catch (error) {
      console.error("Lavio Page Manipulator: Error toggling dark mode:", error);
      return {
        success: false,
        message: "Failed to toggle dark mode",
        error: error.message,
      };
    }
  }

  /**
   * Apply dark mode styles
   */
  applyDarkMode() {
    const css = `
      html {
        filter: invert(1) hue-rotate(180deg) !important;
        background: #000 !important;
      }
      
      /* Exclude Lavio widget from dark mode filter */
      [id^="lavio-"], [class^="lavio-"] {
        filter: invert(1) hue-rotate(180deg) !important;
      }
      
      img:not([id^="lavio-"]):not([class^="lavio-"]), 
      picture:not([id^="lavio-"]):not([class^="lavio-"]), 
      video:not([id^="lavio-"]):not([class^="lavio-"]), 
      canvas:not([id^="lavio-"]):not([class^="lavio-"]), 
      svg:not([id^="lavio-"]):not([class^="lavio-"]), 
      iframe:not([id^="lavio-"]):not([class^="lavio-"]) {
        filter: invert(1) hue-rotate(180deg) !important;
      }
      
      *:not([id^="lavio-"]):not([class^="lavio-"]) {
        background-color: inherit !important;
        border-color: inherit !important;
      }
    `;
    this.updateCustomStyles("darkMode", css);
    this.addManipulation("darkMode", "Dark mode enabled");
  }

  /**
   * Remove dark mode styles
   */
  removeDarkMode() {
    this.updateCustomStyles("darkMode", "");
    this.removeManipulation("darkMode");
  }

  // ============================================================================
  // COLOR ADJUSTMENTS
  // ============================================================================

  /**
   * Change background color
   * @param {string} color - Color value (name, hex, rgb)
   * @returns {Object} Result with success status and message
   */
  changeBackgroundColor(color) {
    try {
      const css = `
        body {
          background-color: ${color} !important;
        }
      `;
      this.updateCustomStyles("backgroundColor", css);
      this.addManipulation("backgroundColor", `Background: ${color}`);

      return {
        success: true,
        message: `Background color changed to ${color}`,
        color: color,
      };
    } catch (error) {
      console.error(
        "Lavio Page Manipulator: Error changing background:",
        error
      );
      return {
        success: false,
        message: "Failed to change background color",
        error: error.message,
      };
    }
  }

  /**
   * Change text color
   * @param {string} color - Color value (name, hex, rgb)
   * @returns {Object} Result with success status and message
   */
  changeTextColor(color) {
    try {
      const css = `
        body, body * {
          color: ${color} !important;
        }
      `;
      this.updateCustomStyles("textColor", css);
      this.addManipulation("textColor", `Text color: ${color}`);

      return {
        success: true,
        message: `Text color changed to ${color}`,
        color: color,
      };
    } catch (error) {
      console.error(
        "Lavio Page Manipulator: Error changing text color:",
        error
      );
      return {
        success: false,
        message: "Failed to change text color",
        error: error.message,
      };
    }
  }

  /**
   * Adjust contrast
   * @param {string} level - "low", "medium", "high", or "reset"
   * @returns {Object} Result with success status and message
   */
  adjustContrast(level) {
    try {
      let contrastValue = 1.0;

      switch (level.toLowerCase()) {
        case "low":
          contrastValue = 0.8;
          break;
        case "medium":
        case "normal":
          contrastValue = 1.0;
          break;
        case "high":
          contrastValue = 1.5;
          break;
        case "reset":
          this.updateCustomStyles("contrast", "");
          this.removeManipulation("contrast");
          return {
            success: true,
            message: "Contrast reset to normal",
          };
        default:
          return {
            success: false,
            message: `Unknown contrast level: ${level}`,
          };
      }

      const css = `
        body {
          filter: contrast(${contrastValue}) !important;
        }
      `;
      this.updateCustomStyles("contrast", css);
      this.addManipulation("contrast", `Contrast: ${level}`);

      return {
        success: true,
        message: `Contrast set to ${level}`,
        value: contrastValue,
      };
    } catch (error) {
      console.error("Lavio Page Manipulator: Error adjusting contrast:", error);
      return {
        success: false,
        message: "Failed to adjust contrast",
        error: error.message,
      };
    }
  }

  // ============================================================================
  // CONTENT VISIBILITY
  // ============================================================================

  /**
   * Hide elements by selector or type
   * @param {string} target - Element selector or type (ads, sidebar, etc.)
   * @returns {Object} Result with success status and message
   */
  hideElements(target) {
    try {
      let selector = "";
      let description = "";

      // Common targets
      switch (target.toLowerCase()) {
        case "ads":
        case "advertisements":
          selector =
            '[class*="ad-"], [id*="ad-"], [class*="advertisement"], iframe[src*="doubleclick"], iframe[src*="googlesyndication"]';
          description = "advertisements";
          break;

        case "sidebar":
        case "sidebars":
          selector = '[class*="sidebar"], [id*="sidebar"], aside';
          description = "sidebar";
          break;

        case "header":
        case "headers":
          selector = "header, [role='banner']";
          description = "header";
          break;

        case "footer":
        case "footers":
          selector = "footer, [role='contentinfo']";
          description = "footer";
          break;

        case "images":
          selector = "img";
          description = "images";
          break;

        case "videos":
          selector = "video, iframe[src*='youtube'], iframe[src*='vimeo']";
          description = "videos";
          break;

        default:
          // Assume it's a custom selector
          selector = target;
          description = target;
      }

      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        return {
          success: false,
          message: `No ${description} found on this page`,
        };
      }

      elements.forEach((el) => {
        if (!el.hasAttribute("data-lavio-hidden")) {
          el.setAttribute("data-lavio-hidden", "true");
          el.setAttribute("data-lavio-display", el.style.display || "");
          el.style.display = "none";
          this.hiddenElements.push(el);
        }
      });

      this.addManipulation(
        `hide_${target}`,
        `Hidden: ${description} (${elements.length})`
      );

      return {
        success: true,
        message: `Hidden ${elements.length} ${description}`,
        count: elements.length,
      };
    } catch (error) {
      console.error("Lavio Page Manipulator: Error hiding elements:", error);
      return {
        success: false,
        message: "Failed to hide elements",
        error: error.message,
      };
    }
  }

  /**
   * Show previously hidden elements
   * @param {string} target - Element selector or type
   * @returns {Object} Result with success status and message
   */
  showElements(target) {
    try {
      const elements = document.querySelectorAll('[data-lavio-hidden="true"]');
      let count = 0;

      elements.forEach((el) => {
        el.removeAttribute("data-lavio-hidden");
        const originalDisplay = el.getAttribute("data-lavio-display") || "";
        el.style.display = originalDisplay;
        el.removeAttribute("data-lavio-display");
        count++;
      });

      this.hiddenElements = [];
      this.removeManipulation(`hide_${target}`);

      return {
        success: true,
        message:
          count > 0
            ? `Showed ${count} hidden elements`
            : "No hidden elements found",
        count: count,
      };
    } catch (error) {
      console.error("Lavio Page Manipulator: Error showing elements:", error);
      return {
        success: false,
        message: "Failed to show elements",
        error: error.message,
      };
    }
  }

  /**
   * Enable reader mode (show only main content)
   * @returns {Object} Result with success status and message
   */
  enableReaderMode() {
    try {
      // Find main content
      const mainContent =
        document.querySelector("main") ||
        document.querySelector('[role="main"]') ||
        document.querySelector("article") ||
        document.querySelector("#content") ||
        document.querySelector(".content");

      if (!mainContent) {
        return {
          success: false,
          message: "Could not identify main content on this page",
        };
      }

      // Hide everything except main content and Lavio elements
      const css = `
        body > * {
          display: none !important;
        }
        
        main, [role="main"], article {
          display: block !important;
        }
        
        [id^="lavio-"], [class^="lavio-"] {
          display: block !important;
          display: flex !important;
        }
      `;
      this.updateCustomStyles("readerMode", css);
      this.addManipulation("readerMode", "Reader mode enabled");

      return {
        success: true,
        message: "Reader mode enabled",
      };
    } catch (error) {
      console.error(
        "Lavio Page Manipulator: Error enabling reader mode:",
        error
      );
      return {
        success: false,
        message: "Failed to enable reader mode",
        error: error.message,
      };
    }
  }

  /**
   * Disable reader mode
   * @returns {Object} Result with success status and message
   */
  disableReaderMode() {
    this.updateCustomStyles("readerMode", "");
    this.removeManipulation("readerMode");
    return {
      success: true,
      message: "Reader mode disabled",
    };
  }

  // ============================================================================
  // LAYOUT ADJUSTMENTS
  // ============================================================================

  /**
   * Adjust content width
   * @param {string} width - "narrow", "medium", "wide", "full", or specific value
   * @returns {Object} Result with success status and message
   */
  adjustWidth(width) {
    try {
      let maxWidth = "";

      switch (width.toLowerCase()) {
        case "narrow":
          maxWidth = "600px";
          break;
        case "medium":
        case "normal":
          maxWidth = "900px";
          break;
        case "wide":
          maxWidth = "1400px";
          break;
        case "full":
          maxWidth = "100%";
          break;
        default:
          maxWidth = width;
      }

      const css = `
        body {
          max-width: ${maxWidth} !important;
          margin: 0 auto !important;
        }
      `;
      this.updateCustomStyles("width", css);
      this.addManipulation("width", `Width: ${width}`);

      return {
        success: true,
        message: `Content width set to ${width}`,
        width: maxWidth,
      };
    } catch (error) {
      console.error("Lavio Page Manipulator: Error adjusting width:", error);
      return {
        success: false,
        message: "Failed to adjust width",
        error: error.message,
      };
    }
  }

  /**
   * Center content
   * @returns {Object} Result with success status and message
   */
  centerContent() {
    try {
      const css = `
        body {
          text-align: center !important;
        }
        
        body > * {
          margin-left: auto !important;
          margin-right: auto !important;
        }
      `;
      this.updateCustomStyles("center", css);
      this.addManipulation("center", "Content centered");

      return {
        success: true,
        message: "Content centered",
      };
    } catch (error) {
      console.error("Lavio Page Manipulator: Error centering content:", error);
      return {
        success: false,
        message: "Failed to center content",
        error: error.message,
      };
    }
  }

  // ============================================================================
  // FOCUS MODE
  // ============================================================================

  /**
   * Enable focus mode (hide distractions)
   * @returns {Object} Result with success status and message
   */
  enableFocusMode() {
    try {
      // Hide common distracting elements
      const distractionSelectors = [
        '[class*="ad-"]',
        '[class*="sidebar"]',
        '[class*="comment"]',
        '[class*="related"]',
        '[class*="recommend"]',
        "aside",
        "nav:not([aria-label='Main'])",
      ];

      let hiddenCount = 0;
      distractionSelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          if (!el.hasAttribute("data-lavio-focus-hidden")) {
            el.setAttribute("data-lavio-focus-hidden", "true");
            el.setAttribute("data-lavio-display", el.style.display || "");
            el.style.display = "none";
            hiddenCount++;
          }
        });
      });

      // Apply focus styles
      const css = `
        body {
          line-height: 1.8 !important;
        }
        
        main, article {
          padding: 40px !important;
          max-width: 800px !important;
          margin: 0 auto !important;
        }
      `;
      this.updateCustomStyles("focusMode", css);
      this.addManipulation("focusMode", "Focus mode enabled");

      return {
        success: true,
        message: `Focus mode enabled (hidden ${hiddenCount} distractions)`,
        hiddenCount: hiddenCount,
      };
    } catch (error) {
      console.error(
        "Lavio Page Manipulator: Error enabling focus mode:",
        error
      );
      return {
        success: false,
        message: "Failed to enable focus mode",
        error: error.message,
      };
    }
  }

  /**
   * Disable focus mode
   * @returns {Object} Result with success status and message
   */
  disableFocusMode() {
    try {
      // Restore hidden elements
      const elements = document.querySelectorAll(
        '[data-lavio-focus-hidden="true"]'
      );
      elements.forEach((el) => {
        el.removeAttribute("data-lavio-focus-hidden");
        const originalDisplay = el.getAttribute("data-lavio-display") || "";
        el.style.display = originalDisplay;
        el.removeAttribute("data-lavio-display");
      });

      this.updateCustomStyles("focusMode", "");
      this.removeManipulation("focusMode");

      return {
        success: true,
        message: "Focus mode disabled",
      };
    } catch (error) {
      console.error(
        "Lavio Page Manipulator: Error disabling focus mode:",
        error
      );
      return {
        success: false,
        message: "Failed to disable focus mode",
        error: error.message,
      };
    }
  }

  // ============================================================================
  // ZOOM CONTROL
  // ============================================================================

  /**
   * Set zoom level
   * @param {string|number} level - "in", "out", "reset", or specific percentage
   * @returns {Object} Result with success status and message
   */
  setZoom(level) {
    try {
      let zoomValue = parseFloat(document.body.style.zoom) || 1.0;

      if (typeof level === "string") {
        switch (level.toLowerCase()) {
          case "in":
            zoomValue = Math.min(zoomValue + 0.1, 2.0);
            break;
          case "out":
            zoomValue = Math.max(zoomValue - 0.1, 0.5);
            break;
          case "reset":
            zoomValue = 1.0;
            break;
          default:
            // Try to parse as number
            const parsed = parseFloat(level);
            if (!isNaN(parsed)) {
              zoomValue = Math.max(0.5, Math.min(parsed / 100, 2.0));
            }
        }
      } else {
        zoomValue = Math.max(0.5, Math.min(level, 2.0));
      }

      document.body.style.zoom = zoomValue;
      this.addManipulation("zoom", `Zoom: ${Math.round(zoomValue * 100)}%`);

      return {
        success: true,
        message: `Zoom set to ${Math.round(zoomValue * 100)}%`,
        zoom: zoomValue,
      };
    } catch (error) {
      console.error("Lavio Page Manipulator: Error setting zoom:", error);
      return {
        success: false,
        message: "Failed to set zoom",
        error: error.message,
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Update custom styles for a specific manipulation
   * @param {string} id - Manipulation ID
   * @param {string} css - CSS to apply
   */
  updateCustomStyles(id, css) {
    if (!this.customStyleElement) {
      this.createCustomStyleElement();
    }

    // Get existing content
    let existingCSS = this.customStyleElement.textContent || "";

    // Remove previous CSS for this ID
    const regex = new RegExp(
      `\\/\\* ${id} start \\*\\/[\\s\\S]*?\\/\\* ${id} end \\*\\/`,
      "g"
    );
    existingCSS = existingCSS.replace(regex, "");

    // Add new CSS if provided
    if (css) {
      existingCSS += `\n/* ${id} start */\n${css}\n/* ${id} end */\n`;
    }

    this.customStyleElement.textContent = existingCSS;
  }

  /**
   * Add a manipulation to the active list
   * @param {string} id - Manipulation ID
   * @param {string} description - Human-readable description
   */
  addManipulation(id, description) {
    // Remove existing manipulation with same ID
    this.activeManipulations = this.activeManipulations.filter(
      (m) => m.id !== id
    );

    // Add new manipulation
    this.activeManipulations.push({
      id: id,
      description: description,
      timestamp: Date.now(),
    });
  }

  /**
   * Remove a manipulation from the active list
   * @param {string} id - Manipulation ID
   */
  removeManipulation(id) {
    this.activeManipulations = this.activeManipulations.filter(
      (m) => m.id !== id
    );
  }

  /**
   * Get list of active manipulations
   * @returns {Array} List of active manipulations
   */
  getActiveManipulations() {
    return this.activeManipulations;
  }

  /**
   * Reset all manipulations
   * @returns {Object} Result with success status and message
   */
  resetAll() {
    try {
      // Clear custom styles
      if (this.customStyleElement) {
        this.customStyleElement.textContent = "";
      }

      // Restore hidden elements
      this.hiddenElements.forEach((el) => {
        if (el.hasAttribute("data-lavio-hidden")) {
          const originalDisplay = el.getAttribute("data-lavio-display") || "";
          el.style.display = originalDisplay;
          el.removeAttribute("data-lavio-hidden");
          el.removeAttribute("data-lavio-display");
        }
      });

      // Restore focus mode hidden elements
      document
        .querySelectorAll('[data-lavio-focus-hidden="true"]')
        .forEach((el) => {
          const originalDisplay = el.getAttribute("data-lavio-display") || "";
          el.style.display = originalDisplay;
          el.removeAttribute("data-lavio-focus-hidden");
          el.removeAttribute("data-lavio-display");
        });

      // Reset zoom
      document.body.style.zoom = "";

      // Clear state
      this.activeManipulations = [];
      this.hiddenElements = [];
      this.isDarkModeEnabled = false;
      this.textSizeMultiplier = 1.0;

      // Clear storage
      chrome.storage.local.remove(["lavioTextSize", "lavioDarkMode"]);

      console.log("Lavio Page Manipulator: All manipulations reset");

      return {
        success: true,
        message: "All page customizations reset",
      };
    } catch (error) {
      console.error("Lavio Page Manipulator: Error resetting:", error);
      return {
        success: false,
        message: "Failed to reset all customizations",
        error: error.message,
      };
    }
  }

  /**
   * Undo last manipulation
   * @returns {Object} Result with success status and message
   */
  undoLast() {
    if (this.activeManipulations.length === 0) {
      return {
        success: false,
        message: "No manipulations to undo",
      };
    }

    const last = this.activeManipulations[this.activeManipulations.length - 1];
    this.updateCustomStyles(last.id, "");
    this.removeManipulation(last.id);

    return {
      success: true,
      message: `Undone: ${last.description}`,
    };
  }
}

// Export for use in content.js
if (typeof window !== "undefined") {
  window.PageManipulator = PageManipulator;
}
