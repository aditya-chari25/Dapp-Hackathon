/* configure access to our .env */
require("dotenv").config({ path: "../.env.sample" });

/* include express.js & socket.io */
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

/* include other packages */
const inquirer = require("inquirer");
const open = require("open");
const TextDecoder = require("text-encoding").TextDecoder;
const PORT = 8080

/* hedera.js */
const {
    Client,
    TopicId,
    TopicMessageSubmitTransaction,
    TopicCreateTransaction,
    TopicMessageQuery
} = require("@hashgraph/sdk");

/* utilities */
const questions = require("./utils.js").initQuestions;
const UInt8ToString = require("./utils.js").UInt8ToString;
const secondsToDate = require("./utils.js").secondsToDate;
const log = require("./utils.js").handleLog;
const sleep = require("./utils.js").sleep;
app.use(express.urlencoded());

let operatorAccount = "";
const hederaClient = Client.forTestnet();
let topicId = "";
let logStatus = "Default";

app.get('/form', function(request, response, next){

	response.send(`
    <!DOCTYPE html>
    <style>
    body{
        background : rgb(49,51,56);
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        align-items:center;
        text-align:center
    }

    .create{
        color : rgb(221,222,224);
    }
    
    .create {
        max-width: 400px;
        margin: 0 auto;
        text-align: center;
      }
      .create label {
        text-align: left;
        display: block;
        color:rgb(221,222,224);
      }
      .create h2 {
        font-size: 20px;
        color: rgb(221,222,224);
        margin-bottom: 30px;
      }
      .create input, .create textarea, .create select {
        width: 100%;
        padding: 6px 10px;
        margin: 10px 0;
        border: 1px solid black;
        border-radius:10px;
        box-sizing: border-box;
        display: block;
      }
      .create button {
        background: white;
        color: black;
        border: 0;
        padding: 8px;
        border-radius: 18px;
        cursor: pointer;
      }
    
      ul{
        font-size: 12px;
        text-align: center;
      }
    
      .boxer{
        border: 1px solid grey;
        align-items: center;
        text-align: center;
        margin-top: 2vh;
      }
      </style>
      <body>

    <div class="create" style="max-width:400px; margin:0 auto">
      <h1>Dapp Chat App</h1>
      <p>Connect to exiting room or connect to new room</p>
      <form method="POST" action="/">
        <label>Account:</label>
        <input type="text"id = "account"name = "account" />
        <label>Key:</label>
        <input type="text" id = "key"name = "key"/>
        <label>Topic:</label>
        <input type="text" id = "topic"name = "topic"value="create a new topic" style="border-radius:10px" />
        <button>Create Room</button>
      </form>
      <div class="boxer">
      <ul><b>Rules for using:-</b></ul>
      <ul>1. Empty account, key will connect to default config present</ul>
      <ul>2. Create a new topic will create new discussion room</ul>
      <ul>3. if want to connect to existing room, enter that room config</ul>
      <ul>4. Wait for 20sec after creating a room, you'll be directed to a new page</ul>
      </div>
    </div>
    </body>
    </html>
`);


});

app.post('/', async(req, res) => {
    try {
        let temp = req.body
        let answers = {
            status : 'default',
            account : temp.account,
            key : temp.key,
            topic: temp.topic
        }
        console.log(answers)
        logStatus = answers.status;
        console.log(answers.status)
        configureAccount(answers.account, answers.key);
        if (answers.topic != undefined) {
            configureExistingTopic(answers.topic);
        } else {
            await configureNewTopic();
        }
        /* run & serve the express app */
        runChat();
    } 
    catch (error) {
        log("ERROR: init() failed", error, logStatus);
        process.exit(1);
    }
})

function generateRandomPort() {
    const minPort = 3000;
    const maxPort = 9000;
  
    return Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;
}
const port123 = generateRandomPort();

app.listen(port123, () => {
    console.log(`Example app listening on port ${port123}`)
})

/* configure our env based on prompted input */
async function init() {
    inquirer.prompt(questions).then(async function (answers) {
        try {
            console.log(answers)
            logStatus = answers.status;
            console.log(answers.status)
            configureAccount(answers.account, answers.key);
            if (answers.existingTopicId != undefined) {
                configureExistingTopic(answers.existingTopicId);
            } else {
                await configureNewTopic();
            }
            /* run & serve the express app */
            runChat();
        } catch (error) {
            log("ERROR: init() failed", error, logStatus);
            process.exit(1);
        }
    });
}

