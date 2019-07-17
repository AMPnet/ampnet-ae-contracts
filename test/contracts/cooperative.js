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
        let count = addressList.length
        console.log(`Registering ${count} batches of wallets`)
        await util.executeWithStats(this.owner(), async () => {
            for (var i = 0; i < count; i++) {
                console.log(`Registering batch ${i+1}.`)
                await this.deployedContract.call("add_wallets", {
                    args: `(${addressList[i]})`
                }).catch(error.decode)
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