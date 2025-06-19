# Documentation

## src/app.controller.ts

This file defines the main controller for the application. It currently has a single GET route that returns a welcome message.

## src/app.datasource.ts

This file configures the data source for TypeORM. It sets up a SQLite database and specifies the entities to be used.
**Note:** It seems there might be a slight duplication or alternative setup for TypeOrmModule.forRoot here, as it's also present in `app.module.ts`.

## src/app.module.ts

This is the main module for the NestJS application. It imports and configures various other modules, including:
- `ConfigModule`: For application configuration.
- `AdsModule`: Likely handles advertising-related features.
- `AuthModule`: For authentication and authorization.
- `StreamModule`: Manages live streaming functionalities.
- `VodModule`: Handles Video on Demand (VOD) features.
- `MetricsModule`: Deals with metrics and analytics.
- `TypeOrmModule`: Configures the database connection (SQLite) and entities (`Stream`, `User`).

It also provides `NmsService` (Node Media Server Service) and `StreamService`.
Crucially, it applies the `ClerkMiddleware` to the 'stream' routes, indicating that these routes require authentication handled by Clerk.

## src/main.ts

This is the entry point of the NestJS application. It performs the following key functions:
- Creates a NestJS application instance using `AppModule`.
- Registers Clerk middleware for authentication.
- Enables Cross-Origin Resource Sharing (CORS) to allow communication with the frontend (presumably `https://airena-streamui.vercel.app`).
- Optionally serves static assets from a 'public' directory.
- Retrieves an instance of `NmsService` and initializes the Node Media Server by calling `nmsService.onModuleInit()`.
- Starts the application, listening on port 3000 on all available network interfaces (`0.0.0.0`).

## src/ads/ads.controller.ts

This file defines the controller responsible for ad-related requests.
- It has a route `GET /ads/vast-tag`.
- This route calls `adsService.generateVastTag()` to get a VAST (Video Ad Serving Template) tag.
- It attempts to access user information from the request (`req.user`), presumably populated by a JWT authentication guard, though the guard is not explicitly applied in this controller.

## src/ads/ads.module.ts

This file defines the `AdsModule` for NestJS.
- It declares `AdsController` as a controller within this module.
- It provides `AdsService` as a service.

## src/ads/ads.service.ts

This service is responsible for generating VAST tags.
- The `generateVastTag` method constructs a VAST tag URL for Google Ad Manager (DoubleClick).
- It can take user preferences (like `interest` and `age`) to customize the ad targeting. If preferences are not provided, it defaults to 'gaming' for interest and 25 for age.
- The `description_url` is hardcoded to `airena.app`.

## src/auth/auth.module.ts

This module configures authentication using PassportJS with a custom Clerk JWT strategy.
- It imports `PassportModule` and registers 'clerk-jwt' as the default strategy.
- It provides `ClerkJwtStrategy` (the custom strategy for validating Clerk JWTs) and `ClerkAuthGuard` (a guard that can be used to protect routes).
- It exports `ClerkAuthGuard` so it can be used in other modules.

## src/auth/clerk.middleware.ts

This file defines `ClerkMiddleware`, a NestJS middleware for Clerk authentication.
- It uses `getAuth` from `@clerk/express` to retrieve authentication information from the request.
- If authentication fails (no `auth` object or `auth.userId`), it throws an `UnauthorizedException`.
- If authentication is successful, it attaches the `auth` object and a simplified `user` object (containing `sub` which is the `userId`) to the request object. This allows downstream handlers and services to access user information.

## src/auth/clerk.strategy.ts

This file implements the `ClerkJwtStrategy` for PassportJS, specifically for validating JWTs issued by Clerk.
- It extends `PassportStrategy` using `passport-jwt`'s `Strategy`.
- **JWT Extraction**: It extracts the JWT from the `Authorization` header as a bearer token.
- **JWKS URI**: It uses `jwks-rsa` to fetch the JSON Web Key Set (JWKS) from the Clerk development instance (`https://civil-stallion-7.clerk.accounts.dev/.well-known/jwks.json`). This is used to verify the signature of the JWT. It includes caching and rate-limiting for JWKS fetching.
- **Issuer and Algorithm**: It specifies the expected issuer (`https://civil-stallion-7.clerk.accounts.dev`) and algorithm (`RS256`) for the JWTs.
- **Validation**: The `validate` method takes the decoded JWT payload and returns an object containing `userId` (from `payload.sub`), `email`, and the rest of the payload. This returned object becomes `req.user` in protected routes.

