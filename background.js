// Lavio AI Assistant - Background Service Worker
// Handles extension lifecycle, AI API initialization, and message passing

class LavioBackground {
  constructor() {
    this.aiSession = null;
    this.isAIAvailable = false;
    this.multimodalSupported = false;
    this.aiCapabilities = null;
    this.settings = {};

    this.initializeExtension();
  }

  async initializeExtension() {
    console.log("Lavio AI Assistant: Initializing...");

    // Initialize storage
    await this.initializeStorage();

    // Check for Chrome Built-in AI availability
    await this.checkAIAvailability();

    // Set up message listeners
    this.setupMessageListeners();

    console.log("Lavio AI Assistant: Initialization complete");
  }

  // Check if Chrome Built-in AI is available
  async checkAIAvailability() {
    try {
      // Check if LanguageModel is available
      if (typeof LanguageModel === "undefined") {
        console.log("LanguageModel API not available");
        this.isAIAvailable = false;
        return {
          available: false,
          error:
            "LanguageModel API not available. Please use Chrome Canary 128+ with AI features enabled.",
          multimodal: false,
        };
      }

      // Check basic availability first
      // Note: Multimodal capabilities (audio/image) are in origin trial and may not be available in Chrome Stable
      let multimodalAvailable = false;
      console.log(
        "Checking for multimodal capabilities (currently in origin trial)..."
      );

      // Try to detect multimodal capabilities by checking if we can create a session with multimodal input
      try {
        let audioSupported = false;
        let imageSupported = false;

        // Test audio multimodal support
        try {
          const audioTestSession = await LanguageModel.create({
            systemPrompt: "Test audio capabilities",
            expectedInputs: [{ type: "audio" }],
          });

          // Create a small test audio blob (empty but valid format)
          const testAudioBlob = new Blob([""], { type: "audio/wav" });

          await audioTestSession.prompt([
            {
              role: "user",
              content: [
                {
                  type: "text",
                  value: "Test audio",
                },
                {
                  type: "audio",
                  value: testAudioBlob,
                },
              ],
            },
          ]);

          audioSupported = true;
          console.log("✓ Audio multimodal capabilities detected");
          audioTestSession.destroy();
        } catch (audioError) {
          console.log("✗ Audio multimodal test failed:", audioError.message);
        }

        // Test image multimodal support
        try {
          const imageTestSession = await LanguageModel.create({
            systemPrompt: "Test image capabilities",
            expectedInputs: [{ type: "image" }],
          });

          // Create a small test image blob (1x1 pixel PNG)
          const testImageData =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
          const testImageResponse = await fetch(testImageData);
          const testImageBlob = await testImageResponse.blob();

          await imageTestSession.prompt([
            {
              role: "user",
              content: [
                {
                  type: "text",
                  value: "Test image",
                },
                {
                  type: "image",
                  value: testImageBlob,
                },
              ],
            },
          ]);

          imageSupported = true;
          console.log("✓ Image multimodal capabilities detected");
          imageTestSession.destroy();
        } catch (imageError) {
          console.log("✗ Image multimodal test failed:", imageError.message);
        }

        multimodalAvailable = audioSupported || imageSupported;

        if (multimodalAvailable) {
          console.log(
            `✓ Multimodal capabilities available: Audio=${audioSupported}, Image=${imageSupported}`
          );
          // Store which capabilities are supported for later use
          this.audioSupported = audioSupported;
          this.imageSupported = imageSupported;
        } else {
          console.log("✗ No multimodal capabilities detected");
          this.audioSupported = false;
          this.imageSupported = false;
        }
      } catch (sessionError) {
        console.log(
          "✗ Could not create test session for multimodal detection:",
          sessionError.message
        );
        multimodalAvailable = false;
        this.audioSupported = false;
        this.imageSupported = false;
      }

      // Check text-only availability as fallback
      const textOnlyAvailability = await LanguageModel.availability();
      console.log("Text-only availability:", textOnlyAvailability);

      if (textOnlyAvailability === "available") {
        this.isAIAvailable = true;
        this.aiCapabilities = await LanguageModel.params();
        return {
          available: true,
          status: "ready",
          capabilities: this.aiCapabilities,
          multimodal: multimodalAvailable,
          mode: multimodalAvailable ? "multimodal" : "text-only",
        };
      } else if (
        textOnlyAvailability === "after-download" ||
        textOnlyAvailability === "downloadable"
      ) {
        // Model is available but needs to be downloaded first (status can be 'after-download' or 'downloadable')
        console.log(
          "Model needs to be downloaded, attempting to trigger download..."
        );

        try {
          // Attempt to create a session to trigger the download
          const downloadSession = await LanguageModel.create();

          // If successful, the model is now ready
          this.isAIAvailable = true;
          this.aiSession = downloadSession;
          this.aiCapabilities = await LanguageModel.params();

          return {
            available: true,
            status: "ready",
            message: "Model downloaded and ready",
            capabilities: this.aiCapabilities,
            multimodal: multimodalAvailable,
            mode: multimodalAvailable ? "multimodal" : "text-only",
          };
        } catch (downloadError) {
          console.error("Failed to download model:", downloadError);
          this.isAIAvailable = false;

          return {
            available: false,
            status: "download-failed",
            error: "Failed to download AI model: " + downloadError.message,
            multimodal: false,
            needsUserInteraction: downloadError.name === "NotAllowedError",
          };
        }
      } else {
        this.isAIAvailable = false;
        return {
          available: false,
          error: "LanguageModel API is not available on this device",
          multimodal: false,
        };
      }
    } catch (error) {
      console.error("Error checking AI availability:", error);
      this.isAIAvailable = false;
      return {
        available: false,
        error: error.message,
        multimodal: false,
      };
    }
  }

