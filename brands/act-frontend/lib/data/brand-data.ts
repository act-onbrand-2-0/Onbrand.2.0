import { getBrandConfig } from '../brand';

/**
 * Example brand-specific data fetching utilities
 * In a real app, this would connect to your database with tenant isolation
 */

// Example data store - in production this would be in a database with proper tenant isolation
const brandDataStore: Record<string, any> = {
  'act': {
    name: 'ACT 2.0',
    description: 'The official ACT brand experience',
    metrics: {
      contentCount: 42,
      contentViews: 3872,
      brandScore: '95%',
      activeUsers: 28
    },
    recentContent: [
      { id: '1', title: 'Brand Guidelines', date: '2025-09-15', status: 'Published' },
      { id: '2', title: 'Marketing Strategy', date: '2025-10-01', status: 'Published' },
      { id: '3', title: 'Q4 Campaign', date: '2025-10-10', status: 'Draft' },
      { id: '4', title: 'Social Media Calendar', date: '2025-10-12', status: 'Review' }
    ]
  },
  'acme': {
    name: 'Acme Corp',
    description: 'Enterprise solutions for innovative businesses',
    metrics: {
      contentCount: 24,
      contentViews: 1245,
      brandScore: '87%',
      activeUsers: 15
    },
    recentContent: [
      { id: '1', title: 'Product Launch', date: '2025-09-20', status: 'Published' },
      { id: '2', title: 'Customer Case Study', date: '2025-10-05', status: 'Review' },
      { id: '3', title: 'Email Newsletter', date: '2025-10-08', status: 'Draft' },
      { id: '4', title: 'Annual Report', date: '2025-10-15', status: 'Draft' }
    ]
  }
};

/**
 * Get brand data for the current tenant
 * This demonstrates how to get tenant-specific data in a multi-tenant app
 */
export async function getBrandData() {
  // Get the current brand ID from the brand detection system
  const brandConfig = getBrandConfig();
  const brandId = brandConfig.id;
  
  // In a real app, you would:
  // 1. Validate the user has access to this brand (tenant)
  // 2. Query your database with tenant isolation
  // 3. Return only data for this specific tenant
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Return data for this brand or default data
  return brandDataStore[brandId] || {
    name: brandConfig.displayName,
    description: 'Brand data not found',
    metrics: {
      contentCount: 0,
      contentViews: 0,
      brandScore: '0%',
      activeUsers: 0
    },
    recentContent: []
  };
}

/**
 * Get content for a specific brand
 */
export async function getBrandContent(brandId: string) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Return content for this brand or empty array
  return brandDataStore[brandId]?.recentContent || [];
}

/**
 * Create content for a specific brand
 */
export async function createBrandContent(brandId: string, content: any) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // In a real app, you would save to your database with tenant isolation
  if (!brandDataStore[brandId]) {
    brandDataStore[brandId] = {
      recentContent: []
    };
  }
  
  // Add content with a generated ID
  const newContent = {
    id: `${Date.now()}`,
    ...content,
    date: new Date().toISOString().split('T')[0]
  };
  
  brandDataStore[brandId].recentContent = [
    newContent,
    ...(brandDataStore[brandId].recentContent || [])
  ];
  
  return newContent;
}
