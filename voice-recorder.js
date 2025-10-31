/**
 * VoiceRecorder - Handles voice recording functionality for Lavio AI Assistant
 * Uses MediaRecorder API with proper error handling and audio processing
 */
class VoiceRecorder {
  constructor(options = {}) {
    this.mediaRecorder = null;
    this.audioStream = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.isPaused = false;
    
    // Configuration
    this.config = {
      mimeType: 'audio/webm;codecs=opus', // Preferred format for Chrome
      audioBitsPerSecond: 128000,
      sampleRate: 44100,
      channelCount: 1, // Mono for voice
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...options
    };

    // Event callbacks
    this.onRecordingStart = options.onRecordingStart || (() => {});
    this.onRecordingStop = options.onRecordingStop || (() => {});
    this.onRecordingPause = options.onRecordingPause || (() => {});
    this.onRecordingResume = options.onRecordingResume || (() => {});
    this.onError = options.onError || ((error) => console.error('Recording error:', error));
    this.onDataAvailable = options.onDataAvailable || (() => {});

    this.init();
  }

  async init() {
    try {
      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder API not supported in this browser');
      }

      // Check supported MIME types and select the best one
      this.config.mimeType = this.getSupportedMimeType();
      console.log('Using MIME type:', this.config.mimeType);
    } catch (error) {
      this.onError(error);
    }
  }

  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return ''; // Let browser choose default
  }

  async requestMicrophonePermission() {
    try {
      const constraints = {
        audio: {
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount
        }
      };

      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
      return { success: true, stream: this.audioStream };
    } catch (error) {
      const errorMessage = this.getMicrophoneErrorMessage(error);
      this.onError(new Error(errorMessage));
      return { success: false, error: errorMessage };
    }
  }

  getMicrophoneErrorMessage(error) {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Microphone access denied. Please allow microphone permissions and try again.';
      case 'NotFoundError':
        return 'No microphone found. Please connect a microphone and try again.';
      case 'NotReadableError':
        return 'Microphone is being used by another application. Please close other apps and try again.';
      case 'OverconstrainedError':
        return 'Microphone constraints not supported. Trying with default settings.';
      case 'SecurityError':
        return 'Microphone access blocked due to security restrictions.';
      default:
        return `Microphone error: ${error.message}`;
    }
  }

  async startRecording() {
    try {
      if (this.isRecording) {
        console.warn('Recording already in progress');
        return { success: false, error: 'Recording already in progress' };
      }

      // Request microphone permission if not already granted
      if (!this.audioStream) {
        const permissionResult = await this.requestMicrophonePermission();
        if (!permissionResult.success) {
          return permissionResult;
        }
      }

      // Clear previous recording data
      this.audioChunks = [];

      // Create MediaRecorder instance
      const options = {
        mimeType: this.config.mimeType,
        audioBitsPerSecond: this.config.audioBitsPerSecond
      };

      this.mediaRecorder = new MediaRecorder(this.audioStream, options);

      // Set up event listeners
      this.setupMediaRecorderEvents();

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      this.isPaused = false;

      this.onRecordingStart();
      return { success: true, message: 'Recording started' };
    } catch (error) {
      this.onError(error);
      return { success: false, error: error.message };
    }
  }

  setupMediaRecorderEvents() {
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
        this.onDataAvailable(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.isRecording = false;
      this.isPaused = false;
      
      // Create final audio blob
      const audioBlob = new Blob(this.audioChunks, { 
        type: this.config.mimeType || 'audio/webm' 
      });
      
      this.onRecordingStop(audioBlob);
    };

    this.mediaRecorder.onpause = () => {
      this.isPaused = true;
      this.onRecordingPause();
    };

    this.mediaRecorder.onresume = () => {
      this.isPaused = false;
      this.onRecordingResume();
    };

    this.mediaRecorder.onerror = (event) => {
      this.onError(new Error(`MediaRecorder error: ${event.error}`));
    };
  }

  stopRecording() {
    try {
      if (!this.isRecording || !this.mediaRecorder) {
        return { success: false, error: 'No active recording to stop' };
      }

      this.mediaRecorder.stop();
      return { success: true, message: 'Recording stopped' };
    } catch (error) {
      this.onError(error);
      return { success: false, error: error.message };
    }
  }

  pauseRecording() {
    try {
      if (!this.isRecording || !this.mediaRecorder || this.isPaused) {
        return { success: false, error: 'Cannot pause recording' };
      }

      this.mediaRecorder.pause();
      return { success: true, message: 'Recording paused' };
    } catch (error) {
      this.onError(error);
      return { success: false, error: error.message };
    }
  }

  resumeRecording() {
    try {
      if (!this.isRecording || !this.mediaRecorder || !this.isPaused) {
        return { success: false, error: 'Cannot resume recording' };
      }

      this.mediaRecorder.resume();
      return { success: true, message: 'Recording resumed' };
    } catch (error) {
      this.onError(error);
      return { success: false, error: error.message };
    }
  }

  // Get current recording state
  getRecordingState() {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      state: this.mediaRecorder ? this.mediaRecorder.state : 'inactive',
      duration: this.getRecordingDuration(),
      hasPermission: !!this.audioStream
    };
  }

  getRecordingDuration() {
    // This is a simple estimation - for precise timing, you'd need to track start time
    return this.audioChunks.length * 100; // Approximate based on 100ms chunks
  }

  // Convert audio blob to different formats
  async convertAudioBlob(blob, targetFormat = 'wav') {
    try {
      // For now, return the original blob
      // In a full implementation, you might use Web Audio API or a library
      // to convert between formats
      return blob;
    } catch (error) {
      this.onError(error);
      return null;
    }
  }

  // Get audio blob as data URL
  async getAudioDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Clean up resources
  cleanup() {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
      }

      this.mediaRecorder = null;
      this.audioChunks = [];
      this.isRecording = false;
      this.isPaused = false;
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Static method to check browser support
  static isSupported() {
    return !!(navigator.mediaDevices && 
              navigator.mediaDevices.getUserMedia && 
              window.MediaRecorder);
  }

  // Static method to check microphone permission status
  static async checkMicrophonePermission() {
    try {
      if (!navigator.permissions) {
        return { state: 'unknown' };
      }

      const permission = await navigator.permissions.query({ name: 'microphone' });
      return { state: permission.state };
    } catch (error) {
      return { state: 'unknown', error: error.message };
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoiceRecorder;
} else if (typeof window !== 'undefined') {
  window.VoiceRecorder = VoiceRecorder;
}