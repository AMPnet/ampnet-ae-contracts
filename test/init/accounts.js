const { Universal: Ae, Node, MemoryAccount } = require('@aeternity/aepp-sdk')
const config = require("./config").local

let mainClient

function main() { return mainClient }

async function initialize(wallets) {
    let node = await Node({
        url: config.url,
        internalUrl: config.internalUrl
    })

    let bankKeypair = {
        publicKey: "ak_2mwRmUeYmfuW93ti9HMSUJzCk1EYcQEfikVSzgo6k2VghsWhgU",
        secretKey: "bb9f0b01c8c9553cfbaf7ef81a50f977b1326801ebf7294d1c2cbccdedf27476e9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca"
    }
    let bankAddress = bankKeypair.publicKey
    let bankPrivateKey = bankKeypair.secretKey
    let bankClient = await Ae({
        nodes: [ { name: "node", instance: node }],
        compilerUrl: config.compilerUrl,
        accounts: [
            MemoryAccount({ keypair: bankKeypair })
        ],
        address: bankAddress,
        networkId: config.networkId
    })

    let coopKeypair = wallets[0]
    let coopAddress = wallets[0].publicKey
    let coopPrivateKey = wallets[0].secretKey
    let coopClient = await Ae({
        nodes: [ { name: "node", instance: node }],
        compilerUrl: config.compilerUrl,
        accounts: [
            MemoryAccount({ keypair: coopKeypair })
        ],
        address: coopAddress,
        networkId: config.networkId
    })

    let eurKeypair = wallets[1]
    let eurAddress = wallets[1].publicKey
    let eurPrivateKey = wallets[1].secretKey
    let eurClient = await Ae({
        nodes: [ { name: "node", instance: node }],
        compilerUrl: config.compilerUrl,
        accounts: [
            MemoryAccount({ keypair: eurKeypair })
        ],
        address: eurAddress,
        networkId: config.networkId
    })

    let bobKeypair = wallets[2]
    let bobAddress = wallets[2].publicKey
    let bobPrivateKey = wallets[2].secretKey
    let bobClient = await Ae({
        nodes: [ { name: "node", instance: node }],
        compilerUrl: config.compilerUrl,
        accounts: [
            MemoryAccount({ keypair: bobKeypair })
        ],
        address: bobAddress,
        networkId: config.networkId
    })

    let aliceKeypair = wallets[3]
    let aliceAddress = wallets[3].publicKey
    let alicePrivateKey = wallets[3].secretKey
    let aliceClient = await Ae({
        nodes: [ { name: "node", instance: node }],
        compilerUrl: config.compilerUrl,
        accounts: [
            MemoryAccount({ keypair: aliceKeypair })
        ],
        address: aliceAddress,
        networkId: config.networkId
    })

    mainClient = coopClient

    return {
        bank: {
            client: bankClient,
            address: bankAddress,
            privateKey: bankPrivateKey,
            keypair: bankKeypair
        },
        coop: {
            client: coopClient,
            address: coopAddress,
            privateKey: coopPrivateKey,
            keypair: coopKeypair
        },
        eur: {
            client: eurClient,
            address: eurAddress,
            privateKey: eurPrivateKey,
            keypair: eurKeypair
        },
        bob: {
            client: bobClient,
            address: bobAddress,
            privateKey: bobPrivateKey,
            keypair: bobKeypair
        },
        alice: {
            client: aliceClient,
            address: aliceAddress,
            privateKey: alicePrivateKey,
            keypair: aliceKeypair
        }
    }
}

Object.assign(exports, { initialize, main })

/*

#0 MINER
ak_2mwRmUeYmfuW93ti9HMSUJzCk1EYcQEfikVSzgo6k2VghsWhgU
bb9f0b01c8c9553cfbaf7ef81a50f977b1326801ebf7294d1c2cbccdedf27476e9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca

#1 (Coop)
ak_fUq2NesPXcYZ1CcqBcGC3StpdnQw3iVxMA3YSeCNAwfN4myQk
7c6e602a94f30e4ea7edabe4376314f69ba7eaa2f355ecedb339df847b6f0d80575f81ffb0a297b7725dc671da0b1769b1fc5cbe45385c7b5ad1fc2eaf1d609d

#2 (Eur)
ak_tWZrf8ehmY7CyB1JAoBmWJEeThwWnDpU4NadUdzxVSbzDgKjP
7fa7934d142c8c1c944e1585ec700f671cbc71fb035dc9e54ee4fb880edfe8d974f58feba752ae0426ecbee3a31414d8e6b3335d64ec416f3e574e106c7e5412

#3 (Bob)
ak_FHZrEbRmanKUe9ECPXVNTLLpRP2SeQCLCT6Vnvs9JuVu78J7V
1509d7d0e113528528b7ce4bf72c3a027bcc98656e46ceafcfa63e56597ec0d8206ff07f99ea517b7a028da8884fb399a2e3f85792fe418966991ba09b192c91

#4 (Alice)
ak_RYkcTuYcyxQ6fWZsL2G3Kj3K5WCRUEXsi76bPUNkEsoHc52Wp
58bd39ded1e3907f0b9c1fbaa4456493519995d524d168e0b04e86400f4aa13937bcec56026494dcf9b19061559255d78deea3281ac649ca307ead34346fa621

#5
ak_2VvB4fFu7BQHaSuW5EkQ7GCaM5qiA5BsFUHjJ7dYpAaBoeFCZi
50458d629ae7109a98e098c51c29ec39c9aea9444526692b1924660b5e2309c7c55aeddd5ebddbd4c6970e91f56e8aaa04eb52a1224c6c783196802e136b9459

#6
ak_286tvbfP6xe4GY9sEbuN2ftx1LpavQwFVcPor9H4GxBtq5fXws
707881878eacacce4db463de9c7bf858b95c3144d52fafed4a41ffd666597d0393d23cf31fcd12324cd45d4784d08953e8df8283d129f357463e6795b40e88aa

#7
ak_f9bmi44rdvUGKDsTLp3vMCMLMvvqsMQVWyc3XDAYECmCXEbzy
9262701814da8149615d025377e2a08b5f10a6d33d1acaf2f5e703e87fe19c83569ecc7803d297fde01758f1bdc9e0c2eb666865284dff8fa39edb2267de70db

*/