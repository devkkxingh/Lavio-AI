/**
 * Action Executor for Lavio AI Assistant
 * Executes user-requested actions on webpage elements
 */

class ActionExecutor {
  constructor() {
    this.lastAction = null;
    this.highlightedElement = null;
  }

  /**
   * Execute a click action on an element
   * @param {HTMLElement} element - Element to click
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Result of action
   */
  async executeClick(element, options = {}) {
    try {
      if (!element) {
        return { success: false, error: "Element not found" };
      }

      // Highlight before clicking (if enabled)
      if (options.highlight !== false) {
        await this.highlightElement(element, "click");
      }

      // Scroll element into view
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });

      // Wait a moment for scroll
      await this.sleep(options.delay || 300);

      // Execute click
      element.click();

      this.lastAction = {
        type: "click",
        element: element,
        timestamp: Date.now(),
      };

      return {
        success: true,
        action: "click",
        elementText: element.textContent?.trim() || element.value || "element",
      };
    } catch (error) {
      console.error("Error executing click:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a scroll action
   * @param {string} direction - Direction to scroll (up, down, top, bottom)
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Result of action
   */
  async executeScroll(direction, options = {}) {
    try {
      const amount = options.amount || 500;

      switch (direction.toLowerCase()) {
        case "up":
          window.scrollBy({ top: -amount, behavior: "smooth" });
          break;
        case "down":
          window.scrollBy({ top: amount, behavior: "smooth" });
          break;
        case "top":
          window.scrollTo({ top: 0, behavior: "smooth" });
          break;
        case "bottom":
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth",
          });
          break;
        case "left":
          window.scrollBy({ left: -amount, behavior: "smooth" });
          break;
        case "right":
          window.scrollBy({ left: amount, behavior: "smooth" });
          break;
        default:
          return { success: false, error: `Unknown direction: ${direction}` };
      }

      this.lastAction = {
        type: "scroll",
        direction: direction,
        timestamp: Date.now(),
      };

      return { success: true, action: "scroll", direction: direction };
    } catch (error) {
      console.error("Error executing scroll:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a navigation action
   * @param {string} action - Navigation action (back, forward, refresh)
   * @returns {Promise<Object>} Result of action
   */
  async executeNavigate(action) {
    try {
      switch (action.toLowerCase()) {
        case "back":
          window.history.back();
          break;
        case "forward":
          window.history.forward();
          break;
        case "refresh":
        case "reload":
          window.location.reload();
          break;
        default:
          return { success: false, error: `Unknown navigation: ${action}` };
      }

      this.lastAction = {
        type: "navigate",
        action: action,
        timestamp: Date.now(),
      };

      return { success: true, action: "navigate", navigationAction: action };
    } catch (error) {
      console.error("Error executing navigation:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a type action (input text)
   * @param {HTMLElement} element - Input element
   * @param {string} text - Text to type
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Result of action
   */
  async executeType(element, text, options = {}) {
    try {
      if (!element) {
        return { success: false, error: "Element not found" };
      }

      // Highlight before typing (if enabled)
      if (options.highlight !== false) {
        await this.highlightElement(element, "type");
      }

      // Scroll element into view
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });

      // Wait a moment for scroll
      await this.sleep(options.delay || 300);

      // Focus the element
      element.focus();

      // Clear existing value if requested
      if (options.clear !== false) {
        element.value = "";
      }

      // Type the text
      element.value = text;

      // Trigger input events for React/Vue compatibility
      const inputEvent = new Event("input", { bubbles: true });
      element.dispatchEvent(inputEvent);

      const changeEvent = new Event("change", { bubbles: true });
      element.dispatchEvent(changeEvent);

      this.lastAction = {
        type: "type",
        element: element,
        text: text,
        timestamp: Date.now(),
      };

      return { success: true, action: "type", text: text };
    } catch (error) {
      console.error("Error executing type:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a focus action (focus on input without typing)
   * @param {HTMLElement} element - Element to focus
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Result of action
   */
  async executeFocus(element, options = {}) {
    try {
      if (!element) {
        return { success: false, error: "Element not found" };
      }

      // Highlight before focusing (if enabled)
      if (options.highlight !== false) {
        await this.highlightElement(element, "focus");
      }

      // Scroll element into view
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });

      // Wait a moment for scroll
      await this.sleep(options.delay || 300);

      // Focus the element
      element.focus();

      this.lastAction = {
        type: "focus",
        element: element,
        timestamp: Date.now(),
      };

      return { success: true, action: "focus" };
    } catch (error) {
      console.error("Error executing focus:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Highlight an element with visual feedback
   * @param {HTMLElement} element - Element to highlight
   * @param {string} actionType - Type of action being performed
   * @returns {Promise<void>}
   */
  async highlightElement(element, actionType = "click") {
    // Remove previous highlight
    if (this.highlightedElement) {
      this.removeHighlight();
    }

    // Store original styles
    const originalOutline = element.style.outline;
    const originalOutlineOffset = element.style.outlineOffset;
    const originalZIndex = element.style.zIndex;

    // Apply highlight
    element.style.outline = "3px solid #FFD700";
    element.style.outlineOffset = "2px";
    element.style.zIndex = "999999";

    this.highlightedElement = {
      element,
      originalOutline,
      originalOutlineOffset,
      originalZIndex,
    };

    // Create label
    const label = this.createActionLabel(element, actionType);

    // Auto-remove after delay
    setTimeout(() => {
      this.removeHighlight();
      if (label && label.parentNode) {
        label.remove();
      }
    }, 1500);
  }

  /**
   * Create a label showing the action
   */
  createActionLabel(element, actionType) {
    const label = document.createElement("div");
    label.className = "lavio-action-label";

    const actionText =
      {
        click: "Clicking",
        type: "Typing",
        focus: "Focusing",
      }[actionType] || "Action";

    label.textContent = actionText;
    label.style.cssText = `
      position: absolute;
      background: #FFD700;
      color: #000;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      z-index: 1000000;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;

    // Position above element
    const rect = element.getBoundingClientRect();
    label.style.top = `${window.scrollY + rect.top - 30}px`;
    label.style.left = `${window.scrollX + rect.left}px`;

    document.body.appendChild(label);
    return label;
  }

  /**
   * Remove highlight from element
   */
  removeHighlight() {
    if (this.highlightedElement) {
      const {
        element,
        originalOutline,
        originalOutlineOffset,
        originalZIndex,
      } = this.highlightedElement;

      element.style.outline = originalOutline;
      element.style.outlineOffset = originalOutlineOffset;
      element.style.zIndex = originalZIndex;

      this.highlightedElement = null;
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get last executed action
   */
  getLastAction() {
    return this.lastAction;
  }

  /**
   * Validate if action is safe to execute
   * @param {string} actionType - Type of action
   * @param {HTMLElement} element - Target element
   * @returns {Object} Validation result
   */
  validateAction(actionType, element) {
    // Whitelist of safe actions
    const safeActions = ["click", "scroll", "focus", "type"];

    if (!safeActions.includes(actionType)) {
      return {
        safe: false,
        reason: `Action type "${actionType}" is not whitelisted`,
      };
    }

    // Check if element is valid
    if (actionType !== "scroll" && !element) {
      return { safe: false, reason: "Target element not found" };
    }

    // Check if element is still in DOM
    if (element && !document.body.contains(element)) {
      return { safe: false, reason: "Element is no longer in document" };
    }

    // Block actions on sensitive elements
    if (element) {
      const tagName = element.tagName.toLowerCase();
      const type = element.type?.toLowerCase();

      // Block file inputs
      if (tagName === "input" && type === "file") {
        return { safe: false, reason: "File inputs are not allowed" };
      }

      // Warn on password inputs
      if (tagName === "input" && type === "password") {
        return {
          safe: true,
          needsConfirmation: true,
          reason: "Action involves password field",
        };
      }

      // Warn on submit buttons
      if (
        (tagName === "button" && type === "submit") ||
        (tagName === "input" && type === "submit")
      ) {
        return {
          safe: true,
          needsConfirmation: true,
          reason: "Action will submit a form",
        };
      }
    }

    return { safe: true };
  }
}

// Export for use in content.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = ActionExecutor;
}
