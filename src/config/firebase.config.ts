import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

const E2E_TEST_MODE = process.env.E2E_TEST_MODE === 'true';

let effectiveAdmin: typeof admin;

if (E2E_TEST_MODE) {
  console.log('E2E_TEST_MODE: Firebase Admin SDK verifyIdToken is mocked.');

  const mockAuth = () => ({
    verifyIdToken: async (token: string) => {
      console.log(`E2E_TEST_MODE: Mock verifyIdToken called with token: ${token}`);
      switch (token) {
        case 'valid-e2e-firebase-token':
          return {
            uid: 'e2e-test-firebase-uid',
            email: 'e2e@example.com',
            name: 'E2E Test User',
          };
        case 'expired-e2e-firebase-token': {
          const err = new Error('Simulated token expired');
          (err as any).code = 'auth/id-token-expired';
          throw err;
        }
        case 'invalid-e2e-firebase-token': {
          const err = new Error('Simulated invalid token');
          (err as any).code = 'auth/argument-error';
          throw err;
        }
        default: {
          const err = new Error(`Unexpected token in E2E: ${token}`);
          (err as any).code = 'auth/invalid-custom-token';
          throw err;
        }
      }
    },
  });

  effectiveAdmin = {
    ...admin,
    apps: admin.apps,
    initializeApp: admin.initializeApp,
    credential: admin.credential,
    auth: mockAuth as any,
  };

  if (admin.apps.length === 0) {
    admin.initializeApp();
  }

} else {
  const requiredEnvVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];

  requiredEnvVars.forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`Missing Firebase environment variable: ${key}`);
    }
  });

  const serviceAccount: admin.ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  };

  if (admin.apps.length === 0) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Firebase Admin Initialization Error:', error);
      throw error;
    }
  }

  effectiveAdmin = admin;
}

export default effectiveAdmin;