let Crypto = require('@aeternity/aepp-sdk').Crypto

function decodeAddress(address) {
    const decoded = Crypto.decodeBase58Check(address.split('_')[1]).toString('hex')
    return `0x${decoded}`
}

Object.assign(exports, {
    decodeAddress
})