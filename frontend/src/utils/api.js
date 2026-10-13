/**
 * Centralized API utility functions
 * Provides consistent error handling and response parsing
 */

/**
 * Gets the API base URL based on the current environment
 * @returns {string} API base URL
 */
export function getApiBaseUrl() {
  // In development, use relative URL (Vite proxy handles it)
  if (import.meta.env.DEV) {
    return '';
  }
  
  // In production, check if we're on the same domain or need absolute URL
  // If the current origin matches the expected domain, use relative URL
  // Otherwise, you might need to set VITE_API_URL environment variable
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  }
  
  // Default: use relative URL (works when frontend and backend are on same domain)
  return '';
}

/**
 * Makes an API request with consistent error handling
 * @param {string} url - API endpoint (can be relative or absolute)
 * @param {object} options - Fetch options
 * @returns {Promise<{data: any, error: string|null}>}
 */
export async function apiRequest(url, options = {}) {
  const token = localStorage.getItem('token');
  
  // Ensure URL is absolute if needed
  const baseUrl = getApiBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  };

  try {
    const res = await fetch(fullUrl, { ...defaultOptions, ...options });
    
    // Try to parse JSON response
    let data;
    try {
      data = await res.json();
    } catch {
      // If not JSON, get text
      const text = await res.text();
      data = text ? { error: text } : {};
    }

    if (!res.ok) {
      let errorMsg = data?.error || data?.message;
      if (!errorMsg) {
        if (res.status === 401) {
          errorMsg = 'Your session has expired or you are not logged in. Please sign in again.';
        } else if (res.status === 403) {
          errorMsg = 'Access forbidden: You do not have permission to perform this action.';
        } else if (res.status === 404) {
          errorMsg = 'The requested resource was not found.';
        } else if (res.status === 429) {
          errorMsg = 'Too many requests. Please wait a moment before trying again.';
        } else if (res.status >= 500) {
          errorMsg = 'The server encountered an error. Please try again shortly.';
        } else {
          errorMsg = `Request failed with status code ${res.status}`;
        }
      } else if (typeof errorMsg !== 'string') {
        errorMsg = JSON.stringify(errorMsg);
      }
      return { data: null, error: errorMsg };
    }

    return { data, error: null };
  } catch (err) {
    console.error('API request error:', err);
    let errorMessage = 'Network error. Please check your internet connection and try again.';
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      errorMessage = 'Unable to reach the server. Please verify your connection or ensure the server is running.';
    } else if (typeof err.message === 'string' && err.message) {
      errorMessage = err.message;
    }
    return { 
      data: null, 
      error: errorMessage
    };
  }
}

/**
 * Makes an authenticated API request
 */
export async function authenticatedRequest(url, options = {}) {
  const token = localStorage.getItem('token');
  if (!token) {
    return { data: null, error: 'Login required' };
  }
  return apiRequest(url, options);
}

/**
 * Shows success alert
 */
export function showSuccess(message) {
  alert(`✅ ${message}`);
}

/**
 * Shows error alert
 */
export function showError(message) {
  alert(`❌ ${message}`);
}

