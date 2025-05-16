import axios, { AxiosError } from 'axios';

// API Configuration
const API_BASE_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:3001';

// Test configuration
const TEST_STREAM_SETTINGS = {
  quality: 'high',
  maxBitrate: 5000,
  resolution: '1920x1080'
};

// TODO: Replace this with a fresh Clerk token
// You can get this by:
// 1. Logging into your application
// 2. Opening browser dev tools
// 3. Going to Application > Local Storage
// 4. Looking for the Clerk session token
const CLERK_TOKEN = 'eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDExMUFBQSIsImtpZCI6Imluc18yd1JkcWllM0lLTWs3NW9QUWVWaXBTV01xS3AiLCJ0eXAiOiJKV1QifQ';

const headers = {
  'Authorization': `Bearer ${CLERK_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testStreamEndpoints() {
  try {
    console.log('🚀 Starting Stream API Tests\n');

    // 1. Get Stream Key
    console.log('📝 Testing: Get Stream Key');
    const keyResponse = await axios.get(`${API_BASE_URL}/stream/key`, { headers });
    console.log('✅ Stream Key Response:', keyResponse.data);
    const streamKey = keyResponse.data.streamKey;
    const streamUrl = keyResponse.data.streamUrl;
    const hlsUrl = keyResponse.data.hlsUrl;

    // Verify the response format
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
      { headers }
    );
    console.log('✅ Start Stream Response:', startResponse.data);

    // 3. Get Stream Status
    console.log('\n📝 Testing: Get Stream Status');
    const statusResponse = await axios.get(
      `${API_BASE_URL}/stream/status/${streamKey}`,
      { headers }
    );
    console.log('✅ Stream Status:', statusResponse.data);

    // 4. Update Stream Settings
    console.log('\n📝 Testing: Update Stream Settings');
    const settingsResponse = await axios.post(
      `${API_BASE_URL}/stream/settings/${streamKey}`,
      TEST_STREAM_SETTINGS,
      { headers }
    );
    console.log('✅ Stream Settings Updated:', settingsResponse.data);

    // 5. Get Stream Details
    console.log('\n📝 Testing: Get Stream Details');
    const detailsResponse = await axios.get(
      `${API_BASE_URL}/stream/${streamKey}`,
      { headers }
    );
    console.log('✅ Stream Details:', detailsResponse.data);

    // 6. Get Stream Metrics
    console.log('\n📝 Testing: Get Stream Metrics');
    const metricsResponse = await axios.get(
      `${API_BASE_URL}/stream/metrics/${streamKey}`,
      { headers }
    );
    console.log('✅ Stream Metrics:', metricsResponse.data);

    // 7. List Streams
    console.log('\n📝 Testing: List Streams');
    const listResponse = await axios.get(
      `${API_BASE_URL}/stream/list`,
      { headers }
    );
    console.log('✅ List Streams:', listResponse.data);

    // 8. Stop Stream
    console.log('\n📝 Testing: Stop Stream');
    const stopResponse = await axios.post(
      `${API_BASE_URL}/stream/stop/${streamKey}`,
      {},
      { headers }
    );
    console.log('✅ Stop Stream Response:', stopResponse.data);

    console.log('\n✨ All tests completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Open OBS Studio');
    console.log('2. Go to Settings > Stream');
    console.log('3. Select "Custom" as the service');
    console.log(`4. Enter Stream URL: ${streamUrl}`);
    console.log(`5. Enter Stream Key: ${streamKey}`);
    console.log('6. Click "Start Streaming"');
    console.log(`7. View your stream at: ${hlsUrl}`);

  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('\n❌ Error testing endpoints:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });

      if (error.response?.status === 401) {
        console.log('\n🔑 Authentication Error:');
        console.log('1. Make sure you are logged in to the frontend application');
        console.log('2. Check that your Clerk token is valid');
        console.log('3. Verify that the backend is running on port 3000');
        console.log('4. Verify that the frontend is running on port 3001');
      }
    } else {
      console.error('\n❌ Unexpected error:', error);
    }
  }
}

// Run the tests
testStreamEndpoints(); 