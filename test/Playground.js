const Cooperative = require("./contracts/cooperative").Cooperative
const Eur = require("./contracts/eur").Eur
const Organization = require("./contracts/organization").Organization
const Project = require("./contracts/project").Project

const accountsInitializer = require("./init/accounts")
const contractsInitializer = require("./init/contracts")
const deployer = require("./deploy/deployer")

const error = require("./utils/error")
const Ae = require('@aeternity/aepp-sdk').Universal;
const { Account } = require('@aeternity/aepp-sdk')

describe("Playground", () => {

    let accounts
	let contracts
	let coop
	let eur

    /////////// ------ SETUP ------------ ///////////
    
  	before(async () => {
		accounts = await accountsInitializer.initialize(wallets)
        //contracts = await contractsInitializer.initialize(accounts)
	})

	beforeEach(async () => {
		// let deployed = await deployer.deploy(contracts)
		// coop = new Cooperative(deployed.coop)
        // eur = new Eur(deployed.eur)
    })
    
    ///////////// --------- TESTS ----------- ///////////

    it('Random test', async () => {
        let client = accountsInitializer.main()
        // console.log("wallets[0]", wallets[0])

        // let signedTx = await client.signTransaction('tx_+NwrAaEBV1+B/7Cil7dyXcZx2gsXabH8XL5FOFx7WtH8Lq8dYJ0DoQXMeYA4M85xSwjWsqAZf1iH81bkHfky2XQg8LUKGO7PfgGHAaZn3TgwAAAAgicQhDuaygC4gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgQctP/wfKh0SSrBsILkd1fYXkVnB5I5Q8IuGm4vD7gSQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYCBv8H+Z6lF7egKNqIhPs5mi4/hXkv5BiWaZG6CbGSyR+UwQbg==')
        // console.log("signed tx", signedTx)

        let txInfo = await client.getTxInfo('th_2qhBqcazQ9zmtyT2oNpdQr1xBoTzMgyCSxN8MBMT4BvHipbxHz')
        console.log("txInfo", txInfo)
    })
})