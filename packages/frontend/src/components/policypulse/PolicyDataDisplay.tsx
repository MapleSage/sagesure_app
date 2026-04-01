/**
 * Policy Data Display
 * Shows parsed policy metadata and sections
 */

import { ParsedPolicy } from '../../lib/policypulse-api';

interface PolicyDataDisplayProps {
  policy: ParsedPolicy;
}

export function PolicyDataDisplay({ policy }: PolicyDataDisplayProps) {
  const { metadata, sections, extractedData } = policy;

  const formatCurrency = (amount: number | null) =>
    amount ? `₹${amount.toLocaleString('en-IN')}` : 'N/A';

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">📋 Policy Details</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <InfoCard label="Insurer" value={metadata.insurerName || 'Unknown'} />
        <InfoCard label="Policy Number" value={metadata.policyNumber || 'N/A'} />
        <InfoCard label="Type" value={metadata.policyType || 'N/A'} />
        <InfoCard label="Sum Assured" value={formatCurrency(metadata.sumAssured)} />
        <InfoCard label="Premium" value={formatCurrency(metadata.premium)} />
        <InfoCard label="Expiry" value={metadata.expiryDate ? new Date(metadata.expiryDate).toLocaleDateString('en-IN') : 'N/A'} />
      </div>

      {sections.coverage && (
        <div>
          <h4 className="font-medium text-gray-800 mb-2">Coverage</h4>
          <p className="text-sm text-gray-600 bg-green-50 p-3 rounded">{sections.coverage.substring(0, 500)}</p>
        </div>
      )}

      {sections.exclusions.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-800 mb-2">Exclusions ({sections.exclusions.length})</h4>
          <ul className="space-y-1">
            {sections.exclusions.slice(0, 10).map((e, i) => (
              <li key={i} className="text-sm text-red-700 bg-red-50 p-2 rounded">❌ {e}</li>
            ))}
          </ul>
        </div>
      )}

      {(extractedData.coPayment || extractedData.roomRentLimit || extractedData.waitingPeriods.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {extractedData.coPayment && (
            <div className="bg-yellow-50 p-3 rounded">
              <p className="text-xs text-yellow-600 font-medium">Co-payment</p>
              <p className="text-lg font-bold text-yellow-800">{extractedData.coPayment}%</p>
            </div>
          )}
          {extractedData.roomRentLimit && (
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-xs text-blue-600 font-medium">Room Rent Limit</p>
              <p className="text-lg font-bold text-blue-800">{formatCurrency(extractedData.roomRentLimit)}/day</p>
            </div>
          )}
          {extractedData.waitingPeriods.length > 0 && (
            <div className="bg-purple-50 p-3 rounded">
              <p className="text-xs text-purple-600 font-medium">Waiting Periods</p>
              {extractedData.waitingPeriods.slice(0, 3).map((wp, i) => (
                <p key={i} className="text-sm text-purple-800">{wp.period} - {wp.condition}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 p-3 rounded">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
    </div>
  );
}
