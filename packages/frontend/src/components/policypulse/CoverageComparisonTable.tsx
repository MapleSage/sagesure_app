/**
 * Coverage Comparison Table
 * Displays side-by-side policy comparison
 */

import { useState } from 'react';
import { comparePolicy, ComparisonReport } from '../../lib/policypulse-api';

interface CoverageComparisonTableProps {
  policyId: string;
}

export function CoverageComparisonTable({ policyId }: CoverageComparisonTableProps) {
  const [report, setReport] = useState<ComparisonReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await comparePolicy(policyId);
      setReport(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to compare policies');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">📊 Coverage Comparison</h3>
        <button
          onClick={handleCompare}
          disabled={loading}
          className="bg-purple-600 text-white py-1.5 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm transition-colors"
        >
          {loading ? 'Comparing...' : '📊 Compare'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {report && (
        <div className="space-y-4" aria-live="polite">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 font-medium text-gray-700">Feature</th>
                  <th className="text-left p-3 font-medium text-blue-700">Your Policy</th>
                  {report.similarPolicies.slice(0, 3).map((p, i) => (
                    <th key={i} className="text-left p-3 font-medium text-gray-700">{p.insurerName}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-3 text-gray-600">Premium</td>
                  <td className="p-3 font-medium">{formatCurrency(report.userPolicy.premium)}</td>
                  {report.similarPolicies.slice(0, 3).map((p, i) => (
                    <td key={i} className="p-3">
                      <span className={p.premium < report.userPolicy.premium ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(p.premium)}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 text-gray-600">Sum Assured</td>
                  <td className="p-3 font-medium">{formatCurrency(report.userPolicy.sumAssured)}</td>
                  {report.similarPolicies.slice(0, 3).map((p, i) => (
                    <td key={i} className="p-3">
                      <span className={p.sumAssured > report.userPolicy.sumAssured ? 'text-green-600' : ''}>
                        {formatCurrency(p.sumAssured)}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 text-gray-600">Claim Settlement</td>
                  <td className="p-3">-</td>
                  {report.similarPolicies.slice(0, 3).map((p, i) => (
                    <td key={i} className="p-3">{p.claimSettlementRatio}%</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {report.comparison.betterFeatures.length > 0 && (
            <div className="bg-green-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-green-800 mb-1">✅ Your policy is better at:</h4>
              <ul className="text-sm text-green-700">
                {report.comparison.betterFeatures.map((f, i) => <li key={i}>• {f}</li>)}
              </ul>
            </div>
          )}

          {report.comparison.worseFeatures.length > 0 && (
            <div className="bg-red-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-red-800 mb-1">❌ Your policy could improve:</h4>
              <ul className="text-sm text-red-700">
                {report.comparison.worseFeatures.map((f, i) => <li key={i}>• {f}</li>)}
              </ul>
            </div>
          )}

          {report.switchingRecommendation.shouldSwitch && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
              <p className="text-blue-800 font-medium">
                💡 Consider switching! Estimated savings: {report.switchingRecommendation.estimatedSavings
                  ? formatCurrency(report.switchingRecommendation.estimatedSavings)
                  : 'varies'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
