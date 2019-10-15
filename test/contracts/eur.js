let util = require('../utils/util')
let error = require('../utils/error')

class Eur {
    constructor(contractInstance) {
        this.contractInstance = contractInstance
    }

    async mint(address, amount) {
        console.log(`Minting $${amount} to wallet ${address}`)
        return util.executeWithStats(this.owner(), async () => {
            let addressToMint = util.enforceAkPrefix(address)
            let tokenAmount = util.eurToToken(amount)
            return this.contractInstance.methods.mint(addressToMint, tokenAmount)
        })
    }

    async getBalance(address) {
        let call = await this.contractInstance.methods.balance_of(util.enforceAkPrefix(address))
        return util.tokenToEur(call.decodedResult)
    }

    address() {
        return this.contractInstance.deployInfo.address
    }

    owner() {
        return this.contractInstance.deployInfo.owner
    }

}

Object.assign(exports, {
    Eur
});