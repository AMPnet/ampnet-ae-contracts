let { Universal: Ae, Node, MemoryAccount } = require('@aeternity/aepp-sdk')
let AeConfig = require('../init/config').local
let source = require('../init/contracts').orgSource
let util = require('../utils/util')

class Organization {

    constructor(coopAddress, client) {
        this.coopAddress = coopAddress
        this.client = client
    }

    async deploy() {
        this.contractInstance = await this.client.getContractInstance(source)
        await this.contractInstance.deploy([this.coopAddress])
    }

    async isVerified() {
        let callResult = await this.contractInstance.methods.is_verified()
        return callResult.decode()
    }

    async addMember(address) {
        return this.contractInstance.methods.add_member(address)
    }

    async confirmMembership() {
        return this.contractInstance.methods.confirm_membership()
    }

    async isMember(address) {
        let callResult = await this.contractInstance.methods.is_member(address)
        return callResult.decode()
    }

    address() {
        return this.contractInstance.deployInfo.address
    }

    owner() {
        return this.contractInstance.deployInfo.owner
    }

    async getInstance(keypair) {
        let node = await Node({
            url: AeConfig.url,
            internalUrl: AeConfig.internalUrl
        })
        let client = await Ae({
            nodes: [ { name: "node", instance: node } ],
            compilerUrl: AeConfig.compilerUrl,
            accounts: [
                MemoryAccount({ keypair: keypair })
            ],
            address: keypair.publicKey,
            networkId: AeConfig.networkId
        })
        let instance = await client.getContractInstance(source, {
            contractAddress: this.address()
        })
        let org = new Organization(this.address(), client)
        org.contractInstance = instance
        return org
    }

}

Object.assign(exports, {
    Organization
});