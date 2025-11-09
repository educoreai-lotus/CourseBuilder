import { Router } from 'express'
import { handleIntegrationRequest } from '../controllers/integration.controller.js'

const router = Router()

router.post('/', handleIntegrationRequest)

export default router
