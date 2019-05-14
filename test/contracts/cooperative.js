let util = require('../utils/util')
let error = require('../utils/error')

class Cooperative {

    constructor(deployedContract) {
        this.deployedContract = deployedContract
    }

    async registerWallet(address) {
        console.log(`Registering wallet ${address}`)
        return await util.executeWithStats(this.owner(), async () => {
           return await this.deployedContract.call("add_wallet", {
                args: `(${address})`
            }).catch(error.decode)
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

    address() {
        return util.decodeAddress(this.deployedContract.address)
    }

    owner() {
        return this.deployedContract.owner
    }

}

Object.assign(exports, {
    Cooperative
});