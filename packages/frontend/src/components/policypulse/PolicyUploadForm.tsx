/**
 * Policy PDF Upload Form
 */

import { useState, useRef } from 'react';
import { uploadPolicy, ParsedPolicy } from '../../lib/policypulse-api';

interface PolicyUploadFormProps {
  onPolicyUploaded: (policyId: string, policy: ParsedPolicy) => void;
}

export function PolicyUploadForm({ onPolicyUploaded }: PolicyUploadFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Please select a PDF file'); return; }
    if (file.size > 50 * 1024 * 1024) { setError('File size must be under 50MB'); return; }

    setLoading(true);
    setError(null);
    try {
      const result = await uploadPolicy(file);
      if (result.parsedPolicy) {
        onPolicyUploaded(result.policyId, result.parsedPolicy);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📄 Upload Policy PDF</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          <input
            id="policy-pdf"
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
          />
          <label htmlFor="policy-pdf" className="cursor-pointer">
            {fileName ? (
              <p className="text-blue-600 font-medium">{fileName}</p>
            ) : (
              <>
                <p className="text-2xl mb-2">📁</p>
                <p className="text-gray-600">Click to select your insurance policy PDF</p>
                <p className="text-sm text-gray-400 mt-1">Max 50MB</p>
              </>
            )}
          </label>
        </div>
        <button
          type="submit"
          disabled={loading || !fileName}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Parsing policy...' : '📤 Upload & Parse'}
        </button>
      </form>
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
