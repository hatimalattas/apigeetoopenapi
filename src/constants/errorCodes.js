/**
 * HTTP Error Codes and Messages
 */
export const ERROR_CODES = {
  BAD_REQUEST: '400',
  UNAUTHORIZED: '401',
  FORBIDDEN: '403',
  NOT_FOUND: '404',
  INTERNAL_SERVER_ERROR: '500'
};

export const DEFAULT_ERROR_MESSAGES = {
  [ERROR_CODES.BAD_REQUEST]: 'Bad Request',
  [ERROR_CODES.UNAUTHORIZED]: 'Unauthorized',
  [ERROR_CODES.FORBIDDEN]: 'Forbidden',
  [ERROR_CODES.NOT_FOUND]: 'Not Found',
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Internal Server Error'
};

export const DEFAULT_TRACKING_ID = '-04-630999-158927-2';