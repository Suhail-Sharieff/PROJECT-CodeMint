const MAX_REQ_PER_USER = 2;
const MAX_USERS = 5;
const MAX_WINDOW_TIME = 10; // seconds

const timeStringToSeconds = (timeString) => {
    const parts = timeString.split(':').map(Number);
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
}

const simulateRateLimitter = async () => {
    // Map stores: { userId: [request_count, window_start_time_in_seconds] }
    const userRequests = new Map();

    for (let i = 1; i <= MAX_USERS; i++) {
        userRequests.set(`user${i}`, [0, 0]); // [count, window_start_time]
    }

    for (let i = 0; i < 30; i++) { // Increased iterations for testing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const rand_user = Math.floor(Math.random() * MAX_USERS) + 1;
        const userId = `user${rand_user}`;
        
        let [reqCount, windowStartSeconds] = userRequests.get(userId);

        const now = new Date();
        const nowSeconds = timeStringToSeconds(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
        const timeString = now.toLocaleTimeString('en-US');

        // --- CORE RATE LIMITER LOGIC ---

        // 1. Check if the current window has expired
        const windowElapsed = nowSeconds - windowStartSeconds;

        if (windowStartSeconds === 0 || windowElapsed >= MAX_WINDOW_TIME) {
            // Window expired or first request: Reset count and start new window
            reqCount = 0;
            windowStartSeconds = nowSeconds;
            console.log(`--- Window reset for ${userId} @ ${timeString}. ---`);
        }
        
        // 2. Check the count limit within the current window
        if (reqCount < MAX_REQ_PER_USER) {
            // Allow request, update counter and map
            reqCount += 1;
            userRequests.set(userId, [reqCount, windowStartSeconds]);
            
            // Simulate processing time
            let randTime = Math.floor(Math.random() * 100); 
            await new Promise(resolve => setTimeout(resolve, randTime));
            
            console.log(`✅ Request from ${userId} @ ${timeString} processed. Count: ${reqCount}/${MAX_REQ_PER_USER}.`);
            
        } else {
            // Deny request
            const waitTime = MAX_WINDOW_TIME - windowElapsed;
            console.log(`❌ DENIED ${userId} @ ${timeString}. Limit reached (${reqCount}). Window expires in ${waitTime.toFixed(1)}s.`);
        }
        // --- END CORE LOGIC ---
    }
}

simulateRateLimitter()