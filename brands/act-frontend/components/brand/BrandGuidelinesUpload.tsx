'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Image as ImageIcon, Download } from 'lucide-react';
import Image from 'next/image';

interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'extracted' | 'approved' | 'error';
  progress?: number;
  message?: string;
}

interface ExtractedImage {
  url: string;
  pageNumber: number;
  description?: string;
  isMainLogo?: boolean;
  width?: number;
  height?: number;
}

interface ExtractedGuidelines {
  voice?: {
    personality?: string[];
    tone?: string;
    writeAs?: string;
    audienceLevel?: string;
  };
  copyGuidelines?: {
    dos?: Array<{ rule: string; example?: string; why?: string }>;
    donts?: Array<{ rule: string; badExample: string; goodExample: string }>;
    wordChoices?: Array<{ avoid: string; prefer: string }>;
    phrases?: { required: string[]; banned: string[] };
  };
  visualGuidelines?: {
    colors?: { primary: string; secondary: string; accent: string; neutrals: string[]; usage: string };
    typography?: { headings: { family: string; weights: string[] }; body: { family: string; weights: string[] }; usage: string };
    imagery?: { 
      style: string; 
      photographyStyle?: string;
      illustrationStyle?: string;
      iconStyle?: string;
      patterns?: string;
      avoid: string[]; 
      prefer: string[];
    };
    logo?: { clearSpace: string; minSize: string; donts: string[] };
    spacing?: {
      gridSystem?: string;
      margins?: string;
      padding?: string;
      verticalRhythm?: string;
      componentSpacing?: string;
    };
    layout?: {
      principles?: string[];
      maxWidth?: string;
      columns?: string;
      breakpoints?: string[];
    };
  };
  messaging?: {
    pillars?: string[];
    valueProposition?: string;
    tagline?: string;
    boilerplate?: string;
  };
  logoAssets?: {
    primaryLogo?: {
      description?: string;
      imageUrl?: string;
      colorVersions?: string[];
    };
    alternativeLogos?: Array<{
      name?: string;
      description?: string;
      imageUrl?: string;
    }>;
    extractedImages?: ExtractedImage[];
  };
  extractedImages?: ExtractedImage[];
  confidence?: number;
}

interface BrandGuidelinesUploadProps {
  brandId: string;
  brandName: string;
  onGuidelinesApproved?: (guidelinesId: string) => void;
  existingGuidelines?: any; // Pass existing approved guidelines to show them
}

