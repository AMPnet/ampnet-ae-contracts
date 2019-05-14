let util = require('../utils/util')

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

        this.compiledProject = await this.client.contractCompile(this.contractSource)
        this.deployedProject = await this.compiledProject.deploy({
            initState: `(${this.orgAddress}, ${minPerUser}, ${maxPerUser}, ${cap}, ${endsAt})`
        })
    }

    async makeInvestment(client) {
        return client.contractCall(this.compiledProject.bytecode, 'sophia', this.deployedProject.address, "invest")
    }
    
    async getInvestment(client) {
        let investment = await client.contractCall(this.compiledProject.bytecode, 'sophia', this.deployedProject.address, "get_investment")
        let investmentDecoded = await investment.decode("(int)")
        return util.tokenToEur(investmentDecoded)
    }
    
    async addInitialInvestors(client) {
        console.log("Add initial investors - started.")
        return util.executeWithStats(client, async () => {
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
        })
    }
    
    async startRevenueSharesPayout(amount) {
        let tokenAmount = util.eurToToken(amount)
        return this.deployedProject.call("start_revenue_shares_payout", {
            args: `(${tokenAmount})`
        })
    }
    
    async payoutRevenueShares() {
        return this.deployedProject.call("payout_revenue_shares")
    }

    async isCompletelyFunded() {
        let funded = await this.deployedProject.call("is_completely_funded")
        let fundedDecoded = await funded.decode("(bool)")
        return !!fundedDecoded.value
    }

    address() {
        return util.decodeAddress(this.deployedProject.address)
    }
}

Object.assign(exports, {
    Project
})

