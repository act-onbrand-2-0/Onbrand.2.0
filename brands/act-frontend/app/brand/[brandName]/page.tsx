import { getBrandConfig } from '../../../lib/brand';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Brand content components
function BrandHero({ brandConfig }: { brandConfig: any }) {
  return (
    <div className="py-12 px-4 bg-gradient-to-b from-transparent to-gray-50">
      <div className="container mx-auto max-w-5xl">
        <h1 className="text-4xl font-bold mb-4" style={{ color: brandConfig.colors.primary }}>
          Welcome to {brandConfig.displayName}
        </h1>
        <p className="text-lg mb-8">
          This is a custom branded experience tailored for {brandConfig.displayName} customers.
        </p>
        <div className="flex gap-4">
          <button 
            className="px-6 py-2 rounded-md" 
            style={{ 
              backgroundColor: brandConfig.colors.primary,
              color: '#fff' 
            }}
          >
            Get Started
          </button>
          <button 
            className="px-6 py-2 rounded-md border" 
            style={{ 
              borderColor: brandConfig.colors.primary,
              color: brandConfig.colors.primary 
            }}
          >
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}

function BrandFeatures({ brandConfig }: { brandConfig: any }) {
  const features = [
    {
      title: 'Brand Guidelines',
      description: 'Access your complete brand guidelines and resources.',
    },
    {
      title: 'Content Management',
      description: 'Create and manage content with your brand voice.',
    },
    {
      title: 'Analytics',
      description: 'Track performance of your brand content across channels.',
    },
  ];

  return (
    <div className="py-12 px-4 bg-white">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-2xl font-bold mb-8 text-center">
          {brandConfig.displayName} Features
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-6 border rounded-lg hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold mb-3" style={{ color: brandConfig.colors.primary }}>
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// For server-side tenant isolation
async function checkUserAccess(brandId: string): Promise<boolean> {
  // In production, check user access to brand
  // For now, we'll just allow access in development
  if (process.env.NODE_ENV === 'production') {
    // In production, you'd implement proper authentication
    // This would use server-side Supabase client to check
    // if the user has access to this brand
    return true;
  }
  
  // For development, allow access to all brands
  return true;
}

// Server component to fetch brand data and render page
export default async function BrandPage({ params }: { params: { brandName: string } }) {
  const { brandName } = params;
  const brandConfig = getBrandConfig();

  // If the brandName in the URL doesn't match the detected brand, show 404
  // This prevents users from accessing other brand pages
  if (brandName !== brandConfig.id) {
    notFound();
  }
  
  // Check if user has access to the requested brand
  const hasAccess = await checkUserAccess(brandName);
  
  // If no access, show 404 page
  if (!hasAccess) {
    notFound();
  }

  return (
    <div>
      <BrandHero brandConfig={brandConfig} />
      <BrandFeatures brandConfig={brandConfig} />
      
      <div className="container mx-auto max-w-5xl py-12 px-4">
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">
            Brand Information
          </h2>
          <div className="space-y-2">
            <p><strong>Brand ID:</strong> {brandConfig.id}</p>
            <p><strong>Display Name:</strong> {brandConfig.displayName}</p>
            <p>
              <strong>Brand Colors:</strong> 
              <span className="ml-2 inline-block w-4 h-4 rounded-full" style={{ backgroundColor: brandConfig.colors.primary }}></span>
              <span className="ml-2 inline-block w-4 h-4 rounded-full" style={{ backgroundColor: brandConfig.colors.secondary }}></span>
              <span className="ml-2 inline-block w-4 h-4 rounded-full" style={{ backgroundColor: brandConfig.colors.accent }}></span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
