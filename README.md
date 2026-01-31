# Codemint 
> Monolith Architechture

Codemint is a scalable, real-time collaborative coding platform designed for **pair programming**, **competitive coding duels**, and **secure, proctored online assessments (OAs)**. The platform emphasizes **event-driven architecture**, **low-latency communication**, and **production-grade scalability and observability**.

---

## Features

- Real-time collaborative coding sessions
- Competitive coding duels between users
- Timed and proctored online assessments
- JWT-based secure authentication and authorization
- Live updates using WebSockets (Socket.IO)
- Event-driven, fault-tolerant backend processing
- Metrics, monitoring, and observability

---

## Technology Stack

### Frontend
- React
- Socket.IO Client

### Backend
- Node.js
- Express.js
- Socket.IO
- JWT Authentication

### Database and Caching
- MySQL (primary relational datastore)
- Redis (clustered) for caching and socket affinity

### Messaging and Architecture
- Apache Kafka
  - Event-based communication
  - Backpressure handling
  - Retry mechanisms
  - Dead Letter Queue (DLQ) for failed events

### Scalability and Reliability
- Node.js clustering for efficient CPU utilization
- Redis-based socket affinity for real-time connections
- Horizontal scalability with cluster-aware design

### Monitoring and Observability
- Prometheus for metrics collection
- Grafana for dashboards and visualization

---

## Architecture Overview
![Monolith Architechture](./assets/system_design.drawio.png)
Codemint currently follows a **monolithic architecture**, internally organized using **event-driven design principles** to ensure scalability and loose coupling.

Key architectural aspects:
- Decoupled internal modules communicating via Kafka events
- Stateless API layer with Redis-backed session and socket management
- Cluster-aware real-time communication using Socket.IO
- Reliable message processing with retries and DLQ support

---

## Database Schema

![Database Schema](./assets/db_schema.drawio.png)

---

## System Design (Monolithic – High Level)

![System Design](./assets/system_design.drawio.png)

---

## Application Screenshots

> Current UI version. Visual and UX improvements are in progress.

![1](https://github.com/user-attachments/assets/f08489cc-c11b-4420-a076-82f9464d4946)
![2](https://github.com/user-attachments/assets/c9fb8a1d-27b6-4fe3-918e-75b275027297)
![3](https://github.com/user-attachments/assets/52a257d1-7e2c-4e5c-92d3-948d53bcc8be)
![4](https://github.com/user-attachments/assets/2756419e-28ca-4e23-b436-fb075b84c18b)
![5](https://github.com/user-attachments/assets/a7bb118a-7802-404b-a6e2-0c9c8acaed99)
![6](https://github.com/user-attachments/assets/37d85e9c-3106-49a4-8001-cd0c90c414ae)
![7](https://github.com/user-attachments/assets/54dae731-dabc-4b12-9a2a-61ee7ce92318)
![8](https://github.com/user-attachments/assets/2d96ea54-5029-411f-be0b-aa035a22c147)
![9](https://github.com/user-attachments/assets/90b9493c-25fa-41fe-946f-84b5794b0539)
![10](https://github.com/user-attachments/assets/288d5158-3da2-4a54-916a-872a2e8536cc)

---

## Upcoming Enhancements

- AI-powered plagiarism detection during online assessments using YOLOS
- WebRTC-based audio and video support for collaboration and proctoring
- Load balancing and auto-scaling infrastructure
- API rate limiting for abuse prevention and fair usage enforcement

---

## Engineering Highlights

- Event-driven architecture using Apache Kafka for scalability and fault tolerance
- Redis clustering for high-performance real-time communication
- Node.js clustering to maximize resource utilization
- Backpressure-aware event consumers with retry logic
- Dead Letter Queues to isolate and analyze failed events
- Production-grade monitoring with Prometheus and Grafana

---

## Challenges I faced and how I solved them

- When I try to utilize all CPU cores by Node clustering, the socket connections started to break or the event werent sending msg at all. Solved it by integrating Redis Sticky Sessions.
- Earlier the code used to sync into DB just after the update in editor, it lead to lagging in UI and DB crash. Fixed it by adding debouncing in UI and event based DB updates using Kafka
