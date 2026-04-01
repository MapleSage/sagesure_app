/**
 * Message Analysis Form
 * Allows users to submit suspicious messages for scam detection
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { analyzeMessage, ScamAnalysis } from '../../lib/scamshield-api';
import { RiskScoreBadge } from './RiskScoreBadge';

interface FormData {
  message: string;
}

export function MessageAnalysisForm() {
  const [result, setResult] = useState<ScamAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const analysis = await analyzeMessage(data.message);
      setResult(analysis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📩 Analyze Suspicious Message</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Paste the suspicious message here
          </label>
          <textarea
            id="message"
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Your policy has been suspended. Click here to reactivate..."
            aria-describedby={errors.message ? 'message-error' : undefined}
            {...register('message', {
              required: 'Please enter a message to analyze',
              minLength: { value: 5, message: 'Message must be at least 5 characters' },
              maxLength: { value: 10000, message: 'Message must be under 10,000 characters' },
            })}
          />
          {errors.message && (
            <p id="message-error" className="text-red-600 text-sm mt-1" role="alert">{errors.message.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Analyzing...' : '🔍 Analyze Message'}
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
            <RiskScoreBadge score={result.riskScore} size="lg" />
          </div>

          {result.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="font-medium text-yellow-800 mb-2">⚠️ Warnings</h4>
              <ul className="space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-sm text-yellow-700">{w}</li>
                ))}
              </ul>
            </div>
          )}

          {result.recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-800 mb-2">📋 Recommendations</h4>
              <ul className="space-y-1">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-blue-700">{r}</li>
                ))}
              </ul>
            </div>
          )}

          {result.matchedPatterns.length > 0 && (
            <div className="text-sm text-gray-500">
              Matched patterns: {result.matchedPatterns.join(', ')} | Confidence: {result.confidence}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}
