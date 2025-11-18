import { useState, useEffect } from 'react';
import { fetchHistory } from '../api';
import { Loader2, X, FileText, Zap } from 'lucide-react';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null); // Для модального окна

  useEffect(() => {
    fetchHistory()
      .then(res => setHistory(Array.isArray(res.data) ? res.data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}><Loader2 className="spin" color="var(--primary)"/></div>;

  return (
    <div className="fade-in">
      <h1>История Выступлений</h1>
      
      <div className="card">
        {history.length === 0 ? (
          <p style={{textAlign:'center', color:'var(--text-muted)'}}>История пуста.</p>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Оценка</th>
                <th>Темп</th>
                <th>Совет</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} onClick={() => setSelectedItem(h)} className="history-row">
                  <td>{new Date(h.created_at).toLocaleDateString()} <br/><small style={{opacity:0.5}}>{new Date(h.created_at).toLocaleTimeString().slice(0,5)}</small></td>
                  <td>
                    <span style={{ 
                      color: h.clarity_score >= 80 ? '#4ade80' : h.clarity_score >= 50 ? '#facc15' : '#f43f5e',
                      fontWeight: 'bold', fontSize: '1.1rem'
                    }}>
                      {h.clarity_score}
                    </span>
                  </td>
                  <td>{h.pace_wpm} wpm</td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)' }}>
                    {h.tip}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ --- */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedItem(null)}><X /></button>
            
            <h2 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
              Детали выступления
            </h2>

            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', marginTop: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Оценка</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{selectedItem.clarity_score}/100</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Темп</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{selectedItem.pace_wpm} <small style={{fontSize:'1rem'}}>слов/мин</small></div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
               <h3 style={{ fontSize: '1.1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <FileText size={18} /> Транскрипт:
               </h3>
               <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '0.5rem', maxHeight: '200px', overflowY: 'auto', lineHeight: '1.6', color: '#cbd5e1' }}>
                 {selectedItem.transcript}
               </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <Zap size={18} /> Анализ ИИ:
              </h3>
              <p style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem' }}>
                {selectedItem.feedback}
              </p>
              <div style={{ marginTop: '1rem', color: 'var(--danger)', fontSize: '0.9rem' }}>
                 Совет: {selectedItem.tip}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default History;