  async processImageInput(imageData, context = {}) {
    if (!this.aiSession) {
      const initResult = await this.initializeAI();
      if (!initResult.success) {
        throw new Error(initResult.error);
      }
    }

    // Check if image multimodal is supported
    if (!this.imageSupported) {
      console.log(
        "Image multimodal not supported, returning fallback response"
      );
      return {
        response:
          "I'm sorry, but image processing is not available in your current Chrome version. The AI is running in text-only mode. Please describe the image in text instead, and I'll be happy to help!",
        fallback: true,
        error: "Image multimodal support not available",
      };
    }

    try {
      // Convert image data to the format expected by the API
      let imageBlob;
      if (imageData instanceof Blob) {
        imageBlob = imageData;
      } else if (
        typeof imageData === "string" &&
        imageData.startsWith("data:")
      ) {
        // If it's a data URL, convert to blob
        const response = await fetch(imageData);
        imageBlob = await response.blob();
      } else {
        throw new Error("Unsupported image data format");
      }

      // Prepare multimodal prompt array according to new API
      const promptArray = [];

      // Add context if available
      if (context.pageTitle || context.url) {
        const contextInfo = [];
        if (context.pageTitle) contextInfo.push(`Page: ${context.pageTitle}`);
        if (context.url) contextInfo.push(`URL: ${context.url}`);

        promptArray.push({
          role: "user",
          content: `Context: ${contextInfo.join(", ")}`,
        });
      }

      // Add conversation history if available
      if (
        context.conversationHistory &&
        context.conversationHistory.length > 0
      ) {
        context.conversationHistory.slice(-5).forEach((msg) => {
          promptArray.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
          });
        });
      }

      // Add the image input with proper multimodal format
      const imagePrompt =
        context.prompt ||
        "Please analyze this image and describe what you see. Provide detailed insights about the content, objects, text, and any relevant information.";

      promptArray.push({
        role: "user",
        content: [
          {
            type: "text",
            value: imagePrompt,
          },
          {
            type: "image",
            value: imageBlob,
          },
        ],
      });

      const response = await this.aiSession.prompt(promptArray);

