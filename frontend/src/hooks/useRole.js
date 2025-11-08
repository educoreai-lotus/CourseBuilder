import { useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'

export function useRole() {
  const { userRole, setUserRole } = useApp()

  const helpers = useMemo(() => {
    const isLearner = userRole === 'learner'
    const isTrainer = userRole === 'trainer'

    return {
      isLearner,
      isTrainer,
      availableRoles: [
        { value: 'learner', label: 'Learner' },
        { value: 'trainer', label: 'Trainer' }
      ]
    }
  }, [userRole])

  const switchRole = (role) => {
    setUserRole(role)
  }

  return {
    userRole,
    switchRole,
    ...helpers
  }
}

