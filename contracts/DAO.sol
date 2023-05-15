//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import './Token.sol';

contract DAO {
    address owner;
    Token public token;
    uint256 public quorum;

    struct Proposal {
        uint256 id;
        string name;
        uint256 amount;
        address payable recipient;
        string description;
        int256 votes;
        bool finalized;
    }

	uint256 public proposalCount;
	mapping(uint256 => Proposal) public proposals;

	mapping(address => mapping(uint256 => bool)) public votes;

	event Propose(
		uint id,
		uint256 amount,
		address recipient,
		address creator,
        string description
	);

	event UpVote(uint256 id, address investor);
    event DownVote(uint256 id, address investor);

	event Finalize(uint256 id);

    constructor(Token _token, uint256 _quorum) {
        owner = msg.sender;
        token = _token;
        quorum = _quorum;
    }

    // Allow contract to receive ether
    receive() external payable {}

	modifier onlyInvestor() {
		require(token.balanceOf(msg.sender) > 0, "Must be token holder");
		_;
	}

	// Create proposal
    function createProposal(
        string memory _name,
        uint256 _amount,
        address payable _recipient,
        string memory _description
    ) external onlyInvestor {
		require(address(this).balance >= _amount, "Not enough funds");

		proposalCount++;

		proposals[proposalCount] = Proposal(
			proposalCount,
			_name,
			_amount,
			_recipient,
            _description,
			0,
			false
		);

		emit Propose(proposalCount, _amount, _recipient, msg.sender, _description);
	}

	function upVote(uint256 _id) external onlyInvestor {
		// Fetch proposal from mapping by id
		Proposal storage proposal = proposals[_id];

		// Don't let investors vote twice
		require(!votes[msg.sender][_id], "Investor has already voted");

		// update votes
		proposal.votes += int256(token.balanceOf(msg.sender));

		// track that user has voted
		votes[msg.sender][_id] = true;

		// emit an event
	    emit UpVote(_id, msg.sender);
	}

    function downVote(uint256 _id) external onlyInvestor {
		// Fetch proposal from mapping by id
		Proposal storage proposal = proposals[_id];

		// Don't let investors vote twice
		require(!votes[msg.sender][_id], "Investor has already voted");

		// update votes
		proposal.votes -= int256(token.balanceOf(msg.sender));

		// track that user has voted
		votes[msg.sender][_id] = true;

		// emit an event
		emit DownVote(_id, msg.sender);
	}

	function finalizeProposal(uint256 _id) external onlyInvestor {
		// Fetch proposal
		Proposal storage proposal = proposals[_id];

		// Ensure proposal is not already finalized
		require(!proposal.finalized, "Proposal has already been finalized");

		// Mark proposal as finalized
		proposal.finalized = true;

		// Check that proposal has enough votes
		require(proposal.votes >= int256(quorum), "Must reach quorum to finalize proposal");

		// Check that the contract has enough ether
		require(address(this).balance >= proposal.amount, "Not enough ether in contract");

		// Transfer funds
		(bool sent, ) = proposal.recipient.call{ value: proposal.amount }("");
		require(sent);

		// Emit event
		emit Finalize(_id);
	}
}
