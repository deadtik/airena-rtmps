import axios, { AxiosError } from 'axios';

// API Configuration
const API_BASE_URL = 'http://localhost:3000';
// const FRONTEND_URL = 'http://localhost:3001'; // Not used in this script

// Test configuration
const TEST_STREAM_SETTINGS = {
  quality: 'high',
  maxBitrate: 5000,
  resolution: '1920x1080'
};

// IMPORTANT: This script expects the NestJS application to be running with
// the E2E_TEST_MODE=true environment variable set.
// This will enable the mock Firebase Admin SDK in src/config/firebase.config.ts.
// Example: E2E_TEST_MODE=true npm run start:dev (or your actual start command)

// Mock Firebase ID Tokens for E2E testing
const VALID_FIREBASE_TOKEN = 'valid-e2e-firebase-token';
const EXPIRED_FIREBASE_TOKEN = 'expired-e2e-firebase-token';
const INVALID_FIREBASE_TOKEN = 'invalid-e2e-firebase-token';


const createHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
});

async function testStreamEndpoints() {
  try {
    console.log('🚀 Starting Stream API E2E Tests with Mock Firebase Auth\n');
    console.log('ℹ️ Ensure the NestJS app is running with E2E_TEST_MODE=true\n');

    // Test with an invalid token first
    console.log('📝 Testing: Endpoint access with an INVALID Firebase token');
    try {
      await axios.get(`${API_BASE_URL}/stream/key`, { headers: createHeaders(INVALID_FIREBASE_TOKEN) });
      console.error('❌ INVALID TOKEN TEST FAILED: Request should have failed but succeeded.');
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) { // Error code from FirebaseAuthMiddleware for argument-error
        console.log(`✅ INVALID TOKEN TEST PASSED: Received ${error.response.status} as expected.`);
      } else {
        console.error('❌ INVALID TOKEN TEST FAILED: Unexpected error or status code.', error);
      }
    }

    // Test with an expired token
    console.log('\n📝 Testing: Endpoint access with an EXPIRED Firebase token');
    try {
      await axios.get(`${API_BASE_URL}/stream/key`, { headers: createHeaders(EXPIRED_FIREBASE_TOKEN) });
      console.error('❌ EXPIRED TOKEN TEST FAILED: Request should have failed but succeeded.');
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        console.log(`✅ EXPIRED TOKEN TEST PASSED: Received ${error.response.status} as expected.`);
      } else {
        console.error('❌ EXPIRED TOKEN TEST FAILED: Unexpected error or status code.', error);
      }
    }

    // Proceed with valid token for other tests
    const validHeaders = createHeaders(VALID_FIREBASE_TOKEN);
    console.log('\nℹ️ Proceeding with VALID Firebase token for remaining tests...');

    // 1. Get Stream Key
    console.log('\n📝 Testing: Get Stream Key');
    const keyResponse = await axios.get(`${API_BASE_URL}/stream/key`, { headers: validHeaders });
    console.log('✅ Stream Key Response:', keyResponse.data);
    const streamKey = keyResponse.data.streamKey;
    const streamUrl = keyResponse.data.streamUrl;
    const hlsUrl = keyResponse.data.hlsUrl;

    if (!streamKey || !streamUrl || !hlsUrl) {
      throw new Error('Invalid stream credentials response');
    }

    console.log('\n🔑 Stream Credentials:');
    console.log('Stream Key:', streamKey);
    console.log('Stream URL:', streamUrl);
    console.log('HLS URL:', hlsUrl);

    // 2. Start Stream
    console.log('\n📝 Testing: Start Stream');
    const startResponse = await axios.post(
      `${API_BASE_URL}/stream/start/${streamKey}`,
      {},
      { headers: validHeaders }
    );
    console.log('✅ Start Stream Response:', startResponse.data);

    // 3. Get Stream Status
    console.log('\n📝 Testing: Get Stream Status');
    const statusResponse = await axios.get(
      `${API_BASE_URL}/stream/status/${streamKey}`,
      { headers: validHeaders } // Assuming this endpoint also requires auth
    );
    console.log('✅ Stream Status:', statusResponse.data);

    // 4. Update Stream Settings
    console.log('\n📝 Testing: Update Stream Settings');
    const settingsResponse = await axios.post(
      `${API_BASE_URL}/stream/settings/${streamKey}`,
      TEST_STREAM_SETTINGS,
      { headers: validHeaders }
    );
    console.log('✅ Stream Settings Updated:', settingsResponse.data);

    // 5. Get Stream Details
    console.log('\n📝 Testing: Get Stream Details');
    const detailsResponse = await axios.get(
      `${API_BASE_URL}/stream/${streamKey}`,
      { headers: validHeaders }
    );
    console.log('✅ Stream Details:', detailsResponse.data);

    // 6. Get Stream Metrics (assuming this also needs auth)
    console.log('\n📝 Testing: Get Stream Metrics');
     const metricsResponse = await axios.get(
       `${API_BASE_URL}/stream/metrics/${streamKey}`,
       { headers: validHeaders }
     );
    console.log('✅ Stream Metrics:', metricsResponse.data);

    // 7. List Streams
    console.log('\n📝 Testing: List Streams');
    const listResponse = await axios.get(
      `${API_BASE_URL}/stream/list`,
      { headers: validHeaders }
    );
    console.log('✅ List Streams:', listResponse.data);

    // 8. Stop Stream
    console.log('\n📝 Testing: Stop Stream');
    const stopResponse = await axios.post(
      `${API_BASE_URL}/stream/stop/${streamKey}`,
      {},
      { headers: validHeaders }
    );
    console.log('✅ Stop Stream Response:', stopResponse.data);

    console.log('\n✨ All E2E tests completed successfully!');
    console.log('\n📋 Next Steps (Manual Streaming Test):');
    console.log('1. Ensure NestJS app is running (E2E_TEST_MODE can be false now).');
    console.log('2. Ensure actual Firebase env vars are set for non-mocked mode.');
    console.log('3. Obtain a real Firebase ID token for your test user.');
    console.log('4. Use a tool like Postman or a frontend app to get stream credentials with the real token.');
    console.log('5. Open OBS Studio...');
    console.log(`6. Stream URL: ${streamUrl} (from step 4)`);
    console.log(`7. Stream Key: ${streamKey} (from step 4)`);
    console.log('8. Click "Start Streaming"');
    console.log(`9. View your stream at: ${hlsUrl} (from step 4)`);

  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('\n❌ Error testing endpoints (with VALID token):', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        config_url: error.config?.url,
        data: error.response?.data,
        headers: error.response?.headers
      });

      if (error.response?.status === 401) {
        console.log('\n🔑 Authentication Error with VALID token:');
        console.log('1. Double-check E2E_TEST_MODE=true is set when running the NestJS app.');
        console.log('2. Verify the mock implementation in firebase.config.ts for "valid-e2e-firebase-token".');
        console.log('3. Check NestJS app console output for any Firebase or auth related errors.');
      }
    } else {
      console.error('\n❌ Unexpected error during E2E tests:', error);
    }
  }
}

// Run the tests
testStreamEndpoints();
