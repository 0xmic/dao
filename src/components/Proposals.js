import { useEffect } from 'react'
import Table from 'react-bootstrap/Table'
import Button from 'react-bootstrap/Button'
import { ethers } from 'ethers'

const Proposals = ({ provider, dao, proposals, quorum, account, userVotes, setUserVotes, setIsLoading }) => {
  useEffect(() => {
    // Fetch user votes for each proposal
    const fetchUserVotes = async () => {
      let newVotes = {}
      for (let i = 0; i < proposals.length; i++) {
        const hasVoted = await dao.votes(account, proposals[i].id)
        newVotes[proposals[i].id] = hasVoted
      }
      setUserVotes(newVotes)
    }

    fetchUserVotes()
  }, [dao, proposals, account, setUserVotes])

  const upVoteHandler = async (id) => {
    try {
      const signer = await provider.getSigner()
      const transaction = await dao.connect(signer).upVote(id)
      await transaction.wait()
    } catch {
      window.alert('User rejected or transaction reverted')
    }

    setIsLoading(true)
    setUserVotes({ ...userVotes, [id]: true })
  }

  const downVoteHandler = async (id) => {
    try {
      const signer = await provider.getSigner()
      const transaction = await dao.connect(signer).downVote(id)
      await transaction.wait()
    } catch {
      window.alert('User rejected or transaction reverted')
    }

    setIsLoading(true)
    setUserVotes({ ...userVotes, [id]: true })
  }

  const finalizeHandler = async (id) => {
    try {
      const signer = await provider.getSigner()
      const transaction = await dao.connect(signer).finalizeProposal(id)
      await transaction.wait()
    } catch {
      window.alert('User rejected or transaction reverted')
    }

    setIsLoading(true)
    setUserVotes({ ...userVotes, [id]: true })
  }

  return (
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>#</th>
          <th>Proposal Name</th>
          <th>Recipient Address</th>
          <th>Amount</th>
          <th>Description</th>
          <th>Status</th>
          <th>Total Votes</th>
          <th>Up Vote</th>
          <th>Down Vote</th>
          <th>Finalize</th>
        </tr>
      </thead>
      <tbody>
        {proposals.map((proposal, index) => (
          <tr key={index}>
            <td>{proposal.id.toString()}</td>
            <td>{proposal.name}</td>
            <td>{proposal.recipient}</td>
            <td>{ethers.utils.formatUnits(proposal.amount, 'ether')} CT</td>
            <td>{proposal.description}</td>
            <td>{proposal.finalized ? 'Approved' : 'In Progress'}</td>
            <td>{proposal.votes.toString()}</td>
            <td>
              {!proposal.finalized && !userVotes[proposal.id] && (
                <Button variant='primary' style={{ width: '100%' }} onClick={() => upVoteHandler(proposal.id)}>
                  Up Vote
                </Button>
              )}
            </td>
            <td>
              {!proposal.finalized && !userVotes[proposal.id] && (
                <Button variant='primary' style={{ width: '100%' }} onClick={() => downVoteHandler(proposal.id)}>
                  Down Vote
                </Button>
              )}
            </td>
            <td>
              {!proposal.finalized && proposal.votes > quorum && (
                <Button variant='primary' style={{ width: '100%' }} onClick={() => finalizeHandler(proposal.id)}>
                  Finalize
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

export default Proposals
