import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db/database.js';
import { generateEmbedding, ragChat, analyzeResearchGaps } from '../services/gemini.js';

const router = express.Router();
router.use(authenticate);

// Schema for matrix request
const matrixSchema = z.object({
  source_ids: z.array(z.string().uuid()).min(1, 'At least one source required').max(10),
});

// Schema for chat request
const chatSchema = z.object({
  question: z.string().min(3, 'Question must be at least 3 characters').max(1000),
  source_ids: z.array(z.string().uuid()).optional(),
  top_k: z.number().int().min(1).max(20).default(8),
});

/**
 * POST /api/v1/research/matrix
 * Returns comparative metadata table for selected sources
 */
router.post('/matrix', async (req, res) => {
  const validation = matrixSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.error.errors,
    });
  }

  const { source_ids } = validation.data;

  try {
    // Fetch sources belonging to user
    const result = await query(
      `SELECT id, title, source_type, parsed_metadata, storage_url, created_at
       FROM uploaded_sources
       WHERE id = ANY($1) AND user_id = $2
       ORDER BY created_at DESC`,
      [source_ids, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No sources found.' });
    }

    // Format comparison matrix
    const matrix = result.rows.map(source => {
      const meta = source.parsed_metadata || {};
      return {
        id: source.id,
        title: source.title,
        source_type: source.source_type,
        methodology: meta.methodology || 'Not specified',
        datasets: meta.datasets || 'Not specified',
        results: meta.results || 'Not specified',
        limitations: meta.limitations || 'Not specified',
        keywords: meta.keywords || [],
        research_type: meta.research_type || 'unknown',
        year: meta.year || null,
        authors: meta.authors || null,
        abstract_summary: meta.abstract_summary || '',
        created_at: source.created_at,
      };
    });

    res.json({
      success: true,
      data: {
        matrix,
        total: matrix.length,
        comparison_fields: ['methodology', 'datasets', 'results', 'limitations'],
      },
    });
  } catch (error) {
    console.error('Matrix error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to generate research matrix.' });
  }
});

/**
 * POST /api/v1/research/chat
 * RAG-powered chat with cosine similarity vector search and inline citations
 */
