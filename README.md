## About the Application:-
It's a web app where one can perform decentralised pub-sub messaging with multiple users in a single room using Hedera Consensus Services

## Youtube URL
You can refer this Youtube Link for getting the demo of this Application:- https://youtu.be/Bk_-yk7SPhU

### Built With
Hedera Hashgraph, Node.JS, Express.js, Socket.io frameworks <br>
### Structure of the Application
Consist of a UI for creating a room by entering your accountid, private key (Both can be done in hedera portal) and the topic ID <br>
The topic Id is the id used for creating a discussion room <br>
New or existing Ids can be used for logging in into the room for discussion
One can also verify your chat transactions in the blockchain as well in Kabuto Name Service which is built on Hedera Hashgraph

## Running the application:-
- Clone the repository
- cd backend/
- npm i
- node index.js
- Open the website in the same port as shown in the terminal and you are good to go

## Steps before running the application
1. Create an account in the [Hedera Portal](https://portal.hedera.com/)
2. After creation, the necessary private-public key pairs (DER) along with Account-ID is available to be used in this Chat Application

## Application when running

![dapp-login-create](https://github.com/aditya-chari25/Dapp-Hackathon/assets/84094715/d8a95bf8-4bcd-449d-9d67-d7e941ba4d64)

The above image shows the creating room page with the necessary Rules/Instructions


![dapp-chat](https://github.com/aditya-chari25/Dapp-Hackathon/assets/84094715/32114d0c-e456-4876-ad2c-5cc8d4824f25)

The above image shows multiple users (2users) interacting with one another in a secure room
