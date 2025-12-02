'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TestResendPage() {
  const [apiKey, setApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState('noreply@act.agency');
  const [toEmail, setToEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const testResendAPI = async () => {
    if (!apiKey || !toEmail) {
      setResult({
        success: false,
        message: 'Please fill in all fields'
      });
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          subject: 'Test Email from ACT 2.0',
          html: '<p>If you received this email, your Resend integration is working! 🎉</p>',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `API Error: ${response.status}`);
      }

      setResult({
        success: true,
        message: `✅ Email sent successfully! Email ID: ${data.id}`,
        details: data,
      });
    } catch (err) {
      setResult({
        success: false,
        message: `❌ Error: ${err instanceof Error ? err.message : 'Failed to send'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔑 Test Resend API Key
          </h1>
          <p className="text-gray-600">
            Direct test of your Resend API key
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Security Warning:</strong> This page directly tests the Resend API. 
            Don't share your API key with anyone. Remove this page in production.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resend API Key <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="re_xxxxxxxxxxxxxxxxxxxxx"
                className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Get from: https://resend.com/api-keys
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="noreply@yourdomain.com"
                className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
              <p className="mt-1 text-xs text-gray-500">
                Must be from a verified domain in Resend
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Email (Your Email) <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <button
              onClick={testResendAPI}
              disabled={loading || !apiKey || !toEmail}
              className="w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending Test Email...' : '📧 Send Test Email'}
            </button>
          </div>
        </div>

        {result && (
          <div
            className={`rounded-lg p-6 mb-6 ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <p
              className={`font-medium mb-2 ${
                result.success ? 'text-green-900' : 'text-red-900'
              }`}
            >
              {result.message}
            </p>
            {result.details && (
              <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            )}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            📋 What This Tests:
          </h2>
          <ul className="list-disc list-inside space-y-2 text-blue-800 text-sm">
            <li>Resend API key is valid</li>
            <li>From email domain is verified</li>
            <li>Emails can be sent via Resend</li>
            <li>No SMTP configuration issues</li>
          </ul>
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-black transition-colors"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
