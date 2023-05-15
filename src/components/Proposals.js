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
          <th className='text-center'>#</th>
          <th className='text-center'>Proposal Name</th>
          <th className='text-center'>Recipient Address</th>
          <th className='text-center'>Amount</th>
          <th className='text-center'>Description</th>
          <th className='text-center'>Status</th>
          <th className='text-center'>Total Votes</th>
          <th className='text-center'>Upvote</th>
          <th className='text-center'>Downvote</th>
          <th className='text-center'>Finalize</th>
        </tr>
      </thead>
      <tbody>
        {proposals.map((proposal, index) => (
          <tr key={index}>
            <td className='text-center'>{proposal.id.toString()}</td>
            <td className='text-center'>{proposal.name}</td>
            <td className='text-center'>{proposal.recipient}</td>
            <td className='text-center'>{ethers.utils.formatUnits(proposal.amount, 'ether')} CT</td>
            <td className='text-center'>{proposal.description}</td>
            <td className='text-center'>{proposal.finalized ? 'Approved' : 'In Progress'}</td>
            <td className='text-center'>{ethers.utils.formatUnits(proposal.votes, 18).toString()}</td>
            <td className='text-center'>
              {!proposal.finalized && !userVotes[proposal.id] && (
                <Button variant='primary' style={{ width: '100%' }} onClick={() => upVoteHandler(proposal.id)}>
                  👍
                </Button>
              )}
            </td>
            <td className='text-center'>
              {!proposal.finalized && !userVotes[proposal.id] && (
                <Button variant='primary' style={{ width: '100%' }} onClick={() => downVoteHandler(proposal.id)}>
                  👎
                </Button>
              )}
            </td>
            <td className='text-center'>
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
