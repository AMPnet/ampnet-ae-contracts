const Ae = require('@aeternity/aepp-sdk').Universal;
const config = require("./config").local

async function initialize(wallets) {
    let coopKeypair = wallets[0]
    let coopClient = await Ae({
        url: config.host,
        internalUrl: config.internalHost,
        keypair: coopKeypair,
        nativeMode: true,
        networkId: 'ae_devnet'
    })
     
    let eurKeypair = wallets[1]
    let eurClient = await Ae({
        url: config.host,
        internalUrl: config.internalHost,
        keypair: eurKeypair,
        nativeMode: true,
        networkId: 'ae_devnet'
    })

    let bobKeypair = wallets[2]
    let bobClient = await Ae({
        url: config.host,
        internalUrl: config.internalHost,
        keypair: bobKeypair,
        nativeMode: true,
        networkId: 'ae_devnet'
    })

    let aliceKeypair = wallets[3]
    let aliceClient = await Ae({
        url: config.host,
        internalUrl: config.internalHost,
        keypair: aliceKeypair,
        nativeMode: true,
        networkId: 'ae_devnet'
    })

    return {
        coop: {
            client: coopClient,
            keypair: coopKeypair
        },
        eur: {
            client: eurClient,
            keypair: eurKeypair
        },
        bob: {
            client: bobClient,
            keypair: bobKeypair
        },
        alice: {
            client: aliceClient,
            keypair: aliceKeypair
        }
    }
}

Object.assign(exports, { initialize })