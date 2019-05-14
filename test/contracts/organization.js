let util = require('../utils/util')
let error = require('../utils/error')

class Organization {

    constructor(contractSource, coopAddress, client) {
        this.contractSource = contractSource
        this.coopAddress = coopAddress
        this.client = client
    }

    async deploy() {
        console.log("Deploying Organization contract")
        this.compiledContract = await this.client.contractCompile(this.contractSource)
        this.deployedContract = await this.compiledContract.deploy({
            initState: `(${this.coopAddress})`
        }).catch(error.decode)
        console.log(`Organization deployed on ${this.address()}\n`)
    }

    address() {
        return util.decodeAddress(this.deployedContract.address)
    }

    owner() {
        return this.deployedContract.owner
    }

}

Object.assign(exports, {
    Organization
});