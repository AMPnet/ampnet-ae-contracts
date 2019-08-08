let fromExponential = require('from-exponential')
let now = require('performance-now')
let randomBytes = require('random-bytes')
let bs58 = require('bs58check')
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

function enforceAkPrefix(address) {
    return address.replace("ct_", "ak_")
}

async function generateRandomAeAddress() {
    let randAddress = await randomBytes(32)
    let randAddressEncoded = 'ak_' + bs58.encode(randAddress)
    return randAddressEncoded
}

let factor = 1000000000000000000; // 10e18 (1 EUR = 10e18 tokens)

function eurToToken(eur) {
    return fromExponential(eur * factor);
}

function tokenToEur(token) {
    return token / factor
}

function aeonToDollar(ae) {
    return (ae / factor) * 0.3
}

Object.assign(exports, {
    eurToToken,
    tokenToEur,
    executeWithStats,
    enforceAkPrefix,
    generateRandomAeAddress
})