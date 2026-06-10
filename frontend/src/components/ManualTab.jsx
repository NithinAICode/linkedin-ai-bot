// frontend/src/components/ManualTab.jsx
import { useState, useEffect } from 'react';
import { getTrending, searchNews, scrapeUrl, generatePost, regeneratePost, generateImage, publishPost } from '../api/api.js';

export default function ManualTab() {
  const [headlines, setHeadlines] = useState([]);
  const [topic, setTopic] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [generatedPost, setGeneratedPost] = useState('');
  const [editedPost, setEditedPost] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFilepath, setImageFilepath] = useState('');
  const [includeImage, setIncludeImage] = useState(false);
  const [tone, setTone] = useState('professional');
  const [loadingHeadlines, setLoadingHeadlines] = useState(false);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [loadingPublish, setLoadingPublish] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { fetchHeadlines(); }, []);

  async function fetchHeadlines() {
    setLoadingHeadlines(true);
    setError('');
    try {
      const data = await getTrending(20);
      setHeadlines(data.headlines || []);
    } catch (e) { setError('Could not load headlines. Is the backend running?'); }
    finally { setLoadingHeadlines(false); }
  }

  async function handleScan() {
    if (!topic.trim()) return;
    setLoadingArticle(true);
    setSelectedArticle(null);
    setGeneratedPost('');
    setEditedPost('');
    setPublishResult(null);
    setError('');
    try {
      const data = await searchNews(topic);
      if (!data.articles?.length) { setError('No articles found for that topic. Try a broader keyword.'); return; }
      const article = data.articles[0];
      const scraped = await scrapeUrl(article.url);
      setSelectedArticle({ ...article, fullContent: scraped.content || article.summary || article.title });
    } catch (e) { setError('Article scan failed: ' + e.message); }
    finally { setLoadingArticle(false); }
  }

  async function handleGenerate() {
    if (!selectedArticle) return;
    setLoadingGenerate(true);
    setError('');
    setPublishResult(null);
    try {
      const data = await generatePost({
        title: selectedArticle.title,
        content: selectedArticle.fullContent,
        source: selectedArticle.source,
        tone,
      });
      setGeneratedPost(data.post);
      setEditedPost(data.post);
    } catch (e) { setError('Post generation failed: ' + e.message); }
    finally { setLoadingGenerate(false); }
  }

  async function handleRegenerate() {
    if (!selectedArticle) return;
    setLoadingGenerate(true);
    setError('');
    try {
      const data = await regeneratePost({
        title: selectedArticle.title,
        content: selectedArticle.fullContent,
        source: selectedArticle.source,
        tone,
        previousPost: editedPost,
      });
      setGeneratedPost(data.post);
      setEditedPost(data.post);
    } catch (e) { setError('Regeneration failed: ' + e.message); }
    finally { setLoadingGenerate(false); }
  }

  async function handleGenerateImage() {
    if (!selectedArticle) return;
    setLoadingImage(true);
    setError('');
    try {
      const data = await generateImage(selectedArticle.title);
      setImageUrl(data.url);
      setImageFilepath(data.filepath);
    } catch (e) { setError('Image generation failed: ' + e.message); }
    finally { setLoadingImage(false); }
  }

  async function handlePublish() {
    if (!editedPost.trim()) return;
    setLoadingPublish(true);
    setError('');
    setPublishResult(null);
    try {
      const result = await publishPost(editedPost, includeImage ? imageFilepath : null, selectedArticle?.title || '');
      setPublishResult(result);
    } catch (e) { setError('Publish failed: ' + e.message); }
    finally { setLoadingPublish(false); }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* LEFT: News panel */}
      <div>
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={styles.sectionTitle}>Trending Now</h3>
            <button style={styles.btnSecondary} onClick={fetchHeadlines} disabled={loadingHeadlines}>
              {loadingHeadlines ? 'Loading…' : '↻ Refresh'}
            </button>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 16 }}>
            {headlines.map((h, i) => (
              <div
                key={i}
                style={{ ...styles.headlineItem, background: topic === h.title ? '#e8f4fd' : '#f8f8f8' }}
                onClick={() => setTopic(h.title)}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.4 }}>{h.title}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{h.source}</div>
              </div>
            ))}
            {!loadingHeadlines && !headlines.length && (
              <div style={{ color: '#999', fontSize: 13, padding: 8 }}>No headlines loaded yet.</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={styles.input}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Type a topic or click a headline above…"
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            />
            <button style={styles.btnPrimary} onClick={handleScan} disabled={!topic.trim() || loadingArticle}>
              {loadingArticle ? 'Scanning…' : 'Scan'}
            </button>
          </div>
        </div>

        {selectedArticle && (
          <div style={{ ...styles.card, marginTop: 16 }}>
            <div style={styles.sectionTitle}>Article Found</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1B4F8A', marginBottom: 4 }}>{selectedArticle.title}</div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{selectedArticle.source} · {new Date(selectedArticle.publishedAt).toLocaleDateString()}</div>
            <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6, maxHeight: 120, overflow: 'hidden' }}>
              {selectedArticle.fullContent?.slice(0, 400)}…
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select style={styles.select} value={tone} onChange={(e) => setTone(e.target.value)}>
                {['professional','technical','executive','conversational','founder'].map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
              <button style={styles.btnPrimary} onClick={handleGenerate} disabled={loadingGenerate}>
                {loadingGenerate ? 'Generating…' : 'Generate Post'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Post preview panel */}
      <div>
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={styles.sectionTitle}>Post Preview</h3>
            {generatedPost && (
              <button style={styles.btnSecondary} onClick={handleRegenerate} disabled={loadingGenerate}>
                {loadingGenerate ? 'Regenerating…' : '↻ Regenerate'}
              </button>
            )}
          </div>

          <textarea
            style={{ ...styles.textarea, minHeight: 280 }}
            value={editedPost}
            onChange={(e) => setEditedPost(e.target.value)}
            placeholder="Your LinkedIn post will appear here. You can edit it before publishing."
          />

          {editedPost && (
            <div style={{ fontSize: 12, color: editedPost.length > 1400 ? '#c44' : '#888', marginTop: 4 }}>
              {editedPost.length} / 3000 characters {editedPost.length > 1400 && '(LinkedIn works best under 1400)'}
            </div>
          )}

          {/* Image section */}
          <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid #eee' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={includeImage} onChange={(e) => setIncludeImage(e.target.checked)} />
              Include banner image
            </label>
            {includeImage && (
              <div style={{ marginTop: 10 }}>
                <button style={styles.btnSecondary} onClick={handleGenerateImage} disabled={!selectedArticle || loadingImage}>
                  {loadingImage ? 'Generating image…' : 'Generate AI image'}
                </button>
                {imageUrl && (
                  <img src={imageUrl} alt="Banner preview" style={{ width: '100%', marginTop: 10, borderRadius: 6 }} />
                )}
              </div>
            )}
          </div>

          {error && <div style={styles.error}>{error}</div>}

          {publishResult && (
            <div style={styles.success}>
              ✅ Published to LinkedIn!
              {publishResult.url && (
                <a href={publishResult.url} target="_blank" rel="noreferrer" style={{ color: '#0a66c2', marginLeft: 8 }}>
                  View post →
                </a>
              )}
            </div>
          )}

          <button
            style={{ ...styles.btnPublish, marginTop: 16 }}
            onClick={handlePublish}
            disabled={!editedPost.trim() || loadingPublish}
          >
            {loadingPublish ? 'Publishing…' : '🚀 Publish to LinkedIn'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#1B4F8A', margin: 0 },
  headlineItem: { padding: '8px 10px', borderRadius: 6, marginBottom: 4, cursor: 'pointer', transition: 'background 0.15s' },
  input: { flex: 1, padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, outline: 'none' },
  select: { padding: '7px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, lineHeight: 1.7, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' },
  btnPrimary: { padding: '8px 16px', background: '#0a66c2', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  btnSecondary: { padding: '7px 14px', background: '#f0f0f0', color: '#333', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  btnPublish: { width: '100%', padding: '12px', background: '#0a66c2', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', fontWeight: 700 },
  error: { marginTop: 10, padding: '8px 12px', background: '#fff3f3', border: '1px solid #fcc', borderRadius: 6, fontSize: 13, color: '#c44' },
  success: { marginTop: 10, padding: '8px 12px', background: '#f0fff4', border: '1px solid #9ec', borderRadius: 6, fontSize: 13, color: '#2a7a2a' },
};
