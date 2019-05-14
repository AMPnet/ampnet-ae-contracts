let util = require('../utils/util')
let error = require('../utils/error')

class Project {

    constructor(contractSource, orgAddress, client, project) {
        this.contractSource = contractSource
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
        this.compiledProject = await this.client.contractCompile(this.contractSource)
        this.deployedProject = await this.compiledProject.deploy({
            initState: `(${this.orgAddress}, ${minPerUser}, ${maxPerUser}, ${cap}, ${endsAt})`
        }).catch(error.decode)
        console.log(`Project deployed on ${this.address()}\n`)
    }

    async makeInvestment(client) {
        let investor = await client.address()
        console.log(`Confirm and execute investment from investor ${investor} in project ${this.address()}`)
        util.executeWithStats(investor, async () => {
            return client.contractCall(this.compiledProject.bytecode, 'sophia', this.deployedProject.address, "invest").catch(error.decode)
        })
    }
    
    async getInvestment(client) {
        let investor = await client.address()
        console.log(`Fetching investment for investor ${investor} in project ${this.address()}`)
        let investment = await client.contractCall(this.compiledProject.bytecode, 'sophia', this.deployedProject.address, "get_investment").catch(error.decode)
        let investmentDecoded = await investment.decode("(int)")
        let investmentInEur = util.tokenToEur(investmentDecoded)
        console.log(`Fetched investment: $${investmentInEur}`)
        return investmentInEur
    }
    
    async addInitialInvestors(client) {
        console.log(`Adding initial investors for project at ${this.address()}`)
        return util.executeWithStats(await client.address(), async () => {
            let initialInvestments = this.project.state.investments
            var investmentBatchesCount = initialInvestments.length
            for (var i = 0; i < investmentBatchesCount; i++) {
                let investmentsList = initialInvestments[i]
                await this.addInvestors(client, investmentsList)
            }
        })
    }

    async addInvestors(client, investmentsList) {
        return client.contractCall(this.compiledProject.bytecode, 'sophia', this.deployedProject.address, "add_investments", {
            args: `(${investmentsList})`
        }).catch(error.decode)
    }
    
    async startRevenueSharesPayout(amount) {
        console.log(`Starting revenue share payout with amount $${amount} for project at ${this.address()} `)
        let tokenAmount = util.eurToToken(amount)
        return util.executeWithStats(this.owner(), async () => {
            return this.deployedProject.call("start_revenue_shares_payout", {
                args: `(${tokenAmount})`
            }).catch(error.decode)
        })
    }
    
    async payoutRevenueShares() {
        console.log(`Paying out revenue shares to next bacth of investors for project at ${this.address()}`)
        return util.executeWithStats(this.owner(), async () => {
            return this.deployedProject.call("payout_revenue_shares").catch(error.decode)
        })
    }

    async isCompletelyFunded() {
        console.log(`Fetching isFunded status for project at ${this.address()}`)
        let funded = await this.deployedProject.call("is_completely_funded")
        let fundedDecoded = await funded.decode("(bool)")
        let fundedStatus = !!fundedDecoded.value
        console.log(`Project funded: ${fundedStatus}\n`)
        return fundedStatus
    }

    address() {
        return util.decodeAddress(this.deployedProject.address)
    }

    owner() {
        return this.deployedProject.owner
    }
}

Object.assign(exports, {
    Project
})

