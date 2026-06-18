import { useEffect, useRef, useState } from 'react';
import { API } from '../config/api';

/**
 * ImageUpload — uploads a sudoku photo to the Python backend OCR service.
 *
 * Requirements:
 *   Backend must be running:  python app.py   (default port 5000)
 *   The Vite proxy forwards /api/* → http://localhost:5000/api/*
 *
 * Props:
 *   onGridExtracted(board)  — called with a 9x9 number array on success
 *   disabled                — locks the picker during an active game
 */
export default function ImageUpload({ onGridExtracted, disabled = false }) {
  const [previewUrl, setPreviewUrl]     = useState(null);
  const [status, setStatus]             = useState('No photo uploaded yet.');
  const [progress, setProgress]         = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [backendOnline, setBackendOnline] = useState(null); // null = unchecked
  const inputRef = useRef(null);

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // Check if backend is reachable once on mount
  useEffect(() => {
    fetch('/api/puzzle', { method: 'GET', signal: AbortSignal.timeout(3000) })
      .then(r => setBackendOnline(r.ok || r.status < 500))
      .catch(() => setBackendOnline(false));
  }, []);

  async function processImage(file) {
    setStatus('Uploading to backend OCR…');
    setProgress(10);
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      setProgress(30);
      const response = await fetch(API.upload, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30000),
      });
      setProgress(80);

      const result = await response.json();
      setProgress(100);

      if (!response.ok || !result.success) {
        setStatus(`❌ Detection failed: ${result.message || 'Backend returned an error.'}`);
        return;
      }

      setStatus('✅ Grid detected! Review the board then press Start.');
      setBackendOnline(true);
      onGridExtracted(result.board);
    } catch (err) {
      console.error('[ImageUpload]', err);
      if (err.name === 'TimeoutError') {
        setStatus('⏱ Request timed out. Make sure the backend is running.');
      } else {
        setStatus(`❌ ${err.message || 'Connection error. Is the Python backend running?'}`);
      }
      setBackendOnline(false);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 800);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedName(file.name);
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    processImage(file);
  }

  const locked = isProcessing || disabled;

  return (
    <section className="upload-shell">
      <div className="upload-header">
        <h3>📷 Scan Sudoku from Photo</h3>
        <p>Crop tightly around the grid — flat angle, good lighting, no glare.</p>
      </div>

      {/* Offline warning */}
      {backendOnline === false && (
        <div className="upload-offline-warning">
          ⚠️ Python backend is offline. Run <code style={{background:'rgba(255,255,255,0.1)',padding:'1px 5px',borderRadius:'4px'}}>python app.py</code> in the project root to enable photo scanning.
        </div>
      )}

      <div className="upload-controls">
        <label className={`file-picker${locked ? ' file-picker--disabled' : ''}`}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,image/heic,image/heif"
            className="file-input"
            onChange={handleFileChange}
            disabled={locked}
          />
          <span className="file-picker-label">{isProcessing ? 'Processing…' : 'Select photo'}</span>
          <span className="file-picker-name">{selectedName || 'No file selected'}</span>
        </label>

        {/* Progress bar */}
        {progress > 0 && (
          <div className="upload-progress-bar">
            <div className="upload-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="upload-status">
          <span>{status}</span>
          {isProcessing && <strong>OCR running…</strong>}
        </div>
      </div>

      {previewUrl && (
        <div className="upload-preview">
          <img src={previewUrl} alt="Uploaded sudoku preview" loading="lazy" />
        </div>
      )}
    </section>
  );
}
