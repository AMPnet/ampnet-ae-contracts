const Cooperative = require("./contracts/cooperative").Cooperative
const Eur = require("./contracts/eur").Eur
const Organization = require("./contracts/organization").Organization
const Project = require("./contracts/project").Project

const accountsInitializer = require("./init/accountsInitializer")
const contractsInitializer = require("./init/contractsInitializer")
const deployer = require("./deploy/deployer")

const error = require("./utils/error")
const Ae = require('@aeternity/aepp-sdk').Universal;

describe("Playground", () => {

    let accounts
	let contracts
	let coop
	let eur

    /////////// ------ SETUP ------------ ///////////
    
  	before(async () => {
		accounts = await accountsInitializer.initialize(wallets)
        contracts = await contractsInitializer.initialize(accounts)
        error.init(accounts.coop.client)
	})

	beforeEach(async () => {
		let deployed = await deployer.deploy(contracts)
		coop = new Cooperative(deployed.coop)
        eur = new Eur(deployed.eur)
    })
    
    ///////////// --------- TESTS ----------- ///////////

    it('Random test', async () => {
        // let address = await accounts.bob.address
        // let test = await coop.registerWallet(address)
    })

})