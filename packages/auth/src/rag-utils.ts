// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embeddings for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Search for similar documents in a brand's knowledge base
 */
export async function searchBrandDocuments(
  supabase: ReturnType<typeof createClient>,
  brandId: string,
  query: string,
  matchThreshold: number = 0.7,
  matchCount: number = 5
) {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Search using the match_brand_documents function
  const { data, error } = await supabase.rpc('match_brand_documents', {
    query_embedding: queryEmbedding,
    query_brand_id: brandId,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error('Error searching documents:', error);
    throw error;
  }

  return data;
}

/**
 * Chunk text into smaller pieces for embedding
 */
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
  }

  return chunks;
}

/**
 * Process a document: chunk it and create embeddings
 */
export async function processDocument(
  supabase: ReturnType<typeof createClient>,
  documentId: string,
  brandId: string,
  content: string
) {
  // Chunk the document
  const chunks = chunkText(content);

  // Generate embeddings for each chunk
  const embeddings = await Promise.all(
    chunks.map(async (chunk, index) => {
      const embedding = await generateEmbedding(chunk);

      return {
        brand_id: brandId,
        document_id: documentId,
        chunk_index: index,
        content: chunk,
        content_length: chunk.length,
        embedding,
      };
    })
  );

  // Insert embeddings into database
  const { error } = await supabase
    .from('document_embeddings')
    .insert(embeddings);

  if (error) {
    console.error('Error inserting embeddings:', error);
    throw error;
  }

  // Update document status
  await supabase
    .from('brand_documents')
    .update({
      is_indexed: true,
      chunk_count: chunks.length,
      status: 'processed',
      processed_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  return { chunkCount: chunks.length };
}
