
import { asyncHandler } from "../utils/asyncHandler.js";
import { io } from "../main.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { v4 as uuidv4 } from 'uuid';
import SERVER_LOG from "../utils/server_log.js";
import { ApiResponse } from "../utils/api_response.js";
import { ApiError } from "../utils/api_error.js";


// Store active sessions and participants
const sessions = new Map();
const participants = new Map();

const initSocketHandlers = (__initilaized_sock__) => {
    io.use(verifyJWT)
    io.on('connection', (clientSocket) => {
        console.log('clientSocket connected:', clientSocket.id, 'user:', clientSocket.user);
        clientSocket.on('join-session', (data) => {
            const { sessionId, email, role } = data;
            const session = sessions.get(sessionId);

            if (!session) {
                clientSocket.emit('error', { message: 'Session not found' });
                return;
            }

            clientSocket.join(sessionId);

            const participant = {
                id: clientSocket.id,
                email: email,
                role: role,
                joinedAt: new Date()
            };

            session.participants.push(participant);
            participants.set(clientSocket.id, { sessionId, ...participant });

            // Send current session state to the new participant
            clientSocket.emit('session-state', {
                code: session.code,
                language: session.language,
                chat: session.chat,
                participants: session.participants,
                isTestMode: session.isTestMode,
                testData: session.testData
            });

            // Notify others about new participant
            clientSocket.to(sessionId).emit('participant-joined', participant);

            console.log(`${userName} (${role}) joined session ${sessionId}`);
        });

        // Handle code changes
        clientSocket.on('code-change', (data) => {
            const participant = participants.get(clientSocket.id);
            if (!participant) return;

            const { sessionId } = participant;
            const session = sessions.get(sessionId);
            if (!session) return;

            // Only teacher can broadcast code changes to all students
            if (participant.role === 'teacher') {
                session.code = data.code;
                session.language = data.language;
                clientSocket.to(sessionId).emit('code-update', data);
            } else {
                // Student code is sent only to teacher
                const teacherSockets = [...io.sockets.sockets.values()]
                    .filter(s => {
                        const p = participants.get(s.id);
                        return p && p.sessionId === sessionId && p.role === 'teacher';
                    });

                teacherSockets.forEach(teacherSocket => {
                    teacherSocket.emit('student-code-update', {
                        studentId: clientSocket.id,
                        studentName: participant.name,
                        code: data.code,
                        language: data.language
                    });
                });
            }
        });




        // Handle code changes
        clientSocket.on('code-change', (data) => {
            const participant = participants.get(clientSocket.id);
            if (!participant) return;

            const { sessionId } = participant;
            const session = sessions.get(sessionId);
            if (!session) return;

            // Only teacher can broadcast code changes to all students
            if (participant.role === 'teacher') {
                session.code = data.code;
                session.language = data.language;
                clientSocket.to(sessionId).emit('code-update', data);
            } else {
                // Student code is sent only to teacher
                const teacherSockets = [...io.sockets.sockets.values()]
                    .filter(s => {
                        const p = participants.get(s.id);
                        return p && p.sessionId === sessionId && p.role === 'teacher';
                    });

                teacherSockets.forEach(teacherSocket => {
                    teacherSocket.emit('student-code-update', {
                        studentId: clientSocket.id,
                        studentName: participant.name,
                        code: data.code,
                        language: data.language
                    });
                });
            }
        });

        // Handle chat messages
        clientSocket.on('chat-message', (data) => {
            const participant = participants.get(clientSocket.id);
            if (!participant) return;

            const { sessionId } = participant;
            const session = sessions.get(sessionId);
            if (!session) return;

            const message = {
                id: uuidv4(),
                userId: clientSocket.id,
                userName: participant.name,
                role: participant.role,
                message: data.message,
                timestamp: new Date()
            };

            session.chat.push(message);

            // Broadcast message to all participants in the session
            io.to(sessionId).emit('chat-message', message);
        });

        // Handle test mode
        clientSocket.on('start-test', (data) => {
            const participant = participants.get(clientSocket.id);
            if (!participant || participant.role !== 'teacher') return;

            const { sessionId } = participant;
            const session = sessions.get(sessionId);
            if (!session) return;

            session.isTestMode = true;
            session.testData = {
                question: data.question,
                timeLimit: data.timeLimit,
                startTime: new Date(),
                submissions: []
            };

            io.to(sessionId).emit('test-started', session.testData);
        });

        // Handle test submission
        clientSocket.on('submit-test', (data) => {
            const participant = participants.get(clientSocket.id);
            if (!participant) return;

            const { sessionId } = participant;
            const session = sessions.get(sessionId);
            if (!session || !session.isTestMode) return;

            const submission = {
                studentId: clientSocket.id,
                studentName: participant.name,
                code: data.code,
                language: data.language,
                submittedAt: new Date()
            };

            session.testData.submissions.push(submission);

            // Notify teacher about submission
            const teacherSockets = [...io.sockets.sockets.values()]
                .filter(s => {
                    const p = participants.get(s.id);
                    return p && p.sessionId === sessionId && p.role === 'teacher';
                });

            teacherSockets.forEach(teacherSocket => {
                teacherSocket.emit('test-submission', submission);
            });

            clientSocket.emit('submission-received');
        });


        // Handle disconnect
        clientSocket.on('disconnect', () => {
            const participant = participants.get(clientSocket.id);
            if (participant) {
                const { sessionId } = participant;
                const session = sessions.get(sessionId);

                if (session) {
                    session.participants = session.participants.filter(p => p.id !== clientSocket.id);
                    clientSocket.to(sessionId).emit('participant-left', participant);
                }

                participants.delete(clientSocket.id);
            }

            console.log('User disconnected:', clientSocket.id);
        });
    })
}


const createSession = asyncHandler(
    (req, res) => {
        const hostName = req.user.email;
        const sessionId = uuidv4()
        SERVER_LOG(`Creating session by ${hostName} with id:${sessionId}`)
        session_map.set(
            sessionId,
            {
                sessionId: sessionId,
                hostName: hostName,
                participantsList: [],
                code: `// Welcome students!`,
                language: 'javascript',
                chat_list: [],
                createdAt: new Date(),
                joinLink: `${process.env.BACKEND_URI}/session/join/${sessionId}`
            }
        )
        res.send(new ApiResponse(200, session_map.get(sessionId), "Session created successfully"))
    }
)



export {
    createSession,
    initSocketHandlers,
}