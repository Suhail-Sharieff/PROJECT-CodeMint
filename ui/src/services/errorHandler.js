// src/services/errorHandler.js
export const getErrorMessage = (error, defaultMessage = 'An unexpected error occurred.') => {
  // 1. Best case: The backend sent a specific error message (ApiError format)
  if (error.response && error.response.data && error.response.data.message) {
    return error.response.data.message;
  }
  // 2. Next best case: A generic Axios error message.
  if (error.message) {
    return error.message;
  }
  // 3. Fallback: A generic message if the error is unusual.
  return defaultMessage;
};