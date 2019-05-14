let Crypto = require('@aeternity/aepp-sdk').Crypto
let fromExponential = require('from-exponential')
let now = require('performance-now')

async function executeWithStats(client, func) {
    let clientAddr = await client.address()
    let startBalance = await client.balance(clientAddr)
    let startTime = now()
    let result = await func()
    let endTime = now()
    let endBalance = await client.balance(clientAddr)
    console.log(`Tx processed. Cost: $${aeonToDollar(startBalance - endBalance)} Time: ${(endTime - startTime)/1000} s`)
    return result
}

function decodeAddress(address) {
    const decoded = Crypto.decodeBase58Check(address.split('_')[1]).toString('hex')
    return `0x${decoded}`
}

function decodeError(client) {
    return async (e) => {
        console.error(e);
        if (e.rawTx) console.error('decodeError', await client.unpackAndVerify(e.rawTx));
        if (e.returnValue) console.error('decodedError', await client.contractDecodeData('string', e.returnValue).catch(e => console.error(e)));
    }
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
    aeonToDollar,
    decodeError,
    executeWithStats
})