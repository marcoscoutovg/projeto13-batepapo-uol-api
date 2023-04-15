import express from "express";
import cors from "cors"
import { MongoClient } from "mongodb";
import dotenv from "dotenv"
import dayjs from "dayjs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const mongoClient = new MongoClient(process.env.DATABASE_URL)
mongoClient.connect().then(() => db = mongoClient.db())

let db;

const PORT = 5000

app.post("/participants", (req, res) => {
    const { name } = req.body;

    if (!name || name === "") {
        return res.sendStatus(422);
    }

    db.collection("participants").insertOne({name, lastStatus: Date.now()})
    .then(() => res.sendStatus(201))
    .catch((err) => console.log(err.message))

    db.collection("messages").insertOne({from: name, to, text, type, time: "HH:mm:ss"})
    .then(() => res.sendStatus(201))
    .catch((err) => console.log(err.message))

    res.send(201);
})

app.get("/participants", (req, res) => {
    db.collection("participants").find.toArray()
    .then(participants => res.send(participants))
    .catch((err) => console.log(err.message))
})

app.post("/messages", (req, res) => {
    const { to, text, type } = req.body;
    const {user} = req.headers;

    if (!to || !text || !type || !user) {
        return res.send(422)
    }

    db.collection("messages")

})

app.get("/messages", (res, req) => {

    if(!user) {
        return res.send(201)
    }
    

})

app.listen(PORT, () => console.log('funcionou'));