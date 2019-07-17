let coopSource = utils.readFileRelative('./contracts/Coop.aes', "utf-8")
let eurSource = utils.readFileRelative('./contracts/EUR.aes', "utf-8")
let orgSource = utils.readFileRelative('./contracts/Organization.aes', "utf-8")
let projSource = utils.readFileRelative('./contracts/Project.aes', "utf-8")

Object.assign(exports, { coopSource, eurSource, orgSource, projSource })