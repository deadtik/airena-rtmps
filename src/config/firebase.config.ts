import * as admin from 'firebase-admin';

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
  // Replace '\\n' literal with actual newlines
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
} as admin.ServiceAccount;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com` // Uncomment if using Realtime Database
});

export default admin;
