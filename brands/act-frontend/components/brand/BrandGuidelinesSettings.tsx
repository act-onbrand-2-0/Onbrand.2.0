'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Edit2, Save, X, Check } from 'lucide-react';

interface BrandGuidelinesSettingsProps {
  guidelines: any;
  brandId: string;
  onUpdate?: (updatedGuidelines: any) => void;
}

interface SectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function ExpandableSection({ title, icon, children, defaultExpanded = false }: SectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {isExpanded && (
        <div className="p-4 space-y-3 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}

interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (newValue: string) => void;
  multiline?: boolean;
}

function EditableField({ label, value, onSave, multiline = false }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {multiline ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        ) : (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1"
          >
            <Save className="h-3 w-3" />
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-sm text-gray-900 mt-1">{value || 'Not set'}</p>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 rounded transition-all"
        >
          <Edit2 className="h-4 w-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
}

interface ColorSwatchProps {
  color: string | { name?: string; hex?: string; rgb?: string; cmyk?: string } | any;
  label: string;
}

function ColorSwatch({ color, label }: ColorSwatchProps) {
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
    <div className="flex items-center gap-2">
      <div
        className="h-10 w-10 rounded-lg border-2 border-gray-200 shadow-sm"
        style={{ backgroundColor: isValidColor ? normalizedColor : '#ccc' }}
      />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-mono font-medium text-gray-900">
          {colorName && <span className="text-gray-600">{colorName}: </span>}
          {normalizedColor || 'No color'}
        </p>
        {!isValidColor && (
          <p className="text-xs text-red-500">
            {colorValue ? `Invalid: ${JSON.stringify(color)}` : 'Not extracted'}
          </p>
        )}
      </div>
    </div>
  );
}

export function BrandGuidelinesSettings({ guidelines, brandId, onUpdate }: BrandGuidelinesSettingsProps) {
  const [localGuidelines, setLocalGuidelines] = useState(guidelines);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced save
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (saveStatus === 'saving') {
      saveTimeoutRef.current = setTimeout(() => {
        onUpdate?.(localGuidelines);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 1000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [localGuidelines, saveStatus, onUpdate]);

  const handleFieldUpdate = (path: string[], value: any) => {
    const updated = { ...localGuidelines };
    let current: any = updated;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    setLocalGuidelines(updated);
    setSaveStatus('saving');
  };

  return (
    <div className="space-y-4">
      {/* Save Status Indicator */}
      {saveStatus !== 'idle' && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
          saveStatus === 'saving' 
            ? 'bg-blue-50 text-blue-700' 
            : 'bg-green-50 text-green-700'
        }`}>
          {saveStatus === 'saving' ? (
            <>
              <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Saving changes...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Changes saved
            </>
          )}
        </div>
      )}

      {/* Voice & Personality */}
      {localGuidelines.voice && (
        <ExpandableSection title="Voice & Personality" icon="🎭" defaultExpanded>
          <div className="space-y-4">
            {localGuidelines.voice.personality?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Personality Traits</p>
                <div className="flex flex-wrap gap-2">
                  {localGuidelines.voice.personality.map((trait: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {localGuidelines.voice.tone && (
              <EditableField
                label="Tone"
                value={localGuidelines.voice.tone}
                onSave={(value) => handleFieldUpdate(['voice', 'tone'], value)}
              />
            )}
            
            {localGuidelines.voice.writeAs && (
              <EditableField
                label="Write As"
                value={localGuidelines.voice.writeAs}
                onSave={(value) => handleFieldUpdate(['voice', 'writeAs'], value)}
                multiline
              />
            )}
            
            {localGuidelines.voice.audienceLevel && (
              <EditableField
                label="Audience Level"
                value={localGuidelines.voice.audienceLevel}
                onSave={(value) => handleFieldUpdate(['voice', 'audienceLevel'], value)}
              />
            )}
          </div>
        </ExpandableSection>
      )}

      {/* Copy Guidelines */}
      {localGuidelines.copyGuidelines && (
        <ExpandableSection title="Copy Guidelines" icon="✍️">
          <div className="space-y-4">
            {localGuidelines.copyGuidelines.dos?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-green-700 mb-2">✅ Do's</p>
                <ul className="space-y-2">
                  {localGuidelines.copyGuidelines.dos.map((item: any, i: number) => (
                    <li key={i} className="text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                      <p className="font-medium text-gray-900">{item.rule}</p>
                      {item.example && (
                        <p className="text-gray-600 text-xs mt-1">Example: "{item.example}"</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {localGuidelines.copyGuidelines.donts?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-700 mb-2">❌ Don'ts</p>
                <ul className="space-y-2">
                  {localGuidelines.copyGuidelines.donts.map((item: any, i: number) => (
                    <li key={i} className="text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                      <p className="font-medium text-gray-900">{item.rule}</p>
                      {item.badExample && item.goodExample && (
                        <p className="text-gray-600 text-xs mt-1">
                          <span className="line-through text-red-600">"{item.badExample}"</span>
                          {' → '}
                          <span className="text-green-600">"{item.goodExample}"</span>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {localGuidelines.copyGuidelines.wordChoices?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Word Choices</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {localGuidelines.copyGuidelines.wordChoices.map((item: any, i: number) => (
                    <div key={i} className="bg-gray-50 p-2 rounded-lg text-sm border border-gray-200">
                      <span className="text-red-600 line-through">{item.avoid}</span>
                      {' → '}
                      <span className="text-green-600 font-medium">{item.prefer}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {localGuidelines.copyGuidelines.phrases?.required?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Required Phrases</p>
                <div className="flex flex-wrap gap-2">
                  {localGuidelines.copyGuidelines.phrases.required.map((phrase: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {localGuidelines.copyGuidelines.phrases?.banned?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Banned Phrases</p>
                <div className="flex flex-wrap gap-2">
                  {localGuidelines.copyGuidelines.phrases.banned.map((phrase: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs line-through">
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ExpandableSection>
      )}

      {/* Visual Guidelines */}
      {localGuidelines.visualGuidelines && (
        <ExpandableSection title="Visual Guidelines" icon="🎨">
          <div className="space-y-6">
            {/* Colors */}
            {localGuidelines.visualGuidelines.colors && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">Colors</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {localGuidelines.visualGuidelines.colors.primary && (
                    <ColorSwatch 
                      color={localGuidelines.visualGuidelines.colors.primary} 
                      label="Primary" 
                    />
                  )}
                  {localGuidelines.visualGuidelines.colors.secondary && (
                    <ColorSwatch 
                      color={localGuidelines.visualGuidelines.colors.secondary} 
                      label="Secondary" 
                    />
                  )}
                  {localGuidelines.visualGuidelines.colors.accent && (
                    <ColorSwatch 
                      color={localGuidelines.visualGuidelines.colors.accent} 
                      label="Accent" 
                    />
                  )}
                  {localGuidelines.visualGuidelines.colors.neutrals?.map((color: string, i: number) => (
                    <ColorSwatch 
                      key={i} 
                      color={color} 
                      label={`Neutral ${i + 1}`} 
                    />
                  ))}
                </div>
                {localGuidelines.visualGuidelines.colors.usage && (
                  <p className="text-xs text-gray-500 mt-3 p-3 bg-gray-50 rounded-lg">
                    {localGuidelines.visualGuidelines.colors.usage}
                  </p>
                )}
              </div>
            )}

            {/* Typography */}
            {localGuidelines.visualGuidelines.typography && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">Typography</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Headings</p>
                    <p className="font-semibold text-gray-900 text-lg">
                      {localGuidelines.visualGuidelines.typography.headings?.family || 'Not specified'}
                    </p>
                    {localGuidelines.visualGuidelines.typography.headings?.weights?.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Weights: {localGuidelines.visualGuidelines.typography.headings.weights.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Body</p>
                    <p className="font-medium text-gray-900">
                      {localGuidelines.visualGuidelines.typography.body?.family || 'Not specified'}
                    </p>
                    {localGuidelines.visualGuidelines.typography.body?.weights?.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Weights: {localGuidelines.visualGuidelines.typography.body.weights.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Spacing */}
            {localGuidelines.visualGuidelines.spacing && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">Spacing</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {localGuidelines.visualGuidelines.spacing.gridSystem && (
                    <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-100">
                      <p className="text-xs text-blue-600 font-medium">Grid System</p>
                      <p className="text-sm font-semibold text-blue-900 mt-1">
                        {localGuidelines.visualGuidelines.spacing.gridSystem}
                      </p>
                    </div>
                  )}
                  {localGuidelines.visualGuidelines.spacing.margins && (
                    <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-100">
                      <p className="text-xs text-blue-600 font-medium">Margins</p>
                      <p className="text-sm font-semibold text-blue-900 mt-1">
                        {localGuidelines.visualGuidelines.spacing.margins}
                      </p>
                    </div>
                  )}
                  {localGuidelines.visualGuidelines.spacing.padding && (
                    <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-100">
                      <p className="text-xs text-blue-600 font-medium">Padding</p>
                      <p className="text-sm font-semibold text-blue-900 mt-1">
                        {localGuidelines.visualGuidelines.spacing.padding}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Logo */}
            {localGuidelines.visualGuidelines.logo && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">Logo Guidelines</p>
                <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {localGuidelines.visualGuidelines.logo.clearSpace && (
                    <p className="text-sm">
                      <span className="text-gray-600">Clear Space:</span>{' '}
                      <span className="font-medium">{localGuidelines.visualGuidelines.logo.clearSpace}</span>
                    </p>
                  )}
                  {localGuidelines.visualGuidelines.logo.minSize && (
                    <p className="text-sm">
                      <span className="text-gray-600">Min Size:</span>{' '}
                      <span className="font-medium">{localGuidelines.visualGuidelines.logo.minSize}</span>
                    </p>
                  )}
                  {localGuidelines.visualGuidelines.logo.donts?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-red-600 font-medium mb-2">Don'ts:</p>
                      <div className="flex flex-wrap gap-2">
                        {localGuidelines.visualGuidelines.logo.donts.map((item: string, i: number) => (
                          <span key={i} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                            ✗ {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ExpandableSection>
      )}

      {/* Messaging */}
      {localGuidelines.messaging && (
        <ExpandableSection title="Messaging" icon="💬">
          <div className="space-y-4">
            {localGuidelines.messaging.pillars?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Brand Pillars</p>
                <div className="flex flex-wrap gap-2">
                  {localGuidelines.messaging.pillars.map((pillar: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                      {pillar}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {localGuidelines.messaging.valueProposition && (
              <EditableField
                label="Value Proposition"
                value={localGuidelines.messaging.valueProposition}
                onSave={(value) => handleFieldUpdate(['messaging', 'valueProposition'], value)}
                multiline
              />
            )}
            
            {localGuidelines.messaging.tagline && (
              <EditableField
                label="Tagline"
                value={localGuidelines.messaging.tagline}
                onSave={(value) => handleFieldUpdate(['messaging', 'tagline'], value)}
              />
            )}
            
            {localGuidelines.messaging.boilerplate && (
              <EditableField
                label="Boilerplate"
                value={localGuidelines.messaging.boilerplate}
                onSave={(value) => handleFieldUpdate(['messaging', 'boilerplate'], value)}
                multiline
              />
            )}
          </div>
        </ExpandableSection>
      )}
    </div>
  );
}
