import request from 'supertest'
import app from '../server.js'

const endpoint = '/api/fill-content-metrics'

describe('Integration Gateway Endpoint', () => {
  it('should process a known service payload and return unified response', async () => {
    const payload = {
      requester_service: 'CourseBuilder',
      payload: JSON.stringify({
        learner_id: '00000000-0000-0000-0000-000000000001',
        learner_name: 'Test Learner',
        learner_company: 'Test Corp',
        skills: ['JavaScript']
      }),
      response: JSON.stringify({
        learner_id: '',
        learner_name: '',
        learner_company: '',
        topics: []
      })
    }

    const response = await request(app)
      .post(endpoint)
      .send(payload)
      .expect(200)

    // Response is sent as stringified JSON with Content-Type: text/plain
    // Supertest may parse it or leave it as text, so handle both cases
    let responseBody;
    if (typeof response.text === 'string') {
      // Response is a string - parse it
      responseBody = JSON.parse(response.text);
    } else if (typeof response.body === 'object' && response.body !== null) {
      // Response was parsed by supertest
      responseBody = response.body;
    } else {
      // Fallback - try to parse response.text
      responseBody = JSON.parse(response.text || '{}');
    }

    // Response should only contain the three required fields
    expect(responseBody).toHaveProperty('requester_service', 'CourseBuilder')
    expect(responseBody).toHaveProperty('payload')
    expect(responseBody).toHaveProperty('response')
    expect(responseBody).not.toHaveProperty('target_service')
    expect(responseBody).not.toHaveProperty('serviceName')
    expect(typeof responseBody.payload).toBe('string')
    expect(typeof responseBody.response).toBe('string')
    
    // Parse response to verify it was filled
    const parsedResponse = JSON.parse(responseBody.response)
    expect(parsedResponse).toBeDefined()
    expect(parsedResponse).toHaveProperty('learner_id')
    expect(parsedResponse).toHaveProperty('topics')
  })

  it('should return 400 if payload structure cannot be matched to a service', async () => {
    const response = await request(app)
      .post(endpoint)
      .send({ 
        requester_service: 'CourseBuilder',
        payload: JSON.stringify({ unknown_field: 'value' }),
        response: JSON.stringify({})
      })
      .expect(400)

    // Response is sent as stringified JSON with Content-Type: text/plain
    let responseBody;
    if (typeof response.text === 'string') {
      responseBody = JSON.parse(response.text);
    } else {
      responseBody = response.body || {};
    }
      
    expect(responseBody).toHaveProperty('error')
    expect(responseBody.message).toContain('target service')
  })
  
  it('should return 400 if response template is missing', async () => {
    const response = await request(app)
      .post(endpoint)
      .send({ 
        requester_service: 'CourseBuilder',
        payload: JSON.stringify({
          learner_id: '00000000-0000-0000-0000-000000000001',
          skills: ['JavaScript']
        })
      })
      .expect(400)

    // Response is sent as stringified JSON with Content-Type: text/plain
    let responseBody;
    if (typeof response.text === 'string') {
      responseBody = JSON.parse(response.text);
    } else {
      responseBody = response.body || {};
    }
      
    expect(responseBody).toHaveProperty('error')
    expect(responseBody.message).toContain('response')
  })
  
  it('should return 400 if requester_service is not CourseBuilder', async () => {
    const response = await request(app)
      .post(endpoint)
      .send({ 
        requester_service: 'OtherService',
        payload: JSON.stringify({
          learner_id: '00000000-0000-0000-0000-000000000001',
          skills: ['JavaScript']
        }),
        response: JSON.stringify({})
      })
      .expect(400)

    let responseBody;
    if (typeof response.text === 'string') {
      responseBody = JSON.parse(response.text);
    } else {
      responseBody = response.body || {};
    }
      
    expect(responseBody).toHaveProperty('error')
    expect(responseBody.message).toContain('CourseBuilder')
  })

})
