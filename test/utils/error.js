let clients = require('../init/accounts')

let decode = async (e) => {
    console.error(e);
    if (e.rawTx) console.error('decodeError', await clients.main().unpackAndVerify(e.rawTx));
    if (e.returnValue) console.error('decodedError', await clients.main().contractDecodeData('string', e.returnValue).catch(e => console.error(e)));
    throw new Error("Test failed.")
}

function filter(str) {
    let startPosition = str.indexOf("#")
    let endPosition = str.lastIndexOf("#")
    if (startPosition == -1 || endPosition == -1 || startPosition == endPosition) {
        return str.replace(/[^a-zA-Z0-9\(\)!\?\., ]/g, '').trim()
    } else {
        return str.substring(startPosition + 1, endPosition)
    }
}

Object.assign(exports, { decode, filter })