## src/auth/jwt-auth.guard.ts

This file defines `ClerkAuthGuard`, which is a NestJS authentication guard.
- It extends `AuthGuard` from `@nestjs/passport` and specifically uses the 'clerk-jwt' strategy.
- This guard can be applied to controllers or specific routes to ensure that only authenticated users (with a valid Clerk JWT) can access them.

## src/data/streaming.db

This is a SQLite database file. It is used by TypeORM to store application data, likely including stream information and user data as defined in the entities.

## src/metrics/metric.controller.ts

This controller handles HTTP requests related to stream metrics.
- `GET /metrics/:streamKey`: Fetches metrics for a specific stream identified by `streamKey`.
- `GET /metrics`: Fetches metrics for all current streams.
It uses `MetricService` to retrieve the metrics data.

## src/metrics/metric.module.ts

Defines the `MetricsModule` for NestJS.
- It provides `MetricService` for handling metric logic and `MetricGateway` for WebSocket communication of metrics.
- It declares `MetricController` to handle HTTP requests for metrics.
- It exports `MetricService` and `MetricGateway` for use in other modules.

## src/metrics/metric.service.spec.ts

This file contains unit tests for `MetricService`.
- It uses Jest as the testing framework.
- It mocks `MetricGateway` to isolate the service logic during tests.
- **Tests cover**:
    - `updateMetrics`: Initializing metrics for new streams, updating existing metrics, and ensuring `gateway.broadcastMetrics` is called.
    - `getMetrics`: Retrieving metrics for existing and non-existent stream keys.
    - `getAllMetrics`: Retrieving all stored metrics.
    - `resetMetrics`: Deleting metrics for a stream key.
- It ensures that the internal metrics store is cleared before each test.

## src/metrics/metric.service.ts

This service manages real-time metrics for video streams.
- **`MetricState` Interface**: Defines the structure for metrics data (bitrate, bandwidth, latency, lastUpdated).
- **Storage**: It keeps an in-memory record (`metrics`) of `MetricState` for each active stream, indexed by `streamKey`.
- **`updateMetrics(streamKey, updates)`**:
    - Updates the metrics for a given `streamKey` with the provided `updates`.
    - If the `streamKey` is new, it initializes its metrics.
    - Sets `lastUpdated` to the current timestamp.
    - Calls `gateway.broadcastMetrics` to send the updated metrics (including the `streamKey`) to connected clients via WebSockets.
- **`getMetrics(streamKey)`**: Returns the metrics for a specific `streamKey`, or `null` if not found.
- **`getAllMetrics()`**: Returns the entire `metrics` object containing data for all streams.
- **`resetMetrics(streamKey)`**: Deletes the metrics data for a specific `streamKey`.
- It depends on `MetricGateway` to broadcast metric updates.

## src/metrics/metrics.gateway.ts

This file defines a WebSocket gateway for broadcasting stream metrics.
- It uses `@nestjs/websockets` and `socket.io`.
- **`@WebSocketGateway({ cors: true })`**: Initializes the gateway, enabling CORS for WebSocket connections.
- **`@WebSocketServer() server: Server`**: Injects the `socket.io` server instance.
- **`afterInit()`**: Logs a message when the WebSocket server is initialized.
- **`broadcastMetrics(streamKey, data)`**:
    - Emits a 'metricsUpdate' event to all connected clients.
    - The `data` object, which includes the `streamKey` and other metric details, is sent as the event payload. This allows clients to receive real-time updates for specific streams or all streams.

## src/nms/nms.service.spec.ts

