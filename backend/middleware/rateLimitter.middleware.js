const MAX_REQ_PER_USER = 2;
const MAX_USERS = 2;
const MAX_TIME_BTW_CONSEQ_REQ = 3;//seconds

const simulateRateLimitter = async () => {
    const userRequests = new Map();
    for (let i = 1; i <= MAX_USERS; i++) {
        const userId = `user${i}`;
        userRequests.set(userId, [0, ""]);
    }

    for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        var rand_user = Math.floor(Math.random() * MAX_USERS) + 1;
        let userId = `user${rand_user}`;
        let currentReqs = userRequests.get(userId)[0];
        let lastRequest = userRequests.get(userId)[1]
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        const diff = getTimeDifferenceManual(lastRequest, timeString);
        if (currentReqs < MAX_REQ_PER_USER && (lastRequest === "" || diff >= MAX_TIME_BTW_CONSEQ_REQ)) {
            let randTime = Math.floor(Math.random() * 1000);
            await new Promise(resolve => setTimeout(resolve, randTime));
            userRequests.set(userId,[ currentReqs + 1,timeString]);
            console.log(`✅ Request from ${userId} @ ${timeString} processed in ${randTime}. Total requests: ${userRequests.get(userId)[0]}`);
            userRequests.set(userId,[ currentReqs,timeString]);
        } else {
            console.log(`❌ Request from ${userId} blocked due to rate limiting. Last Req=${lastRequest} currReq=${timeString} diff=${diff}`);
        }
    }
}
/**
 * Converts HH:MM:SS string to total seconds.
 * @param {string} timeString - Time in "HH:MM:SS" format.
 * @returns {number} Total seconds.
 */
function timeStringToSeconds(timeString) {
    const parts = timeString.split(':').map(Number); // [H, M, S]

    // Total seconds = (Hours * 3600) + (Minutes * 60) + Seconds
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
}

function getTimeDifferenceManual(startTime, endTime) {
    const startSeconds = timeStringToSeconds(startTime);
    const endSeconds = timeStringToSeconds(endTime);

    return endSeconds - startSeconds;
}



simulateRateLimitter()