router.post('/chat', async (req, res) => {
  const validation = chatSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.error.errors,
    });
  }

  const { question, source_ids, top_k } = validation.data;

  try {
    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(question);
    const embeddingStr = `[${questionEmbedding.join(',')}]`;

    let vectorQuery;
    let queryParams;

    if (source_ids && source_ids.length > 0) {
      // Search within specific sources
      vectorQuery = `
        SELECT
          se.chunk_content,
          se.page_or_timestamp,
          us.title as source_title,
          us.id as source_id,
          1 - (se.embedding <-> $1::vector) as similarity_score
        FROM source_embeddings se
        JOIN uploaded_sources us ON us.id = se.source_id
        WHERE us.user_id = $2
          AND se.source_id = ANY($3)
        ORDER BY se.embedding <-> $1::vector
        LIMIT $4
      `;
      queryParams = [embeddingStr, req.user.id, source_ids, top_k];
    } else {
      // Search across all user's sources
      vectorQuery = `
        SELECT
          se.chunk_content,
          se.page_or_timestamp,
          us.title as source_title,
          us.id as source_id,
          1 - (se.embedding <-> $1::vector) as similarity_score
        FROM source_embeddings se
        JOIN uploaded_sources us ON us.id = se.source_id
        WHERE us.user_id = $2
        ORDER BY se.embedding <-> $1::vector
        LIMIT $3
      `;
      queryParams = [embeddingStr, req.user.id, top_k];
    }

    let chunksResult;
    try {
      chunksResult = await query(vectorQuery, queryParams);
    } catch (vecErr) {
      console.warn('Vector search notice, using content chunk retrieval:', vecErr.message?.slice(0, 100));
      const fallbackQuery = (source_ids && source_ids.length > 0)
        ? `SELECT se.chunk_content, se.page_or_timestamp, us.title as source_title, us.id as source_id, 0.85 as similarity_score
           FROM source_embeddings se
           JOIN uploaded_sources us ON us.id = se.source_id
           WHERE us.user_id = $1 AND se.source_id = ANY($2)
           LIMIT $3`
        : `SELECT se.chunk_content, se.page_or_timestamp, us.title as source_title, us.id as source_id, 0.85 as similarity_score
           FROM source_embeddings se
           JOIN uploaded_sources us ON us.id = se.source_id
           WHERE us.user_id = $1
           LIMIT $2`;
      const fallbackParams = (source_ids && source_ids.length > 0)
        ? [req.user.id, source_ids, top_k]
        : [req.user.id, top_k];
      chunksResult = await query(fallbackQuery, fallbackParams);
    }

    if (chunksResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          answer: 'No relevant sources found. Please upload research materials first using the dashboard.',
          citations: [],
          chunks_retrieved: 0,
        },
      });
    }

    // Generate RAG response with citations
    const answer = await ragChat(question, chunksResult.rows, '');

    // Extract unique sources cited
    const citedSources = [...new Map(
      chunksResult.rows.map(r => [r.source_id, { id: r.source_id, title: r.source_title }])
    ).values()];

    res.json({
      success: true,
      data: {
        answer,
        citations: citedSources,
        chunks_retrieved: chunksResult.rows.length,
        context_chunks: chunksResult.rows.map(r => ({
          content: r.chunk_content,
          source_title: r.source_title,
          page_or_timestamp: r.page_or_timestamp,
          similarity_score: parseFloat(r.similarity_score || 0).toFixed(4),
        })),
      },
    });
  } catch (error) {
    console.error('RAG chat error:', error.message);

    // Handle vector extension not available
    if (error.message.includes('operator') || error.message.includes('vector')) {
      return res.status(503).json({
        success: false,
        message: 'Vector search requires pgvector extension. Please ensure your PostgreSQL has pgvector installed.',
      });
    }

    res.status(500).json({ success: false, message: `Chat failed: ${error.message}` });
  }
});

/**
 * POST /api/v1/research/gaps
 * Analyze research gaps from limitations across uploaded papers
 */
router.post('/gaps', async (req, res) => {
  const sourceIdsSchema = z.object({
    source_ids: z.array(z.string().uuid()).optional(),
  });

  const validation = sourceIdsSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: validation.error.errors });
  }

  const { source_ids } = validation.data;

  try {
    let sourcesQuery;
    let sourcesParams;

    if (source_ids && source_ids.length > 0) {
      sourcesQuery = `SELECT id, title, parsed_metadata FROM uploaded_sources WHERE user_id = $1 AND id = ANY($2)`;
      sourcesParams = [req.user.id, source_ids];
    } else {
      sourcesQuery = `SELECT id, title, parsed_metadata FROM uploaded_sources WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`;
      sourcesParams = [req.user.id];
    }

    const sourcesResult = await query(sourcesQuery, sourcesParams);

    if (sourcesResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No sources found for gap analysis.' });
    }

    // Prepare limitations data
    const limitationsData = sourcesResult.rows
      .filter(s => s.parsed_metadata && s.parsed_metadata.limitations)
      .map(s => ({
        title: s.title,
        limitations: s.parsed_metadata.limitations,
        methodology: s.parsed_metadata.methodology || '',
        results: s.parsed_metadata.results || '',
      }));

    if (limitationsData.length === 0) {
      return res.json({
        success: true,
        data: {
          gaps: [],
          message: 'No limitations data found in uploaded sources. Upload research papers to enable gap analysis.',
        },
      });
    }

    const gaps = await analyzeResearchGaps(limitationsData);

    res.json({
      success: true,
      data: {
        gaps,
        sources_analyzed: limitationsData.length,
        total_sources: sourcesResult.rows.length,
      },
    });
  } catch (error) {
    console.error('Gap analysis error:', error.message);
    res.status(500).json({ success: false, message: `Gap analysis failed: ${error.message}` });
  }
});

export default router;
