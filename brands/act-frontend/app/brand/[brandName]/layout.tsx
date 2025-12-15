import Link from 'next/link';
import { ReactNode } from 'react';
import { getBrandConfig, isValidBrand } from '../../../lib/brand';

interface BrandLayoutProps {
  children: ReactNode;
  params: Promise<{ brandName: string }>;
}

function BrandHeader({ brandConfig }: { brandConfig: any }) {
  return (
    <header className="sticky top-0 z-10 shadow-sm" style={{ backgroundColor: brandConfig.colors.primary }}>
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <span className="font-bold text-white text-xl mr-2">{brandConfig.displayName}</span>
          <span className="text-white opacity-75 text-sm">Powered by OnBrand.ai</span>
        </div>
        <nav>
          <ul className="flex space-x-6 text-white">
            <li><Link href={`/brand/${brandConfig.id}/dashboard`} className="hover:text-opacity-80">Dashboard</Link></li>
            <li><Link href={`/brand/${brandConfig.id}/content`} className="hover:text-opacity-80">Content</Link></li>
            <li><Link href={`/brand/${brandConfig.id}/analytics`} className="hover:text-opacity-80">Analytics</Link></li>
            <li><Link href="/login" className="hover:text-opacity-80">Account</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

function BrandFooter({ brandConfig }: { brandConfig: any }) {
  return (
    <footer className="bg-gray-100 py-6 px-4 mt-auto">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-8 mb-6">
          <div>
            <h3 className="font-bold mb-3" style={{ color: brandConfig.colors.primary }}>
              {brandConfig.displayName}
            </h3>
            <p className="text-gray-600 text-sm">
              Branded experience powered by OnBrand.ai
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2 text-gray-700">Resources</h4>
            <ul className="text-sm space-y-1">
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Documentation</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Tutorials</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Support</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2 text-gray-700">Legal</h4>
            <ul className="text-sm space-y-1">
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Terms of Service</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Cookie Policy</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2 text-gray-700">Contact</h4>
            <ul className="text-sm space-y-1">
              <li><a href="mailto:support@onbrand.ai" className="text-gray-600 hover:text-gray-900">support@onbrand.ai</a></li>
              <li><a href="tel:+18005551234" className="text-gray-600 hover:text-gray-900">1-800-555-1234</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4 flex justify-between items-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} OnBrand, Inc. All rights reserved.</p>
          <p>Brand ID: {brandConfig.id}</p>
        </div>
      </div>
    </footer>
  );
}

export default async function BrandLayout({ children, params }: BrandLayoutProps) {
  // Get the brand configuration from the URL parameter
  const { brandName } = await params;
  
  // Check if this is a valid brand
  const validBrand = isValidBrand(brandName);
  
  // Get the specific brand config for this page
  const brandConfig = getBrandConfig(brandName);
  
  // Set page title
  const pageTitle = validBrand ? `${brandConfig.displayName} | OnBrand` : 'Invalid Brand';
  
  return (
    <div className="flex flex-col min-h-screen">
      <BrandHeader brandConfig={brandConfig} />
      
      <main className="flex-grow">
        {children}
      </main>
      
      <BrandFooter brandConfig={brandConfig} />
    </div>
  );
}
