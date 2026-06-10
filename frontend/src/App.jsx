// frontend/src/App.jsx
import { useState, useEffect } from 'react';
import ManualTab from './components/ManualTab.jsx';
import CreateTab from './components/CreateTab.jsx';
import AutoTab from './components/AutoTab.jsx';
import { checkLinkedInStatus } from './api/api.js';

const TABS = [
  { id: 'manual', label: 'Manual', desc: 'Browse news & generate' },
  { id: 'create', label: 'Create Your Own', desc: 'Write your own content' },
  { id: 'auto', label: 'Auto Scheduler', desc: 'Set it & forget it' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('manual');
  const [linkedinStatus, setLinkedinStatus] = useState(null);

  useEffect(() => {
    checkLinkedInStatus()
      .then(setLinkedinStatus)
      .catch(() => setLinkedinStatus({ valid: false, reason: 'Could not connect to backend' }));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f3f2ef', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* LinkedIn logo mark */}
            <div style={{ width: 32, height: 32, background: '#0a66c2', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 18, fontFamily: 'Georgia, serif' }}>in</span>
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>LinkedIn AI Bot</div>
              <div style={{ fontSize: 11, color: '#888' }}>Powered by Claude · Built with Anthropic API</div>
            </div>
          </div>

          {/* LinkedIn token status */}
          {linkedinStatus && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 20,
              background: linkedinStatus.valid ? '#e8f5ee' : '#fff3f3',
              border: `1px solid ${linkedinStatus.valid ? '#9ec' : '#fcc'}`,
              fontSize: 12,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: linkedinStatus.valid ? '#2a7a2a' : '#c44', display: 'inline-block' }} />
              <span style={{ color: linkedinStatus.valid ? '#2a7a2a' : '#c44', fontWeight: 600 }}>
                {linkedinStatus.valid ? `LinkedIn: ${linkedinStatus.name || 'Connected'}` : 'LinkedIn: Token issue'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', paddingLeft: 8 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 24px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #0a66c2' : '3px solid transparent',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 700 : 400,
                color: activeTab === tab.id ? '#0a66c2' : '#666',
                fontSize: 14,
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
        {activeTab === 'manual' && <ManualTab />}
        {activeTab === 'create' && <CreateTab />}
        {activeTab === 'auto'   && <AutoTab />}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '24px', color: '#aaa', fontSize: 12 }}>
        LinkedIn AI Bot · MIT License · Powered by Claude (Anthropic) + Hugging Face + LinkedIn API v2
      </div>
    </div>
  );
}
