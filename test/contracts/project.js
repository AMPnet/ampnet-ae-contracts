let util = require('../utils/util')
let wallets = require('../init/accounts')
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

        console.log("Deploying Project contract")
        this.contractInstance = await this.client.getContractInstance(contracts.projSource)
        await this.contractInstance.deploy([this.orgAddress, minPerUser, maxPerUser, cap, endsAt]).catch(error.decode)
        console.log(`Project deployed on ${this.address()}\n`)
    }

    async makeInvestment(client) {
        let contractInstance = await client.getContractInstance(contracts.projSource, { contractAddress: this.address() })
        console.log(`Confirm and execute investment from investor ${investor} in project ${this.address()}`)
        util.executeWithStats(investor, async () => {
            return contractInstance.call("invest").catch(error.decode)
        })
    }
    
    async getInvestment(client) {
        let contractInstance = await client.getContractInstance(contracts.projSource, { contractAddress: this.address() })
        console.log(`Fetching investment for investor ${investor} in project ${this.address()}`)
        let investment = await contractInstance.call("get_investment", [], { callStatic: true })
        let investmentDecoded = await investment.decode()
        let investmentInEur = util.tokenToEur(investmentDecoded)
        console.log(`Fetched investment: $${investmentInEur}\n`)
        return investmentInEur
    }

    async getInvestments() {
        console.log(`Fetching investors in project ${this.address()}`)
        return util.executeWithStats(this.owner(), async () => {
            let investors = await this.contractInstance.call("get_investments", [], { callStatic: true })
            let investorsDecoded = await investors.decode()
            console.log("Investors decoded", investorsDecoded)
            let investorsArray = investorsDecoded.value
            console.log("investorsArray", investorsArray)
            let count = investorsArray.length
            var result = []
            for(var i = 0; i < count; ++i) {
                console.log(investorsArray[i])
                result.push({
                    investor: investorsArray[i].key.value.toString(16),
                    amount: util.tokenToEur(investorsArray[i].val.value)
                })
            }
            return result
        })
    }

    async totalFundsRaised() {
        console.log(`Fetching total funds raised for project ${this.address()}`)
        let raised = await this.contractInstance.call("total_funds_raised", [], { callStatic: true })
        let raisedDecoded = await raised.decode()
        let raisedInEur = util.tokenToEur(raisedDecoded.value)
        console.log(`Raised: $${raisedInEur}`)
        return raisedInEur
    }
    
    async addInitialInvestors(client) {
        console.log(`Adding initial investors for project at ${this.address()}`)
        return util.executeWithStats(await client.address(), async () => {
            let initialInvestments = this.project.state.investments
            var investmentBatchesCount = initialInvestments.length
            for (var i = 0; i < investmentBatchesCount; i++) {
                console.log(`Adding batch ${i+1}`)
                let investmentsList = initialInvestments[i]
                await this.addInvestors(client, investmentsList)
            }
        })
    }

    async addInvestors(client, investmentsList) {
        let contractInstance = await client.getContractInstance(contracts.projSource, { contractAddress: this.address() })
        return contractInstance.call("add_investments", [investmentsList]).catch(error.decode)
    }
    
    async startRevenueSharesPayout(amount) {
        console.log(`Starting revenue share payout with amount $${amount} for project at ${this.address()} `)
        let tokenAmount = util.eurToToken(amount)
        return util.executeWithStats(this.owner(), async () => {
            return this.contractInstance.call("start_revenue_shares_payout", [ tokenAmount ]).catch(error.decode)
        })
    }
    
    async payoutRevenueShares() {
        console.log(`Paying out revenue shares for project at ${this.address()}`)
        return util.executeWithStats(this.owner(), async () => {
            var shouldCallAgain
            var batchCount = 1
            do {
                console.log(`Paying out batch ${batchCount}`)
                let status = await this.contractInstance.call("payout_revenue_shares").catch(error.decode)
                let statusDecoded = await status.decode()
                shouldCallAgain = !!(statusDecoded.value)
                batchCount++
            } while (shouldCallAgain)
        })
    }

    async isCompletelyFunded() {
        console.log(`Fetching isFunded status for project at ${this.address()}`)
        let funded = await this.contractInstance.call("is_completely_funded", [], { callStatic: true })
        let fundedDecoded = await funded.decode()
        let fundedStatus = !!fundedDecoded.value
        console.log(`Project funded: ${fundedStatus}\n`)
        return fundedStatus
    }

    address() {
        return this.contractInstance.deployInfo.address
    }

    owner() {
        return this.contractInstance.deployInfo.owner
    }

}

Object.assign(exports, {
    Project
})