      return {
        response: response,
        analysis: response, // For backward compatibility
      };
    } catch (error) {
      console.error("Error processing image input:", error);

      // Fallback to text-only processing if multimodal fails
      try {
        const fallbackResponse = await this.aiSession.prompt(
          "I received an image but cannot process images at the moment. Please let the user know that image processing is temporarily unavailable and ask them to describe the image in text instead."
        );

        return {
          response: fallbackResponse,
          fallback: true,
          error: "Image processing not available, using fallback response",
        };
      } catch (fallbackError) {
        throw new Error(
          `Image processing failed: ${error.message}. Fallback also failed: ${fallbackError.message}`
        );
      }
    }
  }

  // Initialize AI session with multimodal support
  async initializeAI(userInteraction = false) {
    try {
      if (this.aiSession) {
        return { success: true, message: "AI session already initialized" };
      }

      // Check availability first
      const availabilityCheck = await this.checkAIAvailability();
      if (!availabilityCheck.available) {
        throw new Error(availabilityCheck.error || "AI not available");
      }

      // Get model parameters
      const params = await LanguageModel.params();

      // Determine which mode to use based on availability
      const useMultimodal = availabilityCheck.multimodal;
      console.log(
        `Initializing AI in ${useMultimodal ? "multimodal" : "text-only"} mode`
      );

      // Create session configuration
      const sessionConfig = {
        temperature: Math.min(
          params.defaultTemperature * 1.1,
          params.maxTemperature
        ),
        topK: params.defaultTopK,
        systemPrompt: `You are Lavio AI Assistant, a helpful and friendly AI that assists users with web browsing, content analysis, and productivity tasks. ${
          useMultimodal
            ? "You can process both text and voice inputs."
            : "You process text inputs only."
        } Be concise but informative in your responses.`,
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => {
            console.log(
              `AI Model download progress: ${Math.round(e.loaded * 100)}%`
            );
            // Could send progress updates to popup/content script
          });
        },
      };

      // Add expectedInputs for multimodal support if available
      if (useMultimodal) {
        const expectedInputs = [];
        if (this.audioSupported) {
          expectedInputs.push({ type: "audio" });
        }
        if (this.imageSupported) {
          expectedInputs.push({ type: "image" });
        }
        if (expectedInputs.length > 0) {
          sessionConfig.expectedInputs = expectedInputs;
          console.log(`Setting expectedInputs:`, expectedInputs);
        }
      }

      // Create the AI session (the API now handles multimodal automatically based on input)
      this.aiSession = await LanguageModel.create(sessionConfig);
      this.isAIAvailable = true;
      this.multimodalSupported = useMultimodal;

      console.log(
        `AI session initialized successfully in ${
          useMultimodal ? "multimodal" : "text-only"
        } mode`
      );

      return {
        success: true,
        message: `AI session initialized in ${
          useMultimodal ? "multimodal" : "text-only"
        } mode`,
        capabilities: params,
        multimodal: useMultimodal,
      };
    } catch (error) {
      console.error("Failed to initialize AI session:", error);
      this.isAIAvailable = false;
      this.aiSession = null;
      this.multimodalSupported = false;

      return {
        success: false,
        error: error.message,
        needsUserInteraction: error.name === "NotAllowedError",
      };
    }
  }

  setupMessageListeners() {
    // Listen for messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === "install") {
        console.log("Lavio AI Assistant installed");
        // Open options page on first install
        chrome.runtime.openOptionsPage();
      }
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case "CHECK_AI_STATUS":
          const availability = await this.checkAIAvailability();
          sendResponse(availability);
          break;

        case "INITIALIZE_AI":
          const initResult = await this.initializeAI();
          sendResponse(initResult);
          break;

        case "SEND_PROMPT":
          if (!this.aiSession) {
            const initResult = await this.initializeAI();
            if (!initResult.success) {
              sendResponse({ success: false, error: initResult.error });
              return;
            }
          }

          // Get conversation history for context
          const historyResult = await chrome.storage.local.get([
            "conversationHistory",
          ]);
          const conversationHistory = historyResult.conversationHistory || [];

          const response = await this.processPrompt(message.prompt, {
            conversationHistory,
            ...message.context,
          });
          sendResponse({ success: true, response });
          break;

        case "PROCESS_AUDIO":
          if (!this.aiSession) {
            const initResult = await this.initializeAI();
            if (!initResult.success) {
              sendResponse({ success: false, error: initResult.error });
              return;
            }
          }
          const audioResult = await this.processAudioInput(
            message.audioData,
            message.context || {}
          );
          sendResponse({ success: true, response: audioResult });
          break;

        case "PROCESS_IMAGE":
          if (!this.aiSession) {
            const initResult = await this.initializeAI();
            if (!initResult.success) {
              sendResponse({ success: false, error: initResult.error });
              return;
            }
          }
          const imageResult = await this.processImageInput(
            message.imageData,
            message.context || {}
          );
          sendResponse({ success: true, response: imageResult });
          break;

        case "GET_PAGE_SUMMARY":
          if (!this.aiSession) {
            const initResult = await this.initializeAI();
            if (!initResult.success) {
              sendResponse({ success: false, error: initResult.error });
              return;
            }
          }
          const summary = await this.summarizePage(
            message.content,
            message.language
          );
          sendResponse({ success: true, summary });
          break;

        case "TRANSLATE_TEXT":
          if (!this.aiSession) {
            const initResult = await this.initializeAI();
            if (!initResult.success) {
              sendResponse({ success: false, error: initResult.error });
              return;
            }
          }
          const translation = await this.translateText(
            message.text,
            message.targetLanguage
          );
          sendResponse({ success: true, translation });
          break;

        case "DETECT_INTENT":
          if (!this.aiSession) {
            const initResult = await this.initializeAI();
            if (!initResult.success) {
              sendResponse({ success: false, error: initResult.error });
              return;
            }
          }
          const intent = await this.detectActionIntent(
            message.text,
            message.pageElements || []
          );
          sendResponse({ success: true, intent });
          break;

        case "TEXT_TO_SPEECH":
          try {
            const audioUrl = await this.textToSpeech(
              message.text,
              message.language
            );
            sendResponse({ success: true, audioUrl });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "SETTINGS_UPDATED":
          await this.updateSettings(message.settings);
          sendResponse({ success: true });
          break;

        case "CLEAR_HISTORY":
          await chrome.storage.local.remove([
            "conversations",
            "conversationHistory",
          ]);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async processPrompt(prompt, context = {}) {
    if (!this.aiSession) {
      throw new Error("AI session not initialized");
    }

    try {
      // Add conversation context using append method for better context management
      if (
        context.conversationHistory &&
        context.conversationHistory.length > 0
      ) {
        await this.appendConversationHistory(context.conversationHistory);
      }

      // Add context information to the prompt
      let enhancedPrompt = prompt;
      if (context.pageTitle) {
        enhancedPrompt = `Context: User is on page "${context.pageTitle}"\n\n${prompt}`;
      }

      // Prepare prompt options
      const promptOptions = {};

      // Add JSON Schema constraint if provided
      if (context.responseConstraint) {
        promptOptions.responseConstraint = context.responseConstraint;
      }

      const response = await this.aiSession.prompt(
        enhancedPrompt,
        promptOptions
      );

      // Store the conversation for future context
      await this.storeConversation(prompt, response);

      return response;
    } catch (error) {
      console.error("Error processing prompt:", error);
      throw error;
    }
  }

  // Helper method for structured responses
  async processStructuredPrompt(prompt, schema, context = {}) {
    return await this.processPrompt(prompt, {
      ...context,
      responseConstraint: schema,
    });
  }

  // Predefined schemas for common use cases
  getBooleanSchema() {
    return { type: "boolean" };
  }

  getClassificationSchema(categories) {
    return {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: categories,
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
        },
      },
      required: ["category", "confidence"],
    };
  }

  getSummarySchema() {
    return {
      type: "object",
      properties: {
        summary: { type: "string" },
        keyPoints: {
          type: "array",
          items: { type: "string" },
        },
        sentiment: {
          type: "string",
          enum: ["positive", "negative", "neutral"],
        },
      },
      required: ["summary", "keyPoints"],
    };
  }

  async appendConversationHistory(history) {
    if (!this.aiSession || !history || history.length === 0) return;

    try {
      // Format history for append method
      const formattedHistory = history.slice(-3).map((item) => ({
        role: item.type === "user" ? "user" : "assistant",
        content: item.message,
      }));

      if (formattedHistory.length > 0) {
        await this.aiSession.append(formattedHistory);
      }
    } catch (error) {
      console.warn("Failed to append conversation history:", error);
      // Continue without history if append fails
    }
  }

  async storeConversation(prompt, response) {
    try {
      const result = await chrome.storage.local.get(["conversationHistory"]);
      const history = result.conversationHistory || [];

      // Add new conversation
      history.push(
        { type: "user", message: prompt, timestamp: Date.now() },
        { type: "assistant", message: response, timestamp: Date.now() }
      );

      // Keep only last 20 messages to prevent storage bloat
      const trimmedHistory = history.slice(-20);

      await chrome.storage.local.set({ conversationHistory: trimmedHistory });
    } catch (error) {
      console.warn("Failed to store conversation:", error);
    }
  }

  async processAudioInput(audioData, context = {}) {
    if (!this.aiSession) {
      const initResult = await this.initializeAI();
      if (!initResult.success) {
        throw new Error(initResult.error);
      }
    }

    // Check if audio multimodal is supported
    if (!this.audioSupported) {
      console.log(
        "Audio multimodal not supported, returning fallback response"
      );
      return {
        response:
          "I'm sorry, but voice processing is not available in your current Chrome version. The AI is running in text-only mode. Please type your message instead, and I'll be happy to help!",
        fallback: true,
        error: "Audio multimodal support not available",
      };
    }

    try {
      // Convert audio data to the format expected by the API
      let audioBlob;
      if (audioData instanceof Blob) {
        audioBlob = audioData;
      } else if (
        typeof audioData === "string" &&
        audioData.startsWith("data:")
      ) {
        // If it's a data URL, convert to blob
        const response = await fetch(audioData);
        audioBlob = await response.blob();
      } else {
        throw new Error("Unsupported audio data format");
      }

      // Prepare multimodal prompt array according to new API
      const promptArray = [];

      // Add context if available
      if (context.pageTitle || context.url) {
        const contextInfo = [];
        if (context.pageTitle) contextInfo.push(`Page: ${context.pageTitle}`);
        if (context.url) contextInfo.push(`URL: ${context.url}`);

        promptArray.push({
          role: "user",
          content: `Context: ${contextInfo.join(", ")}`,
        });
      }

      // Add conversation history if available
      if (
        context.conversationHistory &&
        context.conversationHistory.length > 0
      ) {
        context.conversationHistory.slice(-5).forEach((msg) => {
          promptArray.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
          });
        });
      }

      // Add the audio input with proper multimodal format (using 'value' not 'data')
      promptArray.push({
        role: "user",
        content: [
          {
            type: "text",
            value:
              "Please first transcribe this voice message exactly as spoken, then provide your response. Format your response as: 'TRANSCRIPTION: [exact words spoken] RESPONSE: [your response]'",
          },
          {
            type: "audio",
            value: audioBlob,
          },
        ],
      });

      const response = await this.aiSession.prompt(promptArray);

      // Try to parse the response to extract transcription and AI response
      let transcription = null;
      let aiResponse = response;

      if (typeof response === "string") {
        const transcriptionMatch = response.match(
          /TRANSCRIPTION:\s*(.*?)\s*RESPONSE:\s*(.*)/s
        );
        if (transcriptionMatch) {
          transcription = transcriptionMatch[1].trim();
          aiResponse = transcriptionMatch[2].trim();
        }
      }

      return {
        transcription: transcription,
        response: aiResponse,
        fullResponse: response,
      };
    } catch (error) {
      console.error("Error processing audio input:", error);

      // Fallback to text-only processing if multimodal fails
      try {
        const fallbackResponse = await this.aiSession.prompt(
          "I received a voice message but cannot process audio at the moment. Please let the user know that voice processing is temporarily unavailable and ask them to type their message instead."
        );

        return {
          response: fallbackResponse,
          fallback: true,
          error: "Audio processing not available, using fallback response",
        };
      } catch (fallbackError) {
        throw new Error(
          `Audio processing failed: ${error.message}. Fallback also failed: ${fallbackError.message}`
        );
      }
    }
  }

  async summarizePage(content, language = "en") {
    try {
      // Create language-specific prompt
      let prompt;
      if (language && language !== "en") {
        const languageNames = {
          es: "Spanish",
          fr: "French",
          de: "German",
          it: "Italian",
          pt: "Portuguese",
          ru: "Russian",
          ja: "Japanese",
          ko: "Korean",
          zh: "Chinese",
          ar: "Arabic",
          hi: "Hindi",
          nl: "Dutch",
          sv: "Swedish",
          no: "Norwegian",
          da: "Danish",
          fi: "Finnish",
          pl: "Polish",
          tr: "Turkish",
          he: "Hebrew",
          th: "Thai",
        };
        const languageName = languageNames[language] || language;
        prompt = `Summarize the following content concisely in ${languageName}. Provide 4-6 bullet points and a one-line TL;DR.\n\n${content}`;
      } else {
        prompt = `Summarize the following content concisely. Provide 4-6 bullet points and a one-line TL;DR.\n\n${content}`;
      }

      return await this.processPrompt(prompt);
    } catch (error) {
      console.error("Error summarizing page:", error);
      throw error;
    }
  }

  async translateText(text, targetLanguage) {
    try {
      // Use LanguageModel session to perform translation via prompt
      const prompt = `Translate the following text to ${targetLanguage}. Preserve meaning and tone.\n\n${text}`;
      return await this.processPrompt(prompt);
    } catch (error) {
      console.error("Error translating text:", error);
      throw error;
    }
  }

  /**
   * Detect if user input is an action request or a question
   * @param {string} userInput - The user's voice/text input
   * @param {Array} pageElements - Available elements on the page
   * @returns {Promise<Object>} Intent classification and action details
   */
  async detectActionIntent(userInput, pageElements = []) {
    try {
      // Create a prompt that asks AI to classify the intent
      const elementsDescription =
        pageElements.length > 0
          ? `\n\nAvailable interactive elements on the page:\n${pageElements
              .slice(0, 20)
              .map(
                (el, i) =>
                  `${i + 1}. ${el.type}: "${
                    el.text || el.label || el.placeholder || "unnamed"
                  }"`
              )
              .join("\n")}`
          : "";

      const prompt = `CLASSIFICATION TASK: Analyze this user input and determine if it's an ACTION REQUEST or a QUESTION.

