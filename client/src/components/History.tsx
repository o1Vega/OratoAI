import { useState, useEffect } from 'react';
import { fetchHistory, clearHistory, HistoryItem } from '../api';
import { Loader2, X, FileText, Zap, Trash2, AlertCircle, TrendingUp, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

const History = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    fetchHistory()
      .then(res => {
          const data = Array.isArray(res.data) ? res.data : [];
          setHistory(data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const handleClear = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить ВСЮ историю?')) return;
    
    const toastId = toast.loading('Удаляем историю...'); 

    try {
      await clearHistory();
      setHistory([]);
      toast.success('История очищена 🗑️', { id: toastId });
    } catch (e) {
      toast.error('Ошибка при удалении', { id: toastId });
    }
  };

  const chartData = history.map(h => ({
    ...h,
    shortDate: new Date(h.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })
  }));

  const tableData = [...history].reverse();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}><Loader2 className="spin" color="var(--primary)"/></div>;

  return (
    <div className="fade-in">
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Ваш Прогресс</h1>
        {history.length > 0 && (
          <button onClick={handleClear} className="btn btn-danger" style={{ padding: '0.6rem 1.2rem', fontSize: '0.8rem' }}>
            <Trash2 size={16} />
          </button>
        )}
      </div>
      
      {history.length === 0 ? (
        <div className="card" style={{textAlign:'center', padding: '4rem', color:'var(--text-muted)'}}>
          <AlertCircle size={64} style={{opacity: 0.3, marginBottom: '1.5rem'}}/>
          <h2>Здесь пусто</h2>
          <p>Пройдите первую тренировку, чтобы увидеть графики роста!</p>
        </div>
      ) : (
        <>
          <div className="metrics-grid" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
            
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', display:'flex', alignItems:'center', gap:'10px', marginBottom:'1rem' }}>
                <TrendingUp size={20} color="var(--primary)"/> Динамика Оценки
              </h3>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="shortDate" stroke="#94a3b8" fontSize={12} tickMargin={10} />
                    <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="clarityScore" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorScore)" name="Баллы" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', display:'flex', alignItems:'center', gap:'10px', marginBottom:'1rem' }}>
                <Activity size={20} color="var(--accent)"/> Темп речи (WPM)
              </h3>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="shortDate" stroke="#94a3b8" fontSize={12} tickMargin={10} />
                    <YAxis stroke="#94a3b8" fontSize={12} domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip 
                        contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="pace" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} name="Слов/мин" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          <div className="card">
            <h3 style={{ padding: '1.5rem', paddingBottom:0, margin:0, fontSize:'1.2rem', color:'var(--text-muted)' }}>Список записей</h3>
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
                {tableData.map(h => (
                  <tr key={h.id} onClick={() => setSelectedItem(h)} className="history-row">
                    <td>{new Date(h.date).toLocaleDateString()} <small style={{color:'gray'}}>{new Date(h.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small></td>
                    <td>
                      <span style={{ 
                          display:'inline-block', padding:'2px 8px', borderRadius:'4px', fontWeight:'bold',
                          background: h.clarityScore >= 80 ? 'rgba(16, 185, 129, 0.2)' : h.clarityScore >= 50 ? 'rgba(250, 204, 21, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                          color: h.clarityScore >= 80 ? '#34d399' : h.clarityScore >= 50 ? '#facc15' : '#f43f5e'
                      }}>
                        {h.clarityScore}
                      </span>
                    </td>
                    <td>{h.pace} wpm</td>
                    <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {h.tip}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedItem(null)}><X /></button>
            <h2 style={{borderBottom:'1px solid var(--glass-border)', paddingBottom:'1rem'}}>Детали записи</h2>
            
            <div style={{ display: 'flex', gap: '2rem', margin: '1.5rem 0', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding:'1rem', borderRadius:'12px', minWidth:'100px', textAlign:'center' }}>
                <div style={{fontSize:'0.8rem', color:'var(--text-muted)', textTransform:'uppercase'}}>Оценка</div>
                <div style={{fontSize:'2rem', fontWeight:'bold', color:'var(--primary)'}}>{selectedItem.clarityScore}</div>
              </div>
              <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding:'1rem', borderRadius:'12px', minWidth:'100px', textAlign:'center' }}>
                <div style={{fontSize:'0.8rem', color:'var(--text-muted)', textTransform:'uppercase'}}>Темп</div>
                <div style={{fontSize:'2rem', fontWeight:'bold', color:'var(--accent)'}}>{selectedItem.pace}</div>
              </div>
              <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding:'1rem', borderRadius:'12px', minWidth:'100px', textAlign:'center' }}>
                <div style={{fontSize:'0.8rem', color:'var(--text-muted)', textTransform:'uppercase'}}>Слов</div>
                <div style={{fontSize:'2rem', fontWeight:'bold', color:'var(--danger)'}}>{selectedItem.fillerWords.length}</div>
              </div>
            </div>

            <div style={{ marginTop:'1.5rem' }}>
                <h3 style={{fontSize:'1.1rem', color:'white', display:'flex', gap:'8px'}}><FileText size={18} color="gray"/> Ваш текст:</h3>
                <div style={{background:'rgba(0,0,0,0.3)', padding:'1.5rem', borderRadius:'1rem', maxHeight:'200px', overflowY:'auto', color:'#cbd5e1', lineHeight:'1.6', fontSize:'0.95rem'}}>
                    {selectedItem.transcript}
                </div>
                
                <div style={{marginTop:'2rem', display:'grid', gap:'1rem'}}>
                    <div style={{borderLeft:'3px solid #10b981', paddingLeft:'1rem'}}>
                        <h3 style={{fontSize:'1rem', color:'#10b981', margin:'0 0 5px'}}>Вердикт ИИ</h3>
                        <p style={{margin:0}}>{selectedItem.feedback}</p>
                    </div>
                    <div style={{borderLeft:'3px solid var(--accent)', paddingLeft:'1rem'}}>
                        <h3 style={{fontSize:'1rem', color:'var(--accent)', margin:'0 0 5px'}}>Совет</h3>
                        <p style={{margin:0}}>{selectedItem.tip}</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;