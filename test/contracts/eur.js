let util = require('../utils/util')

class Eur {
    constructor(deployedContract) {
        this.deployedContract = deployedContract
    }

    async mint(address, amount) {
        console.log(`Minting $${amount} to wallet ${address}`)
        return util.executeWithStats(this.owner(), async () => {
            let tokenAmount = util.eurToToken(amount)
            return deployedContract.call("mint", {
                args: `(${address}, ${tokenAmount})`
            }).catch(error.decode)
        })
    }

    async getBalance(address) {
        console.log(`Fetching balance for wallet ${address}`)
        let balance = await deployedContract.call("balance_of", {
			args: `(${address})`
        }).catch(error.decode)
        let balanceDecoded = await balance.decode("(int)")
        let balanceInEur = util.tokenToEur(balanceDecoded)
        console.log(`Fetched balance: $${balanceInEur}`)
        return balanceInEur
    }

    address() {
        return util.decodeAddress(this.deployedContract.address)
    }

    owner() {
        return this.deployedContract.owner
    }
}

Object.assign(exports, {
    Eur
});