const Ae = require('@aeternity/aepp-sdk').Universal;
const Crypto = require('@aeternity/aepp-sdk').Crypto;

const config = {
  host: "http://localhost:3001/",
  internalHost: "http://localhost:3001/internal/",
  gas: 1000000,
  ttl: 10000
}

describe("Happy path test scenarios", () => {

	/////////// ------ TESTS SETUP -------------///////////

	let coopOwner = wallets[0];
	let eurOwner = wallets[1];
	let alice = wallets[2];
	let bob = wallets[3];
	
	let compiledCoop;
	let compiledEur;

  let coop;
  let eur;
    
  before(async () => {
		await loadAndCompileContracts()
	})

	beforeEach(async () => { 
		await deployContracts()
	})

	///////////// --------- TEST CASES ----------- ///////////

	it('test', async () => {
		let coopTestCall = await coop.call("test")
		let coopTestCallDecoded = await coopTestCall.decode("(int)")
		console.log("coopTestCallDecoded", coopTestCallDecoded)
		
		let eurTestCall = await eur.call("test")
		let eurTestCallDecoded = await eurTestCall.decode("(int)") // this fails with giving up after 10 blocks mined
		console.log("eurTestCallDecoded", eurTestCallDecoded)

	})

	/////////// ------ HELPER FUNCTIONS ------- ////////
	
	async function loadAndCompileContracts() {
    const coopOwnerClient = await Ae({
      url: config.host,
      internalUrl: config.internalHost,
      keypair: coopOwner,
      nativeMode: true,
      networkId: 'ae_devnet'
    });

    const eurOwnerClient = await Ae({
      url: config.host,
      internalUrl: config.internalHost,
      keypair: eurOwner,
      nativeMode: true,
		  networkId: 'ae_devnet'
		});

		const ae = await Ae({
      url: config.host,
      internalUrl: config.internalHost,
      keypair: wallets[0],
      nativeMode: true,
		  networkId: 'ae_devnet'
		});
		
		let coopSource = utils.readFileRelative('./contracts/Coop.aes', "utf-8")
		compiledCoop = await ae.contractCompile(coopSource, { gas: config.gas })

		let eurSource = utils.readFileRelative('./contracts/EUR.aes', "utf-8")
		compiledEur = await ae.contractCompile(eurSource, { gas: config.gas })
	}

	async function deployContracts() {
		coop = await compiledCoop.deploy()
		console.log(`decoded coop address: ${decodeAddress(coop.address)}`)
		
		eur = await compiledEur.deploy({
			args: `(${decodeAddress(coop.address)})`,
		})
		console.log(eur)
		console.log(`decoded eur address: ${decodeAddress(eur.address)}`)
		
		await coop.call("setToken", {
			args: `(${decodeAddress(eur.address)})`
		})
		

		/* This fails with gas_error */

		// let delegatedCall = await coop.call("balance_of", {
		// 	args: `(0x0)`
		// })
		// console.log(delegatedCall)
		// let decoded = await delegatedCall.decode("(int)")
		// console.log(decoded)
	}

	function decodeAddress(key) {
		const decoded = Crypto.decodeBase58Check(key.split('_')[1]).toString('hex')
		return `0x${decoded}`
	}

})