import { useEffect, useState } from 'react';
import { API } from '../config/api';

function ImageUpload({ onGridExtracted, disabled = false }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState('No photo uploaded');
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedName, setSelectedName] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function processImage(file) {
    setStatus('Uploading image to backend...');
    setProgress(5);
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(API.upload, {
        method: 'POST',
        body: formData,
      });
      setProgress(60);
      const result = await response.json();
      setProgress(100);

      if (!response.ok || !result.success) {
        setStatus(`Upload failed: ${result.message || 'Server error.'}`);
        return;
      }

      setStatus('Sudoku grid detected. Review the board and press Solve.');
      onGridExtracted(result.board);
    } catch (err) {
      console.error(err);
      setStatus(`Upload error: ${err.message || 'Check your connection and try again.'}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedName(file.name);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    processImage(file);
  }

  return (
    <section className="upload-shell">
      <div className="upload-header">
        <div>
          <h3>Upload Sudoku Photo</h3>
          <p>Crop tightly around the grid. Flat angle, good light, no glare.</p>
        </div>
      </div>
      <div className="upload-controls">
        <label className={`file-picker ${isProcessing || disabled ? 'file-picker--disabled' : ''}`}>
          <input
            type="file"
            accept="image/*"
            className="file-input"
            onChange={handleFileChange}
            disabled={isProcessing || disabled}
          />
          <span className="file-picker-label">Select photo</span>
          <span className="file-picker-name">{selectedName || 'No file selected'}</span>
        </label>
        <div className="upload-status">
          <span>{status}</span>
          {isProcessing && <strong>Processing OCR...</strong>}
          {progress > 0 && progress < 100 && <strong>{progress}%</strong>}
        </div>
      </div>
      {previewUrl && (
        <div className="upload-preview">
          <img src={previewUrl} alt="Uploaded Sudoku" />
        </div>
      )}
    </section>
  );
}

export default ImageUpload;
