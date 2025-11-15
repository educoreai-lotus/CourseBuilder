import request from 'supertest'
import app from '../server.js'

const endpoint = '/api/fill-content-metrics'

describe('Integration Gateway Endpoint', () => {
  it('should process a known service payload and return unified response', async () => {
    const payload = {
      serviceName: 'ContentStudio',
      payload: JSON.stringify({
        learnerData: { learner_id: 'test-123' },
        skills: ['JavaScript']
      })
    }

    const response = await request(app)
      .post(endpoint)
      .send(payload)
      .expect(200)

    expect(response.body).toHaveProperty('serviceName', 'ContentStudio')
    expect(response.body).toHaveProperty('payload')
    expect(typeof response.body.payload).toBe('string')
    
    // Parse payload to verify structure
    const parsedPayload = JSON.parse(response.body.payload)
    expect(parsedPayload).toBeDefined()
  })

  it('should return 400 for unsupported services with unified error response', async () => {
    const response = await request(app)
      .post(endpoint)
      .send({ 
        serviceName: 'UnknownService',
        payload: JSON.stringify({})
      })
      .expect(400)

    expect(response.body).toHaveProperty('error')
    expect(response.body.error).toBeDefined()
  })
})
