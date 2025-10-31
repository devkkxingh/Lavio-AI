/**
 * Element Detector for Lavio AI Assistant
 * Scans the webpage for interactive elements that can be controlled via voice
 */

class ElementDetector {
  constructor() {
    this.detectedElements = [];
  }

  /**
   * Get all interactive elements on the page
   * @returns {Array} Array of detected elements with metadata
   */
  getAllInteractiveElements() {
    this.detectedElements = [];

    // Detect different types of elements
    const buttons = this.getAllButtons();
    const links = this.getAllLinks();
    const inputs = this.getAllInputs();
    const searchBars = this.getAllSearchBars();

    // Combine and deduplicate
    this.detectedElements = [...searchBars, ...buttons, ...links, ...inputs];

    // Remove duplicates by unique ID
    const seen = new Set();
    this.detectedElements = this.detectedElements.filter((element) => {
      const id = element.uniqueId;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    return this.detectedElements;
  }

  /**
   * Get all button elements
   */
  getAllButtons() {
    const buttons = [];
    const buttonElements = document.querySelectorAll(
      'button, input[type="button"], input[type="submit"], [role="button"]'
    );

    buttonElements.forEach((element, index) => {
      if (!this.isVisible(element)) return;

      buttons.push({
        type: "button",
        element: element,
        text: this.getElementText(element),
        ariaLabel: element.getAttribute("aria-label"),
        id: element.id,
        className: element.className,
        position: this.getElementPosition(element),
        uniqueId: this.generateUniqueId(element, "button", index),
      });
    });

    return buttons;
  }

  /**
   * Get all link elements
   */
  getAllLinks() {
    const links = [];
    const linkElements = document.querySelectorAll("a[href]");

    linkElements.forEach((element, index) => {
      if (!this.isVisible(element)) return;

      // Skip if link is too small (likely decorative)
      const rect = element.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;

      links.push({
        type: "link",
        element: element,
        text: this.getElementText(element),
        href: element.href,
        ariaLabel: element.getAttribute("aria-label"),
        id: element.id,
        className: element.className,
        position: this.getElementPosition(element),
        uniqueId: this.generateUniqueId(element, "link", index),
      });
    });

    return links;
  }

  /**
   * Get all input elements
   */
  getAllInputs() {
    const inputs = [];
    const inputElements = document.querySelectorAll(
      'input:not([type="hidden"]):not([type="button"]):not([type="submit"]), textarea'
    );

    inputElements.forEach((element, index) => {
      if (!this.isVisible(element)) return;

      inputs.push({
        type: "input",
        inputType: element.type || "text",
        element: element,
        placeholder: element.placeholder,
        ariaLabel: element.getAttribute("aria-label"),
        label: this.getInputLabel(element),
        id: element.id,
        name: element.name,
        className: element.className,
        position: this.getElementPosition(element),
        uniqueId: this.generateUniqueId(element, "input", index),
      });
    });

    return inputs;
  }

  /**
   * Get all search bar elements (prioritized detection)
   */
  getAllSearchBars() {
    const searchBars = [];
    const searchSelectors = [
      'input[type="search"]',
      'input[name*="search" i]',
      'input[id*="search" i]',
      'input[placeholder*="search" i]',
      'input[aria-label*="search" i]',
      '[role="search"] input',
    ];

    const searchElements = document.querySelectorAll(searchSelectors.join(","));

    searchElements.forEach((element, index) => {
      if (!this.isVisible(element)) return;

      searchBars.push({
        type: "search",
        inputType: element.type || "text",
        element: element,
        placeholder: element.placeholder,
        ariaLabel: element.getAttribute("aria-label"),
        label: this.getInputLabel(element) || "Search",
        id: element.id,
        name: element.name,
        className: element.className,
        position: this.getElementPosition(element),
        uniqueId: this.generateUniqueId(element, "search", index),
      });
    });

    return searchBars;
  }

  /**
   * Check if element is visible
   */
  isVisible(element) {
    if (!element) return false;

    const style = window.getComputedStyle(element);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    return true;
  }

  /**
   * Get text content of element
   */
  getElementText(element) {
    // Try different text sources
    const text =
      element.textContent?.trim() ||
      element.innerText?.trim() ||
      element.value?.trim() ||
      element.getAttribute("aria-label") ||
      element.getAttribute("title") ||
      element.getAttribute("alt") ||
      "";

    // Limit text length
    return text.substring(0, 100);
  }

  /**
   * Get label for input element
   */
  getInputLabel(element) {
    // Try to find associated label
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label.textContent.trim();
    }

    // Try parent label
    const parentLabel = element.closest("label");
    if (parentLabel) {
      return parentLabel.textContent.replace(element.value || "", "").trim();
    }

    // Try placeholder or aria-label
    return (
      element.placeholder ||
      element.getAttribute("aria-label") ||
      element.name ||
      ""
    );
  }

  /**
   * Get element position relative to viewport
   */
  getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    };
  }

  /**
   * Generate unique ID for element
   */
  generateUniqueId(element, type, index) {
    const id = element.id || "";
    const className = element.className || "";
    const text = this.getElementText(element).substring(0, 20);

    return `${type}_${id}_${className}_${text}_${index}`
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "");
  }

  /**
   * Find best matching element by description
   * @param {string} description - Natural language description (e.g., "search bar", "login button")
   * @returns {Object|null} Best matching element or null
   */
  findElementByDescription(description) {
    if (!description) return null;

    const lowerDesc = description.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    this.detectedElements.forEach((element) => {
      const score = this.calculateMatchScore(element, lowerDesc);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = element;
      }
    });

    // Return match only if confidence is high enough
    return bestScore > 0.3 ? bestMatch : null;
  }

  /**
   * Calculate match score between element and description
   */
  calculateMatchScore(element, description) {
    let score = 0;

    // Check element type match
    if (description.includes(element.type)) {
      score += 0.3;
    }

    // Check text content match
    const elementText = (
      element.text ||
      element.label ||
      element.placeholder ||
      ""
    ).toLowerCase();

    if (elementText && description.includes(elementText)) {
      score += 0.5;
    } else if (elementText) {
      // Partial word match
      const words = description.split(/\s+/);
      words.forEach((word) => {
        if (elementText.includes(word) && word.length > 2) {
          score += 0.1;
        }
      });
    }

    // Check aria-label match
    const ariaLabel = (element.ariaLabel || "").toLowerCase();
    if (ariaLabel && description.includes(ariaLabel)) {
      score += 0.4;
    }

    // Check placeholder match
    const placeholder = (element.placeholder || "").toLowerCase();
    if (placeholder && description.includes(placeholder)) {
      score += 0.3;
    }

    // Special bonus for search elements when description includes "search"
    if (element.type === "search" && description.includes("search")) {
      score += 0.4;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Get element statistics
   */
  getStats() {
    const stats = {
      total: this.detectedElements.length,
      byType: {},
    };

    this.detectedElements.forEach((element) => {
      const type = element.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  }
}

// Export for use in content.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = ElementDetector;
}
