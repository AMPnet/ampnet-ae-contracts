let Ae = require('@aeternity/aepp-sdk').Universal
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
const time = require('./utils/time')

describe("Project contract tests", () => {

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

    it("can create new project if caller is organization admin and organization is verified", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        expect(proj.contractInstance.deployInfo.result.returnType).is.equal('ok')

        let fetchedProjectInfo = await proj.getInfo()
        expect(fetchedProjectInfo.minInvestmentPerUser).is.equal(projectInfo.minInvestmentPerUser)
        expect(fetchedProjectInfo.maxInvestmentPerUser).is.equal(projectInfo.maxInvestmentPerUser)
        expect(fetchedProjectInfo.investmentCap).is.equal(projectInfo.investmentCap)
        expect(fetchedProjectInfo.endsAt).is.equal(projectInfo.endsAt)

        let hasFundingExpired = await proj.hasFundingExpired()
        let isCompletelyFunded = await proj.isCompletelyFunded()
        let totalFundsRaised = await proj.totalFundsRaised()
        expect(hasFundingExpired).to.be.false
        expect(isCompletelyFunded).to.be.false
        expect(totalFundsRaised).is.equal(0)

        let investments = await proj.getInvestments()
        expect(investments).to.be.an('object').that.is.empty

        await coop.registerWallet(proj.address())
        let isWalletActive = await coop.isWalletActive(proj.address())
        expect(isWalletActive).to.be.true
    })

    it("should fail to create project if caller is not an organization admin", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let notOwner = util.generateRandomAeWallet()
        await coop.registerWallet(notOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, notOwner.publicKey)

        let forbiddenProjectCreate = createProject(org, notOwner, projectInfo)
        await expect(forbiddenProjectCreate).to.be.rejectedWith("Invocation failed: cb_4U11c3QgYmUgb3JnYW5pemF0aW9uIG93bmVyIHRvIGJlIGFibGUgdG8gY3JlYXRlIFByb2plY3Qub3u5pA==. Decoded: �Must be organization owner to be able to create Project.o{��")
    })

    it("should fail to create project if organization is not verified", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        let forbiddenProjectCreate = createProject(org, orgOwner, projectInfo)
        await expect(forbiddenProjectCreate).to.be.rejectedWith("Invocation failed: cb_ARJPcmdhbml6YXRpb24gbXVzdCBoYXZlIGFuIGFjdGl2ZSB3YWxsZXQgYmVmb3JlIGl0IGNhbiBjcmVhdGUgbmV3IFByb2plY3QuIUxpOA==. Decoded: \u0001\u0012Organization must have an active wallet before it can create new Project.!Li8")
    })

    it("can process new user investment", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        await coop.registerWallet(investor.publicKey)
        await eur.mint(investor.publicKey, projectInfo.minInvestmentPerUser)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)

        let investorEurInstance = await eur.getInstance(investor)
        let investmentAmount = projectInfo.minInvestmentPerUser
        await investorEurInstance.approve(proj.address(), investmentAmount)
        await proj.invest(investor.publicKey)

        let totalFundsRaised = await proj.totalFundsRaised()
        expect(totalFundsRaised).to.be.equal(investmentAmount)

        let isCompletelyFunded = await proj.isCompletelyFunded()
        expect(isCompletelyFunded).to.be.false

        let investorProjInstance = await proj.getInstance(investor)
        let fetchedInvestment = await investorProjInstance.getInvestment()
        expect(fetchedInvestment).to.be.equal(investmentAmount)
    })

    it("should signalize when investment cap reached", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        let investmentAmount = projectInfo.investmentCap
        await coop.registerWallet(investor.publicKey)
        await eur.mint(investor.publicKey, investmentAmount)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), investmentAmount)
        await proj.invest(investor.publicKey)

        let isCompletelyFunded = await proj.isCompletelyFunded()
        expect(isCompletelyFunded).to.be.true
    })

    it("should fail to process investment if project completely funded", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        let investmentAmount = projectInfo.investmentCap
        await coop.registerWallet(investor.publicKey)
        await eur.mint(investor.publicKey, investmentAmount)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), investmentAmount)
        await proj.invest(investor.publicKey)

        let unluckyInvestor = util.generateRandomAeWallet()
        let unluckyInvestmentAmount = projectInfo.minInvestmentPerUser
        await coop.registerWallet(unluckyInvestor.publicKey)
        await eur.mint(unluckyInvestor.publicKey, unluckyInvestmentAmount)
        await accounts.bank.client.spend(100000000000000000, unluckyInvestor.publicKey)
        
        let unluckyInvestorEurInstance = await eur.getInstance(unluckyInvestor)
        await unluckyInvestorEurInstance.approve(proj.address(), unluckyInvestmentAmount)
        
        let forbiddenInvestCall = proj.invest(unluckyInvestor.publicKey)
        await expect(forbiddenInvestCall).to.be.rejectedWith("Invocation failed: cb_yUNhbiBub3QgaW52ZXN0LCBwcm9qZWN0IGFscmVhZHkgY29tcGxldGVseSBmdW5kZWQu52wRvw==. Decoded: �Can not invest, project already completely funded.�l\u0011�")
    })

    it("should fail to process investment if trying to invest 0 tokens", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        await coop.registerWallet(investor.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)

        let forbiddenCall = proj.invest(investor.publicKey)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_bUNhbiBub3QgaW52ZXN0IHplcm8gdG9rZW5zIRIYreE=. Decoded: mCan not invest zero tokens!\u0012\u0018��")
    })

    it("should fail if user's single investment or additional investment will surpass maxPerUser limit", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        let singleInvestmentOutOfBounds = projectInfo.maxInvestmentPerUser + 1
        await coop.registerWallet(investor.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, singleInvestmentOutOfBounds)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), singleInvestmentOutOfBounds)
        
        let forbiddenSingleInvestment = proj.invest(investor.publicKey)
        await expect(forbiddenSingleInvestment).to.be.rejectedWith("Invocation failed: cb_ASxVc2VyJ3MgaW52ZXN0bWVudCB3aWxsIHN1cnBhc3MgbWF4aW11bSBwZXItdXNlciBpbnZlc3RtZW50IGZvciB0aGlzIHByb2plY3QuIEFib3J0aW5nLhXE0g4=. Decoded: \u0001,User\'s investment will surpass maximum per-user investment for this project. Aborting.\u0015��\u000e")
    
        await investorEurInstance.approve(proj.address(), projectInfo.minInvestmentPerUser)
        await proj.invest(investor.publicKey)
        await investorEurInstance.approve(proj.address(), singleInvestmentOutOfBounds - projectInfo.minInvestmentPerUser)
        let forbiddenAdditionalInvestment = proj.invest(investor.publicKey)
        await expect(forbiddenAdditionalInvestment).to.be.rejectedWith("Invocation failed: cb_ASxVc2VyJ3MgaW52ZXN0bWVudCB3aWxsIHN1cnBhc3MgbWF4aW11bSBwZXItdXNlciBpbnZlc3RtZW50IGZvciB0aGlzIHByb2plY3QuIEFib3J0aW5nLhXE0g4=. Decoded: \u0001,User\'s investment will surpass maximum per-user investment for this project. Aborting.\u0015��\u000e")
    })

    it("should fail if user's investment does not meet minimum required perUserInvestment", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        let investmentAmount = projectInfo.minInvestmentPerUser - 1
        await coop.registerWallet(investor.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, investmentAmount)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), investmentAmount)
        
        let forbiddenInvest = proj.invest(investor.publicKey)
        await expect(forbiddenInvest).to.be.rejectedWith("Invocation failed: cb_AUBVc2VyJ3MgaW52ZXN0bWVudCBkb2VzIG5vdCBtZWV0IHJlcXVpcmVkIG1pbmltdW0gcGVyLXVzZXIgaW52ZXN0bWVudCBmb3IgdGhpcyBwcm9qZWN0LiBBYm9ydGluZy7nv6Eb. Decoded: \u0001@User\'s investment does not meet required minimum per-user investment for this project. Aborting.翡\u001b")
    })

    it("should fail if user's investment will make total funds raised be greater than the actual investment cap", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let firstInvestor = util.generateRandomAeWallet()
        let firstInvestmentAmount = projectInfo.minInvestmentPerUser
        await coop.registerWallet(firstInvestor.publicKey)
        await accounts.bank.client.spend(100000000000000000, firstInvestor.publicKey)
        await eur.mint(firstInvestor.publicKey, firstInvestmentAmount)

        let firstInvestorEurInstance = await eur.getInstance(firstInvestor)
        await firstInvestorEurInstance.approve(proj.address(), firstInvestmentAmount)
        await proj.invest(firstInvestor.publicKey)

        let secondInvestor = util.generateRandomAeWallet()
        let secondInvestmentAmount = projectInfo.maxInvestmentPerUser
        await coop.registerWallet(secondInvestor.publicKey)
        await accounts.bank.client.spend(100000000000000000, secondInvestor.publicKey)
        await eur.mint(secondInvestor.publicKey, secondInvestmentAmount)
        
        let secondInvestorEurInstance = await eur.getInstance(secondInvestor)
        await secondInvestorEurInstance.approve(proj.address(), secondInvestmentAmount)
        let forbiddenInvest = proj.invest(secondInvestor.publicKey)
        await expect(forbiddenInvest).to.be.rejectedWith("Invocation failed: cb_AT5Vc2VyJ3MgaW52ZXN0bWVudCB3aWxsIG1ha2UgdG90YWwgZnVuZHMgcmFpc2VkIGdyZWF0ZXIgdGhhbiBwcm9qZWN0J3MgaW52ZXN0bWVudCBjYXAuIEFib3J0aW5nLuVH8Q8=. Decoded: \u0001>User\'s investment will make total funds raised greater than project\'s investment cap. Aborting.�G�\u000f")
    })

    it("should fail if user's investment will leave tiny fraction (smaller than minimumPerUser amount) not funded resulting in dead-lock state", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let firstInvestor = util.generateRandomAeWallet()
        let firstInvestmentAmount = 850
        await coop.registerWallet(firstInvestor.publicKey)
        await accounts.bank.client.spend(100000000000000000, firstInvestor.publicKey)
        await eur.mint(firstInvestor.publicKey, firstInvestmentAmount)

        let firstInvestorEurInstance = await eur.getInstance(firstInvestor)
        await firstInvestorEurInstance.approve(proj.address(), firstInvestmentAmount)
        await proj.invest(firstInvestor.publicKey)

        let secondInvestor = util.generateRandomAeWallet()
        let secondInvestmentAmount = 100
        await coop.registerWallet(secondInvestor.publicKey)
        await accounts.bank.client.spend(100000000000000000, secondInvestor.publicKey)
        await eur.mint(secondInvestor.publicKey, secondInvestmentAmount)
        
        let secondInvestorEurInstance = await eur.getInstance(secondInvestor)
        await secondInvestorEurInstance.approve(proj.address(), secondInvestmentAmount)
        let forbiddenInvest = proj.invest(secondInvestor.publicKey)
        await expect(forbiddenInvest).to.be.rejectedWith("Invocation failed: cb_AUhVc2VyJ3MgaW52ZXN0bWVudCB3aWxsIGxlYXZlIHRpbnkgZnJhY3Rpb24gb2YgcHJvamVjdCBub24tZnVuZGVkLiBFbmxhcmdlIHlvdXIgaW52ZXN0bWVudC4gQWJvcnRpbmcuMgUyqA==. Decoded: \u0001HUser\'s investment will leave tiny fraction of project non-funded. Enlarge your investment. Aborting.2\u00052�")
    })

    it("should fail for user to invest if project funding has ended", async () => {
        let projectInfo = generateProject(100, 1000, 1000, 1)

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        let investmentAmount = projectInfo.minInvestmentPerUser
        await coop.registerWallet(investor.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, investmentAmount)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), investmentAmount)
        let forbiddenCall = proj.invest(investor.publicKey)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_aVByb2plY3QgZnVuZGluZyBoYXMgZW5kZWQuGY+Xbg==. Decoded: iProject funding has ended.\u0019��n")
    })

    it("should be able for user to invest multiple times (while remaining in min-max per user limits", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        let firstInvestmentAmount = projectInfo.minInvestmentPerUser
        let secondInvestmentAmount = 10

        await coop.registerWallet(investor.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, firstInvestmentAmount + secondInvestmentAmount)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), firstInvestmentAmount)
        await proj.invest(investor.publicKey)
        await investorEurInstance.approve(proj.address(), secondInvestmentAmount)
        await proj.invest(investor.publicKey)

        let totalFundsRaised = await proj.totalFundsRaised()
        expect(totalFundsRaised).to.be.equal(firstInvestmentAmount + secondInvestmentAmount)

        let investorProjInstance = await proj.getInstance(investor)
        let fetchedUserInvestment = await investorProjInstance.getInvestment()
        expect(fetchedUserInvestment).to.be.equal(firstInvestmentAmount + secondInvestmentAmount)

        let investments = await proj.getInvestments()
        expect(Object.keys(investments)).to.be.an("array").with.lengthOf(1)
        expect(investments).to.have.property(investor.publicKey)
        expect(investments[investor.publicKey]).to.equal(firstInvestmentAmount + secondInvestmentAmount)
    })

    it("should be able for user to cancel investment if: \n\t - organization admin has activated that option and project not fully funded\n\t - organization admin has activated that option and project IS fully funded\n\t - project not fully funded (regardless of admin flag value)", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        await coop.registerWallet(investor.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, projectInfo.investmentCap)

        // CASE: Project not completely funded and admin did not enable cancelInvestment flag

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), projectInfo.minInvestmentPerUser)
        await proj.invest(investor.publicKey)
        let investorProjInstance = await proj.getInstance(investor)
        await investorProjInstance.cancelInvestment()

        let firstCaseInvestments = await proj.getInvestments()
        expect(Object.keys(firstCaseInvestments)).to.be.an("array").with.lengthOf(1)
        expect(firstCaseInvestments).to.have.property(investor.publicKey)
        expect(firstCaseInvestments[investor.publicKey]).to.equal(0)

        let firstCaseTotalFundsRaised = await proj.totalFundsRaised()
        expect(firstCaseTotalFundsRaised).to.equal(0)

        let firstCaseFetchedInvestment = await investorProjInstance.getInvestment()
        expect(firstCaseFetchedInvestment).to.equal(0)

        let firstCaseInvestorBalance = await eur.getBalance(investor.publicKey)
        expect(firstCaseInvestorBalance).to.equal(projectInfo.investmentCap)


        // CASE: Project not completely funded and admin did enable cancelInvestment flag

        await investorEurInstance.approve(proj.address(), projectInfo.minInvestmentPerUser)
        await proj.invest(investor.publicKey)
        await proj.setCancelInvestmentFlag(true)
        await investorProjInstance.cancelInvestment()

        let secondCaseInvestments = await proj.getInvestments()
        expect(Object.keys(secondCaseInvestments)).to.be.an("array").with.lengthOf(1)
        expect(secondCaseInvestments).to.have.property(investor.publicKey)
        expect(secondCaseInvestments[investor.publicKey]).to.equal(0)

        let secondCaseTotalFundsRaised = await proj.totalFundsRaised()
        expect(secondCaseTotalFundsRaised).to.equal(0)

        let secondCaseFetchedInvestment = await investorProjInstance.getInvestment()
        expect(secondCaseFetchedInvestment).to.equal(0)

        let secondCaseInvestorBalance = await eur.getBalance(investor.publicKey)
        expect(secondCaseInvestorBalance).to.equal(projectInfo.investmentCap)


        // CASE: Project completely funded and admin did enable cancelInvestment flag

        await investorEurInstance.approve(proj.address(), projectInfo.investmentCap)
        await proj.invest(investor.publicKey)
        await investorProjInstance.cancelInvestment()

        let thirdCaseInvestments = await proj.getInvestments()
        expect(Object.keys(thirdCaseInvestments)).to.be.an("array").with.lengthOf(1)
        expect(thirdCaseInvestments).to.have.property(investor.publicKey)
        expect(thirdCaseInvestments[investor.publicKey]).to.equal(0)

        let thirdCaseTotalFundsRaised = await proj.totalFundsRaised()
        expect(thirdCaseTotalFundsRaised).to.equal(0)

        let thirdCaseFetchedInvestment = await investorProjInstance.getInvestment()
        expect(thirdCaseFetchedInvestment).to.equal(0)

        let thirdCaseInvestorBalance = await eur.getBalance(investor.publicKey)
        expect(thirdCaseInvestorBalance).to.equal(projectInfo.investmentCap)

    })

    it("should fail if user tries to cancel non-existing investment", async () => {
        let projectInfo = generateProject()
        let investor = util.generateRandomAeWallet()
        await coop.registerWallet(investor.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)

        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investorProjInstance = await proj.getInstance(investor)
        let forbiddenCancelInvest = investorProjInstance.cancelInvestment()
        await expect(forbiddenCancelInvest).to.be.rejectedWith("Invocation failed: cb_ZUNhbm5vdCBjYW5jZWwgaW52ZXN0bWVudCEqQq8k. Decoded: eCannot cancel investment!*B�$")
    })

    it("should fail to cancel investment if project fully funded", async () => {
        let projectInfo = generateProject()
        let investor = util.generateRandomAeWallet()
        let investment = projectInfo.investmentCap
        await coop.registerWallet(investor.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, investment)

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)

        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), investment)
        await proj.invest(investor.publicKey)
        
        let investorProjInstance = await proj.getInstance(investor)
        let forbiddenCancelInvest = investorProjInstance.cancelInvestment()
        await expect(forbiddenCancelInvest).to.be.rejectedWith("Invocation failed: cb_ZUNhbm5vdCBjYW5jZWwgaW52ZXN0bWVudCEqQq8k. Decoded: eCannot cancel investment!*B�$")
    })

    it("should be able for project admin to payout revenue shares to its investors after project funded and operational", async () => {
        let projectInfo = generateProject(100, 7352186115, 7352186115, 2000)

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)

        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investorThatCancelled = util.generateRandomAeWallet()
        let cancelledInvestment = projectInfo.minInvestmentPerUser
        await coop.registerWallet(investorThatCancelled.publicKey)
        await accounts.bank.client.spend(100000000000000000, investorThatCancelled.publicKey)
        await eur.mint(investorThatCancelled.publicKey, cancelledInvestment)
        let investorThatCancelledEurInstance = await eur.getInstance(investorThatCancelled)
        await investorThatCancelledEurInstance.approve(proj.address(), cancelledInvestment)
        await proj.invest(investorThatCancelled.publicKey)
        let investorThatCancelledProjInstance = await proj.getInstance(investorThatCancelled)
        await investorThatCancelledProjInstance.cancelInvestment()
        console.log("hesitant investor cancelled")

        let investor1 = util.generateRandomAeWallet()
        let investment1 = 100
        await coop.registerWallet(investor1.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor1.publicKey)
        await eur.mint(investor1.publicKey, investment1)
        let investor1eurInstance = await eur.getInstance(investor1)
        await investor1eurInstance.approve(proj.address(), investment1)
        await proj.invest(investor1.publicKey)
        console.log("investor 1 processed")

        let investor2 = util.generateRandomAeWallet()
        let investment2 = 375
        await coop.registerWallet(investor2.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor2.publicKey)
        await eur.mint(investor2.publicKey, investment2)
        let investor2eurInstance = await eur.getInstance(investor2)
        await investor2eurInstance.approve(proj.address(), investment2)
        await proj.invest(investor2.publicKey)
        console.log("investor 2 processed")

        let investor3 = util.generateRandomAeWallet()
        let investment3 = 510
        await coop.registerWallet(investor3.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor3.publicKey)
        await eur.mint(investor3.publicKey, investment3)
        let investor3eurInstance = await eur.getInstance(investor3)
        await investor3eurInstance.approve(proj.address(), investment3)
        await proj.invest(investor3.publicKey)
        console.log("investor 3 processed")

        let investor4 = util.generateRandomAeWallet()
        let investment4 = 12800
        await coop.registerWallet(investor4.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor4.publicKey)
        await eur.mint(investor4.publicKey, investment4)
        let investor4eurInstance = await eur.getInstance(investor4)
        await investor4eurInstance.approve(proj.address(), investment4)
        await proj.invest(investor4.publicKey)
        console.log("investor 4 processed")

        let investor5 = util.generateRandomAeWallet()
        let investment5 = 256213
        await coop.registerWallet(investor5.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor5.publicKey)
        await eur.mint(investor5.publicKey, investment5)
        let investor5eurInstance = await eur.getInstance(investor5)
        await investor5eurInstance.approve(proj.address(), investment5)
        await proj.invest(investor5.publicKey)
        console.log("investor 5 processed")

        let investor6 = util.generateRandomAeWallet()
        let investment6 = 512730
        await coop.registerWallet(investor6.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor6.publicKey)
        await eur.mint(investor6.publicKey, investment6)
        let investor6eurInstance = await eur.getInstance(investor6)
        await investor6eurInstance.approve(proj.address(), investment6)
        await proj.invest(investor6.publicKey)
        console.log("investor 6 processed")

        let investor7 = util.generateRandomAeWallet()
        let investment7 = 42050
        await coop.registerWallet(investor7.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor7.publicKey)
        await eur.mint(investor7.publicKey, investment7)
        let investor7eurInstance = await eur.getInstance(investor7)
        await investor7eurInstance.approve(proj.address(), investment7)
        await proj.invest(investor7.publicKey)
        console.log("investor 7 processed")

        let investor8 = util.generateRandomAeWallet()
        let investment8 = 2700
        await coop.registerWallet(investor8.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor8.publicKey)
        await eur.mint(investor8.publicKey, investment8)
        let investor8eurInstance = await eur.getInstance(investor8)
        await investor8eurInstance.approve(proj.address(), investment8)
        await proj.invest(investor8.publicKey)
        console.log("investor 8 processed")

        let investor9 = util.generateRandomAeWallet()
        let investment9 = 111100
        await coop.registerWallet(investor9.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor9.publicKey)
        await eur.mint(investor9.publicKey, investment9)
        let investor9eurInstance = await eur.getInstance(investor9)
        await investor9eurInstance.approve(proj.address(), investment9)
        await proj.invest(investor9.publicKey)
        console.log("investor 9 processed")

        let investor10 = util.generateRandomAeWallet()
        let investment10 = 18989
        await coop.registerWallet(investor10.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor10.publicKey)
        await eur.mint(investor10.publicKey, investment10)
        let investor10eurInstance = await eur.getInstance(investor10)
        await investor10eurInstance.approve(proj.address(), investment10)
        await proj.invest(investor10.publicKey)
        console.log("investor 10 processed")

        let investor11 = util.generateRandomAeWallet()
        let investment11 = 42433
        await coop.registerWallet(investor11.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor11.publicKey)
        await eur.mint(investor11.publicKey, investment11)
        let investor11eurInstance = await eur.getInstance(investor11)
        await investor11eurInstance.approve(proj.address(), investment11)
        await proj.invest(investor11.publicKey)    
        console.log("investor 11 processed")

        let investor12 = util.generateRandomAeWallet()
        let investment12 = 5325612815
        await coop.registerWallet(investor12.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor12.publicKey)
        await eur.mint(investor12.publicKey, investment12)
        let investor12eurInstance = await eur.getInstance(investor12)
        await investor12eurInstance.approve(proj.address(), investment12)
        await proj.invest(investor12.publicKey)    
        console.log("investor 12 processed")

        let investor13 = util.generateRandomAeWallet()
        let investment13 = 1144020000
        await coop.registerWallet(investor13.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor13.publicKey)
        await eur.mint(investor13.publicKey, investment13)
        let investor13eurInstance = await eur.getInstance(investor13)
        await investor13eurInstance.approve(proj.address(), investment13)
        await proj.invest(investor13.publicKey)    
        console.log("investor 13 processed")

        let investor14 = util.generateRandomAeWallet()
        let investment14 = 795020000
        await coop.registerWallet(investor14.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor14.publicKey)
        await eur.mint(investor14.publicKey, investment14)
        let investor14eurInstance = await eur.getInstance(investor14)
        await investor14eurInstance.approve(proj.address(), investment14)
        await proj.invest(investor14.publicKey)    
        console.log("investor 14 processed")

        let investor15 = util.generateRandomAeWallet()
        let investment15 = 86533300
        await coop.registerWallet(investor15.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor15.publicKey)
        await eur.mint(investor15.publicKey, investment15)
        let investor15eurInstance = await eur.getInstance(investor15)
        await investor15eurInstance.approve(proj.address(), investment15)
        await proj.invest(investor15.publicKey)    
        console.log("investor 15 processed")
        
        let isCompletelyFunded = await proj.isCompletelyFunded()
        expect(isCompletelyFunded).to.be.true

        let investments = await proj.getInvestments()
        console.log("investments", investments)
        expect(Object.keys(investments)).to.be.an("array").with.lengthOf(16)
        expect(investments[investorThatCancelled.publicKey]).to.equal(0)
        expect(investments[investor1.publicKey]).to.be.equal(investment1)
        expect(investments[investor2.publicKey]).to.be.equal(investment2)
        expect(investments[investor3.publicKey]).to.be.equal(investment3)
        expect(investments[investor4.publicKey]).to.be.equal(investment4)
        expect(investments[investor5.publicKey]).to.be.equal(investment5)
        expect(investments[investor6.publicKey]).to.be.equal(investment6)
        expect(investments[investor7.publicKey]).to.be.equal(investment7)
        expect(investments[investor8.publicKey]).to.be.equal(investment8)
        expect(investments[investor9.publicKey]).to.be.equal(investment9)
        expect(investments[investor10.publicKey]).to.be.equal(investment10)
        expect(investments[investor11.publicKey]).to.be.equal(investment11)
        expect(investments[investor12.publicKey]).to.be.equal(investment12)
        expect(investments[investor13.publicKey]).to.be.equal(investment13)
        expect(investments[investor14.publicKey]).to.be.equal(investment14)
        expect(investments[investor15.publicKey]).to.be.equal(investment15)

        let revenue = 154437715
        await eur.mint(proj.address(), revenue)
        await proj.startRevenueSharesPayout(revenue)
        await proj.payoutRevenueShares()

        let investorThatCancelledFetchedBalance = await eur.getBalance(investorThatCancelled.publicKey)
        let investor1fetchedBalance = await eur.getBalance(investor1.publicKey)
        let investor2fetchedBalance = await eur.getBalance(investor2.publicKey)
        let investor3fetchedBalance = await eur.getBalance(investor3.publicKey)
        let investor4fetchedBalance = await eur.getBalance(investor4.publicKey)
        let investor5fetchedBalance = await eur.getBalance(investor5.publicKey)
        let investor6fetchedBalance = await eur.getBalance(investor6.publicKey)
        let investor7fetchedBalance = await eur.getBalance(investor7.publicKey)
        let investor8fetchedBalance = await eur.getBalance(investor8.publicKey)
        let investor9fetchedBalance = await eur.getBalance(investor9.publicKey)
        let investor10fetchedBalance = await eur.getBalance(investor10.publicKey)
        let investor11fetchedBalance = await eur.getBalance(investor11.publicKey)
        let investor12fetchedBalance = await eur.getBalance(investor12.publicKey)
        let investor13fetchedBalance = await eur.getBalance(investor13.publicKey)
        let investor14fetchedBalance = await eur.getBalance(investor14.publicKey)
        let investor15fetchedBalance = await eur.getBalance(investor15.publicKey)

        expect(investorThatCancelledFetchedBalance).to.be.equal(cancelledInvestment)
        expect(investor1fetchedBalance).to.be.equal(Math.floor(investment1 * revenue / projectInfo.investmentCap))
        expect(investor2fetchedBalance).to.be.equal(Math.floor(investment2 * revenue / projectInfo.investmentCap))
        expect(investor3fetchedBalance).to.be.equal(Math.floor(investment3 * revenue / projectInfo.investmentCap))
        expect(investor4fetchedBalance).to.be.equal(Math.floor(investment4 * revenue / projectInfo.investmentCap))
        expect(investor5fetchedBalance).to.be.equal(Math.floor(investment5 * revenue / projectInfo.investmentCap))
        expect(investor6fetchedBalance).to.be.equal(Math.floor(investment6 * revenue / projectInfo.investmentCap))
        expect(investor7fetchedBalance).to.be.equal(Math.floor(investment7 * revenue / projectInfo.investmentCap))
        expect(investor8fetchedBalance).to.be.equal(Math.floor(investment8 * revenue / projectInfo.investmentCap))
        expect(investor9fetchedBalance).to.be.equal(Math.floor(investment9 * revenue / projectInfo.investmentCap))
        expect(investor10fetchedBalance).to.be.equal(Math.floor(investment10 * revenue / projectInfo.investmentCap))
        expect(investor11fetchedBalance).to.be.equal(Math.floor(investment11 * revenue / projectInfo.investmentCap))
        expect(investor12fetchedBalance).to.be.equal(Math.floor(investment12 * revenue / projectInfo.investmentCap))
        expect(investor13fetchedBalance).to.be.equal(Math.floor(investment13 * revenue / projectInfo.investmentCap))
        expect(investor14fetchedBalance).to.be.equal(Math.floor(investment14 * revenue / projectInfo.investmentCap))
        expect(investor15fetchedBalance).to.be.equal(Math.floor(investment15 * revenue / projectInfo.investmentCap))
    })

    it("should fail to start revenue shares payout if caller not organization admin", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        await coop.registerWallet(investor.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, projectInfo.investmentCap)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), projectInfo.investmentCap)
        await proj.invest(investor.publicKey)

        let investorProjInstance = await proj.getInstance(investor)
        let forbiddenCall = investorProjInstance.startRevenueSharesPayout(300)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_7U9ubHkgb3JnYW5pemF0aW9uIG93bmVyIGNhbiBpbml0aWF0ZSByZXZlbnVlIHNoYXJlcyBwYXlvdXQuC+m00w==. Decoded: �Only organization owner can initiate revenue shares payout.\u000b��")
    })

    it("should fail to start revenue shares payout if project not completely funded", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let forbiddenCall = proj.startRevenueSharesPayout(300)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_ARpDYW5ub3Qgc3RhcnQgcmV2ZW51ZSBzaGFyZSBwYXlvdXQgb24gcHJvamVjdCB3aGljaCBpcyBzdGlsbCBpbiBmdW5kaW5nIHBoYXNlLhu5+ME=. Decoded: \u0001\u001aCannot start revenue share payout on project which is still in funding phase.\u001b���")
    })

    it("should fail to start revenue shares payout if revenue not minted to project wallet", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        await coop.registerWallet(investor.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, projectInfo.investmentCap)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), projectInfo.investmentCap)
        await proj.invest(investor.publicKey)

        let forbiddenCall = proj.startRevenueSharesPayout(projectInfo.investmentCap + 1)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_AVJDYW5ub3Qgc3RhcnQgcmV2ZW51ZSBzaGFyZSBwYXlvdXQuIFByb2plY3QgYmFsYW5jZSB0b28gbG93LiBNaW50IHJldmVudWUgdG8gcHJvamVjdCB3YWxsZXQgYW5kIHRyeSBhZ2FpbiExHHnr. Decoded: \u0001RCannot start revenue share payout. Project balance too low. Mint revenue to project wallet and try again!1\u001cy�")
    })

    it("should fail to start revenue shares payout if revenue is zero", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        await coop.registerWallet(investor.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, projectInfo.investmentCap)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), projectInfo.investmentCap)
        await proj.invest(investor.publicKey)

        let forbiddenCall = proj.startRevenueSharesPayout(projectInfo.investmentCap + 1)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_AVJDYW5ub3Qgc3RhcnQgcmV2ZW51ZSBzaGFyZSBwYXlvdXQuIFByb2plY3QgYmFsYW5jZSB0b28gbG93LiBNaW50IHJldmVudWUgdG8gcHJvamVjdCB3YWxsZXQgYW5kIHRyeSBhZ2FpbiExHHnr. Decoded: \u0001RCannot start revenue share payout. Project balance too low. Mint revenue to project wallet and try again!1\u001cy�")
    })

    it("should fail to start revenue shares payout if payout already started", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        await coop.registerWallet(investor.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, projectInfo.investmentCap)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), projectInfo.investmentCap)
        await proj.invest(investor.publicKey)

        await proj.startRevenueSharesPayout(300)
        let forbiddenCall = proj.startRevenueSharesPayout(300)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_5UNhbm5vdCBzdGFydCByZXZlbnVlIHNoYXJlIHBheW91dC4gSXQgaXMgYWxyZWFkeSBzdGFydGVkIXeVt7w=. Decoded: �Cannot start revenue share payout. It is already started!w���")
    })

    it("should be able for project owner to withdraw funds once the project is fully funded", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        await coop.registerWallet(investor.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, projectInfo.investmentCap)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), projectInfo.investmentCap)
        await proj.invest(investor.publicKey)

        await proj.withdraw(projectInfo.investmentCap)
        await eur.burn(proj.address(), projectInfo.investmentCap)
        let fetchedProjBalance = await eur.getBalance(proj.address())
        expect(fetchedProjBalance).to.equal(0)
    })

    it("should fail if anyone else other than project administrator tries to withdraw funds", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        await coop.registerWallet(investor.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, projectInfo.investmentCap)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), projectInfo.investmentCap)
        await proj.invest(investor.publicKey)

        let investorProjInstance = await proj.getInstance(investor)
        let forbiddenCall = investorProjInstance.withdraw(1000)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_AQBPbmx5IG9yZ2FuaXphdGlvbiBvd25lciBjYW4gcmVxdWVzdCB3aXRoZHJhd2FsIG9mIHByb2plY3QgZnVuZHMur9lRMA==. Decoded: \u0001\u0000Only organization owner can request withdrawal of project funds.��Q0")
    })

    it("should fail if trying to withdraw funds from project which is not fully funded", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        await coop.registerWallet(investor.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, projectInfo.minInvestmentPerUser)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), projectInfo.minInvestmentPerUser)
        await proj.invest(investor.publicKey)

        let forbiddenCall = proj.withdraw(projectInfo.maxInvestmentPerUser)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_6VByb2plY3QgaW52ZXN0bWVudCBjYXAgbm90IHJlYWNoZWQhIENhbm5vdCB3aXRoZHJhdyBmdW5kcy43zHIW. Decoded: �Project investment cap not reached! Cannot withdraw funds.7�r\u0016")
    })
    
    it("should fail if trying to withdraw funds from project while revenue share payout is in process", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.bank.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        await coop.registerWallet(investor.publicKey)
        await accounts.bank.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, projectInfo.investmentCap)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), projectInfo.investmentCap)
        await proj.invest(investor.publicKey)

        await proj.startRevenueSharesPayout(1000)
        let forbiddenCall = proj.withdraw(1000)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_/UNhbm5vdCB3aXRoZHJhdyBmdW5kcyB3aGlsZSByZXZlbnVlIHNoYXJlIHBheW91dCBpcyBpbiBwcm9jZXNzLjRnuB8=. Decoded: �Cannot withdraw funds while revenue share payout is in process.4g�\u001f")
    })
 
    ///////////// --------- HELPERS ----------- ////////////

    async function createOrganization(keypair) {
        let client = await Ae({
            ...AeConfig,
            keypair: keypair
        })
        let org = new Organization(coop.address(), client)
        await org.deploy()
        return org
    }

    async function createProject(organization, keypair, project) {
        let client = await Ae({
            ...AeConfig,
            keypair: keypair
        })
        let proj = new Project(organization.address(), client, project)
        await proj.deploy()
        return proj
    }

    //////////// ----------- TEST DATA ------------- ////////////

    function generateProject(
        minInvestmentPerUser = 100,
        maxInvestmentPerUser = 1000,
        investmentCap = 1000,
        endsAtSecondsOffset = 300
    ) {
        return {
            minInvestmentPerUser,
            maxInvestmentPerUser,
            investmentCap,
            endsAt: time.currentTimeWithSecondsOffset(endsAtSecondsOffset)
        }
    }
})