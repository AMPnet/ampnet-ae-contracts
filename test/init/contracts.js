let fs = require('fs')
let path = require('path')

let coopSource = fs.readFileSync(path.join(__dirname, '../..', 'contracts', 'Coop.aes')).toString()
let eurSource = fs.readFileSync(path.join(__dirname, '../..', 'contracts', 'EUR.aes')).toString()
let orgSource = fs.readFileSync(path.join(__dirname, '../..', 'contracts', 'Organization.aes')).toString()
let projSource = fs.readFileSync(path.join(__dirname, '../..', 'contracts', 'Project.aes')).toString()

Object.assign(exports, { coopSource, eurSource, orgSource, projSource })