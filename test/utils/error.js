//import { fail } from "assert";

let errorDecoderClient

function init(client) {
    errorDecoderClient = client
}

let decode = async (e) => {
    console.error(e);
    if (e.rawTx) console.error('decodeError', await errorDecoderClient.unpackAndVerify(e.rawTx));
    if (e.returnValue) console.error('decodedError', await errorDecoderClient.contractDecodeData('string', e.returnValue).catch(e => console.error(e)));
    fail()
}

Object.assign(exports, { init, decode })