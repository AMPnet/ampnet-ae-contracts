const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)

const assert = chai.assert
const expect = chai.expect
const wallets = require('aeproject-config').defaultWallets
const contracts = require('./init/contracts')

const Cooperative = require("./contracts/cooperative").Cooperative
const Eur = require("./contracts/eur").Eur
const Organization = require("./contracts/organization").Organization
const Project = require("./contracts/project").Project

const accountsInitializer = require("./init/accounts")
const deployer = require("./deploy/deployer")

const util = require('./utils/util')

describe("Cooperative contract tests", () => {

    let accounts
	let coop
    let eur

    /////////// ---------- SETUP ------------ ///////////

    before(async () => {
        accounts = await accountsInitializer.initialize(wallets)
        let deployed = await deployer.deploy(accounts)
		coop = new Cooperative(deployed.coop)
		eur = new Eur(deployed.eur)
    })

    it("should be able to claim ownership on Coop contract only once", async () => {
        let newOwner = util.generateRandomAeWallet()
        await coop.claimOwnership(newOwner.publicKey)
        let fetchedOwner = await (await coop.fetchOwner()).decode()
        expect(fetchedOwner).to.equal(newOwner.publicKey)

        let forbiddenOwner = util.generateRandomAeWallet()
        let forbiddenCall = coop.claimOwnership(forbiddenOwner.publicKey)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_8SNFcnJvcjogdHJ5aW5nIHRvIGNsYWltIG93bmVyc2hpcCBtb3JlIHRoYW4gb25jZS4gQWJvcnRpbmcuI0ob3fA=. Decoded: �#Error: trying to claim ownership more than once. Aborting.#J\u001b��")
    })

    it("should be able to claim ownership on EUR contract only once", async () => {
        let newOwner = util.generateRandomAeWallet()
        await eur.claimOwnership(newOwner.publicKey)
        let fetchedOwner = await (await eur.fetchOwner()).decode()
        expect(fetchedOwner).to.equal(newOwner.publicKey)

        let forbiddenOwner = util.generateRandomAeWallet()
        let forbiddenCall = eur.claimOwnership(forbiddenOwner.publicKey)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_8SNFcnJvcjogdHJ5aW5nIHRvIGNsYWltIG93bmVyc2hpcCBtb3JlIHRoYW4gb25jZS4gQWJvcnRpbmcuI0ob3fA=. Decoded: �#Error: trying to claim ownership more than once. Aborting.#J\u001b��")
    
    })

})