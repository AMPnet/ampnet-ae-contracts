let util = require('../utils/util')

class Organization {

    constructor(contractSource, coopAddress, client) {
        this.contractSource = contractSource
        this.coopAddress = coopAddress
        this.client = client
    }

    async deploy() {
        this.compiledContract = await this.client.contractCompile(this.contractSource)
        this.deployedContract = await this.compiledContract.deploy({
            initState: `(${this.coopAddress})`
        })
    }

    address() {
        return util.decodeAddress(this.deployedContract.address)
    }

}

Object.assign(exports, {
    Organization
});