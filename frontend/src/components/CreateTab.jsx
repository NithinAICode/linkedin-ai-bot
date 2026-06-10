// frontend/src/components/CreateTab.jsx
import { useState } from 'react';
import { generateCustomPost, generateImage, uploadImage, publishPost, addToQueue } from '../api/api.js';

export default function CreateTab() {
  const [title, setTitle] = useState('');
  const [talkingPoints, setTalkingPoints] = useState('');
  const [tone, setTone] = useState('professional');
  const [editedPost, setEditedPost] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFilepath, setImageFilepath] = useState('');
  const [includeImage, setIncludeImage] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [loadingPublish, setLoadingPublish] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [queueResult, setQueueResult] = useState(null);
  const [error, setError] = useState('');

  function defaultScheduleTime() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  }

  async function handleGenerate() {
    if (!title.trim() || !talkingPoints.trim()) return;
    setLoadingGenerate(true);
    setError('');
    setPublishResult(null);
    setQueueResult(null);
    try {
      const data = await generateCustomPost({ title, talkingPoints, tone });
      setEditedPost(data.post);
    } catch (e) { setError('Generation failed: ' + e.message); }
    finally { setLoadingGenerate(false); }
  }

  async function handleGenerateImage() {
    setLoadingImage(true);
    setError('');
    try {
      const data = await generateImage(title || 'technology news');
      setImageUrl(data.url);
      setImageFilepath(data.filepath);
    } catch (e) { setError('Image generation failed: ' + e.message); }
    finally { setLoadingImage(false); }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoadingImage(true);
    setError('');
    try {
      const data = await uploadImage(file);
      setImageUrl(data.url);
      setImageFilepath(data.filepath);
    } catch (e) { setError('Image upload failed: ' + e.message); }
    finally { setLoadingImage(false); }
  }

  async function handlePublishNow() {
    if (!editedPost.trim()) return;
    setLoadingPublish(true);
    setError('');
    setPublishResult(null);
    try {
      const result = await publishPost(editedPost, includeImage ? imageFilepath : null, title);
      setPublishResult(result);
    } catch (e) { setError('Publish failed: ' + e.message); }
    finally { setLoadingPublish(false); }
  }

  async function handleAddToQueue() {
    if (!editedPost.trim() || !scheduledAt) return;
    setLoadingPublish(true);
    setError('');
    setQueueResult(null);
    try {
      const item = await addToQueue({
        postText: editedPost,
        scheduledAt: new Date(scheduledAt).toISOString(),
        imageFilepath: includeImage ? imageFilepath : null,
        title,
      });
      setQueueResult(item);
    } catch (e) { setError('Failed to add to queue: ' + e.message); }
    finally { setLoadingPublish(false); }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* LEFT: Input panel */}
      <div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Your Content</h3>
          <p style={styles.hint}>Paste talking points, bullet points, or an article excerpt. Claude will shape it into a professional LinkedIn post.</p>

          <label style={styles.label}>Topic / Headline</label>
          <input
            style={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Why enterprise AI adoption is stalling"
          />

          <label style={styles.label}>Talking Points or Content</label>
          <textarea
            style={{ ...styles.textarea, minHeight: 180 }}
            value={talkingPoints}
            onChange={(e) => setTalkingPoints(e.target.value)}
            placeholder={`Paste article text, bullet points, or your own thoughts.\n\nExample:\n- Gartner says 70% of AI pilots fail to reach production\n- Main blockers: data quality, skills gap, unclear ROI\n- Our team solved this by starting with one narrow use case\n- Key lesson: governance before glamour`}
          />

          <label style={styles.label}>Tone</label>
          <select style={styles.select} value={tone} onChange={(e) => setTone(e.target.value)}>
            {[
              ['professional', 'Professional — balanced, credible'],
              ['technical', 'Technical — for engineers & architects'],
              ['executive', 'Executive — strategic, leadership focus'],
              ['conversational', 'Conversational — candid, direct'],
              ['founder', 'Founder — personal, story-driven'],
            ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          <button
            style={{ ...styles.btnPrimary, width: '100%', marginTop: 16 }}
            onClick={handleGenerate}
            disabled={!title.trim() || !talkingPoints.trim() || loadingGenerate}
          >
            {loadingGenerate ? 'Generating with Claude…' : 'Generate Post'}
          </button>
        </div>

        {/* Image section */}
        <div style={{ ...styles.card, marginTop: 16 }}>
          <h3 style={styles.sectionTitle}>Banner Image (optional)</h3>
          <p style={styles.hint}>LinkedIn performs well with or without images. Add one if it fits the topic.</p>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={includeImage} onChange={(e) => setIncludeImage(e.target.checked)} />
            Attach banner image to post
          </label>

          {includeImage && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={styles.btnSecondary} onClick={handleGenerateImage} disabled={loadingImage}>
                {loadingImage ? 'Generating…' : 'AI-generate image'}
              </button>
              <label style={{ ...styles.btnSecondary, cursor: 'pointer' }}>
                Upload image
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
              </label>
            </div>
          )}

          {imageUrl && includeImage && (
            <img src={imageUrl} alt="Banner preview" style={{ width: '100%', marginTop: 12, borderRadius: 6 }} />
          )}
        </div>
      </div>

      {/* RIGHT: Post preview + publish */}
      <div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Post Preview</h3>
          <textarea
            style={{ ...styles.textarea, minHeight: 320 }}
            value={editedPost}
            onChange={(e) => setEditedPost(e.target.value)}
            placeholder="Your LinkedIn post will appear here after clicking Generate Post."
          />
          {editedPost && (
            <div style={{ fontSize: 12, color: editedPost.length > 1400 ? '#c44' : '#888', marginTop: 4 }}>
              {editedPost.length} / 3000 characters
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}
          {publishResult && (
            <div style={styles.success}>
              ✅ Published to LinkedIn!
              {publishResult.url && <a href={publishResult.url} target="_blank" rel="noreferrer" style={{ color: '#0a66c2', marginLeft: 8 }}>View post →</a>}
            </div>
          )}
          {queueResult && (
            <div style={styles.success}>
              ✅ Added to queue! Scheduled for {new Date(queueResult.scheduledAt).toLocaleString()}
            </div>
          )}

          <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                style={{ ...styles.modeBtn, background: !scheduleMode ? '#0a66c2' : '#f0f0f0', color: !scheduleMode ? '#fff' : '#333' }}
                onClick={() => setScheduleMode(false)}
              >
                Post Now
              </button>
              <button
                style={{ ...styles.modeBtn, background: scheduleMode ? '#0a66c2' : '#f0f0f0', color: scheduleMode ? '#fff' : '#333' }}
                onClick={() => { setScheduleMode(true); if (!scheduledAt) setScheduledAt(defaultScheduleTime()); }}
              >
                Schedule for Later
              </button>
            </div>

            {scheduleMode ? (
              <div>
                <label style={styles.label}>Date and time to post</label>
                <input
                  type="datetime-local"
                  style={{ ...styles.input, marginBottom: 10 }}
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <button
                  style={{ ...styles.btnPublish, width: '100%' }}
                  onClick={handleAddToQueue}
                  disabled={!editedPost.trim() || !scheduledAt || loadingPublish}
                >
                  {loadingPublish ? 'Adding to queue…' : '🗓 Add to Queue'}
                </button>
              </div>
            ) : (
              <button
                style={{ ...styles.btnPublish, width: '100%' }}
                onClick={handlePublishNow}
                disabled={!editedPost.trim() || loadingPublish}
              >
                {loadingPublish ? 'Publishing…' : '🚀 Publish to LinkedIn'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#1B4F8A', margin: '0 0 8px' },
  hint: { fontSize: 12, color: '#888', margin: '0 0 14px', lineHeight: 1.5 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, marginTop: 12 },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', outline: 'none' },
  select: { width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, lineHeight: 1.7, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' },
  btnPrimary: { padding: '9px 18px', background: '#0a66c2', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  btnSecondary: { padding: '7px 14px', background: '#f0f0f0', color: '#333', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  btnPublish: { padding: '12px', background: '#0a66c2', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', fontWeight: 700 },
  modeBtn: { flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  error: { marginTop: 10, padding: '8px 12px', background: '#fff3f3', border: '1px solid #fcc', borderRadius: 6, fontSize: 13, color: '#c44' },
  success: { marginTop: 10, padding: '8px 12px', background: '#f0fff4', border: '1px solid #9ec', borderRadius: 6, fontSize: 13, color: '#2a7a2a' },
};
