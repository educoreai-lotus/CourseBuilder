/**
 * Enhanced OAuth2 Middleware
 * Provides token refresh and enhanced validation
 */

import jwt from 'jsonwebtoken';
import axios from 'axios';

/**
 * Get OAuth2 token from authorization server
 * @param {string} clientId - OAuth2 client ID
 * @param {string} clientSecret - OAuth2 client secret
 * @param {string} tokenUrl - Token endpoint URL
 * @param {string[]} scopes - Requested scopes
 * @returns {Promise<Object>} Token response
 */
export const getOAuth2Token = async (clientId, clientSecret, tokenUrl, scopes = []) => {
  try {
    const response = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: scopes.join(' ')
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      access_token: response.data.access_token,
      token_type: response.data.token_type || 'Bearer',
      expires_in: response.data.expires_in,
      scope: response.data.scope,
      expires_at: new Date(Date.now() + (response.data.expires_in * 1000))
    };
  } catch (error) {
    console.error('[OAuth2] Error getting token:', error);
    throw error;
  }
};

/**
 * Validate and refresh OAuth2 token if needed
 * @param {string} token - Current access token
 * @param {Object} config - OAuth2 configuration
 * @returns {Promise<Object>} Valid token (refreshed if needed)
 */
export const validateAndRefreshToken = async (token, config) => {
  try {
    // Decode token to check expiration
    const decoded = jwt.decode(token);
    
    if (!decoded) {
      throw new Error('Invalid token format');
    }

    // Check if token is expired or will expire soon (within 5 minutes)
    const expirationTime = decoded.exp * 1000;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (expirationTime - now < fiveMinutes) {
      // Token expired or expiring soon, refresh it
      console.log('[OAuth2] Token expiring soon, refreshing...');
      return await getOAuth2Token(
        config.clientId,
        config.clientSecret,
        config.tokenUrl,
        config.scopes || []
      );
    }

    // Token is still valid
    return {
      access_token: token,
      token_type: 'Bearer',
      expires_at: new Date(expirationTime)
    };
  } catch (error) {
    console.error('[OAuth2] Error validating token:', error);
    throw error;
  }
};

/**
 * Create OAuth2 client configuration from environment
 * @returns {Object|null} OAuth2 configuration or null if not configured
 */
export const getOAuth2Config = () => {
  const clientId = process.env.OAUTH2_CLIENT_ID;
  const clientSecret = process.env.OAUTH2_CLIENT_SECRET;
  const tokenUrl = process.env.OAUTH2_TOKEN_URL;
  const scopes = (process.env.OAUTH2_SCOPES || '').split(',').filter(Boolean);

  if (!clientId || !clientSecret || !tokenUrl) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    tokenUrl,
    scopes
  };
};

/**
 * Middleware to inject OAuth2 token for inter-service calls
 * Adds Authorization header with valid OAuth2 token
 */
export const injectOAuth2Token = async (req, res, next) => {
  try {
    // Only inject for inter-service calls (not user requests)
    if (req.user && req.user.role) {
      // This is a user request, not an inter-service call
      return next();
    }

    const config = getOAuth2Config();
    
    if (!config) {
      // OAuth2 not configured, skip
      return next();
    }

    // Get or refresh token
    const tokenCache = req.app.get('oauth2TokenCache') || {};
    let tokenData = tokenCache.token;

    if (!tokenData || !tokenData.access_token) {
      // No cached token, get new one
      tokenData = await getOAuth2Token(
        config.clientId,
        config.clientSecret,
        config.tokenUrl,
        config.scopes
      );
      
      // Cache token
      req.app.set('oauth2TokenCache', {
        token: tokenData,
        cachedAt: new Date()
      });
    } else {
      // Validate and refresh if needed
      tokenData = await validateAndRefreshToken(tokenData.access_token, config);
      
      // Update cache
      req.app.set('oauth2TokenCache', {
        token: tokenData,
        cachedAt: new Date()
      });
    }

    // Inject token into request headers
    req.headers.authorization = `${tokenData.token_type} ${tokenData.access_token}`;
    
    next();
  } catch (error) {
    console.error('[OAuth2] Error injecting token:', error);
    // Don't block request if OAuth2 fails
    next();
  }
};

export default {
  getOAuth2Token,
  validateAndRefreshToken,
  getOAuth2Config,
  injectOAuth2Token
};

