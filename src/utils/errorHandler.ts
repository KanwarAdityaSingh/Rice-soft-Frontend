// Error handling utilities
export interface AppError {
  message: string;
  code?: string;
  status?: number;
}

export class ErrorHandler {
  static handleApiError(error: any): AppError {
    if (error.status && error.message) {
      // This is an ApiError from our service
      return {
        message: error.message,
        code: error.data?.code,
        status: error.status,
      };
    }

    if (error.response) {
      // Axios-like error
      return {
        message: error.response.data?.message || 'An error occurred',
        code: error.response.data?.code,
        status: error.response.status,
      };
    }

    if (error.request) {
      // Network error
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        status: 0,
      };
    }

    // Generic error
    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }

  static getErrorMessage(error: any): string {
    const appError = this.handleApiError(error);
    return appError.message;
  }

  static isNetworkError(error: any): boolean {
    return error.status === 0 || error.code === 'NETWORK_ERROR';
  }

  static isAuthError(error: any): boolean {
    return error.status === 401 || error.status === 403;
  }
}
