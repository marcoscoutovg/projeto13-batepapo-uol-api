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

        await db.collection("participants").insertOne({
            name,
            lastStatus: Date.now()
        })

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

app.get("/participants", async (req, res) => {

    const resp = await db.collection("participants").find().toArray()

    try {
        res.send(resp)
    } catch (err) {
        console.log(err.message)
    }
})

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const { user } = req.headers;

    const messageSchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().required()
    })

    const validation = messageSchema.validate(req.body, { abortEarly: false })

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message)
        return res.status(422)
    }

    try {
        await db.collection("messages").insertOne({
            from: user,
            to,
            text,
            type,
            time: hour
        })

        res.sendStatus(201)
    } catch (err) {
        console.log(err.message)
        return res.sendStatus(422)
    }
})

app.get("/messages", async (req, res) => {

    const { user } = req.headers;
    const limit = req.query.limit;

    try {
        const resp = await db.collection("messages").find({
            $or: [
                { to: "Todos" },
                { to: user },
                { from: user },
            ]
        }).toArray()

        if (limit > 0 && parseInt(limit) !== NaN) {
            let ultimasMsg = resp.slice(-limit).reverse()
            res.send(ultimasMsg)

        } else if (limit === undefined) {
            res.send(resp)

        } else {
            res.sendStatus(422)
        }
    } catch (err) {
        res.sendStatus(500)
    }
})

app.listen(PORT, () => console.log('funcionou'));