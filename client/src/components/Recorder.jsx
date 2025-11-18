import { useState, useEffect, useRef, useTransition } from 'react';
import { Mic, StopCircle, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { analyzeSpeech } from '../api';

const Recorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [timer, setTimer] = useState(0);
  
  const [isPending, startTransition] = useTransition();
  
  // Используем Ref для хранения текста, чтобы он был доступен мгновенно
  const transcriptRef = useRef(''); 
  const recognitionRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Проверка поддержки браузером
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // Не останавливаться после паузы
      recognitionRef.current.interimResults = true; // Показывать промежуточные результаты
      recognitionRef.current.lang = 'ru-RU';

      recognitionRef.current.onresult = (e) => {
        let finalChunk = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalChunk += e.results[i][0].transcript + ' ';
          }
        }
        
        // Если есть финальный текст - сохраняем
        if (finalChunk) {
          transcriptRef.current += finalChunk;
          setTranscript(prev => prev + finalChunk);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Ошибка Speech API:", event.error);
        if (event.error === 'not-allowed') {
            alert('Доступ к микрофону запрещен. Разрешите доступ в настройках браузера.');
        }
      };
    } else {
        alert('Ваш браузер не поддерживает распознавание речи (нужен Chrome/Edge).');
    }
  }, []);

  const startRecording = () => {
    setTranscript('');
    transcriptRef.current = ''; // Сбрас
    setAnalysis(null); // Скрываем старый результат
    setTimer(0);
    setIsRecording(true);
    
    try {
        recognitionRef.current.start();
        intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } catch (e) {
        console.error("Не удалось запустить запись:", e);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    clearInterval(intervalRef.current);
    
    console.log("Остановка записи...");

    // Даем 1 секунду, чтобы "долетели" последние слова из микрофона
    setTimeout(() => {
        handleAnalysis();
    }, 1000);
  };

  const handleAnalysis = () => {
      const textToAnalyze = transcriptRef.current;
      console.log("Текст для анализа:", textToAnalyze);

      if (!textToAnalyze || textToAnalyze.trim().length === 0) {
          alert('Ничего не записалось. Попробуйте говорить громче.');
          return;
      }

      // Запуск запроса к серверу
      startTransition(async () => {
        try {
          console.log("Отправка на сервер...");
          const res = await analyzeSpeech(textToAnalyze, timer);
          console.log("Ответ сервера:", res.data);
          setAnalysis(res.data); // <--- ВОТ ЗДЕСЬ ПОЯВЛЯЕТСЯ ОКНО
        } catch (e) {
          console.error("Ошибка анализа:", e);
          alert('Ошибка связи с сервером. Проверьте, запущен ли бекенд.');
        }
      });
  };

  return (
    <div className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>Тренировка Речи</h1>
        <p style={{ color: 'var(--text-muted)' }}>Говорите свободно. Анализ запустится автоматически после остановки.</p>
      </div>

      {/* --- БЛОК ЗАПИСИ --- */}
      <div className="card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="timer-display">
          {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
        </div>
        
        {!isRecording ? (
          <button 
            onClick={startRecording} 
            className="btn btn-primary"
            disabled={isPending}
            style={{ fontSize: '1.1rem', padding: '1rem 2.5rem', borderRadius: '50px' }}
          >
            {isPending ? <Loader2 className="spin" /> : <Mic />} 
            {isPending ? 'Анализирую...' : 'Начать запись'}
          </button>
        ) : (
          <button 
            onClick={stopRecording} 
            className="btn btn-danger"
            style={{ fontSize: '1.1rem', padding: '1rem 2.5rem', borderRadius: '50px' }}
          >
            <StopCircle className="spin" /> Стоп
          </button>
        )}

        <div className="transcript-box">
          {transcript || <span style={{opacity: 0.5}}>Нажмите запись и говорите...</span>}
        </div>
      </div>

      {/* --- ИНДИКАТОР ЗАГРУЗКИ (ЕСЛИ АНАЛИЗ ИДЕТ) --- */}
      {isPending && (
          <div style={{ textAlign: 'center', margin: '2rem 0', color: 'var(--primary)' }}>
              <Loader2 className="spin" size={40} style={{margin: '0 auto'}}/>
              <p>ИИ думает...</p>
          </div>
      )}

      {/* --- БЛОК РЕЗУЛЬТАТОВ (ПОЯВЛЯЕТСЯ СНИЗУ) --- */}
      {analysis && (
        <div className="card result-section">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="score-circle">
              <div className="score-value">{analysis.clarityScore}</div>
              <div className="score-label">Баллов</div>
            </div>
            <h2 style={{ margin: 0 }}>
                Анализ завершен <Sparkles size={24} color="var(--accent)" style={{verticalAlign:'middle'}}/>
            </h2>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-val">{analysis.pace}</div>
              <div className="metric-label">Слов / Мин</div>
            </div>
            <div className="metric-card">
              <div className="metric-val" style={{ color: analysis.fillerWords.length > 2 ? 'var(--danger)' : 'var(--primary)' }}>
                {analysis.fillerWords.length}
              </div>
              <div className="metric-label">Слов-паразитов</div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem' }}>
             <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '1rem', borderLeft: '4px solid #10b981' }}>
                <h3 style={{ color: '#10b981', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                  <CheckCircle2 size={20} /> Что получилось хорошо:
                </h3>
                <p style={{ margin: 0, lineHeight: '1.6' }}>{analysis.feedback}</p>
             </div>

             <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '1.5rem', borderRadius: '1rem', borderLeft: '4px solid var(--accent)' }}>
                <h3 style={{ color: 'var(--accent)', fontSize: '1.1rem', marginTop: 0 }}>💡 Зона роста:</h3>
                <p style={{ margin: 0, lineHeight: '1.6' }}>{analysis.tip}</p>
             </div>
          </div>
          
          <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            * Результат автоматически сохранен в Истории
          </p>
        </div>
      )}
    </div>
  );
};

export default Recorder;