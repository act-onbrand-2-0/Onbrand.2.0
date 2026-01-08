#!/usr/bin/env node

// Simple build script for Netlify
const { execSync } = require('child_process');

console.log('Running Netlify build script...');

// Netlify environment variables
const context = process.env.CONTEXT; // 'production', 'deploy-preview', 'branch-deploy'
const branch = process.env.BRANCH; // Git branch name
const deployUrl = process.env.DEPLOY_URL; // Full deploy URL from Netlify

// Determine the site URL based on deploy context
function getSiteUrl() {
  // If explicitly set, use that
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // For branch deploys, construct subdomain URL: branch-name.onbrandai.app
  if (context === 'branch-deploy' && branch && branch !== 'main' && branch !== 'master') {
    const branchSubdomain = branch.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    console.log(`Branch deploy detected: ${branch} -> ${branchSubdomain}.onbrandai.app`);
    return `https://${branchSubdomain}.onbrandai.app`;
  }
  
  // For deploy previews, use the Netlify deploy URL
  if (context === 'deploy-preview' && deployUrl) {
    console.log(`Deploy preview detected: ${deployUrl}`);
    return deployUrl;
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
