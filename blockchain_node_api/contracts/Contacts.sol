// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Contacts {
    uint public count = 0; // state variable

    struct Contact {
        uint id;
        string userId;
        uint followers;
        uint likes;
        uint reward;
    }

    mapping(uint => Contact) public contacts;

    function createContact(
        uint id,
        string memory user_id,
        uint _followers,
        uint _likes,
        uint _reward
    ) public {
        contacts[id] = Contact(id, user_id, _followers, _likes, _reward);
    }

    function getTransaction(
        uint _id
    ) public view returns (uint, string memory, uint, uint, uint) {
        Contact memory contact = contacts[_id];
        return (contact.id, contact.userId, contact.followers, contact.likes, contact.reward );
    }
}
