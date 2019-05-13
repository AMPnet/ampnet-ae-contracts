let util = require('../utils/util')

class Eur {
    constructor(deployedContract) {
        this.deployedContract = deployedContract
    }

    async mint(address, amount) {
        let tokenAmount = util.eurToToken(amount)
        return deployedContract.call("mint", {
            args: `(${address}, ${tokenAmount})`
        })
    }

    async getBalance(address) {
        let balance = await deployedContract.call("balance_of", {
			args: `(${address})`
        })
        let balanceDecoded = await balance.decode("(int)")
        return util.tokenToEur(balanceDecoded)
    }

    address() {
        return util.decodeAddress(this.deployedContract.address)
    }
}

Object.assign(exports, {
    Eur
});