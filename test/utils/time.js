function currentTimeWithDaysOffset(days) {
    var result = new Date();
    result.setDate(result.getDate() + days);
    return result.getTime();
}

function currentTimeWithSecondsOffset(seconds) {
    var result = new Date();
    result.setSeconds(result.getSeconds() + seconds);
    return result.getTime();
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

Object.assign(exports, {
    currentTimeWithDaysOffset,
    currentTimeWithSecondsOffset,
    timeout
});
