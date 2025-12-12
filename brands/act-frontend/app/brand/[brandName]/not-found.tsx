import Link from 'next/link';
import { getBrandConfig } from '../../../lib/brand';

/**
 * Custom not-found page for the brand section
 * Shows when a user tries to access an invalid brand subdomain
 */
export default function BrandNotFound() {
  const brandConfig = getBrandConfig();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">Brand Not Found</h1>
      
      <p className="text-gray-600 mb-8 text-center max-w-lg">
        The brand you are trying to access does not exist or you don't have permission to view it.
      </p>
      
      <div className="space-y-4">
        <Link 
          href={`/brand/${brandConfig.id}`}
          className="block text-center px-6 py-2 rounded-md bg-blue-600 text-white"
        >
          Go to Your Brand
        </Link>
        
        <Link
          href="/"
          className="block text-center px-6 py-2 rounded-md border border-gray-300"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
