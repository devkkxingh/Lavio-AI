# VoiceFlow AI Assistant 🎤🤖

A Chrome extension that brings real-time voice conversations with AI directly to your browser, powered by Chrome's Built-in AI APIs.

## 🌟 Features

- **Real-time Voice Conversations**: Talk naturally with AI using your microphone
- **Multimodal AI Integration**: Leverages Chrome's Prompt API with audio support
- **Context-Aware Assistance**: Understands and interacts with webpage content
- **Privacy-First**: All processing happens locally on your device
- **Offline Capability**: Works without internet connection
- **Zero Server Costs**: No backend infrastructure required
- **Smart Page Summarization**: Instantly summarize long articles
- **Intelligent Translation**: Translate selected text or entire pages
- **Floating Voice Button**: Quick access from any webpage
- **Conversation History**: Keep track of your AI interactions

## 🚀 Quick Start

### Prerequisites

- Google Chrome Canary (version 127+)
- Chrome Built-in AI APIs enabled
- Microphone access

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd voiceflow-ai-assistant
   ```

2. **Enable Chrome Built-in AI APIs**
   - Open Chrome Canary
   - Go to `chrome://flags/`
   - Enable the following flags:
     - `#optimization-guide-on-device-model`
     - `#prompt-api-for-gemini-nano`
     - `#summarization-api-for-gemini-nano`
     - `#translation-api`
   - Restart Chrome

3. **Load the Extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the project folder
   - The VoiceFlow icon should appear in your toolbar

4. **Grant Permissions**
   - Click the VoiceFlow icon
   - Allow microphone access when prompted
   - The extension will initialize the AI APIs

## 🎯 Usage

### Voice Conversations
1. Click the VoiceFlow icon or use the floating button on any webpage
2. Click the microphone button to start recording
3. Speak your question or request
4. The AI will process your voice and respond with text and/or audio

### Page Interaction
- **Summarize**: Click "Summarize Page" to get a quick summary of the current article
- **Translate**: Select text and use Ctrl+Shift+T to translate it
- **Context Questions**: Ask questions about the current webpage content

### Keyboard Shortcuts
- `Ctrl + Shift + V`: Toggle voice panel
- `Ctrl + Shift + S`: Quick page summarization
- `Ctrl + Shift + T`: Translate selected text

## 🛠️ Development

### Project Structure
```
voiceflow-ai-assistant/
├── manifest.json          # Extension manifest
├── background.js          # Service worker
├── content.js            # Content script
├── popup/
│   ├── popup.html        # Extension popup UI
│   ├── popup.css         # Popup styles
│   └── popup.js          # Popup functionality
├── options/
│   ├── options.html      # Settings page
│   └── options.js        # Settings functionality
├── assets/
│   ├── icons/
│   │   └── icon.svg      # Extension icon
│   └── sounds/
│       └── notification.mp3
└── README.md
```

### Key Components

#### Background Script (`background.js`)
- Manages Chrome Built-in AI APIs
- Handles cross-component communication
- Manages extension lifecycle and settings

#### Content Script (`content.js`)
- Injects floating voice button
- Handles page interaction and context extraction
- Manages voice recording and UI

#### Popup (`popup/`)
- Main extension interface
- Quick actions and conversation history
- Settings and status display

#### Options Page (`options/`)
- Advanced configuration
- Privacy and behavior settings
- Keyboard shortcuts reference

### Chrome Built-in AI APIs Used

1. **Prompt API**: Core conversational AI with multimodal support
2. **Summarizer API**: Intelligent page and content summarization
3. **Translator API**: Real-time text translation
4. **Rewriter API**: Content improvement and rephrasing
5. **Proofreader API**: Grammar and style checking

### Development Setup

1. **Make changes** to the code
2. **Reload the extension** in `chrome://extensions/`
3. **Test functionality** on various websites
4. **Check console** for any errors or logs

### Testing

- Test voice recording on different websites
- Verify AI API availability and responses
- Test keyboard shortcuts and UI interactions
- Check settings persistence and export/import
- Validate privacy and local processing

## 🏆 Hackathon Strategy

This project is designed for the **Google Chrome Built-in AI Challenge 2025** with focus on:

### Innovation Points
- **Multimodal Voice Interface**: First Chrome extension to use voice with Built-in AI
- **Context-Aware Conversations**: AI understands webpage content
- **Privacy-First Architecture**: All processing happens locally
- **Zero Infrastructure**: No servers, APIs, or cloud dependencies

### Technical Excellence
- **Manifest V3**: Latest Chrome extension standards
- **Modern Web APIs**: MediaRecorder, Web Speech, Chrome APIs
- **Responsive Design**: Works across different screen sizes
- **Error Handling**: Graceful fallbacks and user feedback

### User Experience
- **Intuitive Interface**: Simple, clean, and accessible design
- **Quick Access**: Floating button and keyboard shortcuts
- **Conversation Flow**: Natural voice interaction patterns
- **Visual Feedback**: Clear status indicators and animations

### Practical Value
- **Real-world Use Cases**: Research, learning, accessibility, productivity
- **Cross-language Support**: Translation and multilingual conversations
- **Accessibility**: Voice interface for users with mobility limitations
- **Productivity**: Quick summaries and content analysis

## 🔒 Privacy & Security

- **Local Processing**: All AI operations happen on your device
- **No Data Collection**: No user data is sent to external servers
- **Secure Storage**: Settings and history stored locally in Chrome
- **Permission-Based**: Only requests necessary permissions
- **Open Source**: Full transparency of code and functionality

## 🎨 Customization

### Settings Available
- Voice input enable/disable
- Auto-summarization preferences
- Floating button visibility
- Language preferences
- Response length and style
- Conversation memory settings
- Privacy and data handling

### Theming
The extension uses Chrome's system theme and can be customized through CSS variables in the popup and options pages.

## 🐛 Troubleshooting

### Common Issues

1. **AI APIs not available**
   - Ensure you're using Chrome Canary 127+
   - Check that all required flags are enabled
   - Restart Chrome after enabling flags

2. **Microphone not working**
   - Check browser permissions for microphone
   - Ensure microphone is not being used by other applications
   - Try refreshing the page

3. **Extension not loading**
   - Check for errors in `chrome://extensions/`
   - Ensure all files are present
   - Try reloading the extension

### Debug Mode
Enable debug mode in settings to see detailed logs in the browser console.

## 🤝 Contributing

This project is part of the Google Chrome Built-in AI Challenge 2025. Contributions and feedback are welcome!

### Development Guidelines
- Follow Chrome extension best practices
- Maintain privacy-first approach
- Test across different websites and scenarios
- Document any new features or changes

## 📄 License

This project is created for the Google Chrome Built-in AI Challenge 2025.

## 🙏 Acknowledgments

- Google Chrome team for the Built-in AI APIs
- Chrome extension development community
- Voice interface design inspiration from modern AI assistants

---

**Built with ❤️ for the Google Chrome Built-in AI Challenge 2025**