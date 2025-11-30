/**
 * Tests for RAG Client
 */

import { jest } from '@jest/globals';
import { pushToRAG, updateRAGMetadata, deleteRAGMetadata, searchRAG } from '../integration/clients/ragClient.js';
import axios from 'axios';

jest.mock('axios');

describe('RAG Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RAG_API_URL = 'https://rag-service.example.com';
  });

  afterEach(() => {
    delete process.env.RAG_API_URL;
  });

  describe('pushToRAG', () => {
    it('should push course metadata to RAG service', async () => {
      const mockCourse = {
        id: 'course-1',
        course_name: 'Test Course',
        course_description: 'Test Description',
        level: 'beginner',
        status: 'active'
      };

      const mockTopics = [{ id: 'topic-1', topic_name: 'Topic 1' }];
      const mockModules = [{ id: 'module-1', module_name: 'Module 1' }];
      const mockLessons = [
        {
          id: 'lesson-1',
          lesson_name: 'Lesson 1',
          skills: ['skill1', 'skill2']
        }
      ];

      axios.post = jest.fn().mockResolvedValue({
        data: {
          id: 'rag-id-123',
          rag_id: 'rag-id-123'
        }
      });

      const result = await pushToRAG(mockCourse, mockTopics, mockModules, mockLessons);

      expect(result.success).toBe(true);
      expect(result.ragId).toBe('rag-id-123');
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/metadata'),
        expect.objectContaining({
          id: 'course-1',
          title: 'Test Course',
          type: 'course'
        }),
        expect.any(Object)
      );
    });

    it('should extract skills from lessons', async () => {
      const mockCourse = { id: 'course-1', course_name: 'Test' };
      const mockLessons = [
        {
          id: 'lesson-1',
          skills: ['skill1'],
          micro_skills: ['micro1'],
          nano_skills: ['nano1']
        }
      ];

      axios.post = jest.fn().mockResolvedValue({ data: { id: 'rag-1' } });

      await pushToRAG(mockCourse, [], [], mockLessons);

      const callArgs = axios.post.mock.calls[0];
      const payload = callArgs[1];
      expect(payload.metadata.skills).toContain('skill1');
      expect(payload.metadata.skills).toContain('micro1');
      expect(payload.metadata.skills).toContain('nano1');
    });

    it('should handle API errors gracefully', async () => {
      axios.post = jest.fn().mockRejectedValue(new Error('RAG service unavailable'));

      const result = await pushToRAG(
        { id: 'course-1', course_name: 'Test' },
        [],
        [],
        []
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('RAG service unavailable');
    });
  });

  describe('updateRAGMetadata', () => {
    it('should update existing metadata', async () => {
      axios.put = jest.fn().mockResolvedValue({
        data: { id: 'rag-id-123' }
      });

      const result = await updateRAGMetadata(
        { id: 'course-1', course_name: 'Updated Course' },
        [],
        [],
        []
      );

      expect(result.success).toBe(true);
      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/metadata/course-1'),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('deleteRAGMetadata', () => {
    it('should delete metadata from RAG', async () => {
      axios.delete = jest.fn().mockResolvedValue({ data: {} });

      const result = await deleteRAGMetadata('course-1');

      expect(result.success).toBe(true);
      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/metadata/course-1'),
        expect.any(Object)
      );
    });
  });

  describe('searchRAG', () => {
    it('should perform semantic search', async () => {
      axios.post = jest.fn().mockResolvedValue({
        data: {
          results: [
            { id: 'course-1', score: 0.95 },
            { id: 'course-2', score: 0.87 }
          ],
          count: 2
        }
      });

      const result = await searchRAG('learn javascript', {
        limit: 10,
        threshold: 0.7
      });

      expect(result.success).toBe(true);
      expect(result.results.length).toBe(2);
      expect(result.count).toBe(2);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/search'),
        expect.objectContaining({
          query: 'learn javascript',
          limit: 10,
          threshold: 0.7
        }),
        expect.any(Object)
      );
    });
  });
});

