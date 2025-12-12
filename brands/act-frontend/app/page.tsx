import { redirect } from 'next/navigation';
import { getBrandConfig, isValidBrand } from '../lib/brand';

/**
 * Root page that handles routing based on domain/subdomain
 * Redirects to the brand-specific dashboard or login
 */
export default function Home() {
  // Get the brand from middleware detection
  const brandConfig = getBrandConfig();
  
  // Check if the user is logged in (would do proper auth check in production)
  const isLoggedIn = false; // For demo, force login flow
  
  if (isLoggedIn) {
    // If logged in, go to the dashboard
    redirect(`/brand/${brandConfig.id}/dashboard`);
  } else {
    // If not logged in, go to the login page
    redirect('/login');
  }
}
