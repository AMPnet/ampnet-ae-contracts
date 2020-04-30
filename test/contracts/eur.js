let { Universal: Ae, Node, MemoryAccount } = require('@aeternity/aepp-sdk')
let AeConfig = require('../init/config').local
let contractSource = require('../init/contracts').eurSource
let util = require('../utils/util')
let error = require('../utils/error')

class Eur {
    constructor(contractInstance) {
        this.contractInstance = contractInstance
    }

    async claimOwnership(newOwner) {
        return this.contractInstance.methods.claim_ownership(util.enforceAkPrefix(newOwner))
    }

    async mint(address, amount) {
        let addressToMint = util.enforceAkPrefix(address)
        let tokenAmount = util.eurToToken(amount)
        return this.contractInstance.methods.mint(addressToMint, tokenAmount)
    }

    async burn(address, amount) {
        let addressToBurn = util.enforceAkPrefix(address)
        let tokenAmount = util.eurToToken(amount)
        return this.contractInstance.methods.burn(addressToBurn, tokenAmount)
    }

    async fetchOwner() {
        return this.contractInstance.methods.owner()
    }

    async getBalance(address) {
        let call = await this.contractInstance.methods.balance_of(util.enforceAkPrefix(address))
        let result = await call.decode()
        console.log(`Balance of ${address} = ${result}`)
        return util.tokenToEur(result)
    }

    async getTotalSupply() {
        let call = await this.contractInstance.methods.total_supply()
        return call.decode()
    }

    async approve(address, amount) {
        let addressToApprove = util.enforceAkPrefix(address)
        let tokenAmount = util.eurToToken(amount)
        return this.contractInstance.methods.approve(addressToApprove, tokenAmount)
    }

    async transfer(address, amount) {
        let destinationAddress = util.enforceAkPrefix(address)
        let tokenAmount = util.eurToToken(amount)
        return this.contractInstance.methods.transfer(destinationAddress, tokenAmount)
    }

    async getAllowance(owner, spender) {
        let ownerAddress = util.enforceAkPrefix(owner)
        let spenderAddress = util.enforceAkPrefix(spender)
        let callResult = await this.contractInstance.methods.allowance(ownerAddress, spenderAddress)
        let callResultDecoded = await callResult.decode()
        return util.tokenToEur(callResultDecoded)
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
        let instance = await client.getContractInstance(contractSource, {
            contractAddress: this.address()
        })
        return new Eur(instance) 
    }

}

Object.assign(exports, {
    Eur
});