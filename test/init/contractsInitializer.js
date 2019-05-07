async function initialize(accounts) {
    let coopClient = accounts.coop.client
    let eurClient = accounts.eur.client

    let coopSource = utils.readFileRelative('./contracts/Coop.aes', "utf-8")
    let coopCompiled = await coopClient.contractCompile(coopSource)

    let eurSource = utils.readFileRelative('./contracts/EUR.aes', "utf-8")
    let eurCompiled = await eurClient.contractCompile(eurSource)

    let orgSource = utils.readFileRelative('./contracts/Organization.aes', "utf-8")
    let orgCompiled = await coopClient.contractCompile(orgSource)

    let projSource = utils.readFileRelative('./contracts/Project.aes', "utf-8")
    let projCompiled = await coopClient.contractCompile(projSource)

    return {
        coop: {
            source: coopSource,
            compiled: coopCompiled
        },
        eur: {
            source: eurSource,
            compiled: eurCompiled
        },
        org: {
            source: orgSource,
            compiled: orgCompiled
        },
        proj: {
            source: projSource,
            compiled: projCompiled
        }
    }
}

Object.assign(exports, { initialize })