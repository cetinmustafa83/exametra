import { NextResponse } from 'next/server';

/**
 * Standardized API Response Format
 * All routes should use these helpers for consistency
 */

export interface StandardResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  path?: string;
}

/**
 * Success response with data
 */
export const successResponse = <T = any>(
  data: T,
  status = 200,
  path?: string
): NextResponse<StandardResponse<T>> => {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      path,
    },
    { status }
  );
};

/**
 * Error response
 */
export const errorResponse = (
  error: string | Error,
  status = 400,
  path?: string
): NextResponse<StandardResponse> => {
  const message = error instanceof Error ? error.message : error;
  return NextResponse.json(
    {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      path,
    },
    { status }
  );
};

/**
 * Created (201) response for POST
 */
export const createdResponse = <T = any>(
  data: T,
  path?: string
): NextResponse<StandardResponse<T>> => {
  return successResponse(data, 201, path);
};

/**
 * No content (204) response for DELETE
 */
export const noContentResponse = () => {
  return new NextResponse(null, { status: 204 });
};

/**
 * Unauthorized error
 */
export const unauthorizedError = (path?: string) => {
  return errorResponse('Unauthorized', 401, path);
};

/**
 * Forbidden error
 */
export const forbiddenError = (path?: string) => {
  return errorResponse('Forbidden', 403, path);
};

/**
 * Not found error
 */
export const notFoundError = (message = 'Not found', path?: string) => {
  return errorResponse(message, 404, path);
};

/**
 * Validation error
 */
export const validationError = (message: string, path?: string) => {
  return errorResponse(message, 422, path);
};

/**
 * Server error
 */
export const serverError = (error: Error | string, path?: string) => {
  return errorResponse(error, 500, path);
};

/**
 * Wrap handler with automatic error handling
 */
export const withErrorHandling = (handler: Function) => {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('[v0] API Error:', error);
      return serverError(error instanceof Error ? error : 'Unknown error');
    }
  };
};
