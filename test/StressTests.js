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

	let numberOfInvestors = 6
	let investorBatchSize = 1
	let smallInvestment = 250
	let mediumInvestment = 500
	let largeInvestment = 750

	let largeTestProjectWithInvestors = {
		minInvestmentPerUser: 1,					// $1 min investment per user
		maxInvestmentPerUser: 1000000,				// $1M max invesment per user
		investmentCap: 3000,					// $15M investment cap
		endsAt: time.currentTimeWithDaysOffset(10), // 10 days period of crowdfunding process
		state: generateInitialInvestors(
			numberOfInvestors, 
			investorBatchSize, 
			smallInvestment, 
			mediumInvestment, 
			largeInvestment
		)
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

		// Add 300 investments which will fund project completely (only coop admin can add manually).
		// Also mint actual total investment on project wallet.
		// NOTE: Only coop admin can execute these actions, could be useful for manual set-up
		//       of partially funded projects migrating to our platform, or avoiding previous
		//	     issues by deploying new project contracts and setting everything up. 
		await proj.addInitialInvestors(accounts.coop.client)
		await eur.mint(proj.address(), largeTestProjectWithInvestors.investmentCap)

		// Check if project funded completely
		let funded = await proj.isCompletelyFunded()
		console.log("funded completely", funded)

		// Suppose project generated $1M revenue. Payout shares to each investor
		let revenue = 1000000
		await eur.mint(proj.address(), revenue)
		await proj.startRevenueSharesPayout(revenue)
		await proj.payoutRevenueShares()

		// Check paid revenue shares
		let investors = await proj.getInvestments()
		console.log("investors", investors)

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
		var investorsSeparated = []
		
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
				investorsSeparated.push(randAddress)
			}
			batch += "]"
			investors += "]"
			investmentsList.push(batch)
			investorsList.push(investors)
		}
	
		console.log("investors separated", investorsSeparated)

		return {
			investors: investorsList,
			investments: investmentsList,
			investorsArray: investors
		}
	}

})