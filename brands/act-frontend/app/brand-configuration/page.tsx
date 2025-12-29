'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Upload, FileText, Image as ImageIcon, Type, Home } from 'lucide-react';
import Link from 'next/link';

export default function BrandConfigurationPage() {
  const supabase = useMemo(() => createClient(), []);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUserId(session.user.id);
      // Pick the first brand membership
      const { data: membership } = await supabase
        .from('brand_users')
        .select('brand_id')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle();
      setBrandId(membership?.brand_id || null);
    }
    init();
  }, [supabase]);

  const uploadDocument = async (file: File) => {
    if (!brandId || !userId) return;
    setError(null);
    setStatus(null);
    setIsUploading(true);
    try {
      const path = `${brandId}/documents/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('brand-documents')
        .upload(path, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from('brand_documents')
        .insert({
          brand_id: brandId,
          user_id: userId,
          name: file.name,
          description: 'Brand guideline',
          file_url: path,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
          status: 'pending',
        });
      if (dbErr) throw dbErr;
      setStatus('Brand book uploaded. We will process it shortly.');
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadAsset = async (file: File, kind: 'logos' | 'fonts', assetType: 'logo' | 'font') => {
    if (!brandId || !userId) return;
    setError(null);
    setStatus(null);
    setIsUploading(true);
    try {
      const path = `${brandId}/${kind}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('brand-assets')
        .upload(path, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from('brand_assets')
        .insert({
          brand_id: brandId,
          user_id: userId,
          name: file.name,
          description: assetType === 'logo' ? 'Brand logo' : 'Brand font',
          asset_type: assetType,
          file_url: path,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
        });
      if (dbErr) throw dbErr;
      setStatus(`${assetType === 'logo' ? 'Logo' : 'Font'} uploaded successfully.`);
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header bar matching other pages */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center size-9 rounded-md hover:bg-accent transition-colors"
            title="Back to Dashboard"
          >
            <Home className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold">Brand Configuration</h1>
            <p className="text-xs text-muted-foreground">
              Upload your brand book and identity assets so AI tools can generate on‑brand content.
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">

      {!brandId && (
        <div className="rounded-md border p-4 bg-muted/40 text-sm">
          We couldn't detect your brand. Please ensure your account is linked to a brand.
        </div>
      )}

      {status && (
        <div className="rounded-md border border-green-300 bg-green-50 text-green-800 p-3 text-sm mb-4">
          {status}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive p-3 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* Brand Book */}
        <section className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-[#889def]" />
            <h2 className="text-lg font-medium">Brand Book</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your brand guidelines (PDF, DOCX, or TXT). We will extract colors, fonts, and rules.
          </p>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={(e) => e.target.files?.[0] && uploadDocument(e.target.files[0])}
            disabled={isUploading || !brandId}
            className="block w-full rounded-md border bg-background p-2"
          />
        </section>

        {/* Logos */}
        <section className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="h-5 w-5 text-[#889def]" />
            <h2 className="text-lg font-medium">Logos</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Upload primary and secondary logos (PNG, JPG, SVG).
          </p>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.svg"
            onChange={(e) => e.target.files?.[0] && uploadAsset(e.target.files[0], 'logos', 'logo')}
            disabled={isUploading || !brandId}
            className="block w-full rounded-md border bg-background p-2"
          />
        </section>

        {/* Fonts */}
        <section className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Type className="h-5 w-5 text-[#889def]" />
            <h2 className="text-lg font-medium">Fonts</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Upload brand fonts (TTF, OTF, WOFF, WOFF2).
          </p>
          <input
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            onChange={(e) => e.target.files?.[0] && uploadAsset(e.target.files[0], 'fonts', 'font')}
            disabled={isUploading || !brandId}
            className="block w-full rounded-md border bg-background p-2"
          />
        </section>

        {/* Coming next */}
        <section className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="h-5 w-5 text-[#889def]" />
            <h2 className="text-lg font-medium">Colors & Tone (coming soon)</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Define your color palette and tone of voice, or let us extract it from the brand book.
          </p>
        </section>
      </div>
      </div>
    </div>
  );
}


