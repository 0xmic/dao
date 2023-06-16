import { useEffect, useState } from 'react'
import { Container } from 'react-bootstrap'
import { ethers } from 'ethers'

// Components
import Navigation from './Navigation'
import Create from './Create'
import Proposals from './Proposals'
import Loading from './Loading'

// ABIs: Import your contract ABIs here
import TOKEN_ABI from '../abis/Token.json'
import DAO_ABI from '../abis/DAO.json'

// Config: Import your network config here
import config from '../config.json'

function App() {
  const [provider, setProvider] = useState(null)
  const [token, setToken] = useState(null)
  const [dao, setDao] = useState(null)
  const [treasuryBalance, setTreasuryBalance] = useState(0)

  const [account, setAccount] = useState(null)

  const [proposals, setProposals] = useState(null)
  const [quorum, setQuorum] = useState(null)

  const [userVotes, setUserVotes] = useState({})

  const [isLoading, setIsLoading] = useState(true)

  const loadBlockchainData = async () => {
    // Initiate provider
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(provider)

    // Get chainId
    const { chainId } = await provider.getNetwork()

    // Initiate contracts
    const token = new ethers.Contract(config[chainId].token.address, TOKEN_ABI, provider)
    setToken(token)

    const dao = new ethers.Contract(config[chainId].dao.address, DAO_ABI, provider)
    setDao(dao)

    // Fetch treasury balance
    let treasuryBalance = await token.balanceOf(dao.address)
    treasuryBalance = ethers.utils.formatUnits(treasuryBalance, 18)
    setTreasuryBalance(treasuryBalance)

    // Fetch accounts
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    const account = ethers.utils.getAddress(accounts[0])
    setAccount(account)

    // Fetch proposals count
    const count = await dao.proposalCount()
    const items = []

    for (var i = 0; i < count; i++) {
      const proposal = await dao.proposals(i + 1)
      items.push(proposal)
    }

    setProposals(items)

    // Fetch quorum
    let quorum = await dao.quorum()
    quorum = ethers.utils.formatUnits(quorum, 18)
    setQuorum(quorum)

    // Fetch user votes for each proposal
    let userVotes = {}
    for (var j = 0; j < count; j++) {
      const hasVoted = await dao.votes(account, j + 1)
      userVotes[j + 1] = hasVoted
    }
    setUserVotes(userVotes)

    setIsLoading(false)
  }

  useEffect(() => {
    if (isLoading) {
      loadBlockchainData()
    }
  }, [isLoading])

  return (
    <Container>
      <Navigation account={account} />

      <h1 className='my-4 text-center'>Welcome to our DAO</h1>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          <Create provider={provider} dao={dao} setIsLoading={setIsLoading} />

          <hr />

          <p className='text-center'>
            <strong>Treasury Balance:</strong> {treasuryBalance} Crypto Tokens (CT) | <strong>Quorum:</strong>{' '}
            {quorum.toString()} Crypto Tokens (CT)
          </p>

          <hr />

          <Proposals
            provider={provider}
            dao={dao}
            proposals={proposals}
            quorum={quorum}
            account={account}
            userVotes={userVotes}
            setUserVotes={setUserVotes}
            setIsLoading={setIsLoading}
          />
        </>
      )}
    </Container>
  )
}

export default App
