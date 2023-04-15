import express from "express";
import cors from "cors"
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv"
import dayjs from "dayjs";
import joi from "joi";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.DATABASE_URL)

let hour = dayjs().format().slice(11, 19)

try {
    await mongoClient.connect()
} catch (err) {
    console.log(err.message)
}

const db = mongoClient.db()

const PORT = 5000

app.delete("/participants/:id", async (req, res) => {
    const { id } = req.params

    try {
        await db.collection("participants").deleteOne({ _id: new ObjectId(id) })
        res.status(204).send("Usuário deletado com sucesso")
    } catch (error) {
        res.status(500).send(error)
    }
})

app.post("/participants", async (req, res) => {

    const { name } = req.body;

    const participantsSchema = joi.object({
        name: joi.string().required()
    })

    const validation = participantsSchema.validate(req.body, { abortEarly: false })

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message)
        return res.status(422).send(errors)
    }

    try {
        const participantsList = await db.collection("participants").findOne({ name })
        if (participantsList) return res.sendStatus(409)

        await db.collection("participants").insertOne({ name, lastStatus: Date.now() })

        await db.collection("messages").insertOne({
            from: name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: hour
        })

        res.sendStatus(201)
    } catch (err) {
        console.log(err.message)
    }
})

app.get("/participants", (req, res) => {
    db.collection("participants").find().toArray()
        .then(participants => res.send(participants))
        .catch((err) => console.log(err.message))
})

app.post("/messages", (req, res) => {
    const { to, text, type } = req.body;
    const { user } = req.headers;

    if (!to || !text || !type) {
        return res.send(422)
    }

    db.collection("messages").insertOne({ from: name, to, text, type, time: "HH:mm:ss" })
        .then(() => res.sendStatus(201))
        .catch((err) => console.log(err.message))


})

app.get("/messages", (res, req) => {

    if (!user) {
        return res.send(201)
    }


})

app.listen(PORT, () => console.log('funcionou'));