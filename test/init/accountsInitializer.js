const Ae = require('@aeternity/aepp-sdk').Universal;
const config = require("./config").local
const util = require("../utils/util")

async function initialize(wallets) {
    let coopKeypair = wallets[0]
    let coopAddress = util.decodeAddress(wallets[0].publicKey)
    let coopPrivateKey = wallets[0].secretKey
    let coopClient = await Ae({
        url: config.host,
        internalUrl: config.internalHost,
        keypair: coopKeypair,
        nativeMode: true,
        networkId: 'ae_devnet'
    })
     
    let eurKeypair = wallets[1]
    let eurAddress = util.decodeAddress(wallets[1].publicKey)
    let eurPrivateKey = wallets[1].secretKey
    let eurClient = await Ae({
        url: config.host,
        internalUrl: config.internalHost,
        keypair: eurKeypair,
        nativeMode: true,
        networkId: 'ae_devnet'
    })

    let bobKeypair = wallets[2]
    let bobAddress = util.decodeAddress(wallets[2].publicKey)
    let bobPrivateKey = wallets[2].secretKey
    let bobClient = await Ae({
        url: config.host,
        internalUrl: config.internalHost,
        keypair: bobKeypair,
        nativeMode: true,
        networkId: 'ae_devnet'
    })

    let aliceKeypair = wallets[3]
    let aliceAddress = util.decodeAddress(wallets[3].publicKey)
    let alicePrivateKey = wallets[3].secretKey
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
            address: coopAddress,
            privateKey: coopPrivateKey
        },
        eur: {
            client: eurClient,
            address: eurAddress,
            privateKey: eurPrivateKey
        },
        bob: {
            client: bobClient,
            address: bobAddress,
            privateKey: bobPrivateKey
        },
        alice: {
            client: aliceClient,
            address: aliceAddress,
            privateKey: alicePrivateKey
        }
    }
}

Object.assign(exports, { initialize })