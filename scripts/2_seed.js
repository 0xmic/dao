// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat')
const config = require('../src/config.json')

const tokens = (n) => {
  return hre.ethers.utils.parseUnits(n.toString(), 'ether')
}

async function main() {
  console.log(`Fetching accounts & network...\n`)

  const accounts = await hre.ethers.getSigners()
  const funder = accounts[0]
  const investor1 = accounts[1]
  const investor2 = accounts[2]
  const investor3 = accounts[3]
  const investor4 = accounts[4]
  const investor5 = accounts[5]
  const recipient = accounts[6]

  let transaction

  // Fetch network
  const { chainId } = await hre.ethers.provider.getNetwork()

  console.log(`Fetching token and transferring to accounts...\n`)

  // Fetch deployed token
  const token = await hre.ethers.getContractAt('Token', config[chainId].token.address)
  console.log(`Token fetched: ${token.address}\n`)

  // Send tokens to investors - 50% (each investor gets 10%)
  transaction = await token.transfer(investor1.address, tokens(200000))
  await transaction.wait()

  transaction = await token.transfer(investor2.address, tokens(200000))
  await transaction.wait()

  transaction = await token.transfer(investor3.address, tokens(200000))
  await transaction.wait()

  transaction = await token.transfer(investor4.address, tokens(200000))
  await transaction.wait()

  transaction = await token.transfer(investor5.address, tokens(200000))
  await transaction.wait()

  console.log(`Transferred tokens to accounts...\n`)

  // Fetch deployed dao
  const dao = await hre.ethers.getContractAt('DAO', config[chainId].dao.address)
  console.log(`DAO fetched: ${dao.address}\n`)

  // Send remaining tokens to DAO treasury - 50%
  transaction = await token.transfer(dao.address, tokens(1000000))
  await transaction.wait()

  for (var i = 0; i < 3; i++) {
    // Create proposal
    transaction = await dao
      .connect(investor1)
      .createProposal(`Proposal ${i + 1}`, tokens(100000), recipient.address, `Description ${i + 1}`)
    await transaction.wait()

    // Up Vote 1
    transaction = await dao.connect(investor1).upVote(i + 1)
    await transaction.wait()

    // Up Vote 2
    transaction = await dao.connect(investor2).upVote(i + 1)
    await transaction.wait()

    // Up Vote 3
    transaction = await dao.connect(investor3).upVote(i + 1)
    await transaction.wait()

    // Finalize
    transaction = await dao.connect(investor1).finalizeProposal(i + 1)
    await transaction.wait()

    console.log(`Created & Finalized Proposal ${i + 1}\n`)
  }

  console.log(`Creating one more proposal...\n`)

  // Create one more proposal
  transaction = await dao
    .connect(investor1)
    .createProposal(`Proposal 4`, tokens(100000), recipient.address, `Description 4`)
  await transaction.wait()

  // Up Vote 1
  transaction = await dao.connect(investor2).upVote(4)
  await transaction.wait()

  // Up Vote 2
  transaction = await dao.connect(investor3).upVote(4)
  await transaction.wait()

  console.log(`Finished.\n`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
