#!/usr/bin/env node

// Simple build script for Netlify
const { execSync } = require('child_process');

console.log('Running Netlify build script...');

// Netlify environment variables - log them all for debugging
const context = process.env.CONTEXT; // 'production', 'deploy-preview', 'branch-deploy'
const branch = process.env.BRANCH; // Git branch name
const deployUrl = process.env.DEPLOY_URL; // Unique URL for this deploy
const deployPrimeUrl = process.env.DEPLOY_PRIME_URL; // Primary URL for branch deploys (with subdomain)
const siteUrl = process.env.URL; // Primary site URL

console.log('=== Netlify Environment ===');
console.log(`CONTEXT: ${context}`);
console.log(`BRANCH: ${branch}`);
console.log(`DEPLOY_URL: ${deployUrl}`);
console.log(`DEPLOY_PRIME_URL: ${deployPrimeUrl}`);
console.log(`URL: ${siteUrl}`);
console.log(`NEXT_PUBLIC_SITE_URL (before): ${process.env.NEXT_PUBLIC_SITE_URL}`);
console.log('===========================');

// Determine the site URL based on deploy context
function getSiteUrl() {
  // For branch deploys, use DEPLOY_PRIME_URL which Netlify sets to branch subdomain
  // e.g., https://chatbot.onbrandai.app for the 'chatbot' branch
  if (context === 'branch-deploy' && deployPrimeUrl) {
    console.log(`Using DEPLOY_PRIME_URL for branch deploy: ${deployPrimeUrl}`);
    return deployPrimeUrl;
  }
  
  // For branch deploys without DEPLOY_PRIME_URL, construct it ourselves
  if (context === 'branch-deploy' && branch && branch !== 'main' && branch !== 'master') {
    const branchSubdomain = branch.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const constructedUrl = `https://${branchSubdomain}.onbrandai.app`;
    console.log(`Constructed branch URL: ${constructedUrl}`);
    return constructedUrl;
  }
  
  // For deploy previews, use DEPLOY_PRIME_URL or DEPLOY_URL
  if (context === 'deploy-preview') {
    const previewUrl = deployPrimeUrl || deployUrl;
    console.log(`Using preview URL: ${previewUrl}`);
    return previewUrl;
  }
  
  // For production, use the configured URL or default
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // Default to production URL
  return 'https://onbrandai.app';
}

// Set default environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pyvobennsmzyvtaceopn.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dm9iZW5uc216eXZ0YWNlb3BuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NDEwNDksImV4cCI6MjA3OTIxNzA0OX0.-osk8vo0I8WI6i2UHl7TORcGAv-oZbSsxEVqxL79zVE';
process.env.NEXT_PUBLIC_MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'onbrandai.app';
process.env.NEXT_PUBLIC_SITE_URL = getSiteUrl();

console.log(`Build context: ${context || 'local'}`);
console.log(`Branch: ${branch || 'unknown'}`);
console.log(`Site URL: ${process.env.NEXT_PUBLIC_SITE_URL}`);

try {
  console.log('Running next build...');
  
  execSync('cd ../../ && pnpm --filter=act-frontend exec next build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
      DISABLE_MCP: 'true' // Disable MCP during build to avoid DOMMatrix errors
    }
  });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build error:', error);
  process.exit(1);
}
