import { Router } from 'express'
import { handleIntegrationRequest } from '../controllers/integration.controller.js'
import { authorizeRoles } from '../middleware/auth.middleware.js'

const router = Router()

router.post('/', authorizeRoles('service'), handleIntegrationRequest)

export default router
