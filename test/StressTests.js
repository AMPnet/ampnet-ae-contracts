const Cooperative = require("./contracts/cooperative").Cooperative
const Eur = require("./contracts/eur").Eur
const Organization = require("./contracts/organization").Organization
const Project = require("./contracts/project").Project

const accountsInitializer = require("./init/accounts")
const deployer = require("./deploy/deployer")

const util = require('./utils/util')
const time = require('./utils/time')

describe("Stress tests", () => {

	let accounts
	let contracts
	let coop
	let eur

	/////////// ------ SETUP ------------ ///////////
    
  	before(async () => {
		accounts = await accountsInitializer.initialize(wallets)
	})

	beforeEach(async () => {
		let deployed = await deployer.deploy(accounts)
		coop = new Cooperative(deployed.coop)
		eur = new Eur(deployed.eur)
	})

	///////////// --------- TESTS ----------- ///////////

	it('Should be able to process 150 investors and payout revenue shares', async () => {
		let projData = await getHeavyProject()

		// Regiter all 150 investor wallets + Bob's (org and project admin)
		await coop.registerWallets(projData.state.investors)
		await coop.registerWallet(accounts.bob.address)

		// Bob creates organization, admin approves by activating wallet
		let org = new Organization(coop.address(), accounts.bob.client)
		await coop.registerWallet(org.address())

		let orgWalletActive = await coop.isWalletActive(org.address())
		console.log("Org wallet active", orgWalletActive)

		// Bob creates project under his organization, admin approves by activating project wallet
		let proj = new Project(org.address(), accounts.bob.client, projData)
		await proj.deploy()
		await coop.registerWallet(proj.address())

		// Add investments which will fund project completely (only coop admin can add manually).
		// Also mint actual total investment on project wallet.
		// NOTE: Only coop admin can execute these actions, could be useful for manual set-up
		//       of partially funded projects migrating to our platform, or avoiding previous
		//	     issues by deploying new project contracts and setting everything up. 
		await proj.addInitialInvestors(accounts.coop.client)
		await eur.mint(proj.address(), projData.investmentCap)

		// Check if project funded completely
		let funded = await proj.isCompletelyFunded()
		console.log("funded completely", funded)

		// Suppose project generated $1M revenue. Payout shares to each investor
		let revenue = 1000000
		await eur.mint(proj.address(), revenue)
		let balance = await eur.getBalance(proj.address())
		console.log("project balance", balance)

		await proj.startRevenueSharesPayout(revenue)
		await proj.payoutRevenueShares()

		// Check paid revenue shares
		let investors = await proj.getInvestments()
		console.log("investors", investors)

		let projectBalance = await eur.getBalance(proj.address())
		console.log("remaining project balance", projectBalance)

		let firstInvestor = investors[0]
		console.log("first investor", firstInvestor)

		let firstInvestorBalance = await eur.getBalance(firstInvestor[0])
		console.log("first investor balance", firstInvestorBalance)

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

	async function getHeavyProject() {
		let investmentCap = 3000								// 3k EUR investment cap
		let minInvestment = 1									// 1 EUR min per user investment
		let maxInvestment = 3000								// 3k EUR max per user investment
		let deadline = time.currentTimeWithDaysOffset(10)		// project expires in 10 days

		let numberOfInvestors = 150
		let smallInvestment = 10
		let mediumInvestment = 20
		let largeInvestment = 30

		let investmentRecord = await generateInvestors(
			numberOfInvestors, 
			smallInvestment, 
			mediumInvestment, 
			largeInvestment
		)

		return {
			minInvestmentPerUser: minInvestment,
			maxInvestmentPerUser: maxInvestment,
			investmentCap: investmentCap,
			endsAt: deadline,
			state: investmentRecord
		}
	}

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
	async function generateInvestors(amount, min, avg, max) {
		var investmentsList = []
		var investorsList = []

		for (var i = 0; i < amount; i++) {
			let investment
	
			if (i < amount / 3) investment = min
			else if (i < 2 * amount / 3) investment = avg
			else investment = max

			let randomAddress = await util.generateRandomAeAddress()
			let investmentTokens = util.eurToToken(investment)

			investmentsList.push(new Array(randomAddress, investmentTokens))
			investorsList.push(randomAddress)
		}

		return {
			investors: investorsList,
			investments: investmentsList
		}
	}

})