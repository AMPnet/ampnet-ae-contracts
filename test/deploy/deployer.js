const util = require("../utils/util")

async function deploy(contracts) {
    let coop = await contracts.coop.compiled.deploy()
    let coopAddress = util.decodeAddress(coop.address)

    let eur = await contracts.eur.compiled.deploy({
        initState: `(${coopAddress})`
    })
    let eurAddress = util.decodeAddress(eur.address)
    
    await coop.call("set_token", {
        args: `(${eurAddress})`
    })

    return {
        coop: coop,
        eur: eur
    }
}

Object.assign(exports, { deploy })