let Crypto = require('@aeternity/aepp-sdk').Crypto
let fromExponential = require('from-exponential')
let now = require('performance-now')
let clients = require('../init/accounts')

async function executeWithStats(wallet, func) {
    let startBalance = await clients.main().balance(wallet)
    let startTime = now()
    let result = await func()
    let endTime = now()
    let endBalance = await clients.main().balance(wallet)
    console.log(`Tx processed. Cost: $${aeonToDollar(startBalance - endBalance)} Time: ${(endTime - startTime)/1000} s\n`)
    return result
}

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
    executeWithStats
})