/**
 * Mock utilities for REST API envelope testing
 */

import type { ApiResponse } from '@/types/common';

/**
 * Create a success response envelope
 */
export function createMockSuccessResponse<T>(data: T, correlationId = 'test-correlation-id'): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    correlationId,
  };
}

/**
 * Create an error response envelope
 */
export function createMockErrorResponse(
  message: string,
  code = 'TEST_ERROR',
  correlationId = 'test-correlation-id'
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: {
      message,
      code,
      details: { test: true },
    },
    correlationId,
  };
}

/**
 * Mock edge function responses for testing
 */
export const mockEdgeFunctionResponses = {
  'url-recommendations': createMockSuccessResponse({
    company: 'Test Company',
    domain: 'test.com',
    industryGuess: 'Technology',
    departmentsCovered: ['Engineering'],
    items: [
      {
        id: '1',
        title: 'Test Recommendation',
        description: 'Test description',
        department: 'Engineering',
        confidence: 0.9,
      },
    ],
    status: 'ok',
  }),
  
  'agent-draft-from-reco': createMockSuccessResponse({
    draftId: 'test-draft-id',
    agentId: 'test-agent-id',
  }),
  
  'builder-generate-summary': createMockSuccessResponse({
    summary: 'This is a test AI-generated summary that describes the digital twin system.',
  }),
};
