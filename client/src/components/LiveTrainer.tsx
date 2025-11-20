import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Activity, HeartHandshake, Briefcase, Swords } from 'lucide-react';
import { chatWithCompanion } from '../api';
import toast from 'react-hot-toast';
import '../App.css';

type ModeType = 'mentor' | 'interview' | 'debate';

const LiveTrainer = () => {
  const [status, setStatus] = useState<'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING'>('IDLE');
  const [lastPhrase, setLastPhrase] = useState("Выберите режим и нажмите микрофон.");
  
  // Стейт для UI
  const [mode, setMode] = useState<ModeType>('mentor');
  
  // --- ИСПРАВЛЕНИЕ: REF ДЛЯ АКТУАЛЬНОГО РЕЖИМА ---
  // Мы дублируем режим в ref, чтобы микрофон всегда видел свежее значение
  const modeRef = useRef<ModeType>('mentor');

  // Синхронизируем Ref с состоянием при каждом клике
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'ru-RU';

      recognitionRef.current.onresult = async (e: any) => {
        const text = e.results[0][0].transcript;
        handleSend(text);
      };

      recognitionRef.current.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
           setStatus('IDLE');
           toast.error('Не расслышал...');
        }
      };

      recognitionRef.current.onend = () => {
        if (status === 'LISTENING') setStatus('IDLE');
      };
    }

    return () => {
       window.speechSynthesis.cancel();
    }
  }, []);

  const startSession = () => {
    window.speechSynthesis.cancel();
    setStatus('LISTENING');
    setLastPhrase("Слушаю...");
    try { recognitionRef.current?.start(); } catch {}
  };

  const stopSession = () => {
    window.speechSynthesis.cancel();
    recognitionRef.current?.stop();
    setStatus('IDLE');
  };

  const handleSend = async (text: string) => {
    setStatus('THINKING');
    setLastPhrase(`Вы: "${text}"`);

    try {
      // --- ИСПРАВЛЕНИЕ: БЕРЕМ РЕЖИМ ИЗ REF ---
      // Теперь мы читаем modeRef.current, который всегда свежий
      const currentMode = modeRef.current;
      console.log("Sending request with mode:", currentMode); // Проверка в консоли браузера

      const res = await chatWithCompanion(text, currentMode);
      const reply = res.data.reply;
      setLastPhrase(reply);
      speak(reply);
    } catch (e) {
      setStatus('IDLE');
      toast.error('Сбой связи с ИИ');
    }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    synthRef.current = utterance;
    
    utterance.lang = 'ru-RU';
    utterance.volume = 1;

    // Читаем актуальный режим для настроек голоса тоже из Ref
    const currentMode = modeRef.current;

    if (currentMode === 'interview') {
        utterance.rate = 0.9; 
        utterance.pitch = 0.8; 
    } else if (currentMode === 'debate') {
        utterance.rate = 1.15; 
        utterance.pitch = 1.0;
    } else {
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
    }

    const voices = window.speechSynthesis.getVoices();
    const ruVoices = voices.filter(v => v.lang.includes('ru'));
    
    let voice = ruVoices.find(v => v.name.includes('Google')); 
    if (!voice) voice = ruVoices.find(v => v.name.includes('Milena') || v.name.includes('Yuri')); 
    if (!voice) voice = ruVoices[0]; 
    
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setStatus('SPEAKING');
    utterance.onend = () => setStatus('IDLE');
    utterance.onerror = () => setStatus('IDLE');

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '75vh', gap: '2rem' }}>
      
      <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '16px', marginBottom:'1rem' }}>
          <ModeBtn label="Ментор" active={mode === 'mentor'} onClick={() => setMode('mentor')} color="#10b981" icon={<HeartHandshake size={16}/>} />
          <ModeBtn label="Интервью" active={mode === 'interview'} onClick={() => setMode('interview')} color="#8b5cf6" icon={<Briefcase size={16}/>} />
          <ModeBtn label="Дебаты" active={mode === 'debate'} onClick={() => setMode('debate')} color="#f43f5e" icon={<Swords size={16}/>} />
      </div>

      <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {status === 'IDLE' && <Activity size={64} color="var(--text-muted)" style={{opacity:0.3}} />}
        {status === 'LISTENING' && <div className="pulse-mic"><Mic size={64} color="var(--primary)" /></div>}
        {status === 'THINKING' && <div className="loader-dots"><span></span><span></span><span></span></div>}
        {status === 'SPEAKING' && (
            <div className="voice-wave">
                <div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div>
            </div>
        )}
      </div>

      <div className="card" style={{ 
          minWidth: '300px', maxWidth: '650px', minHeight: '120px', 
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize: '1.3rem', padding: '2rem', lineHeight: '1.6', textAlign: 'center',
          border: status === 'SPEAKING' ? `2px solid ${getColor(mode)}` : '1px solid var(--glass-border)',
          boxShadow: status === 'SPEAKING' ? `0 0 40px ${getColor(mode, 0.25)}` : 'none',
          transition: 'all 0.4s ease'
      }}>
          <p style={{ margin: 0 }}>{lastPhrase}</p>
      </div>

      {status === 'IDLE' ? (
        <button onClick={startSession} className="btn btn-primary" style={{
            borderRadius: '50px', padding: '1rem 3.5rem', fontSize:'1.2rem', 
            background: `linear-gradient(135deg, ${getColor(mode)}, #111)`
        }}>
          <Mic size={24} /> Начать
        </button>
      ) : (
        <button onClick={stopSession} className="btn btn-danger" style={{borderRadius: '50px', padding: '1rem 3.5rem', fontSize:'1.2rem'}}>
          <Square size={20} fill="white"/> Стоп
        </button>
      )}
    </div>
  );
};

// UI Helpers
const ModeBtn = ({label, active, onClick, color, icon}: any) => (
    <button onClick={onClick} style={{
        background: active ? color : 'transparent',
        color: active ? 'white' : 'var(--text-muted)',
        border: 'none', padding: '0.6rem 1rem', borderRadius: '10px',
        cursor: 'pointer', display:'flex', gap:'6px', alignItems:'center', fontWeight:'bold', fontSize:'0.9rem',
        transition: 'all 0.2s',
        boxShadow: active ? `0 0 15px ${color}66` : 'none'
    }}>
        {icon} {label}
    </button>
)

const getColor = (mode: string, alpha = 1) => {
    if (mode === 'interview') return `rgba(139, 92, 246, ${alpha})`; 
    if (mode === 'debate') return `rgba(244, 63, 94, ${alpha})`; 
    return `rgba(16, 185, 129, ${alpha})`; 
}

export default LiveTrainer;