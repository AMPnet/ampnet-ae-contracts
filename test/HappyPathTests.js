const accountsInitializer = require("./init/accountsInitializer")
const contractsInitializer = require("./init/contractsInitializer")
const deployer = require("./deploy/deployer")
const decodeAddress = require("./utils/util").decodeAddress

const fromExponential = require('from-exponential')
const randomstring = require('randomstring');
const currency = require('./utils/eur');

describe("Happy path test scenarios", () => {

	let accounts
	let contracts
	let coop
	let eur

	/////////// ------ TESTS SETUP -------------///////////
    
  	before(async () => {
		accounts = await accountsInitializer.initialize(wallets)
		contracts = await contractsInitializer.initialize(accounts)
	})

	beforeEach(async () => {
		let deployed = await deployer.deploy(contracts)
		coop = deployed.coop
		eur = deployed.eur
	})

	///////////// --------- TEST CASES ----------- ///////////

	it('Complete flow', async () => {
		// Regiter Bob and Alice wallets
		await registerWallet(accounts.alice.keypair.publicKey)
		await registerWallet(accounts.bob.keypair.publicKey)

		// Bob creates organization, admin approves by activating wallet
		let org = await createOrganization(accounts.bob.client)
		await registerWallet(org.address)

		// Bob creates project under his organization, admin approves by activating project wallet
		let proj = await createProject(accounts.bob.client, org, largeTestProjectWithInvestors)
		await registerWallet(proj.address)

		// Add 300 investments which will fund project completely
		var investmentBatchesLength = largeTestProjectWithInvestors.initialInvestors.length
		for (var i = 0; i < investmentBatchesLength; i++) {
			let investmentsList = largeTestProjectWithInvestors.initialInvestors[i]
			await addInvestors(accounts.coop.client, proj, investmentsList)
			console.log(`Batch ${i+1} added.`)
		}

		// Check if project funded completely
		let funded = await proj.call("is_completely_funded")
		let fundedDecoded = await funded.decode("(bool)")
		console.log(fundedDecoded)

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

	/////////// ------ CONTRACT CALLS --------- ////////

	async function registerWallet(address) {
		let decodedAddress = decodeAddress(address)
		return coop.call("add_wallet", {
			args: `(${decodedAddress})`
		})
	}

	async function createOrganization(client) {
		let compiledOrg = await client.contractCompile(contracts.org.source)
		let coopAddress = decodeAddress(coop.address)
		return compiledOrg.deploy({
			initState: `(${coopAddress})`
		})
	}

	async function createProject(client, org, project) {
		let compiledProj = await client.contractCompile(contracts.proj.source)
		let orgAddress = decodeAddress(org.address)
		let minPerUser = fromExponential(project.minInvestmentPerUser)
		let maxPerUser = fromExponential(project.maxInvestmentPerUser)
		let cap = fromExponential(project.investmentCap)
		let endsAt = project.endsAt
		return compiledProj.deploy({
			initState: `(${orgAddress}, ${minPerUser}, ${maxPerUser}, ${cap}, ${endsAt})`
		})
	}

	async function mint(address, amount) {
		let decodedAddress = decodeAddress(address)
		return eur.call("mint", {
			args: `(${decodedAddress}, ${amount})`
		})
	}

	async function approveInvestment(client, project, amount) {
		let decodedProjectAddress = decodeAddress(project.address)
		return client.contractCall(contracts.eur.compiled.bytecode, 'sophia', eur.address, "approve", {
			args: `(${decodedProjectAddress}, ${amount})`
		})
	}

	async function makeInvestment(client, project) {
		return client.contractCall(contracts.proj.compiled.bytecode, 'sophia', project.address, "invest")
	}

	async function getInvestment(client, project) {
		return client.contractCall(contracts.proj.compiled.bytecode, 'sophia', project.address, "get_investment")
	}

	async function addInvestors(client, project, investmentsList) {
		return client.contractCall(contracts.proj.compiled.bytecode, 'sophia', project.address, "add_investments", {
			args: `(${investmentsList})`
		})
	}

	async function startRevenueSharesPayout(project, amount) {
		return project.call("start_revenue_shares_payout", {
			args: `(${amount})`
		})
	}

	async function payoutRevenueShares(project) {
		return project.call("payout_revenue_shares")
	}
	
	async function getBalance(address) {
		let decodedAddress = decodeAddress(address)
		return eur.call("balance_of", {
			args: `(${decodedAddress})`
		})
	}

	let largeTestProjectWithInvestors = {
		minInvestmentPerUser: currency.eurToToken(1),		// $1 min investment per user
		maxInvestmentPerUser: currency.eurToToken(1000000),	// $1M max invesment per user
		investmentCap: currency.eurToToken(15000000),		// $15M investment cap
		endsAt: 1572566400000,
		initialInvestors: generateInitialInvestors(300, 50, currency.eurToToken(25000), currency.eurToToken(50000), currency.eurToToken(75000)) // 3k small-mid-large investors
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

	function generateInitialInvestors(amount, batchSize, min, avg, max) {
		var result = []

		for(var batchIndex = 0; batchIndex < amount / batchSize; batchIndex++) {
			var i
			let from = batchIndex * batchSize
			let to = (batchIndex + 1) * batchSize 
			var batch = "["
			for (i = from; i < to; i++) {
				let investment
	
				if (i < amount / 3) investment = min
				else if (i < 2 * amount / 3) investment = avg
				else investment = max
			
				let randAddress = "0x" + randomstring.generate({
					length: 64,
					charset: 'hex'
				})
				if (i > from) batch += ", "
				batch += `(${randAddress}, ${fromExponential(investment)})`
			}
			batch += "]"
			result.push(batch)
		}
	
		return result
	}

})