export function BrandGuidelinesUpload({ brandId, brandName, onGuidelinesApproved, existingGuidelines }: BrandGuidelinesUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [file, setFile] = useState<File | null>(null);
  const [extraction, setExtraction] = useState<ExtractedGuidelines | null>(null);
  const [guidelinesId, setGuidelinesId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState<'upload' | 'view'>(existingGuidelines ? 'view' : 'upload');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
      } else {
        setUploadState({ status: 'error', message: 'Only PDF files are supported' });
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadState({ status: 'idle' });
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploadState({ status: 'uploading', progress: 0 });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);

      setUploadState({ status: 'uploading', progress: 30, message: 'Uploading PDF...' });

      const response = await fetch(`/api/brands/${brandId}/guidelines/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      setUploadState({ status: 'processing', progress: 60, message: 'Extracting guidelines with AI...' });

      const result = await response.json();

      if (result.success) {
        setExtraction(result.extraction);
        setGuidelinesId(result.guidelinesId);
        setUploadState({ 
          status: 'extracted', 
          message: `Extracted with ${Math.round((result.extraction.confidence || 0) * 100)}% confidence` 
        });
      } else {
        throw new Error(result.error || 'Extraction failed');
      }
    } catch (error) {
      setUploadState({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Upload failed' 
      });
    }
  };

  const handleApprove = async () => {
    if (!guidelinesId) return;

    setUploadState({ status: 'processing', message: 'Approving guidelines...' });

    try {
      const response = await fetch(`/api/brands/${brandId}/guidelines/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guidelinesId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Approval failed');
      }

      setUploadState({ status: 'approved', message: 'Brand guidelines activated!' });
      onGuidelinesApproved?.(guidelinesId);
    } catch (error) {
      setUploadState({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Approval failed' 
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      {existingGuidelines && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode('view')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'view'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            View Current Guidelines
          </button>
          <button
            onClick={() => setViewMode('upload')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'upload'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Upload New Guidelines
          </button>
        </div>
      )}

      {/* View Mode - Show Existing Guidelines */}
      {viewMode === 'view' && existingGuidelines && (
        <div className="border-2 border-blue-200 rounded-xl overflow-hidden bg-white shadow-lg">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <h3 className="font-bold text-white text-lg">
              Current Brand Guidelines for {brandName}
            </h3>
            <p className="text-blue-100 text-sm mt-1">
              Approved on {new Date(existingGuidelines.approvedAt).toLocaleDateString()}
            </p>
          </div>

          <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto">
            {/* Voice & Personality */}
            {existingGuidelines.voice && Object.keys(existingGuidelines.voice).length > 0 && (
              <GuidelineSection title="Voice & Personality" icon="🎭">
                {existingGuidelines.voice.personality?.length ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {existingGuidelines.voice.personality.map((trait: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                        {trait}
                      </span>
                    ))}
                  </div>
                ) : null}
                {existingGuidelines.voice.tone && (
                  <p className="text-sm"><strong>Tone:</strong> {existingGuidelines.voice.tone}</p>
                )}
                {existingGuidelines.voice.writeAs && (
                  <p className="text-sm"><strong>Write as:</strong> {existingGuidelines.voice.writeAs}</p>
                )}
              </GuidelineSection>
            )}

            {/* Copy Guidelines */}
            {existingGuidelines.copyGuidelines && (
              <GuidelineSection title="Copy Guidelines" icon="✍️">
                {existingGuidelines.copyGuidelines.dos?.length ? (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-green-700 mb-1">✅ Do:</p>
                    <ul className="text-sm space-y-1 pl-4">
                      {existingGuidelines.copyGuidelines.dos.map((d: any, i: number) => (
                        <li key={i}>
                          {d.rule}
                          {d.example && <span className="text-gray-500"> — e.g., "{d.example}"</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {existingGuidelines.copyGuidelines.donts?.length ? (
                  <div>
                    <p className="text-sm font-medium text-red-700 mb-1">❌ Don't:</p>
                    <ul className="text-sm space-y-1 pl-4">
                      {existingGuidelines.copyGuidelines.donts.map((d: any, i: number) => (
                        <li key={i}>{d.rule}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </GuidelineSection>
            )}

            {/* Visual Guidelines - Reuse existing component structure */}
            {existingGuidelines.visualGuidelines && (
              <GuidelineSection title="Visual Guidelines" icon="🎨">
                {/* Colors */}
                {existingGuidelines.visualGuidelines.colors && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800 mb-2">🎨 Colors</p>
                    <div className="flex flex-wrap gap-3">
                      {existingGuidelines.visualGuidelines.colors.primary && (
                        <ColorSwatch color={existingGuidelines.visualGuidelines.colors.primary} label="Primary" />
                      )}
                      {existingGuidelines.visualGuidelines.colors.secondary && (
                        <ColorSwatch color={existingGuidelines.visualGuidelines.colors.secondary} label="Secondary" />
                      )}
                      {existingGuidelines.visualGuidelines.colors.accent && (
                        <ColorSwatch color={existingGuidelines.visualGuidelines.colors.accent} label="Accent" />
                      )}
                    </div>
                  </div>
                )}

                {/* Typography */}
                {existingGuidelines.visualGuidelines.typography && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-800 mb-2">🔤 Typography</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Headings</p>
                        <p className="font-medium text-gray-900">{existingGuidelines.visualGuidelines.typography.headings?.family || 'Not specified'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Body</p>
                        <p className="font-medium text-gray-900">{existingGuidelines.visualGuidelines.typography.body?.family || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </GuidelineSection>
            )}

            {/* Messaging */}
            {existingGuidelines.messaging && (
              <GuidelineSection title="Messaging" icon="💬">
                {existingGuidelines.messaging.pillars?.length ? (
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-700 mb-1">Pillars:</p>
                    <div className="flex flex-wrap gap-2">
                      {existingGuidelines.messaging.pillars.map((p: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {existingGuidelines.messaging.tagline && (
                  <p className="text-sm"><strong>Tagline:</strong> "{existingGuidelines.messaging.tagline}"</p>
                )}
                {existingGuidelines.messaging.valueProposition && (
                  <p className="text-sm"><strong>Value Prop:</strong> {existingGuidelines.messaging.valueProposition}</p>
                )}
              </GuidelineSection>
            )}
          </div>
        </div>
      )}

      {/* Upload Mode */}
      {viewMode === 'upload' && (
        <>
      {/* Upload Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-10 text-center transition-all bg-white shadow-sm
          ${dragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'}
          ${uploadState.status === 'error' ? 'border-red-400 bg-red-50' : ''}
          ${uploadState.status === 'approved' ? 'border-green-400 bg-green-50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {/* Only show file input when no file selected */}
        {!file && uploadState.status === 'idle' && (
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        )}

        <div className="space-y-4">
          {uploadState.status === 'idle' && !file && (
            <>
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900">
                  Upload Brand Guidelines
                </p>
                <p className="text-base text-gray-600 mt-2">
                  Drag & drop a PDF file or click to browse
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Supports PDF up to 50MB
                </p>
              </div>
            </>
          )}

          {file && uploadState.status === 'idle' && (
            <>
              <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900">{file.name}</p>
                <p className="text-base text-gray-600 mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to extract
                </p>
              </div>
              <div className="flex gap-4 justify-center mt-6">
                <button
                  onClick={() => setFile(null)}
                  className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  Change File
                </button>
                <button
                  onClick={handleUpload}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg shadow-blue-600/30"
                >
                  Extract Guidelines
                </button>
              </div>
            </>
          )}

          {(uploadState.status === 'uploading' || uploadState.status === 'processing') && (
            <>
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <p className="text-xl font-semibold text-gray-900">{uploadState.message}</p>
              {uploadState.progress && (
                <div className="w-full max-w-sm mx-auto mt-4">
                  <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${uploadState.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{uploadState.progress}% complete</p>
                </div>
              )}
            </>
          )}

          {uploadState.status === 'error' && (
            <>
              <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
              <p className="text-lg font-medium text-red-700">{uploadState.message}</p>
              <button
                onClick={() => setUploadState({ status: 'idle' })}
                className="text-sm text-red-600 hover:underline"
              >
                Try again
              </button>
            </>
          )}

          {uploadState.status === 'approved' && (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <p className="text-lg font-medium text-green-700">{uploadState.message}</p>
            </>
          )}
        </div>
      </div>

      {/* Extracted Guidelines Preview */}
      {extraction && uploadState.status === 'extracted' && (
        <div className="border-2 border-green-200 rounded-xl overflow-hidden bg-white shadow-lg">
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex items-center justify-between">
            <h3 className="font-bold text-white text-lg">
              Extracted Guidelines for {brandName}
            </h3>
            <span className="text-sm bg-white/20 text-white px-3 py-1 rounded-full font-medium">
              Confidence: {Math.round((extraction.confidence || 0) * 100)}%
            </span>
          </div>

          <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto">
            {/* Voice & Personality */}
            {extraction.voice && Object.keys(extraction.voice).length > 0 && (
              <GuidelineSection title="Voice & Personality" icon="🎭">
                {extraction.voice.personality?.length ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {extraction.voice.personality.map((trait, i) => (
                      <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                        {trait}
                      </span>
                    ))}
                  </div>
                ) : null}
                {extraction.voice.tone && (
                  <p className="text-sm"><strong>Tone:</strong> {extraction.voice.tone}</p>
                )}
                {extraction.voice.writeAs && (
                  <p className="text-sm"><strong>Write as:</strong> {extraction.voice.writeAs}</p>
                )}
              </GuidelineSection>
            )}

            {/* Copy Guidelines */}
            {extraction.copyGuidelines && (
              <GuidelineSection title="Copy Guidelines" icon="✍️">
                {extraction.copyGuidelines.dos?.length ? (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-green-700 mb-1">✅ Do:</p>
                    <ul className="text-sm space-y-1 pl-4">
                      {extraction.copyGuidelines.dos.slice(0, 5).map((d, i) => (
                        <li key={i}>
                          {d.rule}
                          {d.example && <span className="text-gray-500"> — e.g., "{d.example}"</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {extraction.copyGuidelines.donts?.length ? (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-red-700 mb-1">❌ Don't:</p>
                    <ul className="text-sm space-y-1 pl-4">
                      {extraction.copyGuidelines.donts.slice(0, 5).map((d, i) => (
                        <li key={i}>
                          {d.rule}
                          {d.badExample && <span className="text-gray-500"> — "{d.badExample}" → "{d.goodExample}"</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {extraction.copyGuidelines.wordChoices?.length ? (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Word Choices:</p>
                    <div className="flex flex-wrap gap-2">
                      {extraction.copyGuidelines.wordChoices.slice(0, 8).map((w, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-gray-100 rounded">
                          <span className="text-red-500 line-through">{w.avoid}</span>
                          {' → '}
                          <span className="text-green-600">{w.prefer}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </GuidelineSection>
            )}

            {/* Visual Guidelines */}
            {extraction.visualGuidelines && (
              <GuidelineSection title="Visual Guidelines" icon="🎨">
                {/* Colors */}
                {extraction.visualGuidelines.colors && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800 mb-2">🎨 Colors</p>
                    <div className="flex flex-wrap gap-3">
                      {extraction.visualGuidelines.colors.primary && (
                        <ColorSwatch color={extraction.visualGuidelines.colors.primary} label="Primary" />
                      )}
                      {extraction.visualGuidelines.colors.secondary && (
                        <ColorSwatch color={extraction.visualGuidelines.colors.secondary} label="Secondary" />
                      )}
                      {extraction.visualGuidelines.colors.accent && (
                        <ColorSwatch color={extraction.visualGuidelines.colors.accent} label="Accent" />
                      )}
                      {extraction.visualGuidelines.colors.neutrals?.map((color, i) => (
                        <ColorSwatch key={i} color={color} label={`Neutral ${i + 1}`} />
                      ))}
                    </div>
                    {extraction.visualGuidelines.colors.usage && (
                      <p className="text-xs text-gray-500 mt-2">{extraction.visualGuidelines.colors.usage}</p>
                    )}
                  </div>
                )}

                {/* Typography */}
                {extraction.visualGuidelines.typography && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800 mb-2">🔤 Typography</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Headings</p>
                        <p className="font-medium text-gray-900">{extraction.visualGuidelines.typography.headings?.family || 'Not specified'}</p>
                        {extraction.visualGuidelines.typography.headings?.weights?.length > 0 && (
                          <p className="text-xs text-gray-500">Weights: {extraction.visualGuidelines.typography.headings.weights.join(', ')}</p>
                        )}
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Body</p>
                        <p className="font-medium text-gray-900">{extraction.visualGuidelines.typography.body?.family || 'Not specified'}</p>
                        {extraction.visualGuidelines.typography.body?.weights?.length > 0 && (
                          <p className="text-xs text-gray-500">Weights: {extraction.visualGuidelines.typography.body.weights.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    {extraction.visualGuidelines.typography.usage && (
                      <p className="text-xs text-gray-500 mt-2">{extraction.visualGuidelines.typography.usage}</p>
                    )}
                  </div>
                )}

                {/* Imagery */}
                {extraction.visualGuidelines.imagery && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800 mb-2">📷 Imagery & Icons</p>
                    <div className="space-y-2">
                      {extraction.visualGuidelines.imagery.style && (
                        <p className="text-sm"><span className="text-gray-500">Style:</span> {extraction.visualGuidelines.imagery.style}</p>
                      )}
                      {extraction.visualGuidelines.imagery.photographyStyle && (
                        <p className="text-sm"><span className="text-gray-500">Photography:</span> {extraction.visualGuidelines.imagery.photographyStyle}</p>
                      )}
                      {extraction.visualGuidelines.imagery.illustrationStyle && (
                        <p className="text-sm"><span className="text-gray-500">Illustrations:</span> {extraction.visualGuidelines.imagery.illustrationStyle}</p>
                      )}
                      {extraction.visualGuidelines.imagery.iconStyle && (
                        <p className="text-sm"><span className="text-gray-500">Icons:</span> {extraction.visualGuidelines.imagery.iconStyle}</p>
                      )}
                      {extraction.visualGuidelines.imagery.patterns && (
                        <p className="text-sm"><span className="text-gray-500">Patterns:</span> {extraction.visualGuidelines.imagery.patterns}</p>
                      )}
                      {extraction.visualGuidelines.imagery.prefer?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {extraction.visualGuidelines.imagery.prefer.map((item, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">✓ {item}</span>
                          ))}
                        </div>
                      )}
                      {extraction.visualGuidelines.imagery.avoid?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {extraction.visualGuidelines.imagery.avoid.map((item, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">✗ {item}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Spacing */}
                {extraction.visualGuidelines.spacing && Object.values(extraction.visualGuidelines.spacing).some(v => v) && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800 mb-2">📐 Spacing</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {extraction.visualGuidelines.spacing.gridSystem && (
                        <div className="bg-blue-50 p-2 rounded text-center">
                          <p className="text-xs text-blue-600">Grid</p>
                          <p className="text-sm font-medium text-blue-900">{extraction.visualGuidelines.spacing.gridSystem}</p>
                        </div>
                      )}
                      {extraction.visualGuidelines.spacing.margins && (
                        <div className="bg-blue-50 p-2 rounded text-center">
                          <p className="text-xs text-blue-600">Margins</p>
                          <p className="text-sm font-medium text-blue-900">{extraction.visualGuidelines.spacing.margins}</p>
                        </div>
                      )}
                      {extraction.visualGuidelines.spacing.padding && (
                        <div className="bg-blue-50 p-2 rounded text-center">
                          <p className="text-xs text-blue-600">Padding</p>
                          <p className="text-sm font-medium text-blue-900">{extraction.visualGuidelines.spacing.padding}</p>
                        </div>
                      )}
                      {extraction.visualGuidelines.spacing.componentSpacing && (
                        <div className="bg-blue-50 p-2 rounded text-center">
                          <p className="text-xs text-blue-600">Components</p>
                          <p className="text-sm font-medium text-blue-900">{extraction.visualGuidelines.spacing.componentSpacing}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Layout */}
                {extraction.visualGuidelines.layout && Object.values(extraction.visualGuidelines.layout).some(v => v && (Array.isArray(v) ? v.length > 0 : true)) && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800 mb-2">📱 Layout</p>
                    <div className="space-y-2">
                      {extraction.visualGuidelines.layout.columns && (
                        <p className="text-sm"><span className="text-gray-500">Grid:</span> {extraction.visualGuidelines.layout.columns}</p>
                      )}
                      {extraction.visualGuidelines.layout.maxWidth && (
                        <p className="text-sm"><span className="text-gray-500">Max Width:</span> {extraction.visualGuidelines.layout.maxWidth}</p>
                      )}
                      {(extraction.visualGuidelines.layout.breakpoints?.length ?? 0) > 0 && (
                        <div>
                          <span className="text-sm text-gray-500">Breakpoints:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {extraction.visualGuidelines.layout.breakpoints?.map((bp, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">{bp}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(extraction.visualGuidelines.layout.principles?.length ?? 0) > 0 && (
                        <div>
                          <span className="text-sm text-gray-500">Principles:</span>
                          <ul className="text-sm mt-1 space-y-1">
                            {extraction.visualGuidelines.layout.principles?.map((p, i) => (
                              <li key={i} className="text-gray-700">• {p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Logo */}
                {extraction.visualGuidelines.logo && (
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-2">🏷️ Logo Usage</p>
                    <div className="space-y-1 text-sm">
                      {extraction.visualGuidelines.logo.clearSpace && (
                        <p><span className="text-gray-500">Clear Space:</span> {extraction.visualGuidelines.logo.clearSpace}</p>
                      )}
                      {extraction.visualGuidelines.logo.minSize && (
                        <p><span className="text-gray-500">Min Size:</span> {extraction.visualGuidelines.logo.minSize}</p>
                      )}
                      {extraction.visualGuidelines.logo.donts?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {extraction.visualGuidelines.logo.donts.map((d, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">✗ {d}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </GuidelineSection>
            )}

            {/* Messaging */}
            {extraction.messaging && (
              <GuidelineSection title="Messaging" icon="💬">
                {extraction.messaging.pillars?.length ? (
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-700 mb-1">Pillars:</p>
                    <div className="flex flex-wrap gap-2">
                      {extraction.messaging.pillars.map((p, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {extraction.messaging.tagline && (
                  <p className="text-sm"><strong>Tagline:</strong> "{extraction.messaging.tagline}"</p>
                )}
                {extraction.messaging.valueProposition && (
                  <p className="text-sm"><strong>Value Prop:</strong> {extraction.messaging.valueProposition}</p>
                )}
              </GuidelineSection>
            )}

            {/* Extracted Logo Images */}
            {(extraction.extractedImages?.length || extraction.logoAssets?.extractedImages?.length) ? (
              <GuidelineSection title="Extracted Logo Images" icon="🖼️">
                <p className="text-sm text-gray-600 mb-4">
                  The following logos were automatically extracted from your brand guidelines document.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {(extraction.extractedImages || extraction.logoAssets?.extractedImages || []).map((img, i) => (
                    <ExtractedImageCard key={i} image={img} index={i} />
                  ))}
                </div>
              </GuidelineSection>
            ) : null}
          </div>

          {/* Approve Button */}
          <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
            <p className="text-base text-gray-600">
              Review the extracted guidelines above, then approve to activate.
            </p>
            <button
              onClick={handleApprove}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-lg shadow-green-600/30"
            >
              ✓ Approve & Activate
            </button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

function GuidelineSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-lg">
        <span className="text-2xl">{icon}</span> {title}
      </h4>
      <div className="text-gray-700">
        {children}
      </div>
    </div>
  );
}

function ExtractedImageCard({ image, index }: { image: ExtractedImage; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleDownload = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logo-${index + 1}-page-${image.pageNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };
  
  return (
    <div className="relative group">
      <div 
        className={`border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
          image.isMainLogo ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        }`}
        onClick={() => setIsExpanded(true)}
      >
        {image.isMainLogo && (
          <div className="absolute top-1 left-1 z-10 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full font-medium">
            Main Logo
          </div>
        )}
        <div className="relative w-full aspect-square bg-gray-100 flex items-center justify-center p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.description || `Extracted logo ${index + 1}`}
            className="max-w-full max-h-full object-contain"
          />
        </div>
        <div className="p-2 border-t bg-gray-50">
          <p className="text-xs text-gray-500 truncate" title={image.description}>
            Page {image.pageNumber}
          </p>
          {image.width && image.height && (
            <p className="text-xs text-gray-400">
              {image.width} × {image.height}px
            </p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className="absolute bottom-2 right-2 p-1.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
          title="Download logo"
        >
          <Download className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      
      {/* Expanded Modal */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-2xl max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {image.isMainLogo ? 'Main Logo' : `Logo ${index + 1}`}
                </h3>
                <p className="text-sm text-gray-500">From page {image.pageNumber}</p>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.description || `Extracted logo ${index + 1}`}
                className="max-w-full max-h-[50vh] object-contain"
              />
            </div>
            {image.description && (
              <p className="mt-4 text-sm text-gray-600">{image.description}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
              <a
                href={image.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Open in New Tab
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ColorSwatch({ color, label }: { color: string | { name?: string; hex?: string; rgb?: string; cmyk?: string } | any; label: string }) {
  // Handle both string and object color formats
  let colorValue = '';
  let colorName = '';
  
  // Debug: log the color to see what format it's in
  if (process.env.NODE_ENV === 'development') {
    console.log(`ColorSwatch ${label}:`, color, typeof color);
  }
  
  if (typeof color === 'string') {
    colorValue = color;
  } else if (typeof color === 'object' && color !== null) {
    colorValue = color.hex || color.rgb || color.value || '';
    colorName = color.name || color.description || '';
  }
  
  // Extract hex code from strings like "#063EF8 (ACT Blue) - CMYK: 90/70/0/0, RGB: 6/62/248"
  let normalizedColor = colorValue.trim();
  const hexMatch = normalizedColor.match(/#[0-9A-Fa-f]{6}/);
  if (hexMatch) {
    normalizedColor = hexMatch[0];
    // Extract color name if present (text between hex and dash or in parentheses)
    const nameMatch = colorValue.match(/#[0-9A-Fa-f]{6}\s*\(([^)]+)\)/);
    if (nameMatch && !colorName) {
      colorName = nameMatch[1];
    }
  } else if (normalizedColor && !normalizedColor.startsWith('#')) {
    normalizedColor = '#' + normalizedColor;
  }
  
  // Pad incomplete hex codes (e.g., #C4E9F -> #C4E9FF)
  if (normalizedColor.startsWith('#') && normalizedColor.length < 7) {
    normalizedColor = normalizedColor.padEnd(7, normalizedColor.charAt(normalizedColor.length - 1));
  }
  
  const isValidColor = /^#[0-9A-Fa-f]{6}$/.test(normalizedColor);
  
  return (
    <div className="text-center">
      <div 
        className="w-10 h-10 rounded border border-gray-300"
        style={{ backgroundColor: isValidColor ? normalizedColor : '#ccc' }}
      />
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      {colorName && <p className="text-xs text-gray-600">{colorName}</p>}
      <p className="text-xs font-mono text-gray-400">{normalizedColor || 'No color'}</p>
      {!isValidColor && (
        <p className="text-xs text-red-500">
          {colorValue ? `Invalid: ${JSON.stringify(color)}` : 'Not extracted'}
        </p>
      )}
    </div>
  );
}
