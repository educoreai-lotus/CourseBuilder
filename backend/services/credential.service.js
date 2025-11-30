/**
 * Credential Service
 * Issues micro-credentials via Credly API after course completion
 */

import axios from 'axios';

/**
 * Get Credly API configuration from environment
 */
function getCredlyConfig() {
  const apiKey = process.env.CREDLY_API_KEY;
  const apiUrl = process.env.CREDLY_API_URL || 'https://api.credly.com/v1';
  const organizationId = process.env.CREDLY_ORGANIZATION_ID;

  if (!apiKey) {
    console.warn('[Credential Service] CREDLY_API_KEY not configured');
    return null;
  }

  return {
    apiKey,
    apiUrl,
    organizationId
  };
}

/**
 * Issue a credential to a learner after course completion
 * @param {Object} params - Credential issuance parameters
 * @param {string} params.learnerId - Learner ID
 * @param {string} params.learnerName - Learner name
 * @param {string} params.learnerEmail - Learner email
 * @param {string} params.courseId - Course ID
 * @param {string} params.courseName - Course name
 * @param {number} params.score - Assessment score (0-100)
 * @param {Date} params.completedAt - Course completion date
 * @param {string} params.badgeTemplateId - Credly badge template ID (optional)
 * @returns {Promise<Object>} Credential issuance result
 */
export const issueCredential = async ({
  learnerId,
  learnerName,
  learnerEmail,
  courseId,
  courseName,
  score,
  completedAt,
  badgeTemplateId
}) => {
  try {
    // Check for email first
    if (!learnerEmail) {
      console.warn(`[Credential Service] Skipping credential for ${learnerId} - no email`);
      return { skipped: true, reason: 'no_email' };
    }

    const config = getCredlyConfig();
    
    if (!config) {
      console.warn('[Credential Service] Credly not configured, skipping credential issuance');
      return {
        success: false,
        skipped: true,
        reason: 'Credly API not configured'
      };
    }

    // Build credential payload
    const credentialPayload = {
      recipient_email: learnerEmail,
      issued_to_first_name: learnerName?.split(' ')[0] || learnerName,
      issued_to_last_name: learnerName?.split(' ').slice(1).join(' ') || '',
      badge_template_id: badgeTemplateId || process.env.CREDLY_DEFAULT_BADGE_TEMPLATE_ID,
      issued_at: completedAt?.toISOString() || new Date().toISOString(),
      issued_reason: `Completed course: ${courseName}`,
      evidence: [
        {
          url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/course/${courseId}`,
          description: `Course completion certificate for ${courseName}`
        }
      ],
      expires_at: null, // Credentials don't expire
      suppress_badge_notification_email: false
    };

    // Add custom fields if organization ID is set
    if (config.organizationId) {
      credentialPayload.organization_id = config.organizationId;
    }

    // Issue credential via Credly API
    const response = await axios.post(
      `${config.apiUrl}/credential_batches`,
      {
        credential: credentialPayload
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Credential issued to ${learnerEmail} for course ${courseName}`);

    return {
      success: true,
      credentialId: response.data.id,
      badgeUrl: response.data.badge_url,
      issuedAt: response.data.issued_at
    };
  } catch (error) {
    console.error('[Credential Service] Error issuing credential:', error);
    
    // Don't throw - credential issuance failure shouldn't block course completion
    return {
      success: false,
      error: error.message,
      response: error.response?.data
    };
  }
};

/**
 * Revoke a credential (if needed)
 * @param {string} credentialId - Credential ID to revoke
 * @returns {Promise<Object>} Revocation result
 */
export const revokeCredential = async (credentialId) => {
  try {
    const config = getCredlyConfig();
    
    if (!config) {
      return {
        success: false,
        skipped: true,
        reason: 'Credly API not configured'
      };
    }

    const response = await axios.delete(
      `${config.apiUrl}/credential_batches/${credentialId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      }
    );

    return {
      success: true,
      revokedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Credential Service] Error revoking credential:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  issueCredential,
  revokeCredential
};

