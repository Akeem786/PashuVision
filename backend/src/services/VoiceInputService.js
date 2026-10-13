// Lazy load @google-cloud/speech only when needed
let speechModule = null;
function getSpeechModule() {
  if (speechModule === null) {
    try {
      speechModule = require('@google-cloud/speech');
    } catch (error) {
      console.warn('⚠️  @google-cloud/speech module not available. Voice input features will be disabled.');
      return null;
    }
  }
  return speechModule;
}

const fs = require('fs');
const path = require('path');

class VoiceInputService {
  constructor() {
    this.speechClient = null;
    this.supportedLanguages = ['en-US', 'hi-IN', 'te-IN', 'ta-IN', 'bn-IN'];
    this.commands = this.initializeCommands();
    // Lazy initialize speech client
    this.initializeSpeechClient();
  }

  initializeSpeechClient() {
    try {
      const speech = getSpeechModule();
      if (speech && (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT)) {
        this.speechClient = new speech.SpeechClient();
      } else {
        this.speechClient = null;
      }
    } catch (error) {
      console.warn('⚠️  Failed to initialize Google Speech client:', error.message);
      this.speechClient = null;
    }
  }

  initializeCommands() {
    return {
      'create_animal': ['create animal', 'new animal', 'add animal', 'register animal'],
      'check_health': ['check health', 'health check', 'animal health', 'health status'],
      'vaccination': ['vaccination', 'vaccine', 'immunization', 'injection'],
      'breed_info': ['breed information', 'breed details', 'what breed', 'breed type'],
      'location': ['location', 'where', 'place', 'address'],
      'age': ['age', 'how old', 'months', 'years'],
      'gender': ['male', 'female', 'gender', 'sex'],
      'owner': ['owner', 'farmer', 'keeper', 'belongs to'],
      'save': ['save', 'store', 'record', 'submit'],
      'cancel': ['cancel', 'stop', 'exit', 'quit']
    };
  }

  async processVoiceInput(audioBuffer, language = 'en-US') {
    try {
      // Check if speech client is available
      if (!this.speechClient) {
        throw new Error('Google Speech client not available. Voice input requires @google-cloud/speech module.');
      }

      const audio = {
        content: audioBuffer.toString('base64')
      };

      const config = {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: language,
        alternativeLanguageCodes: this.supportedLanguages,
        enableAutomaticPunctuation: true,
        model: 'latest_long'
      };

      const request = {
        audio: audio,
        config: config
      };

      const [response] = await this.speechClient.recognize(request);
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      return {
        transcription,
        confidence: response.results[0].alternatives[0].confidence,
        language: language,
        commands: this.extractCommands(transcription),
        entities: this.extractEntities(transcription)
      };

    } catch (error) {
      console.error('Voice processing error:', error);
      return {
        transcription: '',
        confidence: 0,
        error: 'Voice processing failed',
        commands: [],
        entities: {}
      };
    }
  }

  extractCommands(transcription) {
    const foundCommands = [];
    const text = transcription.toLowerCase();

    for (const [command, phrases] of Object.entries(this.commands)) {
      for (const phrase of phrases) {
        if (text.includes(phrase)) {
          foundCommands.push(command);
          break;
        }
      }
    }

    return foundCommands;
  }

  extractEntities(transcription) {
    const entities = {
      breed: this.extractBreed(transcription),
      age: this.extractAge(transcription),
      gender: this.extractGender(transcription),
      location: this.extractLocation(transcription),
      owner: this.extractOwner(transcription)
    };

    return entities;
  }

  extractBreed(text) {
    const breeds = [
      'gir', 'sahiwal', 'red sindhi', 'tharparkar', 'kankrej',
      'murrah', 'jaffarabadi', 'mehsana', 'surti', 'bhadawari',
      'holstein', 'jersey', 'crossbreed', 'indigenous'
    ];

    const foundBreeds = breeds.filter(breed => 
      text.toLowerCase().includes(breed.toLowerCase())
    );

    return foundBreeds[0] || null;
  }

  extractAge(text) {
    const agePatterns = [
      /(\d+)\s*(months?|month)/i,
      /(\d+)\s*(years?|year)/i,
      /(\d+)\s*(days?|day)/i
    ];

    for (const pattern of agePatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        
        if (unit.includes('month')) return value;
        if (unit.includes('year')) return value * 12;
        if (unit.includes('day')) return Math.floor(value / 30);
      }
    }

    return null;
  }

  extractGender(text) {
    if (text.includes('male') || text.includes('bull') || text.includes('he')) {
      return 'male';
    }
    if (text.includes('female') || text.includes('cow') || text.includes('she')) {
      return 'female';
    }
    return null;
  }

  extractLocation(text) {
    const locationKeywords = ['village', 'district', 'state', 'taluka', 'block'];
    const words = text.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      if (locationKeywords.includes(words[i].toLowerCase())) {
        return words.slice(Math.max(0, i-2), i+3).join(' ');
      }
    }

    return null;
  }

  extractOwner(text) {
    const ownerKeywords = ['owner', 'farmer', 'keeper', 'belongs to', 'my name'];
    const words = text.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      if (ownerKeywords.includes(words[i].toLowerCase())) {
        return words.slice(i+1, i+4).join(' ');
      }
    }

    return null;
  }

  generateVoiceResponse(command, data) {
    const responses = {
      'create_animal': `I'll help you create a new animal record. Please provide the breed, age, and gender.`,
      'check_health': `I'll check the health status of your animal. Please show me the animal.`,
      'vaccination': `I'll help you with vaccination information. What animal do you want to vaccinate?`,
      'breed_info': `I'll provide breed information. Which breed are you interested in?`,
      'save': `Animal record saved successfully. Your animal ID is ${data?.animalId || 'generated'}.`,
      'cancel': `Operation cancelled. How else can I help you?`
    };

    return responses[command] || 'I understand. Please provide more details.';
  }

  async createAnimalFromVoice(voiceData, user) {
    const entities = voiceData.entities;
    
    const animal = {
      id: require('nanoid')(),
      predictedBreed: entities.breed || 'Unknown',
      ageMonths: entities.age || null,
      gender: entities.gender || '',
      ownerName: entities.owner || user.name,
      location: entities.location || '',
      notes: `Created via voice input: "${voiceData.transcription}"`,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      status: 'pending',
      imageUrls: [],
      gps: null,
      capturedAt: null,
      voiceCreated: true
    };

    return animal;
  }

  getSupportedLanguages() {
    return this.supportedLanguages.map(lang => ({
      code: lang,
      name: this.getLanguageName(lang),
      nativeName: this.getNativeLanguageName(lang)
    }));
  }

  getLanguageName(code) {
    const names = {
      'en-US': 'English',
      'hi-IN': 'Hindi',
      'te-IN': 'Telugu',
      'ta-IN': 'Tamil',
      'bn-IN': 'Bengali'
    };
    return names[code] || code;
  }

  getNativeLanguageName(code) {
    const names = {
      'en-US': 'English',
      'hi-IN': 'हिन्दी',
      'te-IN': 'తెలుగు',
      'ta-IN': 'தமிழ்',
      'bn-IN': 'বাংলা'
    };
    return names[code] || code;
  }
}

module.exports = VoiceInputService;