This file contains unit tests for the `NmsService` (Node Media Server Service).
- It uses Jest for testing and extensively mocks dependencies like `ConfigService`, `MetricService`, `VodService`, `Logger`, `child_process`, and `node-media-server`.
- **Key Test Areas**:
    - **Configuration**: Verifies that `FFMPEG_PATH` and `MEDIA_ROOT` are correctly retrieved from `ConfigService` and used to configure `NodeMediaServer`.
    - **NMS Initialization**: Ensures that `NodeMediaServer` is instantiated with the correct configuration and that event handlers (`postPublish`, `donePublish`, `error`) are registered, and `nms.run()` is called.
    - **`postPublish` Event - FFmpeg Spawning**:
        - Checks that the correct `ffmpegPath` (from config) is used when spawning FFmpeg processes for VOD recording and metrics collection.
        - Tests error handling for FFmpeg process spawning (if `child_process.spawn` throws).
        - Tests error handling if the spawned FFmpeg processes themselves emit an 'error' event or close with a non-zero exit code.
- **Mocking Strategy**:
    - `NodeMediaServer` is mocked to control its behavior and spy on its methods.
    - `child_process.spawn` is mocked to simulate FFmpeg process creation and control their output/events.
    - Services (`MetricService`, `VodService`) are mocked to isolate `NmsService` logic.
    - `Logger` is mocked to verify logging calls.
- **Limitations Noted in Test Comments**: The tests acknowledge that more sophisticated mocking of `child_process.spawn` would be needed to differentiate event handling for multiple FFmpeg processes spawned in the same handler (e.g., VOD and Metrics FFmpeg instances).
- **Custom `expect` Matchers**: The file includes a minimal, self-contained implementation of `expect` and some common Jest matchers (`objectContaining`, `arrayContaining`, `stringContaining`, `any`) for type compatibility and basic assertion functionality, suggesting it might be run in an environment where Jest's global `expect` is not fully available or to ensure specific matching behavior.

## src/nms/nms.service.ts

This service is responsible for integrating and managing the Node Media Server (NMS) within the NestJS application. NMS handles RTMP streaming, HLS transcoding, and other media processing tasks.
- **Dependencies**:
    - `MetricService`: To update real-time stream metrics.
    - `VodService`: To generate paths for Video on Demand (VOD) recordings.
    - `ConfigService`: To get configuration values like FFmpeg path and media root directory.
- **`onModuleInit()`**: This lifecycle hook is where the NMS is configured and started.
    - **Configuration**:
        - Retrieves `FFMPEG_PATH` and `MEDIA_ROOT` from `ConfigService`.
        - Sets up NMS configuration for RTMP (port, chunk size, etc.), HTTP (media root for serving files, port), and transcoding (`trans`).
        - The transcoding task is configured to enable HLS for streams in the 'live' application.
    - **NMS Instance**: Creates an instance of `NodeMediaServer` with the generated config.
    - **Event Handling**:
        - **`postPublish` (Stream Started)**:
            - Triggered when a new stream starts publishing to NMS.
            - Extracts `streamKey` from the `streamPath`.
            - **VOD Recording**:
                - Generates a VOD output path using `vodService.generateVodPath()`.
                - Spawns an FFmpeg process to record the RTMP stream to an MP4 file.
                - Includes detailed logging for FFmpeg's stderr, errors, and exit codes.
                - Calls `metricService.resetMetrics(streamKey)` when the VOD recording FFmpeg process closes (successfully or not), which might be an area to review if metrics should persist or be handled differently.
            - **Live Metrics Collection**:
                - Spawns another FFmpeg process to analyze the RTMP stream and extract metrics.
                - This FFmpeg instance outputs statistics to stdout.
                - The service parses `total_size` from FFmpeg's output to calculate `bitrate`.
                - It also calculates `latency` and estimates `bandwidth`.
                - `metricService.updateMetrics()` is called with the calculated metrics. It waits for a few data chunks (`dataChunksProcessed < 3`) before starting to send updates, possibly to allow metrics to stabilize.
                - Includes logging for FFmpeg's stderr, errors, and exit codes for the metrics process.
        - **`donePublish` (Stream Ended)**: Logs when a stream ends.
        - **`error` (NMS Global Error)**: Logs any global errors from the NMS instance.
    - **`this.nms.run()`**: Starts the Node Media Server.
- **Logging**: Uses NestJS `Logger` extensively to provide detailed logs for NMS events, FFmpeg processes (VOD and metrics), and errors.
