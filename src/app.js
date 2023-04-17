import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from "joi";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {
    await mongoClient.connect();
} catch (err) {
    console.log(err.message);
}

const db = mongoClient.db();

const PORT = 5000;

app.post("/participants", async (req, res) => {

    const { name } = req.body;

    const participantsSchema = joi.object({
        name: joi.string().required()
    });

    const validation = participantsSchema.validate(req.body, { abortEarly: false });

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    try {
        const participantsList = await db.collection("participants").findOne({ name });
        if (participantsList) return res.sendStatus(409);

        await db.collection("participants").insertOne({
            name,
            lastStatus: Date.now()
        });

        await db.collection("messages").insertOne({
            from: name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: dayjs().format("HH:mm:ss")
        });

        res.sendStatus(201);
    } catch (err) {
        res.send(err.message);
    }
})

app.get("/participants", async (req, res) => {

    const resp = await db.collection("participants").find().toArray();

    try {
        res.send(resp);
    } catch (err) {
        console.log(err.message);
    }
});

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const { user } = req.headers;

    const messageSchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().required().valid("message", "private_message")
    });

    const validation = messageSchema.validate(req.body, { abortEarly: false });

    const userCadastrado = await db.collection("participants").findOne({ name: user });

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    try {

        if (!user) {
            return res.sendStatus(422);
        }

        if (!userCadastrado) {
            return res.sendStatus(422);
        }

        await db.collection("messages").insertOne({
            from: user,
            to,
            text,
            type,
            time: dayjs().format("HH:mm:ss")
        });

        res.sendStatus(201);
    } catch (err) {
        console.log(err.message);
        return res.sendStatus(422);
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
        }).toArray();

        if (limit > 0 && !Number.isNaN(limit)) {
            const ultimasMsg = resp.slice(-limit).reverse();
            res.send(ultimasMsg);

        } else if (limit === undefined) {
            res.send(resp);

        } else {
            res.sendStatus(422);
        }
    } catch (err) {
        res.sendStatus(500);
    }
})

app.post("/status", async (req, res) => {
    const { user } = req.headers;

    try {
        if (!user) {
            return res.sendStatus(404);
        }

        const userCadastrado = await db.collection("participants").findOne({ name: user });

        await db.collection("participants").updateOne({ name: user },
            { $set: { lastStatus: Date.now() } });

        if (userCadastrado) {
            return res.sendStatus(200);
        } else {
            return res.sendStatus(404);
        }
    } catch (err) {
        res.sendStatus(500);
    }


})

setInterval(async () => {
    try {
        const tempoInativo = Date.now() - 10000;

        const inativos = await db.collection("participants").find({ lastStatus: { $lte: tempoInativo } }).toArray();

        if (inativos) {
            inativos.forEach(async (i) => {
                await db.collection("messages").insertOne({
                    from: i.name,
                    to: "Todos",
                    text: "sai da sala...",
                    type: "status",
                    time: dayjs().format("HH:mm:ss")
                });
            });
        }

        await db.collection("participants").deleteMany({ lastStatus: { $lte: tempoInativo } });

    } catch (err) {
        console.log(err.message);
    }

}, 15000);

app.listen(PORT);