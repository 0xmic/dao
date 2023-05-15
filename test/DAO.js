const { expect } = require('chai')
const { ethers } = require('hardhat')

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const ether = tokens

describe('DAO', () => {
  let token, dao
  let deployer, funder, investor1, investor2, investor3, investor4, investor5, recipient, user

  beforeEach(async () => {
    let transaction

    // Set up accounts
    let accounts = await ethers.getSigners()
    deployer = accounts[0]
    funder = accounts[1]
    investor1 = accounts[2]
    investor2 = accounts[3]
    investor3 = accounts[4]
    investor4 = accounts[5]
    investor5 = accounts[6]
    recipient = accounts[7]
    user = accounts[8]

    // Deploy token
    const Token = await ethers.getContractFactory('Token')
    token = await Token.deploy('Crypto Token', 'CT', '2000000')

    // Send tokens to investors - 50% (each investor gets 10%)
    transaction = await token.connect(deployer).transfer(investor1.address, tokens(200000))
    await transaction.wait()

    transaction = await token.connect(deployer).transfer(investor2.address, tokens(200000))
    await transaction.wait()

    transaction = await token.connect(deployer).transfer(investor3.address, tokens(200000))
    await transaction.wait()

    transaction = await token.connect(deployer).transfer(investor4.address, tokens(200000))
    await transaction.wait()

    transaction = await token.connect(deployer).transfer(investor5.address, tokens(200000))
    await transaction.wait()

    // Deploy DAO
    // Set quorum to > 25% of total token supply:
    // 500k tokens + 1 wei, i.e., 500000000000000000000001
    const DAO = await ethers.getContractFactory('DAO')
    dao = await DAO.deploy(token.address, '500000000000000000000001')

    // Send remaining tokens to DAO treasury - 50%
    transaction = await token.connect(deployer).transfer(dao.address, tokens(1000000))
  })

  describe('Deployment', () => {
    it('sends Crypto Token (CT) to the DAO treasury', async () => {
      expect(await token.balanceOf(dao.address)).to.equal(tokens(1000000))
    })

    it('has correct name', async () => {
      expect(await dao.token()).to.equal(token.address)
    })

    it('returns quorum', async () => {
      expect(await dao.quorum()).to.equal('500000000000000000000001')
    })
  })

  describe('Proposal creation', () => {
    let transaction, result

    describe('Success', () => {
      beforeEach(async () => {
        transaction = await dao
          .connect(investor1)
          .createProposal('Proposal 1', tokens(100), recipient.address, 'Description 1')
        result = await transaction.wait()
      })

      it('updates proposal count', async () => {
        expect(await dao.proposalCount()).to.equal(1)
      })

      it('updates proposal mapping', async () => {
        const proposal = await dao.proposals(1)

        expect(proposal.id).to.equal(1)
        expect(proposal.amount).to.equal(tokens(100))
        expect(proposal.recipient).to.equal(recipient.address)
      })

      it('emits a propose event', async () => {
        await expect(transaction)
          .to.emit(dao, 'Propose')
          .withArgs(1, tokens(100), recipient.address, investor1.address, 'Description 1')
      })
    })

    describe('Failure', () => {
      it('rejects invalid amount - not enough funds in DAO', async () => {
        await expect(
          dao.connect(investor1).createProposal('Proposal 1', tokens(1000001), recipient.address, 'Description 1')
        ).to.be.reverted
      })

      it('rejects non-investor', async () => {
        await expect(dao.connect(user).createProposal('Proposal 1', tokens(100), recipient.address, 'Description 1')).to
          .be.reverted
      })
    })
  })

  describe('Up Voting', () => {
    let transaction, result

    beforeEach(async () => {
      transaction = await dao
        .connect(investor1)
        .createProposal('Proposal 1', tokens(100), recipient.address, 'Description 1')
      result = await transaction.wait()
    })

    describe('Success', () => {
      beforeEach(async () => {
        transaction = await dao.connect(investor1).upVote(1)
        result = await transaction.wait()
      })

      it('updates vote count', async () => {
        const proposal = await dao.proposals(1)
        expect(proposal.votes).to.equal(tokens(200000))
      })

      it('emits an UpVote event', async () => {
        await expect(transaction).to.emit(dao, 'UpVote').withArgs(1, investor1.address)
      })
    })

    describe('Failure', () => {
      it('rejects non-investor', async () => {
        await expect(dao.connect(user).upVote(1)).to.be.reverted
      })

      it('rejects double voting', async () => {
        transaction = await dao.connect(investor1).upVote(1)
        await transaction.wait()

        await expect(dao.connect(investor1).upVote(1)).to.be.reverted
      })
    })
  })

  describe('Down Voting', () => {
    let transaction, result

    beforeEach(async () => {
      transaction = await dao
        .connect(investor1)
        .createProposal('Proposal 1', tokens(100), recipient.address, 'Description 1')
      result = await transaction.wait()
    })

    describe('Success', () => {
      beforeEach(async () => {
        transaction = await dao.connect(investor1).upVote(1)
        result = await transaction.wait()

        transaction = await dao.connect(investor2).downVote(1)
        result = await transaction.wait()
      })

      it('updates vote count', async () => {
        const proposal = await dao.proposals(1)
        expect(proposal.votes).to.equal(tokens(0))
      })

      it('emits a DownVote event', async () => {
        await expect(transaction).to.emit(dao, 'DownVote').withArgs(1, investor2.address)
      })
    })

    describe('Failure', () => {
      it('rejects non-investor', async () => {
        await expect(dao.connect(user).downVote(1)).to.be.reverted
      })

      it('rejects double voting', async () => {
        transaction = await dao.connect(investor1).downVote(1)
        await transaction.wait()

        await expect(dao.connect(investor1).downVote(1)).to.be.reverted
      })
    })
  })

  describe('Governance', () => {
    let transaction, result

    describe('Success', () => {
      beforeEach(async () => {
        // Create proposal
        transaction = await dao
          .connect(investor1)
          .createProposal('Proposal 1', tokens(100), recipient.address, 'Description 1')
        result = await transaction.wait()

        // Up Vote
        transaction = await dao.connect(investor1).upVote(1)
        result = await transaction.wait()

        transaction = await dao.connect(investor2).upVote(1)
        result = await transaction.wait()

        transaction = await dao.connect(investor3).upVote(1)
        result = await transaction.wait()

        // Finalize proposal
        transaction = await dao.connect(investor1).finalizeProposal(1)
        result = await transaction.wait()
      })

      it('transfers funds to recipient', async () => {
        expect(await token.balanceOf(recipient.address)).to.equal(tokens(100))
      })

      it('updates the proposal to finalize', async () => {
        const proposal = await dao.proposals(1)
        expect(proposal.finalized).to.equal(true)
      })

      it('emits a Finalize event', async () => {
        await expect(transaction).to.emit(dao, 'Finalize').withArgs(1)
      })
    })

    describe('Failure', () => {
      beforeEach(async () => {
        // Create proposal
        transaction = await dao
          .connect(investor1)
          .createProposal('Proposal 1', tokens(100), recipient.address, 'Description 1')
        result = await transaction.wait()

        // Up Vote
        transaction = await dao.connect(investor1).upVote(1)
        result = await transaction.wait()

        transaction = await dao.connect(investor2).upVote(1)
        result = await transaction.wait()
      })

      it('rejects finalization if not enough upVotes', async () => {
        await expect(dao.connect(investor1).finalizeProposal(1)).to.be.reverted
      })

      it('rejects finalization from a non-investor', async () => {
        transaction = await dao.connect(investor3).upVote(1)
        result = await transaction.wait()

        await expect(dao.connect(user).finalizeProposal(1)).to.be.reverted
      })

      it('rejects proposal if already finalized', async () => {
        // Up Vote 3
        transaction = await dao.connect(investor3).upVote(1)
        result = await transaction.wait()

        // Finalize
        transaction = await dao.connect(investor1).finalizeProposal(1)
        result = await transaction.wait()

        // Try to finalize again
        await expect(dao.connect(investor1).finalizeProposal(1)).to.be.reverted
      })
    })
  })
})
