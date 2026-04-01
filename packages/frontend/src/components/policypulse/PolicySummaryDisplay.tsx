/**
 * Policy Summary Display with Language Selector
 * Shows plain language summary with translation support
 */

import { useState } from 'react';
import { generateSummary, PolicySummary } from '../../lib/policypulse-api';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी (Hindi)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'te', name: 'తెలుగు (Telugu)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
];

interface PolicySummaryDisplayProps {
  policyId: string;
}

export function PolicySummaryDisplay({ policyId }: PolicySummaryDisplayProps) {
  const [summary, setSummary] = useState<PolicySummary | null>(null);
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateSummary(policyId, language);
      setSummary(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">🗣️ Plain Language Summary</h3>

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">Language</label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Generating...' : '📝 Generate'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {summary && (
        <div className="space-y-4" aria-live="polite">
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-gray-800 leading-relaxed">{summary.summary}</p>
          </div>

          {summary.keyPoints.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Key Points</h4>
              <ul className="space-y-2">
                {summary.keyPoints.map((point, i) => (
                  <li key={i} className="text-sm text-gray-700 bg-gray-50 p-2 rounded flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.exclusionsHighlight.length > 0 && (
            <div>
              <h4 className="font-medium text-red-800 mb-2">⚠️ Important Exclusions</h4>
              <ul className="space-y-1">
                {summary.exclusionsHighlight.map((exc, i) => (
                  <li key={i} className="text-sm text-red-700 bg-red-50 p-2 rounded">❌ {exc}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-xs text-gray-400 italic border-t pt-3">{summary.disclaimer}</div>
        </div>
      )}
    </div>
  );
}
