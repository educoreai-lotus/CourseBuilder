import request from 'supertest'
import app from '../server.js'

const endpoint = '/api/fill-content-metrics'

describe('Integration Gateway Endpoint', () => {
  it('should process request with response template fields and route to Course Builder handler', async () => {
    // NEW ROUTING LOGIC: AI is used when response template has fields
    // Note: This test requires GEMINI_API_KEY to be set for AI query generation
    // If not set, it will return 500 error (AI unavailable)
    const payload = {
      requester_service: 'content_studio',
      payload: {
        course_id: '11111111-1111-1111-1111-111111111111'
      },
      response: {
        course_name: '',
        total_lessons: 0
      }
    }

    const response = await request(app)
      .post(endpoint)
      .send(payload)

    // If AI is available, expect 200. If not, expect 500 (AI unavailable)
    // Both are valid responses - the important thing is it routes correctly
    expect([200, 500]).toContain(response.status)

    // Response is now JSON object (not stringified)
    const responseBody = response.body;

    // If AI succeeded (200), response should have envelope with filled response
    // If AI failed (500), response will have error (without envelope)
    if (response.status === 200) {
      expect(responseBody).toHaveProperty('requester_service', 'content_studio')
      expect(responseBody).toHaveProperty('payload')
      expect(responseBody).toHaveProperty('response')
      expect(typeof responseBody.response).toBe('object')
      expect(responseBody.response).toHaveProperty('course_name')
      expect(responseBody.response).toHaveProperty('total_lessons')
      expect(responseBody).not.toHaveProperty('target_service')
      expect(responseBody).not.toHaveProperty('serviceName')
    } else {
      // AI unavailable - error response (no envelope)
      expect(responseBody).toHaveProperty('error')
      expect(responseBody).toHaveProperty('message')
      // Verify it routed to Course Builder handler (error message mentions it)
      expect(responseBody.message).toContain('Course Builder handler')
    }
  })

  it('should return 400 if payload cannot be matched to a service and response is empty', async () => {
    // NEW ROUTING LOGIC: If response is empty {}, try to match payload to specialized handler
    // If payload doesn't match any pattern, return 400
    const response = await request(app)
      .post(endpoint)
      .send({ 
        requester_service: 'content_studio',
        payload: { unknown_field: 'value' },
        response: {}
      })
      .expect(400)

    // Response is now JSON object
    const responseBody = response.body;
      
    expect(responseBody).toHaveProperty('error')
    // Error message should mention unable to determine target service
    expect(
      responseBody.message.includes('Could not determine target service') ||
      responseBody.message.includes('payload matches a known service pattern')
    ).toBe(true)
  })
  
  it('should accept request without response (defaults to empty {})', async () => {
    // NEW ROUTING LOGIC: Response is optional, defaults to {}
    // If response is empty, routes to specialized handler based on payload
    const response = await request(app)
      .post(endpoint)
      .send({ 
        requester_service: 'content_studio',
        payload: {
          topics: [
            {
              topic_name: 'Test Topic',
              skills: ['JavaScript'],
              contents: []
            }
          ]
        }
        // No response field - should default to {}
      })
      .expect(200)

    const responseBody = response.body;
      
    expect(responseBody).toHaveProperty('requester_service', 'content_studio')
    expect(responseBody).toHaveProperty('payload')
    expect(responseBody).toHaveProperty('response')
    // For Content Studio with empty response, should return course data or {}
    expect(typeof responseBody.response).toBe('object')
  })
  
  it('should accept any requester_service value', async () => {
    // NEW ROUTING LOGIC: requester_service doesn't matter for routing
    // Routing is based on response template fields or payload structure
    // Note: This test requires GEMINI_API_KEY for AI query generation
    const response = await request(app)
      .post(endpoint)
      .send({ 
        requester_service: 'any_service',
        payload: {
          course_id: '11111111-1111-1111-1111-111111111111'
        },
        response: {
          course_name: '',
          total_lessons: 0
        }
      })

    // If AI is available, expect 200. If not, expect 500
    expect([200, 500]).toContain(response.status)

    const responseBody = response.body;
    
    // If AI succeeded, response should have envelope
    // If AI failed, response will have error (no envelope)
    if (response.status === 200) {
      expect(responseBody).toHaveProperty('requester_service', 'any_service')
      expect(responseBody).toHaveProperty('payload')
      expect(responseBody).toHaveProperty('response')
    } else {
      // AI unavailable - error response
      expect(responseBody).toHaveProperty('error')
      expect(responseBody.message).toContain('Course Builder handler')
    }
  })

})
