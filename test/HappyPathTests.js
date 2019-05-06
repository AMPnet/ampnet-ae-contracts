const Ae = require('@aeternity/aepp-sdk').Universal;
const Crypto = require('@aeternity/aepp-sdk').Crypto;
const randomstring = require('randomstring')

const currency = require('./utils/eur');
const time = require('./utils/time');

const config = {
  host: "http://localhost:3001/",
  internalHost: "http://localhost:3001/internal/",
  gas: 1000000,
  ttl: 10000
}

describe("Happy path test scenarios", () => {

	/////////// ------ TESTS SETUP -------------///////////
    
  	before(async () => {
		await initializeClients()
		await loadAndCompileContracts()
	})

	beforeEach(async () => { 
		await deployContracts()
	})

	///////////// --------- TEST CASES ----------- ///////////

	it('Complete flow', async () => {
		let timestamp = await coop.call("timestamp")
		let timestampDecoded = await timestamp.decode("(int)")
		console.log("decodeed timestamp", timestampDecoded)

		let t = time.currentTimeWithDaysOffset(1)
		console.log("tomorrow", t)

		console.log("large test project investors", largeTestProjectWithInvestors.initialInvestors)
		
		var pos
		for (pos = 0; pos < largeTestProjectWithInvestors; pos += 100) {
			let investments = largeTestProjectWithInvestors.initialInvestors.slice(pos, pos + 100)

		}

		

		// // Regiter Bob and Alice wallets
		// await registerWallet(alice.publicKey)
		// await registerWallet(bob.publicKey)

		// // Bob creates organization, admin approves by activating wallet
		// let org = await createOrganization(bobClient)
		// await registerWallet(org.address)
		
		// // Bob creates project under his organization, admin approves by activating project wallet
		// let proj = await createProject(bobClient, org, largeTestProjectWithInvestors)
		// await registerWallet(proj.address)

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
		let compiledOrg = await client.contractCompile(orgSource)
		let coopAddress = decodeAddress(coop.address)
		return compiledOrg.deploy({
			initState: `(${coopAddress})`
		})
	}

	async function createProject(client, org, project) {
		let compiledProj = await client.contractCompile(projSource)
		let orgAddress = decodeAddress(org.address)
		return compiledProj.deploy({
			initState: `(${orgAddress}, ${project.minInvestmentPerUser}, ${project.maxInvestmentPerUser}, ${project.investmentCap}, ${project.endsAt}, ${project.initialInvestors})`
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
		return client.contractCall(compiledEur.bytecode, 'sophia', eur.address, "approve", {
			args: `(${decodedProjectAddress}, ${amount})`
		})
	}

	async function makeInvestment(client, project) {
		return client.contractCall(compiledProj.bytecode, 'sophia', project.address, "invest")
	}

	async function getInvestment(client, project) {
		return client.contractCall(compiledProj.bytecode, 'sophia', project.address, "get_investment")
	}

	async function addInvestors(client, project, investmentsList) {
		return client.contractCall(compiledProj.bytecode, 'sophia', project.address, "add_investments", {
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

	async function parseInitialInvestors(project, numOfInvestors) {
		let investorsList = generateInitialInvestors(numOfInvestors, project.investmentCap)
		console.log("Investors list", investorsList)
	}

	////////// ------- CONSTANTS -------------- ////////

	let coopOwner = wallets[0];
	let eurOwner = wallets[1];
	let alice = wallets[2];
	let bob = wallets[3];
	
	let compiledEur;
	let compiledCoop;

	let orgSource;
	let compiledOrg;

	let projSource;
	let compiledProj;

    let coop;
	let eur;

	let coopClient;
	let eurClient;
	let aliceClient;
	let bobClient; 

	let largeTestProjectWithInvestors = {
		minInvestmentPerUser: currency.eurToToken(1),		// $1 min investment per user
		maxInvestmentPerUser: currency.eurToToken(1000000),	// $1M max invesment per user
		investmentCap: currency.eurToToken(150000000),		// $150M investment cap
		endsAt: 1572566400000,								// 
		initialInvestors: generateInitialInvestors(3000, currency.eurToToken(25000), currency.eurToToken(50000), currency.eurToToken(75000)) // 3k small-mid-large investors
	}

	/////////// ------ HELPER FUNCTIONS ------- ////////

	async function initializeClients() {
		coopClient = await Ae({
      		url: config.host,
      		internalUrl: config.internalHost,
      		keypair: coopOwner,
      		nativeMode: true,
      		networkId: 'ae_devnet'
		});
		
		eurClient = await Ae({
      		url: config.host,
      		internalUrl: config.internalHost,
      		keypair: eurOwner,
      		nativeMode: true,
		  	networkId: 'ae_devnet'
		});

		bobClient = await Ae({
      		url: config.host,
      		internalUrl: config.internalHost,
      		keypair: bob,
      		nativeMode: true,
		  	networkId: 'ae_devnet'
		});

		aliceClient = await Ae({
      		url: config.host,
      		internalUrl: config.internalHost,
      		keypair: alice,
      		nativeMode: true,
		  	networkId: 'ae_devnet'
		});
	}
	
	async function loadAndCompileContracts() {
		let coopSource = utils.readFileRelative('./contracts/Coop.aes', "utf-8")
		compiledCoop = await coopClient.contractCompile(coopSource, { gas: config.gas })

		let eurSource = utils.readFileRelative('./contracts/EUR.aes', "utf-8")
		compiledEur = await eurClient.contractCompile(eurSource, { gas: config.gas })

		orgSource = utils.readFileRelative('./contracts/Organization.aes', "utf-8")
		compiledOrg = await coopClient.contractCompile(orgSource, { gas: config.gas })

		projSource = utils.readFileRelative('./contracts/Project.aes', "utf-8")
		compiledProj = await coopClient.contractCompile(projSource, { gas: config.gas })
	}

	async function deployContracts() {
		coop = await compiledCoop.deploy()
		console.log(`decoded coop address: ${decodeAddress(coop.address)}`)
		
		eur = await compiledEur.deploy({
			initState: `(${decodeAddress(coop.address)})`
		})
		console.log(eur)
		console.log(`decoded eur address: ${decodeAddress(eur.address)}`)
		
		await coop.call("set_token", {
			args: `(${decodeAddress(eur.address)})`
		})
	}

	function decodeAddress(key) {
		const decoded = Crypto.decodeBase58Check(key.split('_')[1]).toString('hex')
		return `0x${decoded}`
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

	function generateInitialInvestors(amount, min, avg, max) {
		var result = [];
		console.log(result)
		var batchIndex
		for(batchIndex = 0; batchIndex < amount / 100; batchIndex++) {
			var i
			let from = batchIndex * 100
			let to = (batchIndex + 1) * 100 
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
				batch += `(${randAddress}, ${investment})`
			}
			batch += "]"
			console.log("batch", batchIndex)
			console.log(batch)
			result.push(batch)
		}
	
		return result
	}

})