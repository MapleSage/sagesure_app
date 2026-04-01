/**
 * ScamShield Page
 * Main page combining all ScamShield features
 */

import { useState } from 'react';
import { MessageAnalysisForm } from './MessageAnalysisForm';
import { PhoneVerificationForm } from './PhoneVerificationForm';
import { VideoUploadForm } from './VideoUploadForm';

type Tab = 'message' | 'phone' | 'video';

export function ScamShieldPage() {
  const [activeTab, setActiveTab] = useState<Tab>('message');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'message', label: 'Message Analysis', icon: '📩' },
    { id: 'phone', label: 'Phone Verification', icon: '📱' },
    { id: 'video', label: 'Deepfake Detection', icon: '🎥' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🛡️ ScamShield</h2>
        <p className="text-gray-600 mt-1">Protect yourself from insurance scams, fake calls, and deepfakes</p>
      </div>

      <nav className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1" role="tablist" aria-label="ScamShield features">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-700 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      <div role="tabpanel" id={`panel-${activeTab}`}>
        {activeTab === 'message' && <MessageAnalysisForm />}
        {activeTab === 'phone' && <PhoneVerificationForm />}
        {activeTab === 'video' && <VideoUploadForm />}
      </div>
    </div>
  );
}
