let { Universal: Ae, Node, MemoryAccount } = require('@aeternity/aepp-sdk')
let AeConfig = require('../init/config').local
let contractSource = require('../init/contracts').coopSource
let util = require('../utils/util')

class Cooperative {

    constructor(contractInstance) {
        this.contractInstance = contractInstance
    }

    async registerWallet(address) {
        return this.contractInstance.methods.add_wallet(util.enforceAkPrefix(address))
    }

    async registerWallets(addressList) {
        let addressListSize = addressList.length
        let batchSize = 50
        let batchCount = Math.ceil(addressListSize / batchSize)
        for (var i = 0; i < batchCount; i++) {
            console.log(`Registering batch ${i+1}.`)
            let position = i * batchSize
            let addressBatch = addressList.slice(position, Math.min(addressListSize, position + batchSize))
            await this.contractInstance.methods.add_wallets(addressBatch)
        }
    }

    async isWalletActive(address) {
        let call = await this.contractInstance.methods.is_wallet_active(util.enforceAkPrefix(address))
        return call.decodedResult
    }

    address() {
        return this.contractInstance.deployInfo.address
    }

    owner() {
        return this.contractInstance.deployInfo.owner
    }

    async getInstance(keypair) {
        let node = await Node({
            url: AeConfig.url,
            internalUrl: AeConfig.internalUrl
        })
        let client = await Ae({
            nodes: [ { name: "node", instance: node } ],
            compilerUrl: AeConfig.compilerUrl,
            accounts: [
                MemoryAccount({ keypair: keypair })
            ],
            address: keypair.publicKey,
            networkId: AeConfig.networkId
        })
        let instance = await client.getContractInstance(contractSource, {
            contractAddress: this.address()
        })
        return new Cooperative(instance) 
    }

}

Object.assign(exports, {
    Cooperative
});