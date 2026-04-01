/**
 * Video Upload Form for Deepfake Detection
 * Allows users to upload video recordings for analysis
 */

import { useState, useRef } from 'react';
import { analyzeVideo, DeepfakeAnalysis } from '../../lib/scamshield-api';
import { RiskScoreBadge } from './RiskScoreBadge';

export function VideoUploadForm() {
  const [result, setResult] = useState<DeepfakeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Please select a video file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError('File size must be under 100MB');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { analysis } = await analyzeVideo(file);
      setResult(analysis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🎥 Deepfake Detection</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="video" className="block text-sm font-medium text-gray-700 mb-1">
            Upload video call recording
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <input
              id="video"
              ref={fileRef}
              type="file"
              accept="video/mp4,video/mpeg,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
            />
            <label htmlFor="video" className="cursor-pointer">
              <div className="text-gray-500">
                {fileName ? (
                  <p className="text-blue-600 font-medium">{fileName}</p>
                ) : (
                  <>
                    <p className="text-lg">📁 Click to select video</p>
                    <p className="text-sm mt-1">MP4, MPEG, MOV, WEBM (max 100MB)</p>
                  </>
                )}
              </div>
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !fileName}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Analyzing video...' : '🔍 Analyze for Deepfake'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4" aria-live="polite">
          <div className="flex justify-center">
            <RiskScoreBadge score={result.confidence} size="lg" />
          </div>

          <div className={`p-4 rounded-md ${result.isDeepfake ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <p className={`font-medium ${result.isDeepfake ? 'text-red-800' : 'text-green-800'}`}>
              {result.isDeepfake ? '🚨 Deepfake Detected!' : '✅ Video appears authentic'}
            </p>
          </div>

          {result.anomalies.facialInconsistencies.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Facial Anomalies</h4>
              <ul className="space-y-1">
                {result.anomalies.facialInconsistencies.map((a, i) => (
                  <li key={i} className="text-sm text-yellow-700">• {a}</li>
                ))}
              </ul>
            </div>
          )}

          {!result.anomalies.audioVisualSync && (
            <p className="text-sm text-red-600">⚠️ Audio-visual synchronization issues detected</p>
          )}

          {result.anomalies.backgroundAnomalies.length > 0 && (
            <div className="text-sm text-gray-600">
              Background anomalies: {result.anomalies.backgroundAnomalies.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