function runChat() {
    app.use(express.static("../frontend"));
    http.listen(0, function () {
        const randomInstancePort = http.address().port;
        open("http://localhost:" + randomInstancePort);
    });
    subscribeToMirror();
    io.on("connection", function (client) {
        console.log(client)
        const connectMessage = {
            operatorAccount: operatorAccount,
            client: client.id,
            topicId: topicId.toString()
        }
        io.emit(
            "connect message",
            JSON.stringify(connectMessage)
        );
        client.on("chat message", function (msg) {
            const message = {
                operatorAccount: operatorAccount,
                client: client.id,
                message: msg
            }
            sendHCSMessage(JSON.stringify(message));
        });
        client.on("disconnect", function () {
            const disconnect = {
                operatorAccount: operatorAccount,
                client: client.id
            }
            io.emit("disconnect message", JSON.stringify(disconnect));
        });
    });
}

// init(); // process arguments & handoff to runChat()

/* helper hedera functions */

/* have feedback, questions, etc.? please feel free to file an issue! */
function sendHCSMessage(msg) {
    try {
        // let's fire and forget here, we're not waiting for a receipt, just sending
        new TopicMessageSubmitTransaction()
            .setTopicId(topicId)
            .setMessage(msg)
            .execute(hederaClient);

        log("TopicMessageSubmitTransaction()", msg, logStatus);
    } catch (error) {
        log("ERROR: TopicMessageSubmitTransaction()", error, logStatus);
        process.exit(1);
    }
}

function subscribeToMirror() {
    try {
        new TopicMessageQuery()
            .setTopicId(topicId)
            .subscribe(hederaClient,
                (error) => {
                    log("Message subscriber raised an error", error, logStatus);
                },
                (message) => {
                    log("Response from TopicMessageQuery()", message, logStatus);
                    const mirrorMessage = new TextDecoder("utf-8").decode(message.contents);
                    const messageJson = JSON.parse(mirrorMessage);
                    console.log(messageJson)
                    log("Parsed mirror message", logStatus);
                    const runningHash = UInt8ToString(message["runningHash"]);
                    const timestamp = secondsToDate(message["consensusTimestamp"]);

                    const messageToUI = {
                        operatorAccount: messageJson.operatorAccount,
                        client: messageJson.client,
                        message: messageJson.message,
                        sequence: message.sequenceNumber.toString(10), // sequence number is a big integer
                        runningHash: runningHash,
                        timestamp: timestamp
                    }
                    io.emit(
                        "chat message",
                        JSON.stringify(messageToUI)
                    );
                }
            );
        log("MirrorConsensusTopicQuery()", topicId.toString(), logStatus);
    } catch (error) {
        log("ERROR: MirrorConsensusTopicQuery()", error, logStatus);
        process.exit(1);
    }
}

async function createNewTopic() {
    try {
        const response = await new TopicCreateTransaction().execute(hederaClient);
        log("TopicCreateTransaction()", `submitted tx`, logStatus);
        const receipt = await response.getReceipt(hederaClient);
        const newTopicId = receipt.topicId;
        log(
            "TopicCreateTransaction()",
            `success! new topic ${newTopicId}`,
            logStatus
        );
        return newTopicId;
    } catch (error) {
        log("ERROR: TopicCreateTransaction()", error, logStatus);
        process.exit(1);
    }
}

/* helper init functions */
function configureAccount(account, key) {
    try {
        // If either values in our init() process were empty
        // we should try and fallback to the .env configuration
        if (account === "" || key === "") {
            log("init()", "using default .env config", logStatus);
            operatorAccount = process.env.MY_ACCOUNT_ID;
            hederaClient.setOperator(process.env.MY_ACCOUNT_ID, process.env.MY_PRIVATE_KEY);
        }
        // Otherwise, let's use the initalization parameters
        else {
            operatorAccount = account;
            hederaClient.setOperator(account, key);
        }
    } catch (error) {
        log("ERROR: configureAccount()", error, logStatus);
        process.exit(1);
    }
}

async function configureNewTopic() {
    log("init()", "creating new topic", logStatus);
    topicId = await createNewTopic();
    log(
        "ConsensusTopicCreateTransaction()",
        `waiting for new HCS Topic & mirror node (it may take a few seconds)`,
        logStatus
    );
    await sleep(9000);
}

async function configureExistingTopic(existingTopicId) {
    log("init()", "connecting to existing topic", logStatus);
    if (existingTopicId === "") {
        topicId = TopicId.fromString(process.env.TOPIC_ID);
    } else {
        topicId = TopicId.fromString(existingTopicId);
    }
}