User Input: "${userInput}"
${elementsDescription}

ACTION REQUESTS are commands to interact with the page, like:
- Click on [element]
- Scroll down/up
- Go back/forward
- Type [text] in [field]
- Focus on [element]
- Open [link]

QUESTIONS are requests for information, like:
- What is this page about?
- Tell me about [topic]
- Explain [concept]
- Summarize this

FOR THIS TASK ONLY, respond in this EXACT JSON format (do not use this format for other tasks):
{
  "isAction": true/false,
  "confidence": 0.0-1.0,
  "actionType": "click/scroll/navigate/type/focus" OR null,
  "targetDescription": "description of target element" OR null,
  "additionalData": "any extra data like text to type" OR null,
  "reasoning": "brief explanation"
}

Return ONLY the JSON object, nothing else.`;

      const response = await this.aiSession.prompt(prompt);

      // Parse the JSON response
      try {
        // Extract JSON from response (AI might include extra text)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }

        const intent = JSON.parse(jsonMatch[0]);

        // Validate the response structure
        if (typeof intent.isAction !== "boolean") {
          throw new Error("Invalid intent format");
        }

        return intent;
      } catch (parseError) {
        console.error("Error parsing intent JSON:", parseError);
        // Fallback: treat as question if parsing fails
        return {
          isAction: false,
          confidence: 0.5,
          actionType: null,
          targetDescription: null,
          additionalData: null,
          reasoning: "Failed to parse intent, treating as question",
        };
      }
    } catch (error) {
      console.error("Error detecting intent:", error);
      // Fallback to treating as question on error
      return {
        isAction: false,
        confidence: 0,
        actionType: null,
        targetDescription: null,
        additionalData: null,
        reasoning: `Error: ${error.message}`,
      };
    }
  }

  async textToSpeech(text, language = "en") {
    try {
      // Check if browser supports Speech Synthesis API
      if (typeof speechSynthesis === "undefined") {
        throw new Error("Text-to-speech not supported in this browser");
      }

      return new Promise((resolve, reject) => {
        // Create speech synthesis utterance
        const utterance = new SpeechSynthesisUtterance(text);

        // Set language if provided
        if (language) {
          utterance.lang = language === "zh" ? "zh-CN" : language;
        }

        // Configure speech parameters
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Handle events
        utterance.onend = () => {
          resolve({ success: true, message: "Speech completed" });
        };

        utterance.onerror = (event) => {
          reject(new Error(`Speech synthesis error: ${event.error}`));
        };

        // Start speaking
        speechSynthesis.speak(utterance);
      });
    } catch (error) {
      console.error("Error in text-to-speech:", error);
      throw error;
    }
  }

  async initializeStorage() {
    // Set default settings
    const defaultSettings = {
      voiceInputEnabled: true,
      autoSummarize: false,
      showFloatingButton: true,
      language: "en",
      responseLength: "medium",
      contextAware: true,
      conversationMemory: true,
      historyLimit: 50,
      localProcessing: true,
      saveHistory: true,
      clearOnExit: false,
      debugMode: false,
      experimentalFeatures: false,
      conversationHistory: [],
      shortcuts: {
        summarize: "summarize this page",
        translate: "translate this",
        help: "help me with",
      },
    };

    try {
      const stored = await chrome.storage.sync.get(defaultSettings);
      this.settings = { ...defaultSettings, ...stored };

      // Save any missing defaults
      await chrome.storage.sync.set(this.settings);
      console.log("Storage initialized with settings:", this.settings);
    } catch (error) {
      console.error("Error initializing storage:", error);
      this.settings = defaultSettings;
    }
  }
}

// Initialize the background service
const lavioBackground = new LavioBackground();
