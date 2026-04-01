/**
 * Policy Pulse Page
 * Main page combining all Policy Pulse features
 */

import { useState } from 'react';
import { ParsedPolicy } from '../../lib/policypulse-api';
import { PolicyUploadForm } from './PolicyUploadForm';
import { PolicyDataDisplay } from './PolicyDataDisplay';
import { PolicySummaryDisplay } from './PolicySummaryDisplay';
import { RedFlagsDisplay } from './RedFlagsDisplay';
import { CoverageComparisonTable } from './CoverageComparisonTable';

export function PolicyPulsePage() {
  const [policyId, setPolicyId] = useState<string | null>(null);
  const [policy, setPolicy] = useState<ParsedPolicy | null>(null);

  const handlePolicyUploaded = (id: string, parsedPolicy: ParsedPolicy) => {
    setPolicyId(id);
    setPolicy(parsedPolicy);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">📋 Policy Pulse</h2>
        <p className="text-gray-600 mt-1">Upload your insurance policy to understand it in plain language</p>
      </div>

      <div className="space-y-6">
        <PolicyUploadForm onPolicyUploaded={handlePolicyUploaded} />

        {policy && (
          <>
            <PolicyDataDisplay policy={policy} />
            {policyId && (
              <>
                <PolicySummaryDisplay policyId={policyId} />
                <RedFlagsDisplay policyId={policyId} />
                <CoverageComparisonTable policyId={policyId} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
