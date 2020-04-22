let { Universal: Ae, Node, MemoryAccount } = require('@aeternity/aepp-sdk')
let AeConfig = require('./init/config').local

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

describe("Organization contract tests", () => {

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

    
    ///////////// --------- TESTS ----------- ///////////

    it("can create new organization if caller's wallet is registered by Cooperative", async () => {
        let randomWallet = util.generateRandomAeWallet()
        await coop.registerWallet(randomWallet.publicKey)
        await accounts.bank.client.spend(100000000000000000, randomWallet.publicKey)

        let newOrganization = await createOrganization(randomWallet)
        expect(newOrganization.contractInstance.deployInfo.result.returnType).is.equal('ok')
    })

    it("should fail if non-registered user is trying to create organization", async () => {
        let randomWallet = util.generateRandomAeWallet()
        await accounts.bank.client.spend(100000000000000000, randomWallet.publicKey)
        let forbiddenOrgCreate = createOrganization(randomWallet)
        await expect(forbiddenOrgCreate).to.be.rejectedWith("Invocation failed: cb_ATwjQ2FuIG5vdCBjcmVhdGUgb3JnYW5pemF0aW9uLiBDcmVhdG9yIG11c3QgYmUgcmVnaXN0ZXJlZCBwbGF0Zm9ybSB1c2VyIHdpdGggYWN0aXZhdGVkIHdhbGxldC4jwtUY6Q==. Decoded: \u0001<#Can not create organization. Creator must be registered platform user with activated wallet.#��\u0018�")
    })

    it("has no active wallet by default", async () => {
        let randomWallet = util.generateRandomAeWallet()
        await coop.registerWallet(randomWallet.publicKey)
        await accounts.bank.client.spend(100000000000000000, randomWallet.publicKey)

        let org = await createOrganization(randomWallet)
        let isWalletActive = await coop.isWalletActive(org.address())
        expect(isWalletActive).to.be.false
    })

    it("can get verified by Cooperative (which results in active organization wallet)", async () => {
        let randomWallet = util.generateRandomAeWallet()
        await coop.registerWallet(randomWallet.publicKey)
        await accounts.bank.client.spend(100000000000000000, randomWallet.publicKey)

        let org = await createOrganization(randomWallet)
        await coop.registerWallet(org.address())
        
        let isWalletActive = await coop.isWalletActive(org.address())
        expect(isWalletActive).to.be.true

        let isVerified = await org.isVerified()
        expect(isVerified).to.be.true
    })

    it("should fail if trying to add new member as non-owner of organization", async () => {
        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)

        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let nonOwner = util.generateRandomAeWallet()
        await coop.registerWallet(nonOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, nonOwner.publicKey)

        let randomWallet = util.generateRandomAeWallet()
        await coop.registerWallet(randomWallet.publicKey)

        let nonOwnerOrgInstance = await org.getInstance(nonOwner)
        let forbiddenCall = nonOwnerOrgInstance.addMember(randomWallet.publicKey)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_vSNPbmx5IG9yZ2FuaXphdGlvbiBvd25lciBjYW4gbWFrZSB0aGlzIGFjdGlvbiEjdXaHgQ==. Decoded: �#Only organization owner can make this action!#uv��")
    })

    it("should fail if trying to add new member to a non-activated organization", async () => {
        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)

        let org = await createOrganization(orgOwner)

        let randomWallet = util.generateRandomAeWallet()
        await coop.registerWallet(randomWallet.publicKey)

        let forbiddenCall = org.addMember(randomWallet.publicKey)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_AQgjSW4gb3JkZXIgdG8gbWFrZSB0aGlzIGFjdGlvbiBvcmdhbml6YXRpb24gbXVzdCBoYXZlIGFjdGl2ZSB3YWxsZXQhI+3DOmM=. Decoded: \u0001\b#In order to make this action organization must have active wallet!#��:c")
    })

    it("should fail if trying to add non-activated member to organization", async () => {
        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)

        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let randomWallet = util.generateRandomAeWallet()
        let forbiddenCall = org.addMember(randomWallet.publicKey)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_ATYjTWVtYmVyIHRvIGJlIGFkZGVkIHRvIG9yZ2FuaXphdGlvbiBoYXMgdG8gYmUgcmVnaXN0ZXJlZCBwbGF0Zm9ybSB1c2VyIHdpdGggYWN0aXZlIHdhbGxldC4jdDOuBA==. Decoded: \u00016#Member to be added to organization has to be registered platform user with active wallet.#t3�\u0004")
    })

    it("should fail if trying to confirm membership on non-active organization", async () => {
        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        let member = util.generateRandomAeWallet()
        await coop.registerWallet(member.publicKey)
        await accounts.bank.client.spend(100000000000000000, member.publicKey)

        let memberOrgInstance = await org.getInstance(member)
        let forbiddenCall = memberOrgInstance.confirmMembership()
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_AQgjSW4gb3JkZXIgdG8gbWFrZSB0aGlzIGFjdGlvbiBvcmdhbml6YXRpb24gbXVzdCBoYXZlIGFjdGl2ZSB3YWxsZXQhI+3DOmM=. Decoded: \u0001\b#In order to make this action organization must have active wallet!#��:c")
    })

    it("should fail if trying to confirm organization membership of a non-activated wallet", async () => {
        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let member = util.generateRandomAeWallet()
        await accounts.bank.client.spend(100000000000000000, member.publicKey)
        let memberOrgInstance = await org.getInstance(member)
        let forbiddenCall = memberOrgInstance.confirmMembership()
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_ARQjT25seSByZWdpc3RlcmVkIHBsYXRmb3JtIG1lbWJlciB3aXRoIGFjdGl2ZSB3YWxsZXQgY2FuIG1ha2UgdGhpcyBhY3Rpb24uIzKDkeY=. Decoded: \u0001\u0014#Only registered platform member with active wallet can make this action.#2���")
    })

    it("should fail if trying to confirm organization membership but invitation does not exist", async () => {
        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let member = util.generateRandomAeWallet()
        await coop.registerWallet(member.publicKey)
        await accounts.bank.client.spend(100000000000000000, member.publicKey)

        let memberOrgInstance = await org.getInstance(member)
        let forbiddenCall = memberOrgInstance.confirmMembership()
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_8SNUcnlpbmcgdG8gYWNjZXB0IG9yZ2FuaXphdGlvbiBpbnZpdGUgd2hpY2ggZG9lcyBub3QgZXhpc3QhIzrQ0n4=. Decoded: �#Trying to accept organization invite which does not exist!#:��~")
    })

    it("should fail if trying to confirm organization membership but invite is already accepted", async () => {
        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let member = util.generateRandomAeWallet()
        await coop.registerWallet(member.publicKey)
        await accounts.bank.client.spend(100000000000000000, member.publicKey)
        let memberOrgInstance = await org.getInstance(member)

        await org.addMember(member.publicKey)
        await memberOrgInstance.confirmMembership()
        
        let forbiddenCall = memberOrgInstance.confirmMembership()
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_AQYjVHJ5aW5nIHRvIGFjY2VwdCBvcmdhbml6YXRpb24gaW52aXRlIGJ1dCBpdCB3YXMgYWxyZWFkeSBhY2NlcHRlZCEjzRetrg==. Decoded: \u0001\u0006#Trying to accept organization invite but it was already accepted!#�\u0017��")
    })

    it("should be able for org admin to send invite and then for member to accept the invite and become org member", async () => {
        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let member = util.generateRandomAeWallet()
        await coop.registerWallet(member.publicKey)
        await accounts.bank.client.spend(100000000000000000, member.publicKey)
        let memberOrgInstance = await org.getInstance(member)

        let memberStatusBeforeInvite = await org.isMember(member.publicKey)
        expect(memberStatusBeforeInvite).to.be.false

        await org.addMember(member.publicKey)

        let memberStatusBeforeConfirm = await org.isMember(member.publicKey)
        expect(memberStatusBeforeConfirm).to.be.false

        await memberOrgInstance.confirmMembership()

        let memberStatusAfterConfirm = await org.isMember(member.publicKey)
        expect(memberStatusAfterConfirm).to.be.true
    })

    ///////////// --------- HELPERS ----------- ////////////

    async function createOrganization(keypair) {
        let node = await Node({
            url: AeConfig.url,
            internalUrl: AeConfig.internalUrl
        })
        let client = await Ae({
            nodes: [ { name: "node", instance: node } ],
            compilerUrl: AeConfig.compilerUrl,
            accounts: [
                MemoryAccount({ keypair: keypair })
            ],
            address: keypair.publicKey,
            networkId: AeConfig.networkId
        })
        let org = new Organization(coop.address(), client)
        await org.deploy()
        return org
    }

})