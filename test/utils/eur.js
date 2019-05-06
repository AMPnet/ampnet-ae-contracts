var factor = 1000000000000000000;

var eurToToken = function (eur) {
    return eur * factor;
};

var tokenToEur = function (token) {
    return token / factor;
};

Object.assign(exports, {
    eurToToken,
    tokenToEur
});