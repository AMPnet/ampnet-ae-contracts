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

    it("should fail to claim ownership on Coop contract, feature is disabled", async () => {
        let newOwner = util.generateRandomAeWallet()
        let forbiddenCall = coop.claimOwnership(newOwner.publicKey)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_3SNFcnJvcjogY2xhaW0gb3duZXJzaGlwIGZlYXR1cmUgaXMgZGlzYWJsZWQuIEFib3J0aW5nLiMgZMWt. Decoded: �#Error: claim ownership feature is disabled. Aborting.# dŭ")
    })

    it("should fail to claim ownership on EUR contract, feature is disabled", async () => {
        let newOwner = util.generateRandomAeWallet()
        let forbiddenCall = eur.claimOwnership(newOwner.publicKey)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_3SNFcnJvcjogY2xhaW0gb3duZXJzaGlwIGZlYXR1cmUgaXMgZGlzYWJsZWQuIEFib3J0aW5nLiMgZMWt. Decoded: �#Error: claim ownership feature is disabled. Aborting.# dŭ")
    })

})