/**
 * Marketing page for the parent domain (onbrand.ai, onbrandai.app)
 */

import Image from 'next/image';
import Link from 'next/link';

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto py-4 px-6 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="font-bold text-xl">OnBrand.ai</div>
          </div>
          <nav>
            <ul className="flex space-x-6">
              <li><a href="#features" className="text-gray-600 hover:text-gray-900">Features</a></li>
              <li><a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a></li>
              <li><Link href="/login" className="text-gray-600 hover:text-gray-900">Sign In</Link></li>
              <li>
                <Link 
                  href="/signup" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Get Started
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-5xl text-center">
            <h1 className="text-5xl font-bold mb-6">Brand Management for AI-Powered Content</h1>
            <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
              OnBrand helps companies maintain brand consistency across all their AI-generated content with powerful tools and seamless integrations.
            </p>
            <div className="flex justify-center gap-4">
              <Link 
                href="/signup" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-lg font-medium"
              >
                Try for Free
              </Link>
              <Link 
                href="#demo" 
                className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-md text-lg font-medium"
              >
                Watch Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white px-6">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold mb-12 text-center">Everything You Need for Brand Consistency</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-slate-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">Brand Guidelines</h3>
                <p className="text-gray-600">Ensure all content follows your brand voice, style, and values consistently.</p>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">Custom AI Training</h3>
                <p className="text-gray-600">Train AI models on your specific brand guidelines and content needs.</p>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">Multi-Channel Management</h3>
                <p className="text-gray-600">Seamlessly deploy brand-consistent content across all your platforms.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold mb-12 text-center">Simple, Transparent Pricing</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-xl font-semibold mb-2">Starter</h3>
                <p className="text-gray-500 mb-4">For small teams getting started</p>
                <p className="text-4xl font-bold mb-6">$29<span className="text-lg text-gray-500 font-normal">/month</span></p>
                <ul className="mb-8 space-y-2">
                  <li className="flex items-center"><span className="mr-2">✓</span> 1 Brand Profile</li>
                  <li className="flex items-center"><span className="mr-2">✓</span> Basic Guidelines</li>
                  <li className="flex items-center"><span className="mr-2">✓</span> 100 Content Generations</li>
                </ul>
                <Link href="/signup?plan=starter" className="block text-center bg-slate-100 hover:bg-slate-200 text-gray-800 py-2 rounded-md w-full">
                  Get Started
                </Link>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-md border-2 border-blue-500 transform scale-105">
                <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium inline-block mb-3">Most Popular</div>
                <h3 className="text-xl font-semibold mb-2">Professional</h3>
                <p className="text-gray-500 mb-4">For growing businesses</p>
                <p className="text-4xl font-bold mb-6">$99<span className="text-lg text-gray-500 font-normal">/month</span></p>
                <ul className="mb-8 space-y-2">
                  <li className="flex items-center"><span className="mr-2">✓</span> 3 Brand Profiles</li>
                  <li className="flex items-center"><span className="mr-2">✓</span> Advanced Guidelines</li>
                  <li className="flex items-center"><span className="mr-2">✓</span> 1,000 Content Generations</li>
                  <li className="flex items-center"><span className="mr-2">✓</span> API Access</li>
                </ul>
                <Link href="/signup?plan=professional" className="block text-center bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md w-full">
                  Get Started
                </Link>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
                <p className="text-gray-500 mb-4">For organizations with complex needs</p>
                <p className="text-4xl font-bold mb-6">Custom</p>
                <ul className="mb-8 space-y-2">
                  <li className="flex items-center"><span className="mr-2">✓</span> Unlimited Brand Profiles</li>
                  <li className="flex items-center"><span className="mr-2">✓</span> Custom AI Training</li>
                  <li className="flex items-center"><span className="mr-2">✓</span> Unlimited Content Generations</li>
                  <li className="flex items-center"><span className="mr-2">✓</span> Advanced Analytics</li>
                  <li className="flex items-center"><span className="mr-2">✓</span> Dedicated Support</li>
                </ul>
                <Link href="/signup?plan=enterprise" className="block text-center bg-slate-100 hover:bg-slate-200 text-gray-800 py-2 rounded-md w-full">
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-white py-12 px-6">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">OnBrand.ai</h3>
              <p className="text-gray-400">Making AI-generated content on-brand, every time.</p>
            </div>
            <div>
              <h4 className="font-medium mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-gray-400">
            <p>&copy; {new Date().getFullYear()} OnBrand, Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
