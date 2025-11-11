const normalizeSkills = (skills = []) =>
  skills
    .map((skill) => (typeof skill === 'string' ? skill.trim() : ''))
    .filter(Boolean);

export const generateCourseMetadata = ({
  learnerId = null,
  learnerName = null,
  learnerCompany = null,
  learningPath = [],
  skills = [],
  level = null,
  duration = null
}) => {
  const normalizedSkills = normalizeSkills(skills);
  const focusTopic = learningPath[0]?.topicName || normalizedSkills[0] || 'Adaptive Learning';
  const shortLearnerName = learnerName ? learnerName.split(' ')[0] : null;

  const courseName = shortLearnerName
    ? `${shortLearnerName}'s ${focusTopic} Journey`
    : `Personalized ${focusTopic} Path`;

  const describedSkills = normalizedSkills.slice(0, 3).join(', ');
  const courseDescription = normalizedSkills.length
    ? `AI-curated path covering ${describedSkills}. Includes hands-on labs and external resources to accelerate mastery.`
    : `AI-curated path focused on ${focusTopic}. Includes hands-on labs and external resources to accelerate mastery.`;

  const tags = new Set(normalizedSkills.map((skill) => skill.toLowerCase()));
  learningPath.forEach((topic) => {
    if (topic?.topicName) {
      tags.add(topic.topicName.toLowerCase());
    }
  });

  return {
    courseName,
    courseDescription,
    metadata: {
      personalized: Boolean(learnerId),
      source: learnerId ? 'learner_ai' : 'content_studio',
      skills: normalizedSkills,
      tags: Array.from(tags),
      level,
      duration_minutes: duration || null,
      learner_profile: learnerId
        ? {
            id: learnerId,
            name: learnerName || null,
            company: learnerCompany || null
          }
        : null,
      enrichment: {
        youtube_links: [],
        github_repos: []
      },
      learning_path_summary: learningPath.map((topic) => ({
        topic: topic.topicName,
        description: topic.topicDescription || ''
      }))
    }
  };
};

export default {
  generateCourseMetadata
};

