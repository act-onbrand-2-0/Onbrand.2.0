/**
 * Environment configuration and utilities
 */

export type AppEnvironment = 'development' | 'staging' | 'production';

/**
 * Get the current application environment
 */
export function getAppEnv(): AppEnvironment {
  const env = process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development';
  
  if (env === 'staging') return 'staging';
  if (env === 'production') return 'production';
  return 'development';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getAppEnv() === 'development';
}

/**
 * Check if running in staging
 */
export function isStaging(): boolean {
  return getAppEnv() === 'staging';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getAppEnv() === 'production';
}

/**
 * Get the app URL based on environment
 */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Get environment-specific configuration
 */
export function getEnvConfig() {
  const env = getAppEnv();
  
  return {
    env,
    isDevelopment: isDevelopment(),
    isStaging: isStaging(),
    isProduction: isProduction(),
    appUrl: getAppUrl(),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    functionsUrl: process.env.SUPABASE_FUNCTIONS_URL || '',
  };
}

/**
 * Log environment info (development only)
 */
export function logEnvInfo() {
  if (!isDevelopment()) return;
  
  const config = getEnvConfig();
  console.log('🌍 Environment Configuration:', {
    environment: config.env,
    appUrl: config.appUrl,
    supabaseUrl: config.supabaseUrl,
    functionsUrl: config.functionsUrl,
  });
}
