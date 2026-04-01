/**
 * Phone Verification Form
 * Allows users to verify phone numbers against scammer databases
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { verifyPhone, PhoneVerification } from '../../lib/scamshield-api';

interface FormData {
  phoneNumber: string;
}

export function PhoneVerificationForm() {
  const [result, setResult] = useState<PhoneVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const verification = await verifyPhone(data.phoneNumber);
      setResult(verification);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to verify phone number');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📱 Verify Phone Number</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Enter phone number to verify
          </label>
          <input
            id="phoneNumber"
            type="tel"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 9876543210"
            aria-describedby={errors.phoneNumber ? 'phone-error' : undefined}
            {...register('phoneNumber', {
              required: 'Please enter a phone number',
              pattern: {
                value: /^(\+?91)?[-\s]?[6-9]\d{9}$/,
                message: 'Please enter a valid Indian phone number',
              },
            })}
          />
          {errors.phoneNumber && (
            <p id="phone-error" className="text-red-600 text-sm mt-1" role="alert">{errors.phoneNumber.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Verifying...' : '🔍 Verify Number'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-3" aria-live="polite">
          <div className="flex items-center gap-3">
            {result.isKnownScammer ? (
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">🚨 Known Scammer</span>
            ) : result.isVerified ? (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">✅ Verified</span>
            ) : (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">⚠️ Unverified</span>
            )}
            {result.isDND && (
              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">DND Registered</span>
            )}
          </div>
          {result.brandName && (
            <p className="text-sm text-gray-700">Brand: <strong>{result.brandName}</strong></p>
          )}
          {result.warnings.length > 0 && (
            <ul className="space-y-1">
              {result.warnings.map((w, i) => (
                <li key={i} className="text-sm text-gray-700">{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
