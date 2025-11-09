import request from 'supertest'
import app from '../server.js'

const endpoint = '/api/v1/integrations'

describe('Integration Gateway Endpoint', () => {
  it('should process a known service payload and return unified response', async () => {
    const payload = {
      service: 'content_studio',
      blocks: [{ id: 'b1', type: 'lesson' }],
      topics: ['AI Fundamentals']
    }

    const response = await request(app)
      .post(endpoint)
      .send(payload)
      .expect(200)

    expect(response.body).toMatchObject({
      success: true,
      service: 'content_studio',
      message: 'Processed successfully'
    })
    expect(response.body.data).toBeDefined()
    expect(response.body.error).toBeUndefined()
  })

  it('should return 400 for unsupported services with unified error response', async () => {
    const response = await request(app)
      .post(endpoint)
      .send({ service: 'unknown_service' })
      .expect(400)

    expect(response.body).toMatchObject({
      success: false,
      service: 'unknown_service',
      error: 'unsupported_service'
    })
    expect(response.body.data).toBeUndefined()
  })
})
