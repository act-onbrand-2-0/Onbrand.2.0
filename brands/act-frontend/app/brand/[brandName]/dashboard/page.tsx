import { getBrandConfig } from '../../../../lib/brand';
import { getBrandData } from '../../../../lib/data/brand-data';

/**
 * Brand-specific dashboard page
 * Demonstrates nested routing within a multi-tenant app
 * Uses tenant-specific data fetching
 */
export default async function BrandDashboard({ params }: { params: { brandName: string } }) {
  const { brandName } = params;
  
  // Get the specific brand config for this page
  const brandConfig = getBrandConfig(brandName);
  
  // Fetch tenant-specific data using our data layer
  const brandData = await getBrandData(brandName);
  
  // Construct metrics from brand data
  const metrics = [
    { name: 'Total Content', value: brandData.metrics.contentCount.toString() },
    { name: 'Content Views', value: brandData.metrics.contentViews.toLocaleString() },
    { name: 'Brand Score', value: brandData.metrics.brandScore },
    { name: 'Active Users', value: brandData.metrics.activeUsers.toString() },
  ];
  
  // Use the recent content from brand data
  const recentContent = brandData.recentContent;
  
  return (
    <div className="py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button 
            className="px-4 py-2 rounded-md text-white"
            style={{ backgroundColor: brandConfig.colors.primary }}
          >
            Create New
          </button>
        </div>
        
        {/* Welcome Banner */}
        <div 
          className="p-6 rounded-lg mb-8 text-white" 
          style={{ backgroundColor: brandConfig.colors.primary }}
        >
          <h2 className="text-xl font-semibold mb-2">Welcome to {brandConfig.displayName}</h2>
          <p className="mb-2">Your brand portal has been set up successfully.</p>
          <p>This multi-tenant application now recognizes your subdomain and provides a custom branded experience.</p>
        </div>
        
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {metrics.map((metric, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-500 mb-1">{metric.name}</div>
              <div className="text-2xl font-semibold">{metric.value}</div>
            </div>
          ))}
        </div>
        
        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <h2 className="text-lg font-semibold mb-4">Recent Content</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-3 px-4">Title</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentContent.map((item: { title: string; date: string; status: string }, i: number) => (
                  <tr key={i}>
                    <td className="py-3 px-4">{item.title}</td>
                    <td className="py-3 px-4">{item.date}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.status === 'Published' ? 'bg-green-100 text-green-800' :
                        item.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <a href="#" className="text-blue-600 hover:text-blue-800">View</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Brand Information */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Brand Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm text-gray-500 mb-1">Brand ID</h3>
              <p>{brandConfig.id}</p>
            </div>
            <div>
              <h3 className="text-sm text-gray-500 mb-1">Display Name</h3>
              <p>{brandConfig.displayName}</p>
            </div>
            <div>
              <h3 className="text-sm text-gray-500 mb-1">Domain</h3>
              <p>{brandConfig.domain}.onbrandai.app</p>
            </div>
            <div>
              <h3 className="text-sm text-gray-500 mb-1">Created</h3>
              <p>October 1, 2025</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
