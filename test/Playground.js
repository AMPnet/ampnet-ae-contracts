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

const forgaeConfig = require('forgae-config')

describe("Playground", () => {

    let accounts
	let contracts
	let coop
	let eur

    /////////// ------ SETUP ------------ ///////////
    
  	before(async () => {
		// accounts = await accountsInitializer.initialize(wallets)
        // contracts = await contractsInitializer.initialize(accounts)
	})

	beforeEach(async () => {
		// let deployed = await deployer.deploy(accounts, contracts)
		// coop = new Cooperative(deployed.coop)
        // eur = new Eur(deployed.eur)
    })
    
    ///////////// --------- TESTS ----------- ///////////

    it('Playground', async () => {
        console.log(forgaeConfig)
    })
})