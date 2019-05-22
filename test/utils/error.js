let clients = require('../init/accounts')

let decode = async (e) => {
    console.error(e);
    if (e.rawTx) console.error('decodeError', await clients.main().unpackAndVerify(e.rawTx));
    if (e.returnValue) console.error('decodedError', await clients.main().contractDecodeData('string', e.returnValue).catch(e => console.error(e)));
    throw new Error("Test failed.")
}

Object.assign(exports, { decode })