let util = require('../utils/util')
let error = require('../utils/error')

class Cooperative {

    constructor(deployedContract) {
        this.deployedContract = deployedContract
    }

    async registerWallet(address) {
        console.log(`Register wallet ${address}`)
        let tx = await this.deployedContract.call("add_wallet", {
            args: `(${address})`
        }).catch(error.decode)
        console.log(`Wallet ${address} registered.\n Tx cost: ${util.aeonToDollar}`)
        return tx
    }

    async registerWallets(addressList) {
        let count = addressList.length
        console.log(`Register ${count} batches of wallets`)
        for (var i = 0; i < count; i++) {
            console.log(`Registering batch ${i+1}.`)
            await this.deployedContract.call("add_wallets", {
                args: `(${addressList[i]})`
            })
        }
        console.log(`Batches registered.`)
    }

    address() {
        return util.decodeAddress(this.deployedContract.address)
    }

}

Object.assign(exports, {
    Cooperative
});