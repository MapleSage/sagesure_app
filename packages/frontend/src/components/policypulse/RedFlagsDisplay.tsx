/**
 * Red Flags Display
 * Shows detected red flags with severity indicators
 */

import { useState } from 'react';
import { getRedFlags, RedFlagReport } from '../../lib/policypulse-api';

interface RedFlagsDisplayProps {
  policyId: string;
}

const SEVERITY_STYLES = {
  HIGH: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-700' },
  MEDIUM: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-700' },
  LOW: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-700' },
};

const RISK_STYLES = {
  HIGH: 'bg-red-100 text-red-800 ring-red-500',
  MEDIUM: 'bg-yellow-100 text-yellow-800 ring-yellow-500',
  LOW: 'bg-green-100 text-green-800 ring-green-500',
};

export function RedFlagsDisplay({ policyId }: RedFlagsDisplayProps) {
  const [report, setReport] = useState<RedFlagReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRedFlags(policyId);
      setReport(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze red flags');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">🚩 Red Flag Detection</h3>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="bg-red-600 text-white py-1.5 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm transition-colors"
        >
          {loading ? 'Analyzing...' : '🔍 Detect Red Flags'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {report && (
        <div className="space-y-4" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ring-2 ${RISK_STYLES[report.overallRisk]}`}>
              Overall Risk: {report.overallRisk}
            </span>
            {report.misSellingSuspicion && (
              <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                ⚠️ Mis-selling Suspected
              </span>
            )}
            <span className="text-sm text-gray-500">{report.redFlags.length} flag(s) found</span>
          </div>

          {report.redFlags.length > 0 && (
            <div className="space-y-3">
              {report.redFlags.map((flag, i) => {
                const styles = SEVERITY_STYLES[flag.severity];
                return (
                  <div key={i} className={`${styles.bg} ${styles.border} border rounded-md p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`${styles.badge} px-2 py-0.5 rounded text-xs font-medium`}>
                        {flag.severity}
                      </span>
                      <span className={`${styles.text} font-medium text-sm`}>{flag.type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className={`${styles.text} text-sm`}>{flag.description}</p>
                    {flag.recommendation && (
                      <p className="text-sm text-gray-600 mt-2 italic">💡 {flag.recommendation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {report.recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-800 mb-2">Recommendations</h4>
              <ul className="space-y-1">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-blue-700">• {r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
