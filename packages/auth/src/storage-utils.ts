/**
 * Supabase Storage utilities with brand isolation
 * Files are organized as: {brand_id}/{category}/{filename}
 */

import { createClient } from '@supabase/supabase-js';

export type StorageBucket = 
  | 'brand-documents'
  | 'brand-images'
  | 'brand-assets'
  | 'training-data'
  | 'generated-content';

export type FileCategory =
  | 'documents'
  | 'images'
  | 'logos'
  | 'fonts'
  | 'training'
  | 'generated'
  | 'exports'
  | 'temp';

/**
 * Upload a file to brand-specific storage
 */
export async function uploadBrandFile(
  supabase: ReturnType<typeof createClient>,
  options: {
    bucket: StorageBucket;
    brandId: string;
    category: FileCategory;
    file: File;
    fileName?: string;
  }
): Promise<{ path: string; url: string | null; error: Error | null }> {
  const { bucket, brandId, category, file, fileName } = options;

  try {
    // Generate file path: {brand_id}/{category}/{filename}
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = fileName || `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${brandId}/${category}/${uniqueFileName}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { path: '', url: null, error };
    }

    // Get public URL if bucket is public
    let publicUrl: string | null = null;
    if (bucket === 'brand-images') {
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      publicUrl = urlData.publicUrl;
    }

    return { path: data.path, url: publicUrl, error: null };
  } catch (error) {
    return { 
      path: '', 
      url: null, 
      error: error instanceof Error ? error : new Error('Upload failed') 
    };
  }
}

/**
 * Upload multiple files
 */
export async function uploadBrandFiles(
  supabase: ReturnType<typeof createClient>,
  options: {
    bucket: StorageBucket;
    brandId: string;
    category: FileCategory;
    files: File[];
  }
): Promise<Array<{ path: string; url: string | null; error: Error | null }>> {
  const { bucket, brandId, category, files } = options;

  const uploads = files.map(file =>
    uploadBrandFile(supabase, { bucket, brandId, category, file })
  );

  return Promise.all(uploads);
}

/**
 * Get signed URL for private file
 */
export async function getSignedUrl(
  supabase: ReturnType<typeof createClient>,
  bucket: StorageBucket,
  filePath: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      return { url: null, error };
    }

    return { url: data.signedUrl, error: null };
  } catch (error) {
    return { 
      url: null, 
      error: error instanceof Error ? error : new Error('Failed to get signed URL') 
    };
  }
}

/**
 * Download a file
 */
export async function downloadBrandFile(
  supabase: ReturnType<typeof createClient>,
  bucket: StorageBucket,
  filePath: string
): Promise<{ data: Blob | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Download failed') 
    };
  }
}

/**
 * List files in a brand's folder
 */
export async function listBrandFiles(
  supabase: ReturnType<typeof createClient>,
  bucket: StorageBucket,
  brandId: string,
  category?: FileCategory
): Promise<{ files: any[]; error: Error | null }> {
  try {
    const path = category ? `${brandId}/${category}` : brandId;

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      return { files: [], error };
    }

    return { files: data || [], error: null };
  } catch (error) {
    return { 
      files: [], 
      error: error instanceof Error ? error : new Error('List failed') 
    };
  }
}

/**
 * Delete a file
 */
export async function deleteBrandFile(
  supabase: ReturnType<typeof createClient>,
  bucket: StorageBucket,
  filePath: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Delete failed') 
    };
  }
}

/**
 * Delete multiple files
 */
export async function deleteBrandFiles(
  supabase: ReturnType<typeof createClient>,
  bucket: StorageBucket,
  filePaths: string[]
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(filePaths);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Delete failed') 
    };
  }
}

/**
 * Get file metadata
 */
export async function getBrandFileMetadata(
  supabase: ReturnType<typeof createClient>,
  bucket: StorageBucket,
  filePath: string
): Promise<{ metadata: any | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(filePath.split('/').slice(0, -1).join('/'), {
        limit: 1,
        search: filePath.split('/').pop(),
      });

    if (error || !data || data.length === 0) {
      return { metadata: null, error: error || new Error('File not found') };
    }

    return { metadata: data[0], error: null };
  } catch (error) {
    return { 
      metadata: null, 
      error: error instanceof Error ? error : new Error('Failed to get metadata') 
    };
  }
}

/**
 * Move/rename a file
 */
export async function moveBrandFile(
  supabase: ReturnType<typeof createClient>,
  bucket: StorageBucket,
  fromPath: string,
  toPath: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .move(fromPath, toPath);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Move failed') 
    };
  }
}

/**
 * Get storage usage for a brand
 */
export async function getBrandStorageUsage(
  supabase: ReturnType<typeof createClient>,
  brandId: string
): Promise<{ sizeBytes: number; fileCount: number; error: Error | null }> {
  try {
    const buckets: StorageBucket[] = [
      'brand-documents',
      'brand-images',
      'brand-assets',
      'training-data',
      'generated-content',
    ];

    let totalSize = 0;
    let totalFiles = 0;

    for (const bucket of buckets) {
      const { files } = await listBrandFiles(supabase, bucket, brandId);
      
      files.forEach(file => {
        totalSize += file.metadata?.size || 0;
        totalFiles++;
      });
    }

    return { sizeBytes: totalSize, fileCount: totalFiles, error: null };
  } catch (error) {
    return { 
      sizeBytes: 0, 
      fileCount: 0, 
      error: error instanceof Error ? error : new Error('Failed to calculate usage') 
    };
  }
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  }
): { valid: boolean; error?: string } {
  const { maxSizeMB = 50, allowedTypes } = options;

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB` };
  }

  // Check file type
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not allowed` };
  }

  return { valid: true };
}
