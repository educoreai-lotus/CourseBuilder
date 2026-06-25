import { useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'

const LEARNER_UI_ROLE = 'learner'

export function useRole() {
  const { setUserRole } = useApp()

  const helpers = useMemo(
    () => ({
      isLearner: true,
      isTrainer: false,
      availableRoles: [{ value: LEARNER_UI_ROLE, label: 'Learner' }]
    }),
    []
  )

  const switchRole = (_role) => {
    setUserRole(LEARNER_UI_ROLE)
  }

  return {
    userRole: LEARNER_UI_ROLE,
    switchRole,
    ...helpers
  }
}
