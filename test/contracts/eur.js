let util = require('../utils/util')
let error = require('../utils/error')

class Eur {
    constructor(contractInstance) {
        this.contractInstance = contractInstance
    }

    async mint(address, amount) {
        console.log(`Minting $${amount} to wallet ${address}`)
        return util.executeWithStats(this.owner(), async () => {
            let tokenAmount = util.eurToToken(amount)
            return this.contractInstance.call("mint", [util.enforceAkPrefix(address), tokenAmount]).catch(error.decode)
        })
    }

    async getBalance(address) {
        console.log(`Fetching balance for wallet ${address}`)
        let balance = await this.contractInstance.call("balance_of", [util.enforceAkPrefix(address)], { callStatic: true }).catch(error.decode)
        let balanceDecoded = await balance.decode()
        let balanceInEur = util.tokenToEur(balanceDecoded)
        console.log(`Fetched balance: $${balanceInEur}`)
        return balanceInEur
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