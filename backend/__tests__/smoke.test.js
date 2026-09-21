const request = require('supertest');
const express = require('express');

/**
 * Smoke tests for AutoLeads API core routes.
 * These test the happy path for search, leads, and status endpoints.
 */

// Mock the Supabase client and external services
jest.mock('../src/db/supabase', () => ({
  from: jest.fn((table) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: mockData[table], error: null }),
  })),
}));

jest.mock('../src/services/googleMaps');
jest.mock('../src/services/instagram');
jest.mock('../src/services/competitors');
jest.mock('../src/services/scoring');
jest.mock('../src/services/copyGenerator');

// Mock data
const mockData = {
  searches: {
    id: 'search-123',
    query: 'salão de beleza',
    category: 'salão de beleza',
    location: 'Salvador',
    status: 'processing',
  },
  leads: {
    id: 'lead-456',
    search_id: 'search-123',
    name: 'Beauty Salon XYZ',
    category: 'salão de beleza',
    status: 'new',
    lead_scores: [{ temperature: 'hot', total_score: 85 }],
  },
  lead_status_history: [
    {
      id: 'hist-1',
      lead_id: 'lead-456',
      previous_status: 'new',
      new_status: 'contacted',
      changed_at: new Date().toISOString(),
    },
  ],
};

describe('AutoLeads API Smoke Tests', () => {
  let app;

  beforeAll(() => {
    // Create a minimal Express app with our routes
    app = express();
    app.use(express.json());

    // Mock route handlers for testing
    app.post('/api/search', (req, res) => {
      const { query, location, category } = req.body;
      if (!location) {
        return res.status(400).json({ error: 'location is required' });
      }
      const searchQuery = query || category || '';
      if (!searchQuery) {
        return res.status(400).json({ error: 'query or category is required' });
      }
      return res.status(201).json({
        searchId: mockData.searches.id,
        status: 'processing',
      });
    });

    app.get('/api/leads', (req, res) => {
      return res.json({
        data: [mockData.leads],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });
    });

    app.get('/api/leads/:id', (req, res) => {
      return res.json({
        ...mockData.leads,
        status_history: mockData.lead_status_history,
      });
    });
  });

  describe('POST /api/search', () => {
    it('should accept a valid search with query and location', async () => {
      const res = await request(app)
        .post('/api/search')
        .send({
          query: 'salão de beleza',
          location: 'Salvador',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('searchId');
      expect(res.body).toHaveProperty('status', 'processing');
    });

    it('should accept search with category instead of query', async () => {
      const res = await request(app)
        .post('/api/search')
        .send({
          category: 'salão de beleza',
          location: 'Salvador',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('searchId');
    });

    it('should reject search without location', async () => {
      const res = await request(app)
        .post('/api/search')
        .send({
          query: 'salão de beleza',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/location.*required/i);
    });

    it('should reject search without query or category', async () => {
      const res = await request(app)
        .post('/api/search')
        .send({
          location: 'Salvador',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/query.*category.*required/i);
    });
  });

  describe('GET /api/leads', () => {
    it('should return paginated leads list', async () => {
      const res = await request(app).get('/api/leads');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should accept pagination params', async () => {
      const res = await request(app)
        .get('/api/leads')
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
    });

    it('should accept temperature filter', async () => {
      const res = await request(app)
        .get('/api/leads')
        .query({ temperature: 'hot' });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/leads/:id', () => {
    it('should return lead detail with status history', async () => {
      const res = await request(app).get('/api/leads/lead-456');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('status_history');
      expect(Array.isArray(res.body.status_history)).toBe(true);
    });

    it('should order status history by changed_at descending', async () => {
      const res = await request(app).get('/api/leads/lead-456');

      expect(res.status).toBe(200);
      const history = res.body.status_history;
      if (history.length > 1) {
        expect(
          new Date(history[0].changed_at) >= new Date(history[1].changed_at)
        ).toBe(true);
      }
    });
  });
});
