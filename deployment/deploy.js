/*
 * ISC License (ISC)
 * Copyright (c) 2018 aeternity developers
 *
 *  Permission to use, copy, modify, and/or distribute this software for any
 *  purpose with or without fee is hereby granted, provided that the above
 *  copyright notice and this permission notice appear in all copies.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 *  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
 *  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 *  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 *  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 *  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 *  PERFORMANCE OF THIS SOFTWARE.
 */
const Ae = require('@aeternity/aepp-sdk').Universal
const Crypto = require('@aeternity/aepp-sdk').Crypto
const Deployer = require('forgae').Deployer;
const gasLimit = 1000000;

const deploy = async (network, privateKey) => {

	/* Works as expected */

	let coopOwner = privateKey
	let eurOwner = '7c6e602a94f30e4ea7edabe4376314f69ba7eaa2f355ecedb339df847b6f0d80575f81ffb0a297b7725dc671da0b1769b1fc5cbe45385c7b5ad1fc2eaf1d609d'

	let coopDeployer = new Deployer(network, coopOwner)
	let coop = await coopDeployer.deploy("./contracts/Coop.aes")

	let eurDeployer = new Deployer(network, eurOwner)
	let coopAddressDecoded = `0x${Crypto.decodeBase58Check(coop.address.split('_')[1]).toString('hex')}`
	console.log(`coop address decoded: ${coopAddressDecoded}`)
	let eur = await eurDeployer.deploy("./contracts/EUR.aes", gasLimit, `(${coopAddressDecoded})`) 

	let eurAddressDecoded = `0x${Crypto.decodeBase58Check(eur.address.split('_')[1]).toString('hex')}`
	console.log(`eur address decoded: ${eurAddressDecoded}`)

	let result = await coop.call("setToken", {
		args: `(${eurAddressDecoded})`
	})

	let balanceCall = await coop.call("balance_of", {
		args: `(0x0)`
	})
	let balanceCallDecoded = await balanceCall.decode("(int)")

	console.log(balanceCallDecoded)
};

module.exports = {
	deploy
};