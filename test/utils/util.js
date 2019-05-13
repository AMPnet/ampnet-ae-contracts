let Crypto = require('@aeternity/aepp-sdk').Crypto
let fromExponential = require('from-exponential')

function decodeAddress(address) {
    const decoded = Crypto.decodeBase58Check(address.split('_')[1]).toString('hex')
    return `0x${decoded}`
}

let factor = 1000000000000000000; // 10e18 (1 EUR = 10e18 tokens)

function eurToToken(eur) {
    return fromExponential(eur * factor);
}

function tokenToEur(token) {
    return token / factor
}

function aeonToDollar(ae) {
    return (ae / factor) * 0.46
}

Object.assign(exports, {
    decodeAddress,
    eurToToken,
    tokenToEur,
    aeonToDollar
})