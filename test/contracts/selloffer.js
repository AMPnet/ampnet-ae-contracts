let { Universal: Ae, Node, MemoryAccount } = require('@aeternity/aepp-sdk')
let AeConfig = require('../init/config').local
let contracts = require('../init/contracts')
let util = require('../utils/util')

class SellOffer {

    constructor(projAddress, client, shares, price) {
        this.projAddress = projAddress
        this.client = client
        this.shares = util.eurToToken(shares)
        this.price = util.eurToToken(price)
    }

    async deploy() {
        this.contractInstance = await this.client.getContractInstance(contracts.sellOfferSource)
        await this.contractInstance.deploy([this.projAddress, this.shares, this.price])
    }

    async tryToSettle(buyer) {
        return this.contractInstance.methods.try_to_settle(buyer)
    }

    async acceptCounterOffer(fromBuyer) {
        return this.contractInstance.methods.accept_counter_offer(fromBuyer)
    }

    async cancelOffer() {
        return this.contractInstance.methods.cancel_offer()
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
        let instance = await client.getContractInstance(contracts.sellOfferSource, {
            contractAddress: this.address()
        })
        return new Cooperative(instance) 
    }

}

Object.assign(exports, {
    SellOffer
});