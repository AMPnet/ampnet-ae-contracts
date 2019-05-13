let util = require('../utils/util')

class Cooperative {

    constructor(deployedContract) {
        this.deployedContract = deployedContract
    }

    async registerWallet(address) {
        console.log(`Register wallet ${address}`)
        let tx = await this.deployedContract.call("add_wallet", {
            args: `(${address})`
        })
        console.log(`Wallet ${address} registered.\n Tx cost: `)
        return this.deployedContract.call("add_wallet", {
            args: `(${address})`
        })
    }

    async registerWallets(addressList) {
        let count = addressList.length
        for (var i = 0; i < count; i++) {
            await this.deployedContract.call("add_wallets", {
                args: `(${addressList[i]})`
            })
        }
    }

    address() {
        return util.decodeAddress(this.deployedContract.address)
    }

}

Object.assign(exports, {
    Cooperative
});