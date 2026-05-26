# Whats added in v5?
- i initially thought like migrating from MySQL to some wide column DB like Cassandra, since my app is write heavy, but then realized that then i would have to implement complex normalization and denormalization logic at my application layer, since the app does some complex joins, aggregations and computations
- so i decided to stick with Mysql itself
- further, the DB writes were still a thing of concern, though i had debouncing logic in the editor when i tested against 500 VUs, i observed DB connection pool exhuastion or resource exhuastion
- Her's how i optimized it:
- **Collaborative Coding Sessions**:
   * In [session.controller.js](./backend/controller/session.controller.js), active workspace updates (`host_code_change` and `joinee_code_change`) write intermediate keystrokes directly to Redis (`session:code:${session_id}:${user_id}`).
   * The database updates via Kafka are debounced to a maximum of once every **5 seconds**.
   * On room termination (`end_session`) or user connection loss (`disconnect`), the active timers are immediately cleared and flushed to the database.
   * `join_session` performs cache-first lookups to restore the latest state from Redis before falling back to MySQL.

2. **Competitive Coding Duels (Battles)**:
   * In [battle.controller.js](./backend/controller/battle.controller.js), code changes are instantly pushed to Redis Hash structures (`battle:codes:${battle_id}:${user_id}`) under the respective `battle_question_id` key.
   * Database updates are debounced by **5 seconds** and flushed immediately when the user disconnects or manually submits their solution (`submit_battle`).
   * `join_battle` retrieves the participant's current codes directly from the Redis Hash, resolving cache misses from the database.

3. **Online Assessments (Tests)**:
   * In [test.controller.js](./backend/controller/test.controller.js), the same pattern is applied. Code changes in `save_code` update the Redis Hash (`test:codes:${test_id}:${user_id}`) and queue a debounced Kafka db-query write.
   * Debounce timers are flushed on `submit_test` or `disconnect`.
   * `join_test` queries Redis first to load the student's current progress.

| Metric | Earlier Optimized | Latest Optimized | Status |
| :--- | :--- | :--- | :--- |
| Failure Rate | 0.39% | 0.26% | ✅ Near-original |
| Avg Response Time | 127.35ms | 113.99ms | ✅ Improved further |
| Median Response Time | 129ms | 110ms | ✅ Much closer |
| P90 Latency | 230.55ms | 216.79ms | ✅ Nearly identical |
| P95 Latency | 253.63ms | 248.64ms | ✅ Almost exact match |
| Max Response Time | 338.64ms | 369.63ms | ⚠ Slightly higher |
| Total Requests | 3012 | 3008 | ✅ Equivalent |
| Iterations | 1006 | 1004 | ✅ Equivalent |
| Auth Success Rate | 99.4% | 99.6% | ✅ Excellent |
| WebSocket Reliability | Excellent | Excellent | ✅ Stable |

- ``Verdict` : The System perfoms efficiently upto 500 concurrent users per session/battle/tests
