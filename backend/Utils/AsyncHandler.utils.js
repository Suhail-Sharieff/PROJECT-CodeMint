const asyncHandler = (requestHandler) => {
    return async (req, res, next) => {
        const start = process.hrtime(); // High-resolution real time
        try {
            console.log("============================================");
            await requestHandler(req, res, next);
        } catch (err) {
            return next(err);
        } finally {
            const diff = process.hrtime(start);
            const seconds = diff[0] + diff[1] / 1e9;
            console.log(`⏳ API responded in ${seconds.toFixed(3)} seconds`);
            console.log("============================================");

        }
    }
}

export { asyncHandler }