# Auth Module (Firebase Only)

This module provides authentication using Firebase ID tokens. Clerk authentication has been fully removed.

## Usage
- Use `FirebaseAuthMiddleware` to protect routes and attach the decoded Firebase user to `req.user`.
- Use `FirebaseAuthGuard` in controllers for route-level protection.

## Files
- `firebase-auth.middleware.ts`: Express/NestJS middleware for verifying Firebase ID tokens.
- `firebase-auth.guard.ts`: NestJS guard for controller-level protection.
- `auth.module.ts`: Exports only Firebase authentication logic.

## Remove Clerk
- All Clerk-related files and code have been removed.
- Only Firebase authentication is supported.
