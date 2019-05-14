const Cooperative = require("./contracts/cooperative").Cooperative
const Eur = require("./contracts/eur").Eur
const Organization = require("./contracts/organization").Organization
const Project = require("./contracts/project").Project

const accountsInitializer = require("./init/accounts")
const contractsInitializer = require("./init/contracts")
const deployer = require("./deploy/deployer")

const randomstring = require('randomstring')
const util = require('./utils/util')
const time = require('./utils/time')

describe("Stress tests", () => {

	let accounts
	let contracts
	let coop
	let eur

	let largeTestProjectWithInvestors = {
		minInvestmentPerUser: 1,					// $1 min investment per user
		maxInvestmentPerUser: 1000000,				// $1M max invesment per user
		investmentCap: 15000000,					// $15M investment cap
		endsAt: time.currentTimeWithDaysOffset(10), // 10 days period of crowdfunding process
		state: generateInitialInvestors(300, 50, 25000, 50000, 75000) // 300 small-mid-large investors (in batches of 50)
	}

	/////////// ------ SETUP ------------ ///////////
    
  	before(async () => {
		accounts = await accountsInitializer.initialize(wallets)
		contracts = await contractsInitializer.initialize(accounts)
	})

	beforeEach(async () => {
		let deployed = await deployer.deploy(contracts)
		coop = new Cooperative(deployed.coop)
		eur = new Eur(deployed.eur)
	})

	///////////// --------- TESTS ----------- ///////////

	it('Should be able to process 300 investors and payout revenue shares', async () => {
		// Regiter all 300 investor wallets + Bob's (org and project admin)
		await coop.registerWallets(largeTestProjectWithInvestors.state.investors)
		await coop.registerWallet(accounts.bob.address)

		// Bob creates organization, admin approves by activating wallet
		let org = new Organization(contracts.org.source, coop.address(), accounts.bob.client)
		await org.deploy()
		await coop.registerWallet(org.address())

		// Bob creates project under his organization, admin approves by activating project wallet
		let proj = new Project(contracts.proj.source, org.address(), accounts.bob.client, largeTestProjectWithInvestors)
		await proj.deploy()
		await coop.registerWallet(proj.address())

		// Add 300 investments which will fund project completely (only coop admin can add manually)
		await proj.addInitialInvestors(accounts.coop.client)

		// Check if project funded completely
		let funded = await proj.isCompletelyFunded()
		console.log("funded completely", funded)

		// let investors = await proj.call("get_investors")
		// let investorsDecoded = await investors.decode("(list((int, address)))")
		// console.log("investors decoded", investorsDecoded.value[999].value)

		// // Alice tops up wallet with 100 EUR
		// await mint(alice.publicKey, 100)

		// // Alice invests 100 EUR into proj
		// await approveInvestment(aliceClient, proj, 100)
		// await makeInvestment(aliceClient, proj)

		// // Fetch Alice's investment
		// let investment = await getInvestment(aliceClient, proj)
		// let investmentDecoded = await investment.decode("(int)")
		// console.log("Alice investment", investmentDecoded)

		// // Fetch Alice's balance
		// let balance = await getBalance(alice.publicKey)
		// let balanceDecoded = await balance.decode("(int)")
		// console.log("Alice balance", balanceDecoded)

		// // Payout revenue shares
		// await startRevenueSharesPayout(proj, 30)
		// await payoutRevenueShares(proj)

		// // Fetch Alice's balance again (30 EUR of revenue shares should be visible)
		// let newBalance = await getBalance(alice.publicKey)
		// let newBalanceDecoded = await newBalance.decode("(int)")
		// console.log("Alice new balance", newBalanceDecoded)
	})

	/////////// ------ HELPER FUNCTIONS --------- ////////

	/**
	 * Generates initial investors list of size - amount.
	 * Divides investors in three categories: small, medium, large.
	 * Third of investors invest half of average investment (average as in project_cap / amount_of_investors ).
	 * Another third if investors invest average, and finally last third represents large investors (1.5 * average).
	 * Sum of all these investments is equal to investmentCap (if investmentCap is divisible by amount and amount is
	 * divisible by 3).
	 * 
	 * Used for stress testing on large groups of investors (2-3k ppl).
	 */

	function generateInitialInvestors(amount, batchSize, min, avg, max) {
		var investmentsList = []
		var investorsList = []
		
		for(var batchIndex = 0; batchIndex < amount / batchSize; batchIndex++) {
			var i
			let from = batchIndex * batchSize
			let to = (batchIndex + 1) * batchSize 
			var batch = "["
			var investors = "["
			for (i = from; i < to; i++) {
				let investment
	
				if (i < amount / 3) investment = min
				else if (i < 2 * amount / 3) investment = avg
				else investment = max
			
				let randAddress = "0x" + randomstring.generate({
					length: 64,
					charset: 'hex'
				})
				if (i > from) {
					batch += ", "
					investors += ", "
				}
				batch += `(${randAddress}, ${util.eurToToken(investment)})`
				investors += randAddress
			}
			batch += "]"
			investors += "]"
			investmentsList.push(batch)
			investorsList.push(investors)
		}
	
		return {
			investors: investorsList,
			investments: investmentsList
		}
	}

})