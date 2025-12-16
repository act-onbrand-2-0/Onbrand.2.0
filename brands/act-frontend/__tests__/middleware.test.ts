import { describe, it, expect, vi, beforeEach } from 'vitest';
import { middleware } from '../middleware';
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Mock NextResponse
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server');
  return {
    ...actual,
    NextResponse: {
      next: vi.fn(() => ({
        headers: {
          set: vi.fn(),
        },
      })),
      rewrite: vi.fn((url) => ({ url })),
    },
  };
});

describe('Middleware', () => {
  let mockRequest: NextRequest;
  let nextUrlMock: any;
  let headersMock: Map<string, string>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup request headers mock
    headersMock = new Map();
    headersMock.set('host', 'example.com');

    // Setup nextUrl mock
    nextUrlMock = {
      pathname: '/',
      href: 'http://example.com/',
      origin: 'http://example.com',
      clone: vi.fn().mockReturnThis(),
    };

    // Setup mock request
    mockRequest = {
      headers: {
        get: vi.fn((name) => headersMock.get(name) || null),
        has: vi.fn((name) => headersMock.has(name)),
      },
      nextUrl: nextUrlMock,
      url: 'http://example.com/',
    } as unknown as NextRequest;

    // Reset console.log mock
    console.log = vi.fn();
  });

  it('should extract subdomain from hostname', () => {
    headersMock.set('host', 'acme.onbrand.ai');
    middleware(mockRequest);
    expect(console.log).toHaveBeenCalledWith('Middleware - hostname:', 'acme.onbrand.ai', 'subdomain:', 'acme');
  });

  it('should handle localhost correctly', () => {
    headersMock.set('host', 'localhost:3000');
    middleware(mockRequest);
    expect(console.log).toHaveBeenCalledWith('Middleware - hostname:', 'localhost:3000', 'subdomain:', 'localhost');
  });

  it('should redirect to marketing page for parent domain root path', () => {
    headersMock.set('host', 'onbrand.ai');
    nextUrlMock.pathname = '/';
    
    middleware(mockRequest);
    
    expect(NextResponse.rewrite).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/marketing' })
    );
  });

  it('should not redirect to marketing page for non-root paths on parent domain', () => {
    headersMock.set('host', 'onbrand.ai');
    nextUrlMock.pathname = '/about';
    
    middleware(mockRequest);
    
    expect(NextResponse.rewrite).not.toHaveBeenCalled();
    expect(NextResponse.next).toHaveBeenCalled();
  });

  it('should set brand headers for subdomain', async () => {
    headersMock.set('host', 'acme.onbrand.ai');
    const response = await middleware(mockRequest);
    
    expect(response.headers.set).toHaveBeenCalledWith('x-brand-subdomain', 'acme');
    expect(response.headers.set).toHaveBeenCalledWith('x-hostname', 'acme.onbrand.ai');
  });

  it('should handle onbrandai.app domain correctly', () => {
    headersMock.set('host', 'onbrandai.app');
    nextUrlMock.pathname = '/';
    
    middleware(mockRequest);
    
    expect(NextResponse.rewrite).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/marketing' })
    );
  });

  it('should handle www.onbrandai.app domain correctly', () => {
    headersMock.set('host', 'www.onbrandai.app');
    nextUrlMock.pathname = '/';
    
    middleware(mockRequest);
    
    expect(NextResponse.rewrite).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/marketing' })
    );
  });
});
