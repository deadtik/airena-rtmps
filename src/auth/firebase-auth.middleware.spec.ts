import { FirebaseAuthMiddleware } from './firebase-auth.middleware';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase.config'; // Actual admin instance

// Mock the Firebase Admin SDK
jest.mock('../config/firebase.config', () => {
  // This is the function that admin.auth() will return
  const authObject = {
    // verifyIdToken will be a Jest mock function
    verifyIdToken: jest.fn(),
    // Add other methods of admin.auth() if your middleware uses them
  };
  // This is the function that admin.auth is
  const authFunction = jest.fn(() => authObject);

  return {
    // This is the default export of firebase.config.ts -> admin
    // It has an auth method.
    auth: authFunction,
    // Add other properties of 'admin' from firebase.config.ts if needed by the middleware
    // For example, if your middleware used admin.firestore(), you'd mock it here.
  };
});

describe('FirebaseAuthMiddleware', () => {
  let middleware: FirebaseAuthMiddleware;
  // Use a more specific type or ensure headers is always defined.
  // For simplicity, we'll cast to Request where used, but initialize headers.
  let mockRequest: Partial<Request> & { headers: { [key: string]: string | undefined } };
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let mockVerifyIdToken: jest.Mock;

  beforeEach(() => {
    middleware = new FirebaseAuthMiddleware();
    mockRequest = { headers: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();

    // Reset and re-assign mocks before each test to ensure clean state
    // This is crucial because admin is imported and its functions are memoized by Jest's mock
    const adminMock = admin as any; // Cast to access mocked functions
    mockVerifyIdToken = adminMock.auth().verifyIdToken as jest.Mock;
    mockVerifyIdToken.mockReset(); // Clear previous mockResolvedValue/mockRejectedValue

    // Also reset the call count for the auth function itself if needed for other tests
    if (jest.isMockFunction(adminMock.auth)) {
        adminMock.auth.mockClear();
    }
  });

  // No afterEach needed if mocks are reset in beforeEach

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('successful authentication', () => {
    it('should call next() and attach user to request if token is valid', async () => {
      const mockToken = 'valid-firebase-token';
      const mockDecodedUser = { uid: 'test-uid', email: 'test@example.com' };
      mockRequest.headers!['authorization'] = `Bearer ${mockToken}`; // Use non-null assertion for headers

      // Ensure verifyIdToken is an async mock for await to work as expected
      mockVerifyIdToken.mockResolvedValue(mockDecodedUser);

      await middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockVerifyIdToken).toHaveBeenCalledWith(mockToken);
      expect((mockRequest as any).user).toEqual(mockDecodedUser);
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).toHaveBeenCalledWith(); // No arguments
    });
  });

  describe('authentication failures', () => {
    it('should throw UnauthorizedException if Authorization header is missing', async () => {
      await expect(
        middleware.use(mockRequest as Request, mockResponse as Response, nextFunction)
      ).rejects.toThrow(new UnauthorizedException('Missing Authorization Header'));
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid Authorization header format (no Bearer)', async () => {
      mockRequest.headers['authorization'] = 'InvalidTokenFormat';
      await expect(
        middleware.use(mockRequest as Request, mockResponse as Response, nextFunction)
      ).rejects.toThrow(new UnauthorizedException('Invalid Authorization Header format. Expected: Bearer <token>'));
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid Authorization header format (no token)', async () => {
      mockRequest.headers['authorization'] = 'Bearer ';
      await expect(
        middleware.use(mockRequest as Request, mockResponse as Response, nextFunction)
      ).rejects.toThrow(new UnauthorizedException('Invalid Authorization Header format. Expected: Bearer <token>'));
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if verifyIdToken fails with a generic error', async () => {
      const mockToken = 'some-token';
      mockRequest.headers!['authorization'] = `Bearer ${mockToken}`; // Use non-null assertion

      // Ensure verifyIdToken is an async mock for await to work as expected
      mockVerifyIdToken.mockRejectedValue(new Error('Firebase generic error'));

      await expect(
        middleware.use(mockRequest as Request, mockResponse as Response, nextFunction)
      ).rejects.toThrow(new ForbiddenException('Invalid Firebase ID token.'));
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if token is expired (auth/id-token-expired)', async () => {
      const mockToken = 'expired-token';
      mockRequest.headers!['authorization'] = `Bearer ${mockToken}`; // Use non-null assertion
      const expiredError = { code: 'auth/id-token-expired', message: 'Token expired' };

      // Ensure verifyIdToken is an async mock for await to work as expected
      mockVerifyIdToken.mockRejectedValue(expiredError);

      await expect(
        middleware.use(mockRequest as Request, mockResponse as Response, nextFunction)
      ).rejects.toThrow(new UnauthorizedException('Firebase ID token has expired.'));
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if token is malformed (auth/argument-error)', async () => {
      const mockToken = 'malformed-token';
      mockRequest.headers!['authorization'] = `Bearer ${mockToken}`; // Use non-null assertion
      const malformedError = { code: 'auth/argument-error', message: 'Token malformed' };

      // Ensure verifyIdToken is an async mock for await to work as expected
      mockVerifyIdToken.mockRejectedValue(malformedError);

      await expect(
        middleware.use(mockRequest as Request, mockResponse as Response, nextFunction)
      ).rejects.toThrow(new UnauthorizedException('Firebase ID token is malformed or invalid.'));
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
