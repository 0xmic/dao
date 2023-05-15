//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import './Token.sol';

/// @title DAO Contract
/// @notice A contract for decentralized autonomous organizations
contract DAO {
    address owner;
    Token public token;
    uint256 public quorum;

    /// @notice Structure for proposals
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

    /// @notice Constructor for creating the DAO
    /// @param _token The token used for the DAO
    /// @param _quorum The minimum number of votes required for a proposal to pass
    constructor(Token _token, uint256 _quorum) {
        owner = msg.sender;
        token = _token;
        quorum = _quorum;
    }

    /// @notice Modifier to ensure the function caller is a token holder
    modifier onlyInvestor() {
        require(token.balanceOf(msg.sender) > 0, "Must be token holder");
        _;
    }

    /// @notice Create a new proposal
    /// @param _name The name of the proposal
    /// @param _amount The amount of tokens requested
    /// @param _recipient The address where funds will be sent if the proposal is approved
    /// @param _description The details of the proposal
    function createProposal(
        string memory _name,
        uint256 _amount,
        address payable _recipient,
        string memory _description
    ) external onlyInvestor {
        require(token.balanceOf(address(this)) >= _amount, "Not enough funds");

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

    /// @notice Upvote a proposal
    /// @param _id The ID of the proposal
    function upVote(uint256 _id) external onlyInvestor {
        Proposal storage proposal = proposals[_id];

        require(!votes[msg.sender][_id], "Investor has already voted");

        proposal.votes += int256(token.balanceOf(msg.sender));

        votes[msg.sender][_id] = true;

        emit UpVote(_id, msg.sender);
    }

    /// @notice Downvote a proposal
    /// @param _id The ID of the proposal
    function downVote(uint256 _id) external onlyInvestor {
        Proposal storage proposal = proposals[_id];

        require(!votes[msg.sender][_id], "Investor has already voted");

        proposal.votes -= int256(token.balanceOf(msg.sender));

        votes[msg.sender][_id] = true;

        emit DownVote(_id, msg.sender);
    }

    /// @notice Finalize a proposal
    /// @param _id The ID of the proposal to finalize
    function finalizeProposal(uint256 _id) external onlyInvestor {
        Proposal storage proposal = proposals[_id];

        require(!proposal.finalized, "Proposal has already been finalized");
        require(proposal.votes >= int256(quorum), "Must reach quorum to finalize proposal");
        require(token.balanceOf(address(this)) >= proposal.amount, "Not enough tokens in contract");

        require(token.transfer(proposal.recipient, proposal.amount), "Token transfer failed");

        proposal.finalized = true;

        emit Finalize(_id);
    }
}
