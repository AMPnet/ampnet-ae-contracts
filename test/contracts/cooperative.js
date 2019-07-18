let util = require('../utils/util')
let error = require('../utils/error')

class Cooperative {

    constructor(contractInstance) {
        this.contractInstance = contractInstance
    }

    async registerWallet(address) {
        console.log(`Registering wallet ${address}`)
        return await util.executeWithStats(this.owner(), async () => {
           return await this.contractInstance.call("add_wallet", [ util.enforceAkPrefix(address) ], {}).catch(error.decode)
        })
    }

    async registerWallets(addressList) {
        let addressListSize = addressList.length
        let batchSize = 50
        let batchCount = Math.ceil(addressListSize / batchSize)
        console.log(`Registering ${addressListSize} batches of wallets`)
        await util.executeWithStats(this.owner(), async () => {
            for (var i = 0; i < batchCount; i++) {
                console.log(`Registering batch ${i+1}.`)
                let position = i * batchSize
                let addressBatch = addressList.slice(position, Math.min(addressListSize, position + batchSize))
                await this.contractInstance.call("add_wallets", [ addressBatch ]).catch(error.decode)
            }
        })
    }

    async isWalletActive(address) {
        console.log(`Received request to check is wallet ${address} active`)
        let status = await this.contractInstance.call("is_wallet_active", [ util.enforceAkPrefix(address) ], { callStatic: true })
        let statusDecoded = await status.decode()
        return statusDecoded
    }

    address() {
        return this.contractInstance.deployInfo.address
    }

    owner() {
        return this.contractInstance.deployInfo.owner
    }

}

Object.assign(exports, {
    Cooperative
});