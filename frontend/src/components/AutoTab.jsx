// frontend/src/components/AutoTab.jsx
import { useState, useEffect } from 'react';
import {
  getFrequencies, getSchedulerStatus, startScheduler, stopScheduler,
  runSchedulerNow, getQueue, deleteFromQueue,
} from '../api/api.js';

export default function AutoTab() {
  const [frequencies, setFrequencies] = useState([]);
  const [status, setStatus] = useState({ running: false });
  const [queue, setQueue] = useState([]);
  const [selectedFrequency, setSelectedFrequency] = useState('once_daily');
  const [tone, setTone] = useState('professional');
  const [includeImage, setIncludeImage] = useState(true);
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingRunNow, setLoadingRunNow] = useState(false);
  const [runNowResult, setRunNowResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFrequencies();
    loadStatus();
    loadQueue();
    const interval = setInterval(() => { loadStatus(); loadQueue(); }, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadFrequencies() {
    try {
      const data = await getFrequencies();
      setFrequencies(data.frequencies || []);
    } catch (_) {}
  }

  async function loadStatus() {
    try {
      const data = await getSchedulerStatus();
      setStatus(data);
    } catch (_) {}
  }

  async function loadQueue() {
    try {
      const data = await getQueue();
      setQueue(data.items || []);
    } catch (_) {}
  }

  async function handleStart() {
    setLoadingStart(true);
    setError('');
    try {
      await startScheduler({ frequency: selectedFrequency, tone, includeImage });
      await loadStatus();
    } catch (e) { setError('Failed to start scheduler: ' + e.message); }
    finally { setLoadingStart(false); }
  }

  async function handleStop() {
    try {
      await stopScheduler();
      await loadStatus();
    } catch (e) { setError('Failed to stop: ' + e.message); }
  }

  async function handleRunNow() {
    setLoadingRunNow(true);
    setError('');
    setRunNowResult(null);
    try {
      const result = await runSchedulerNow({ tone, includeImage });
      setRunNowResult(result);
      await loadQueue();
    } catch (e) { setError('Run-now failed: ' + e.message); }
    finally { setLoadingRunNow(false); }
  }

  async function handleDeleteQueue(id) {
    try {
      await deleteFromQueue(id);
      await loadQueue();
    } catch (e) { setError('Delete failed: ' + e.message); }
  }

  const pending = queue.filter((i) => i.status === 'pending');
  const posted = queue.filter((i) => i.status === 'posted');
  const failed = queue.filter((i) => i.status === 'failed');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* LEFT: Scheduler controls */}
      <div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Auto Scheduler</h3>
          <p style={styles.hint}>
            Set a frequency and walk away. The bot finds trending tech news, writes a post with Claude, and publishes it to LinkedIn automatically.
          </p>

          {/* Status badge */}
          <div style={{ ...styles.statusBadge, background: status.running ? '#e8f5ee' : '#f5f5f5', borderColor: status.running ? '#2a7a2a' : '#ccc' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: status.running ? '#2a7a2a' : '#bbb', display: 'inline-block', marginRight: 6 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: status.running ? '#2a7a2a' : '#666' }}>
              {status.running ? `Running — ${frequencies.find((f) => f.value === status.frequency)?.label || status.frequency}` : 'Not running'}
            </span>
          </div>

          {status.lastRun && (
            <div style={styles.metaLine}>Last post: {new Date(status.lastRun).toLocaleString()}</div>
          )}
          {status.nextRun && status.running && (
            <div style={styles.metaLine}>Next post: {new Date(status.nextRun).toLocaleString()}</div>
          )}

          <label style={styles.label}>Posting Frequency</label>
          <select
            style={styles.select}
            value={selectedFrequency}
            onChange={(e) => setSelectedFrequency(e.target.value)}
            disabled={status.running}
          >
            {frequencies.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          <label style={styles.label}>Writing Tone</label>
          <select style={styles.select} value={tone} onChange={(e) => setTone(e.target.value)} disabled={status.running}>
            {[
              ['professional', 'Professional'],
              ['technical', 'Technical'],
              ['executive', 'Executive'],
              ['conversational', 'Conversational'],
              ['founder', 'Founder'],
            ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 14 }}>
            <input
              type="checkbox"
              checked={includeImage}
              onChange={(e) => setIncludeImage(e.target.checked)}
              disabled={status.running}
            />
            Include AI-generated banner image with each post
          </label>

          {error && <div style={styles.error}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            {status.running ? (
              <button style={{ ...styles.btnDanger, flex: 1 }} onClick={handleStop}>
                ⏹ Stop Scheduler
              </button>
            ) : (
              <button
                style={{ ...styles.btnPrimary, flex: 1 }}
                onClick={handleStart}
                disabled={loadingStart}
              >
                {loadingStart ? 'Starting…' : '▶ Start Scheduler'}
              </button>
            )}
          </div>
        </div>

        {/* Run Now for testing */}
        <div style={{ ...styles.card, marginTop: 16 }}>
          <h3 style={styles.sectionTitle}>Test — Post Right Now</h3>
          <p style={styles.hint}>Trigger one auto-post immediately without waiting for the schedule. Useful for testing your setup.</p>
          <button
            style={{ ...styles.btnSecondary, width: '100%' }}
            onClick={handleRunNow}
            disabled={loadingRunNow}
          >
            {loadingRunNow ? 'Posting… (this takes ~15 seconds)' : '⚡ Post One Now'}
          </button>
          {runNowResult && (
            <div style={{ ...styles.success, marginTop: 10 }}>
              ✅ Post published!
              {runNowResult.result?.url && (
                <a href={runNowResult.result.url} target="_blank" rel="noreferrer" style={{ color: '#0a66c2', marginLeft: 8 }}>
                  View on LinkedIn →
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Queue viewer */}
      <div>
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={styles.sectionTitle}>Scheduled Queue</h3>
            <button style={styles.btnTiny} onClick={loadQueue}>↻ Refresh</button>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {[['Pending', pending.length, '#0a66c2'], ['Posted', posted.length, '#2a7a2a'], ['Failed', failed.length, '#c44']].map(([label, count, color]) => (
              <div key={label} style={{ flex: 1, textAlign: 'center', padding: '10px 0', background: '#f8f8f8', borderRadius: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color }}>{count}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Pending items */}
          {pending.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Upcoming</div>
              {pending.map((item) => (
                <div key={item.id} style={styles.queueItem}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 3 }}>
                      {item.title || item.postText.slice(0, 60) + '…'}
                    </div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      🗓 {new Date(item.scheduledAt).toLocaleString()}
                    </div>
                  </div>
                  <button style={styles.btnTiny} onClick={() => handleDeleteQueue(item.id)}>Cancel</button>
                </div>
              ))}
            </>
          )}

          {/* Posted items */}
          {posted.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#555', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Posted</div>
              {posted.slice(-5).map((item) => (
                <div key={item.id} style={{ ...styles.queueItem, opacity: 0.7 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#1a1a1a', marginBottom: 3 }}>
                      {item.title || item.postText.slice(0, 60) + '…'}
                    </div>
                    <div style={{ fontSize: 11, color: '#2a7a2a' }}>
                      ✅ Posted {item.postedAt ? new Date(item.postedAt).toLocaleString() : ''}
                    </div>
                  </div>
                  {item.postUrl && (
                    <a href={item.postUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#0a66c2', textDecoration: 'none' }}>
                      View →
                    </a>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Failed items */}
          {failed.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#c44', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Failed</div>
              {failed.map((item) => (
                <div key={item.id} style={{ ...styles.queueItem, borderColor: '#fcc' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#1a1a1a', marginBottom: 3 }}>
                      {item.title || item.postText.slice(0, 60) + '…'}
                    </div>
                    <div style={{ fontSize: 11, color: '#c44' }}>{item.failReason || 'Unknown error'}</div>
                  </div>
                </div>
              ))}
            </>
          )}

          {queue.length === 0 && (
            <div style={{ textAlign: 'center', color: '#bbb', fontSize: 14, padding: '32px 0' }}>
              No posts in queue yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#1B4F8A', margin: '0 0 8px' },
  hint: { fontSize: 12, color: '#888', margin: '0 0 14px', lineHeight: 1.5 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, marginTop: 14 },
  select: { width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 },
  statusBadge: { display: 'flex', alignItems: 'center', padding: '10px 14px', border: '1px solid', borderRadius: 8, marginBottom: 10 },
  metaLine: { fontSize: 12, color: '#666', marginBottom: 4, paddingLeft: 2 },
  queueItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #eee', borderRadius: 8, marginBottom: 8 },
  btnPrimary: { padding: '10px 18px', background: '#0a66c2', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontWeight: 600 },
  btnDanger: { padding: '10px 18px', background: '#c44', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontWeight: 600 },
  btnSecondary: { padding: '9px 16px', background: '#f0f0f0', color: '#333', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  btnTiny: { padding: '4px 10px', background: '#f5f5f5', color: '#666', border: '1px solid #ddd', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  error: { marginTop: 10, padding: '8px 12px', background: '#fff3f3', border: '1px solid #fcc', borderRadius: 6, fontSize: 13, color: '#c44' },
  success: { padding: '8px 12px', background: '#f0fff4', border: '1px solid #9ec', borderRadius: 6, fontSize: 13, color: '#2a7a2a' },
};
