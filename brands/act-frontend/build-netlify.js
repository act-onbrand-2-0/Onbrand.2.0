#!/usr/bin/env node

// Custom build script for Netlify that skips problematic API routes
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Running custom Netlify build script for act-frontend...');

// Set default environment variables for build
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'placeholder-key';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'placeholder-key';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'placeholder-key';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'placeholder-key';

// Temporarily rename the api directory to prevent Next.js from processing it during build
const apiDir = path.join(__dirname, 'app', 'api');
const tempApiDir = path.join(__dirname, 'app', '_api_temp');

try {
  // Check if api directory exists
  if (fs.existsSync(apiDir)) {
    console.log('Temporarily renaming api directory...');
    fs.renameSync(apiDir, tempApiDir);
  }

  // Run the Next.js build with static export
  console.log('Running Next.js build...');
  execSync('next build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_SKIP_API_DIRECTORY: 'true'
    }
  });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build error:', error);
  process.exit(1);
} finally {
  // Restore the api directory
  if (fs.existsSync(tempApiDir)) {
    console.log('Restoring api directory...');
    fs.renameSync(tempApiDir, apiDir);
  }
}
