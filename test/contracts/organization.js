let contracts = require('../init/contracts')
let util = require('../utils/util')
let error = require('../utils/error')

class Organization {

    constructor(coopAddress, client) {
        this.coopAddress = coopAddress
        this.client = client
    }

    async deploy() {
        console.log("Deploying Organization contract")
        this.contractInstance = await this.client.getContractInstance(contracts.orgSource)
        await this.contractInstance.deploy([this.coopAddress]).catch(error.decode)
        console.log(`Organization deployed on ${this.address()}\n`)
    }

    address() {
        return this.contractInstance.deployInfo.address
    }

    owner() {
        return this.contractInstance.deployInfo.owner
    }

}

Object.assign(exports, {
    Organization
});