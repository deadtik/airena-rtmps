import * as admin from 'firebase-admin';

// Check if running in E2E test mode to conditionally mock Firebase auth
const E2E_TEST_MODE = process.env.E2E_TEST_MODE === 'true';

let effectiveAdmin: typeof admin;

if (E2E_TEST_MODE) {
  console.log('E2E_TEST_MODE: Firebase Admin SDK verifyIdToken is mocked.');

  // Create a manually mocked admin object structure
  const mockAuth = () => {
    return {
      // Include other auth methods if your app uses them, otherwise they'll be undefined
      // For now, only mocking verifyIdToken
      verifyIdToken: async (token: string) => {
        console.log(`E2E_TEST_MODE: Mock verifyIdToken called with token: ${token}`);
        if (token === 'valid-e2e-firebase-token') {
          return {
            uid: 'e2e-test-firebase-uid',
            email: 'e2e@example.com',
            name: 'E2E Test User',
            // Add other fields your application might expect
          };
        } else if (token === 'expired-e2e-firebase-token') {
          const error = new Error('Simulated token expired error for E2E test.');
          (error as any).code = 'auth/id-token-expired';
          throw error;
        } else if (token === 'invalid-e2e-firebase-token') {
          const error = new Error('Simulated invalid token error for E2E test.');
          (error as any).code = 'auth/argument-error';
          throw error;
        } else {
          // Default for any other token in E2E mode
          const error = new Error(`Unexpected token for E2E mock: ${token}`);
          (error as any).code = 'auth/invalid-custom-token'; // Or some other generic error
          throw error;
        }
      },
      // Mock other admin.auth() methods if needed by your application during E2E tests
      // e.g., createUser: async (properties) => { ... },
      // getUser: async (uid) => { ... },
    };
  };

  effectiveAdmin = {
    // Preserve other admin namespaces if used (e.g., firestore, messaging)
    ...admin,
    apps: admin.apps, // Preserve apps array
    initializeApp: admin.initializeApp, // Preserve initializeApp
    credential: admin.credential, // Preserve credential namespace
    // Override auth namespace
    auth: mockAuth as any, // Cast to any to satisfy TypeScript for the mock
  };

  // Initialize a dummy app if not already initialized, to allow auth() to be called
  // This check should use the original admin object.
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }

} else {
  // Standard Firebase Initialization for dev/prod
  const requiredFirebaseEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ];

  for (const envVar of requiredFirebaseEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing Firebase environment variable: ${envVar}. Please set all required Firebase credentials.`);
    }
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  } as admin.ServiceAccount;

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
  }
  effectiveAdmin = admin; // Use the real admin
}

export default effectiveAdmin;
