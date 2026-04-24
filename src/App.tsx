/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  Send, 
  Settings, 
  Play, 
  Volume2, 
  Languages, 
  MoreVertical, 
  Search, 
  ArrowLeft,
  Check,
  CheckCheck,
  Menu,
  Info,
  LogOut,
  Zap,
  History
} from 'lucide-react';
import { cn } from './lib/utils';
import { translateMessage, IndianLanguage } from './services/geminiService';
import { speakText } from './services/speechService';
import { getFirebaseAuth, getFirebaseDb, signInWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User, Auth } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Firestore,
  type DocumentData 
} from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  translatedText?: string;
  sender: 'user' | 'other';
  timestamp: any;
  status?: 'sent' | 'delivered' | 'read';
}

const INDIAN_LANGUAGES: IndianLanguage[] = [
  'Hindi', 'Bengali', 'Marathi', 'Telugu', 'Tamil', 'Gujarati', 'Urdu', 'Kannada', 'Odia', 'Malayalam', 'Punjabi'
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<IndianLanguage>('Hindi');
  const [isTranslating, setIsTranslating] = useState<string | null>(null);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsubscribe: any;
    const initAuth = async () => {
      try {
        const auth = await getFirebaseAuth();
        unsubscribe = onAuthStateChanged(auth, (u) => {
          setUser(u);
        });
      } catch (e) {
        console.warn("Firebase Auth not ready:", e);
      }
    };
    initAuth();
    return () => unsubscribe && unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setMessages([
        {
          id: '1',
          text: "Welcome to Bolo! Login to sync your messages across devices and enable offline reading.",
          sender: 'other',
          timestamp: new Date(),
        }
      ]);
      return;
    }

    let unsubscribe: any;
    const syncMessages = async () => {
      try {
        const db = await getFirebaseDb();
        const q = query(collection(db, `users/${user.uid}/messages`), orderBy('timestamp', 'asc'));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Message[];
          
          if (msgs.length > 0) {
            setMessages(msgs);
          }
        }, (error) => {
          console.warn("Firestore sync error:", error);
        });
      } catch (e) {
        console.warn("Firestore not ready:", e);
      }
    };
    
    syncMessages();
    return () => unsubscribe && unsubscribe();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const messageData = {
      text: inputText,
      sender: 'user' as const,
      timestamp: serverTimestamp() || new Date(),
      status: 'sent' as const
    };

    if (user) {
      try {
        const db = await getFirebaseDb();
        await addDoc(collection(db, `users/${user.uid}/messages`), messageData);
      } catch (e) {
        console.error("Save error:", e);
        // Fallback for demo
        setMessages(prev => [...prev, { id: Date.now().toString(), ...messageData }]);
      }
    } else {
      setMessages(prev => [...prev, { id: Date.now().toString(), ...messageData }]);
    }
    
    setInputText('');
  };

  const handleTranslateAndSpeak = async (message: Message) => {
    if (isTranslating) return;
    
    setIsTranslating(message.id);
    
    try {
      let translation = message.translatedText;
      
      if (!translation) {
        translation = await translateMessage(message.text, selectedLanguage);
        // Update local state and ideally sync back to Firestore
        setMessages(prev => prev.map(m => 
          m.id === message.id ? { ...m, translatedText: translation } : m
        ));
      }
      
      speakText(translation, selectedLanguage);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTranslating(null);
    }
  };

  const simulateInboxFetch = () => {
    const fakeMessages = [
      "Your order #1234 has been shipped and will arrive tomorrow.",
      "Meeting postponed to 3 PM. Please join using the link provided.",
      "OTP for your transaction is 556677. Do not share with anyone."
    ];
    
    const randomMsg = fakeMessages[Math.floor(Math.random() * fakeMessages.length)];
    const newMessage: Message = {
      id: Date.now().toString(),
      text: randomMsg,
      sender: 'other',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  return (
    <div className="flex h-screen bg-[#F0F2F5] font-sans antialiased overflow-hidden">
      {/* Sidebar (Mobile Hidden or Tablet/Desktop) */}
      <div className="hidden md:flex flex-col w-[30%] lg:w-[25%] bg-white border-r border-[#D1D7DB]">
        <div className="h-16 flex items-center justify-between px-4 bg-[#F0F2F5]">
          <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden ring-2 ring-white cursor-pointer" onClick={() => !user && signInWithGoogle()}>
            <img 
              src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'Bolo'}`} 
              alt="Avatar" 
              className="w-full h-full" 
            />
          </div>
          <div className="flex gap-4 text-[#54656F] items-center">
            {user ? (
              <LogOut className="w-5 h-5 cursor-pointer hover:text-red-500" onClick={logout} title="Logout" />
            ) : (
              <Zap className="w-5 h-5 cursor-pointer text-[#00A884]" onClick={signInWithGoogle} title="Login with Google" />
            )}
            <Settings className="w-5 h-5 cursor-pointer" />
          </div>
        </div>
        
        <div className="p-2 bg-white">
          <div className="flex items-center gap-4 bg-[#F0F2F5] px-4 py-2 rounded-lg">
            <Search className="w-5 h-5 text-[#54656F]" />
            <input 
              placeholder="Search or start new chat" 
              className="bg-transparent border-none outline-none w-full text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div 
            className="flex items-center gap-4 px-4 py-3 bg-[#F0F2F5] hover:bg-[#F5F6F6] cursor-pointer border-l-4 border-[#00A884]"
            onClick={simulateInboxFetch}
          >
            <div className="w-12 h-12 rounded-full bg-[#00A884] flex items-center justify-center text-white shadow-sm ring-2 ring-white">
              <History className="w-6 h-6" />
            </div>
            <div className="flex-1 border-b border-[#F0F2F5] pb-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-[#111B21]">Recent Messages</span>
                <span className="text-[10px] bg-[#25D366] text-white px-1.5 py-0.5 rounded-full">New</span>
              </div>
              <p className="text-xs text-[#667781] truncate font-medium">Click to simulate inbox fetch...</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 px-4 py-3 hover:bg-[#F5F6F6] cursor-pointer" onClick={() => setShowInfo(true)}>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
               <Info className="w-6 h-6" />
            </div>
            <div className="flex-1 border-b border-[#F0F2F5] pb-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">How it works?</span>
                <span className="text-xs text-[#667781]">24/04</span>
              </div>
              <p className="text-xs text-[#667781] truncate">Research on inbox integration...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative w-full h-full bg-white">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 bg-[#F0F2F5] border-b border-[#D1D7DB] z-10">
          <div className="flex items-center gap-4">
            <ArrowLeft className="md:hidden w-6 h-6 text-[#54656F] cursor-pointer" />
            <div className="w-10 h-10 rounded-full bg-gray-300">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=BoloBot" alt="Avatar" className="w-full h-full rounded-full" />
            </div>
            <div>
              <h2 className="font-medium text-[#111B21]">Bolo - Voice Reader</h2>
              <p className="text-[11px] text-[#667781]">Reading in {selectedLanguage} script</p>
            </div>
          </div>
          <div className="flex gap-4 sm:gap-6 text-[#54656F] items-center">
            <div 
              className="flex items-center gap-2 cursor-pointer bg-white/80 hover:bg-white border border-[#D1D7DB] px-3 py-1.5 rounded-full transition-all shadow-sm"
              onClick={() => setShowLanguagePicker(true)}
            >
              <Languages className="w-4 h-4 text-[#00A884]" />
              <span className="text-sm font-semibold text-[#00A884]">{selectedLanguage}</span>
            </div>
            <Search className="w-5 h-5 cursor-pointer hidden sm:block" />
            <MoreVertical className="w-5 h-5 cursor-pointer" />
          </div>
        </div>

        {/* Chat Canvas */}
        <div className="flex-1 overflow-y-auto whatsapp-bg px-4 py-4 md:px-12 flex flex-col gap-2 custom-scrollbar relative">
          {/* Watermark style background info */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none text-6xl font-bold text-center w-full transform -rotate-12">
            English to Voice<br/>BOLO APP
          </div>

          <div className="self-center bg-[#E9EDEF] px-3 py-1 rounded-md text-[11px] mb-4 shadow-sm text-[#54656F] uppercase tracking-wider font-medium z-10">
            Today
          </div>

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                layout
                className={cn(
                  "max-w-[85%] md:max-w-[70%] rounded-lg p-2.5 shadow-sm relative group mb-1 min-w-[80px]",
                  msg.sender === 'user' 
                    ? "self-end bg-[#D9FDD3] rounded-tr-none text-right" 
                    : "self-start bg-white rounded-tl-none text-left"
                )}
              >
                {/* Speech Control for incoming messages */}
                {msg.sender === 'other' && (
                  <button 
                    onClick={() => handleTranslateAndSpeak(msg)}
                    disabled={isTranslating === msg.id}
                    title={"Read in " + selectedLanguage}
                    className={cn(
                      "absolute -right-12 top-1 shadow-lg p-2 rounded-full bg-white text-[#54656F] hover:text-[#00A884] hover:bg-[#F0F2F5] transition-all opacity-0 group-hover:opacity-100 scale-90",
                      isTranslating === msg.id && "animate-pulse opacity-100 text-[#00A884]"
                    )}
                  >
                    {isTranslating === msg.id ? <Volume2 className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                )}

                <p className={cn(
                  "text-[14.2px] leading-relaxed text-[#111B21] pr-10 pb-4",
                  msg.sender === 'user' && "pl-4 pr-12"
                )}>
                  {msg.text}
                </p>
                
                {msg.translatedText && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 pt-2 border-t border-gray-100 text-left"
                  >
                    <p className="text-[15px] font-hindi text-[#008069] font-medium">
                      {msg.translatedText}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                       <button 
                        onClick={() => speakText(msg.translatedText!, selectedLanguage)}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                       >
                         <Volume2 className="w-4 h-4 text-[#008069]" />
                       </button>
                       <span className="text-[10px] text-[#008069] opacity-70 italic font-medium tracking-tight">
                         Converted to {selectedLanguage} audio
                       </span>
                    </div>
                  </motion.div>
                )}
                
                <div className="absolute right-1.5 bottom-1 flex items-center gap-1">
                  <span className="text-[10px] text-[#667781] font-medium">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.sender === 'user' && (
                    msg.status === 'read' ? <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" /> : <Check className="w-3.5 h-3.5 text-[#667781]" />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="px-4 py-2 bg-[#F0F2F5] flex items-center gap-3">
          <div className="flex gap-1 text-[#54656F]">
            <button className="cursor-pointer hover:bg-gray-200 p-2.5 rounded-full transition-colors md:hidden" onClick={() => !user && signInWithGoogle()}>
              {user ? <LogOut className="w-6 h-6" onClick={logout} /> : <Zap className="w-6 h-6" />}
            </button>
            <button className="cursor-pointer hover:bg-gray-200 p-2.5 rounded-full transition-colors" onClick={simulateInboxFetch} title="Fetch Inbox">
              <History className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 bg-white rounded-full flex items-center px-4 py-1.5 shadow-sm border border-transparent focus-within:border-[#D1D7DB]">
            <input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Paste English message here..." 
              className="flex-1 outline-none border-none text-sm py-1 placeholder:text-[#667781]"
            />
          </div>
          
          <button 
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-all outline-none",
              inputText.trim() ? "bg-[#00A884]" : "bg-[#54656F] opacity-50 cursor-not-allowed"
            )}
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>

        {/* Info Modal */}
        <AnimatePresence>
          {showInfo && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
              onClick={() => setShowInfo(false)}
            >
              <motion.div 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white w-full max-w-lg rounded-[2rem] overflow-hidden p-8 shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-[#00A884]/10 rounded-2xl">
                    <Zap className="w-8 h-8 text-[#00A884]" />
                  </div>
                  <h3 className="font-bold text-2xl">Bolo Research & Integration</h3>
                </div>
                
                <div className="space-y-4 text-sm text-[#54656F] leading-relaxed">
                  <p>
                    <strong className="text-[#111B21]">1. Inbox Integration:</strong> For web apps, direct access to WhatsApp/SMS is prohibited for security. Bolo uses a <span className="text-[#008069] font-medium">"Paste & Read"</span> approach or a simulation layer.
                  </p>
                  <p>
                    <strong className="text-[#111B21]">2. Message Formats:</strong> Bolo handles plain text, bullet points, and short SMS alerts efficiently using Gemini AI's parsing capabilities.
                  </p>
                  <p>
                    <strong className="text-[#111B21]">3. Offline Mode:</strong> We use <span className="text-[#008069] font-medium">Firestore Persistence</span> and <span className="text-[#008069] font-medium">Web Speech API</span> local voices to ensure previously converted messages can be played without internet.
                  </p>
                  <p>
                    <strong className="text-[#111B21]">4. Native App (Future):</strong> On Android, Bolo would use a <span className="text-[#008069] font-medium">NotificationListenerService</span> to automatically read incoming notifications in your chosen language.
                  </p>
                </div>

                <button 
                  onClick={() => setShowInfo(false)}
                  className="w-full mt-8 py-4 bg-[#F0F2F5] hover:bg-gray-200 rounded-2xl font-bold text-[#111B21] transition-colors"
                >
                  Got it!
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Language Picker Modal */}
        <AnimatePresence>
          {showLanguagePicker && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setShowLanguagePicker(false)}
            >
              <motion.div 
                initial={{ y: 200 }}
                animate={{ y: 0 }}
                exit={{ y: 200 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="px-8 pt-8 pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-2xl text-[#111B21]">Translate to</h3>
                    <div 
                      onClick={() => setShowLanguagePicker(false)}
                      className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-6 h-6 text-[#111B21]" />
                    </div>
                  </div>
                  <p className="text-[#667781] text-sm mb-6">Choose an Indian language for voice reading.</p>
                  
                  <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-2 pb-8">
                    <div className="grid grid-cols-1 gap-3">
                      {INDIAN_LANGUAGES.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => {
                            setSelectedLanguage(lang);
                            setShowLanguagePicker(false);
                          }}
                          className={cn(
                            "group px-5 py-4 rounded-2xl flex items-center justify-between transition-all border-2",
                            selectedLanguage === lang 
                              ? "bg-[#D9FDD3] border-[#00A884] text-[#008069] shadow-sm" 
                              : "bg-white border-[#F0F2F5] text-[#111B21] hover:border-[#D1D7DB] hover:bg-gray-50"
                          )}
                        >
                          <span className="font-bold text-lg">{lang}</span>
                          {selectedLanguage === lang ? (
                            <Check className="w-6 h-6" />
                          ) : (
                            <Play className="w-5 h-5 text-gray-300 group-hover:text-[#00A884] transition-colors" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
