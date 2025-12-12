'use client';

import { useEffect, useState } from 'react';
import { getBrandConfig } from '../../lib/brand';

/**
 * Simple test page for middleware and brand detection
 */
export default function TestMiddlewarePage() {
  const [headerInfo, setHeaderInfo] = useState<any>(null);
  const brandConfig = getBrandConfig();
  
  useEffect(() => {
    // Fetch the header info from our API
    fetch('/api/test-brand')
      .then(res => res.json())
      .then(data => setHeaderInfo(data))
      .catch(err => console.error('Error fetching headers:', err));
  }, []);
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Middleware Test Results</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Client Side Brand Detection</h2>
          <div className="bg-gray-50 p-4 rounded-md">
            <p><strong>Brand ID:</strong> {brandConfig.id}</p>
            <p><strong>Display Name:</strong> {brandConfig.displayName}</p>
            <p><strong>Colors:</strong></p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: brandConfig.colors.primary }}></div>
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: brandConfig.colors.secondary }}></div>
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: brandConfig.colors.accent }}></div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Hostname Information</h2>
          <div className="bg-gray-50 p-4 rounded-md">
            <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : ''}</p>
            <p><strong>Hostname:</strong> {typeof window !== 'undefined' ? window.location.hostname : ''}</p>
          </div>
        </div>
      </div>
      
      {headerInfo && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">API Response (Server Side)</h2>
          
          <div className="mb-4">
            <h3 className="font-semibold">Middleware Headers:</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <p><strong>x-brand-subdomain:</strong> {headerInfo.middleware.subdomain}</p>
              <p><strong>x-hostname:</strong> {headerInfo.middleware.hostname}</p>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="font-semibold">Server-side Brand Detection:</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <p><strong>Brand ID:</strong> {headerInfo.brand.id}</p>
              <p><strong>Display Name:</strong> {headerInfo.brand.displayName}</p>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Timestamp: {headerInfo.timestamp}</p>
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Test Instructions</h2>
        <p className="mb-2">Visit these URLs to test subdomain handling:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><a href="http://localhost:3000/test-middleware" className="text-blue-600 hover:underline">localhost:3000</a> - Default behavior</li>
          <li><a href="http://act.localhost:3000/test-middleware" className="text-blue-600 hover:underline">act.localhost:3000</a> - ACT brand</li>
          <li><a href="http://acme.localhost:3000/test-middleware" className="text-blue-600 hover:underline">acme.localhost:3000</a> - Acme brand</li>
          <li><a href="http://onbrand.localhost:3000/test-middleware" className="text-blue-600 hover:underline">onbrand.localhost:3000</a> - Parent domain</li>
        </ul>
      </div>
    </div>
  );
}
