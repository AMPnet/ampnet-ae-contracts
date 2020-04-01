let { Universal: Ae, Node, MemoryAccount } = require('@aeternity/aepp-sdk')
let AeConfig = require('../init/config').local
let source = require('../init/contracts').projSource
let util = require('../utils/util')
let contracts = require('../init/contracts')
let error = require('../utils/error')

class Project {

    constructor(orgAddress, client, project) {
        this.orgAddress = orgAddress
        this.client = client
        this.project = project
    }

    async deploy() {
        let minPerUser = util.eurToToken(this.project.minInvestmentPerUser)
        let maxPerUser = util.eurToToken(this.project.maxInvestmentPerUser)
        let cap = util.eurToToken(this.project.investmentCap)
        let endsAt = this.project.endsAt

        this.contractInstance = await this.client.getContractInstance(contracts.projSource)
        await this.contractInstance.deploy([this.orgAddress, minPerUser, maxPerUser, cap, endsAt])
    }

    async setCancelInvestmentFlag(flag) {
        return this.contractInstance.methods.set_cancel_investment_flag(flag)
    }

    async getInfo() {
        let callResult = await this.contractInstance.methods.get_project_info()
        let decoded = await callResult.decode()
        return {
            minInvestmentPerUser: util.tokenToEur(decoded[0]),
            maxInvestmentPerUser: util.tokenToEur(decoded[1]),
            investmentCap: util.tokenToEur(decoded[2]),
            endsAt: decoded[3]
        }
    }

    async hasFundingExpired() {
        let callResult = await this.contractInstance.methods.has_funding_expired()
        return callResult.decode()
    }

    async totalFundsRaised() {
        let callResult = await this.contractInstance.methods.total_funds_raised()
        let decoded = await callResult.decode()
        return util.tokenToEur(decoded)
    }

    async isCompletelyFunded() {
        let callResult = await this.contractInstance.methods.is_completely_funded()
        return callResult.decode()
    }

    async invest(address) {
        let investorAddress = util.enforceAkPrefix(address)
        return this.contractInstance.methods.invest(investorAddress)
    }

    async withdraw(amount) {
        let tokenAmount = util.eurToToken(amount)
        return this.contractInstance.methods.withdraw(tokenAmount)
    }

    async cancelInvestment() {
        return this.contractInstance.methods.cancel_investment()
    }

    async getInvestment() {
        let callResult = await this.contractInstance.methods.get_investment()
        let decoded = await callResult.decode()
        return util.tokenToEur(decoded)
    }

    async getInvestments() {
        let call = await this.contractInstance.methods.get_investments()
        let investors = call.decodedResult
        return investors.reduce(function (map, record) {
            map[record[0]] = util.tokenToEur(record[1])
            return map
        }, {})
    }

    async totalFundsRaised() {
        let call = await this.contractInstance.methods.total_funds_raised()
        let raisedInEur = util.tokenToEur(call.decodedResult)
        return raisedInEur
    }
    
    async addInitialInvestors(client) {
        console.log(`Adding initial investors for project at ${this.address()}`)
        return util.executeWithStats(await client.address(), async () => {
            let initialInvestments = this.project.state.investments
            let initialInvestmentsCount = initialInvestments.length
            let batchSize = 50
            let batchCount = Math.ceil(initialInvestmentsCount / batchSize)
            for (var i = 0; i < batchCount; i++) {
                console.log(`Adding batch ${i+1}`)
                let position = i * batchSize
                let investmentsList = initialInvestments.slice(position, Math.min(position + batchSize, initialInvestmentsCount))
                await this.addInvestors(client, investmentsList)
            }
        })
    }

    async addInvestors(client, investmentsList) {
        let contractInstance = await client.getContractInstance(contracts.projSource, { contractAddress: this.address() })
        return contractInstance.methods.add_investments(investmentsList)
    }
    
    async startRevenueSharesPayout(amount) {
        let tokenAmount = util.eurToToken(amount)
        return this.contractInstance.methods.start_revenue_shares_payout(tokenAmount)
    }
    
    async payoutRevenueShares() {
        var shouldCallAgain
        do {
            let call = await this.contractInstance.methods.payout_revenue_shares()
            shouldCallAgain = call.decodedResult
        } while (shouldCallAgain)
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
        let proj = new Project(this.address(), this.client, this.project)
        proj.contractInstance = instance
        return proj
    }

}

Object.assign(exports, {
    Project
})

