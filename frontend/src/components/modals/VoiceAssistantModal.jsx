import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Mic, MicOff, Volume2, Sparkles, X, Send } from 'lucide-react';

const VoiceAssistantModal = ({
  isOpen,
  onClose,
  onOpenWasteModal,
  onOpenBreakdownModal,
  onOpenGrievanceModal,
  onOpenEmergencyModal
}) => {
  const { t, language, speak } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [assistantReply, setAssistantReply] = useState('');
  const [supportStatus, setSupportStatus] = useState(true);

  let recognition = null;
  const SpeechRecognition =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!SpeechRecognition) {
      setSupportStatus(false);
    }
  }, [SpeechRecognition]);

  if (!isOpen) return null;

  const processCommand = (cmd) => {
    const text = cmd.toLowerCase().trim();
    let reply = '';

    if (text.includes('leak') || text.includes('emergency') || text.includes('gas leak') || text.includes('அவசரம்') || text.includes('கசிவு')) {
      reply = language === 'ta'
        ? 'அவசர பாதுகாப்பு சாளரத்தை திறக்கிறேன். தயவுசெய்து தீப்பொறியை தவிர்க்கவும்.'
        : 'Opening Emergency Safety Alert window now. Please stay away from ignition sources.';
      setAssistantReply(reply);
      speak(reply);
      setTimeout(() => {
        onClose();
        if (onOpenEmergencyModal) onOpenEmergencyModal();
      }, 1500);
      return;
    }

    if (text.includes('waste') || text.includes('pickup') || text.includes('dung') || text.includes('கழிவு') || text.includes('சாணம்')) {
      reply = language === 'ta'
        ? 'கழிவு சேகரிப்பு கோரிக்கை சாளரத்தை திறக்கிறேன்.'
        : 'Opening Waste Pickup Request window for your household.';
      setAssistantReply(reply);
      speak(reply);
      setTimeout(() => {
        onClose();
        if (onOpenWasteModal) onOpenWasteModal();
      }, 1500);
      return;
    }

    if (text.includes('breakdown') || text.includes('repair') || text.includes('pipe') || text.includes('பழுது') || text.includes('ஆலை')) {
      reply = language === 'ta'
        ? 'ஆலை பழுதுபார்ப்பு புகாரளிக்கும் சாளரத்தை திறக்கிறேன்.'
        : 'Opening Plant Breakdown Reporting window.';
      setAssistantReply(reply);
      speak(reply);
      setTimeout(() => {
        onClose();
        if (onOpenBreakdownModal) onOpenBreakdownModal();
      }, 1500);
      return;
    }

    if (text.includes('complaint') || text.includes('grievance') || text.includes('புகார்') || text.includes('குறை')) {
      reply = language === 'ta'
        ? 'சமூக குறைதீர்ப்பு சாளரத்தை திறக்கிறேன்.'
        : 'Opening Community Grievance & Suggestion window.';
      setAssistantReply(reply);
      speak(reply);
      setTimeout(() => {
        onClose();
        if (onOpenGrievanceModal) onOpenGrievanceModal();
      }, 1500);
      return;
    }

    if (text.includes('savings') || text.includes('lpg') || text.includes('money') || text.includes('சேமிப்பு')) {
      reply = language === 'ta'
        ? 'உயிர்வாயு பயன்பாட்டின் மூலம் ஒரு குடும்பம் மாதம் ₹1,100 வரை எல்.பி.ஜி கட்டணத்தை சேமிக்க முடியும்.'
        : 'A typical farming household saves up to ₹1,100 per month by replacing conventional LPG with community biogas.';
      setAssistantReply(reply);
      speak(reply);
      return;
    }

    // Default friendly reply
    reply = language === 'ta'
      ? `நீங்கள் கூறியது: "${cmd}". நீங்கள் கழிவு சேகரிப்பு, ஆலை பழுது, அல்லது அவசர எச்சரிக்கை பற்றி கேட்கலாம்.`
      : `Heard: "${cmd}". You can ask to: "schedule waste pickup", "report gas leak", "lodge complaint", or "calculate savings".`;
    setAssistantReply(reply);
    speak(reply);
  };

  const startListening = () => {
    if (!SpeechRecognition) {
      setSupportStatus(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = language === 'ta' ? 'ta-IN' : 'en-IN';

      rec.onstart = () => {
        setIsListening(true);
        setTranscript('');
        setAssistantReply('');
      };

      rec.onresult = (event) => {
        const spoken = event.results[0][0].transcript;
        setTranscript(spoken);
        processCommand(spoken);
      };

      rec.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      setIsListening(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-emerald-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                {language === 'ta' ? 'குரல் உதவியாளர் (Voice Assistant)' : 'Voice Rural Assistant'}
              </h3>
              <p className="text-[11px] text-emerald-100">
                {language === 'ta' ? 'பேசி தேவையான தகவல்களைப் பெறுங்கள்' : 'Hands-free rural speech navigation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Microphone Visualizer */}
        <div className="p-6 text-center space-y-5">
          <div className="relative inline-block">
            {isListening && (
              <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
            )}
            <button
              onClick={startListening}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
                isListening
                  ? 'bg-emerald-600 text-white shadow-emerald-500/40 scale-105'
                  : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border-2 border-dashed border-emerald-400'
              }`}
            >
              {isListening ? <Mic className="w-8 h-8 animate-pulse" /> : <Mic className="w-8 h-8" />}
            </button>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800">
              {isListening
                ? language === 'ta' ? 'கேட்கிறது... கட்டளையை பேசுங்கள்' : 'Listening... Speak now'
                : language === 'ta' ? 'மைக் மீது தட்டி பேசவும்' : 'Tap the microphone to speak'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {language === 'ta' ? 'மொழி: தமிழ் (இந்தியா)' : 'Language: English (India)'}
            </p>
          </div>

          {/* Transcript bubble */}
          {transcript && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-left">
              <p className="text-[10px] uppercase font-bold text-slate-400">You said:</p>
              <p className="text-xs font-medium text-slate-800 mt-0.5">"{transcript}"</p>
            </div>
          )}

          {/* Assistant answer bubble */}
          {assistantReply && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-left flex items-start gap-2.5">
              <Volume2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-700">Assistant Response:</p>
                <p className="text-xs text-slate-800 mt-0.5">{assistantReply}</p>
              </div>
            </div>
          )}

          {/* Keyboard input fallback for browsers without speech */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-[11px] text-slate-500 mb-2">Or type your command manually:</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={language === 'ta' ? 'எ.கா. கழிவு சேகரிப்பு, எரிவாயு கசிவு...' : 'e.g. Schedule waste pickup, gas leak, savings...'}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && transcript.trim()) {
                    processCommand(transcript);
                  }
                }}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => {
                  if (transcript.trim()) processCommand(transcript);
                }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistantModal;
