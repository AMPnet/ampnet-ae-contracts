let Ae = require('@aeternity/aepp-sdk').Universal
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

    async makeInvestment(client) {
        let contractInstance = await client.getContractInstance(contracts.projSource, { contractAddress: this.address() })
        console.log(`Confirm and execute investment from investor ${investor} in project ${this.address()}`)
        util.executeWithStats(investor, async () => {
            return contractInstance.methods.invest()
        })
    }
    
    async getInvestment(client) {
        let contractInstance = await client.getContractInstance(contracts.projSource, { contractAddress: this.address() })
        console.log(`Fetching investment for investor ${investor} in project ${this.address()}`)
        let call = await contractInstance.methods.get_investment()
        let investmentInEur = util.tokenToEur(call.decodedResult)
        console.log(`Fetched investment: $${investmentInEur}\n`)
        return investmentInEur
    }

    async getInvestments() {
        console.log(`Fetching investors in project ${this.address()}`)
        let call = await this.contractInstance.methods.get_investments()
        let investors = call.decodedResult
        console.log("Investors decoded", investors)
        return investors
    }

    async totalFundsRaised() {
        console.log(`Fetching total funds raised for project ${this.address()}`)
        let call = await this.contractInstance.methods.total_funds_raised()
        let raisedInEur = util.tokenToEur(call.decodedResult)
        console.log(`Raised: $${raisedInEur}`)
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
        console.log(`Starting revenue share payout with amount $${amount} for project at ${this.address()} `)
        let tokenAmount = util.eurToToken(amount)
        return util.executeWithStats(this.owner(), async () => {
            return this.contractInstance.methods.start_revenue_shares_payout(tokenAmount)
        })
    }
    
    async payoutRevenueShares() {
        console.log(`Paying out revenue shares for project at ${this.address()}`)
        return util.executeWithStats(this.owner(), async () => {
            var shouldCallAgain
            var batchCount = 1
            do {
                console.log(`Paying out batch ${batchCount}`)
                let call = await this.contractInstance.methods.payout_revenue_shares()
                shouldCallAgain = call.decodedResult
                batchCount++
            } while (shouldCallAgain)
        })
    }

    address() {
        return this.contractInstance.deployInfo.address
    }

    owner() {
        return this.contractInstance.deployInfo.owner
    }

    async getInstance(keypair) {
        let config = {
            ...AeConfig,
            keypair: keypair
        }
        let client = await Ae(config)
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

