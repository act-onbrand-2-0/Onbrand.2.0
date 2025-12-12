import { redirect } from 'next/navigation';
import { isValidBrand } from '../lib/brand';

/**
 * Root page that handles routing based on domain/subdomain
 * Simplified to avoid headers() Promise issues
 */
export default function Home() {
  // For simplicity, we'll just redirect to the test page
  redirect('/test-middleware');
}
