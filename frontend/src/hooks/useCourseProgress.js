import { useMemo } from 'react'

const stageFlow = {
  personalized: ['lessons', 'exercises', 'exam', 'feedback'],
  marketplace: ['enroll', 'lessons', 'exercises', 'exam', 'feedback']
}

export function useCourseProgress({
  courseType = 'marketplace',
  completedStages = [],
  isEnrolled = false,
  totalLessons = 0,
  completedLessons = 0
} = {}) {
  const stages = stageFlow[courseType] || stageFlow.marketplace

  const completedSet = useMemo(() => {
    const base = new Set(completedStages)
    if (courseType === 'marketplace' && isEnrolled) {
      base.add('enroll')
    }
    return base
  }, [completedStages, courseType, isEnrolled])

  const isLastLessonCompleted = useMemo(() => {
    if (totalLessons <= 0) return false
    return completedLessons >= totalLessons
  }, [completedLessons, totalLessons])

  const isStageComplete = (stage) => completedSet.has(stage)

  const canAccessStage = (stage) => {
    if (!stages.includes(stage)) return false

    const stageIndex = stages.indexOf(stage)
    if (stageIndex === 0) {
      if (stage === 'enroll') {
        return !isStageComplete('enroll')
      }
      return true
    }

    const prerequisites = stages.slice(0, stageIndex)
    const allPrerequisitesComplete = prerequisites.every(isStageComplete)

    if (!allPrerequisitesComplete) {
      return false
    }

    if (stage === 'exam') {
      return isLastLessonCompleted
    }

    return true
  }

  const nextStage = () => {
    for (let i = 0; i < stages.length; i += 1) {
      const stage = stages[i]
      if (!isStageComplete(stage)) {
        const prerequisites = stages.slice(0, i)
        const ready = prerequisites.every(isStageComplete)
        if (ready && (stage !== 'exam' || isLastLessonCompleted)) {
          return stage
        }
      }
    }
    return null
  }

  return {
    stages,
    isStageComplete,
    canAccessStage,
    nextStage,
    isLastLessonCompleted
  }
}

