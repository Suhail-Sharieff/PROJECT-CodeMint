# Implementation Plan - Authentication Flow & Database Indexing Optimizations

This plan outlines the approach to optimize Codemint's authentication flow and MySQL database queries. By caching JWT verification, bypassing redundant DB lookups on socket connection, caching user profiles in Redis, and safely applying targeted composite indexes, we can significantly reduce CPU usage and MySQL pool queueing.

## User Review Required

> [!IMPORTANT]
> - We will use the existing Redis cluster (already running on port 6379) to store cached JWT tokens and user profiles. The token caches will have a dynamic TTL matching the token's remaining lifespan, and user profile caches will have a default TTL of 1 hour.
> - We will introduce a safe database index provisioning script (`backend/Utils/db_indexing.js`) that runs at startup. This prevents duplicate key errors on subsequent server restarts while ensuring index optimization is applied automatically.

---

## Proposed Changes

### 1. Redis-Based JWT Caching

#### [MODIFY] [auth.middleware.js](file:///c:/Users/suhai/Desktop/PROJECT-CodeMint/backend/middleware/auth.middleware.js)
- Import `crypto` to generate SHA256 hashes of the JWT tokens (saving memory in Redis instead of caching the full long JWT string as keys).
- In `verifyJWT`, check Redis first for `jwt:auth:${tokenHash}`.
- If cached, deserialize the user payload, assign it to `req.user`, and call `next()`.
- If not cached:
  1. Verify the JWT cryptographically using `jwt.verify`.
  2. Map decoded properties to `req.user`.
  3. Store `req.user` in Redis under `jwt:auth:${tokenHash}` with a TTL matching the token's remaining time (`decoded.exp - currentTime`).

#### [MODIFY] [socket_events.js](file:///c:/Users/suhai/Desktop/PROJECT-CodeMint/backend/socket_events.js)
- Import `redis` from `redis_connection.utils.js` and `crypto`.
- In the Socket.IO `io.use` authentication middleware:
  1. Compute the SHA-256 hash of the handshake token.
  2. Check Redis for `jwt:auth:${tokenHash}`.
  3. If cached, assign the parsed user object directly to `socket.user` and bypass both `jwt.verify` and the MySQL query (`SELECT user_id, name, email FROM user WHERE user_id = ?`).
  4. If not cached, fall back to verification, query the database, cache the result in Redis with the token's remaining TTL, and assign it to `socket.user`.

#### [MODIFY] [token_generator.utils.js](file:///c:/Users/suhai/Desktop/PROJECT-CodeMint/backend/Utils/token_generator.utils.js)
- Import `redis` from `redis_connection.utils.js`.
- In `getUserById(user_id)`:
  1. Check Redis first for `user:profile:${user_id}`.
  2. If found, deserialize and return it immediately.
  3. If not found, fetch from the database, cache in Redis with a TTL of 3600 seconds, and return it.
- **Bugfix**: In `getUserById`, change the invalid class instantiation `throw ApiError(...)` to `throw new ApiError(...)` on line 47.

---

### 2. Database Indexing

#### [NEW] [db_indexing.js](file:///c:/Users/suhai/Desktop/PROJECT-CodeMint/backend/Utils/db_indexing.js)
- Create a utility module containing helper function `createIndexSafe(tableName, indexName, indexDefinition)`.
- It executes `ALTER TABLE tableName ADD INDEX indexName indexDefinition` and gracefully swallows error `ER_DUP_KEYNAME` (1061) if the index already exists.
- Define a function `createIndexes()` to create the following optimization indexes:
  - `idx_test_submissions_test_user` on `test_submissions(test_id, user_id)` (optimizes user test progress fetches)
  - `idx_battle_submissions_battle_user` on `battle_submissions(battle_id, user_id)` (optimizes user duel progress fetches)
  - `idx_messages_session_created` on `messages(session_id, created_at)` (optimizes chat history fetches with order by)
  - `idx_kafka_dlq_created_at` on `kafka_dlq(created_at)` (optimizes DLQ worker batching)

#### [MODIFY] [index.js](file:///c:/Users/suhai/Desktop/PROJECT-CodeMint/backend/index.js)
- Import `createIndexes` from `./Utils/db_indexing.js`.
- Run `await createIndexes()` inside `startServer()` immediately after `await initDB(init_query)`.

---

## Verification Plan

### Automated Tests
- Run k6 stress testing to check performance and error rate:
  `k6 run --vus 10 --duration 10s backend/test/stress_test.js`
- Verify that request response times (`http_req_duration`) decrease, and no CPU bottlenecking or `wsarecv`/`connectex` socket disconnects occur.
- Check backend console logs to ensure Redis cache hits are occurring, and database indexes are safely created/skipped without errors.
