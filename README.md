# What changes in v6
- Current architecture is based on `Last write wins` strategy, implemented using Redis and kafka, decoupling DB writes from changes
- But, the cursor in monaco editor keeps jumping(especially when the user types very fast)
- This happens becoz, tho the DB writes are decoupled, still each sender emits their entire code to the receiver, the receiver needs to replace entire code with new one, even for a small change in the code, leading to cursor jumping

- The solution is to use Operational Transformation (OT)
### How Operational Transformation (OT) Works
Instead of sending the whole file, clients send only the **operations** (incremental edits). An operation consists of three basic actions:
* `Insert(position, text)`
* `Delete(position, length)`
* `Retain(length)` (moves the cursor forward without modifying)

When Client A and Client B concurrently edit the document, the server receives both operations and **transforms** them so they converge on the same text.
For example, if the document is `"abc"`:
* Client A inserts `"x"` at index 0 $\rightarrow$ `opA = Insert(0, "x")` $\rightarrow$ final text `"xabc"`
* Client B inserts `"y"` at index 3 $\rightarrow$ `opB = Insert(3, "y")` $\rightarrow$ final text `"abcy"`

If the server receives `opA` first, it transforms `opB` to account for `opA`'s insertion (shifting the insertion index of `opB` by +1 to index 4). The transformed operation `opB'` is applied to get `"xabcy"`.

---

### Implementation Plan: Changes Needed in Codemint

To replace the full-buffer updates with an OT-based collaboration flow, you need to make the following changes:

```mermaid
sequenceDiagram
    participant Client A (Monaco)
    participant Server (Socket.IO + Redis)
    participant Client B (Monaco)

    Client A (Monaco)->>Server (Socket.IO + Redis): Send Op(Insert "x" at 0, baseRev: 5)
    Note over Server (Socket.IO + Redis): Transform Op against concurrent edits
    Server (Socket.IO + Redis)-->>Client A (Monaco): Acknowledge Op (newRev: 6)
    Server (Socket.IO + Redis)->>Client B (Monaco): Broadcast Transformed Op(Insert "x" at 0)
    Note over Client B (Monaco): Apply Op locally using Monaco Editor Model API
```

#### 1. Client-Side Changes (UI)
* **Editor Integration**: Instead of sending code changes on simple keystrokes, listen to the raw changes of the code editor (e.g., Monaco Editor's `onDidChangeModelContent`). Monaco provides an event containing an array of `changes` with `range`, `rangeLength`, and `text`.
* **OT Client Lifecycle**: Implement an OT client engine (often using the `ot.js` library). The client must track:
  1. `revision`: The server-confirmed document revision index.
  2. `pendingOp`: The operation currently sent to the server awaiting an acknowledgment.
  3. `bufferOp`: Operations the user performed locally while waiting for the server's ack.
* When the server acknowledges a sent operation, the client sends its buffered operations next.

#### 2. Server-Side Changes (`backend`)
* **Document History Tracking**: In [session.controller.js](file:///c:/Users/suhai/Desktop/PROJECT-CodeMint/backend/controller/session.controller.js), maintain a history log of operations and the current revision number in Redis for every active session.
* **Transformation Logic**:
  When the server receives an operation `op` at base revision `clientRev`:
  1. If `clientRev === serverRev` (no concurrent edits), apply `op` to the document in Redis, increment `serverRev`, and broadcast `op` to other participants.
  2. If `clientRev < serverRev` (concurrent edits occurred), the server transforms `op` against all operations in the history log from `clientRev` to `serverRev`. Apply the transformed operation `op'`, increment `serverRev`, save it to the history log, broadcast `op'`, and send an acknowledgment back to the sender.

#### 3. Database Caching Changes
* The periodic Kafka database updates will write the current consolidated text string from the Redis state to MySQL, keeping the database writes decoupled from the WebSocket operational throughput.

---

### 💡 Highly Recommended Alternative: CRDTs via Yjs
While OT is powerful, writing transformation math manually is complex and prone to edge-case bugs. A modern, cleaner alternative is **Yjs**, a high-performance **CRDT (Conflict-free Replicated Data Type)** library.

Implementing Yjs in Codemint is significantly easier:
1. **Client-side**:
   Use `@monaco-editor/react` (or your raw editor) paired with `yjs` and `y-monaco` bindings. Yjs handles cursor positions and text insertions automatically.
2. **Server-side**:
   Run a `y-websocket` server provider. You can integrate this directly into [socket_events.js](file:///c:/Users/suhai/Desktop/PROJECT-CodeMint/backend/socket_events.js). Instead of custom event listeners, Socket.IO wraps Yjs binary state updates, and Yjs takes care of syncing and resolving conflicts out of the box.