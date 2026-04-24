import { IndianLanguage } from "./geminiService";

export function speakText(text: string, language: IndianLanguage) {
  if (!('speechSynthesis' in window)) {
    console.error("Speech synthesis not supported in this browser.");
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Mapping of languages to BCP-47 codes for better voice selection
  const langMap: Record<IndianLanguage, string> = {
    'Hindi': 'hi-IN',
    'Bengali': 'bn-IN',
    'Marathi': 'mr-IN',
    'Telugu': 'te-IN',
    'Tamil': 'ta-IN',
    'Gujarati': 'gu-IN',
    'Urdu': 'ur-PK',
    'Kannada': 'kn-IN',
    'Odia': 'or-IN',
    'Malayalam': 'ml-IN',
    'Punjabi': 'pa-IN'
  };

  utterance.lang = langMap[language] || 'en-US';
  utterance.rate = 0.9; // Slightly slower for better clarity
  utterance.pitch = 1.0;

  // Try to find a specific voice for the language if available
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find(v => v.lang.startsWith(utterance.lang));
  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
}
