const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const port = process.env.PORT || 8000;
require('dotenv').config();
const bcryptjs = require('bcryptjs');
const jwt = require("jsonwebtoken");

const app = express();
const corsConfig = {
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}
app.use(cors(corsConfig))
app.options("*", cors(corsConfig))
app.use(express.json())
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept,authorization")
    next()
})


const uri = `mongodb+srv://${process.env.POWER_DB_USER}:${process.env.POWER_DB_PASS}@cluster0.ys0dmn7.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ message: "UnAuthorized" });
    }
    const token = authorization.split(" ")[1];
    jwt.verify(token, process.env.SECRET_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "Forbidden access" });
        }
        req.decoded = decoded;
        next();
    });
}


async function run() {
    try {
        client.connect();
        const usersCollection = client.db("db-power-hack").collection("users");
        const billsCollection = client.db("db-power-hack").collection("bills");
        console.log('db connected');

        //api for register users
        app.post("/api/registration", async (req, res) => {
            const name = req.body.name;
            const email = req.body.email;
            const phone = req.body.phone;
            const password = req.body.password;
            const hashedPassword = bcryptjs.hashSync(password, 10);

            const exist = await usersCollection.findOne({ email: email });

            if (exist) {
                res.send({ status: 401, message: "This email already exist, try another one" })
            } else {
                console.log('register api heated')
                const user = {
                    name,
                    email,
                    phone,
                    hashedPassword
                }
                await usersCollection.insertOne(user);
                const accessToken = jwt.sign({ id: user._id }, process.env.SECRET_TOKEN, {
                    expiresIn: '1h'
                });
                res.send({ status: 200, message: "User registered successfully", accessToken });
            }

        });

        // api for user login
        app.post("/api/login", async (req, res) => {
            const user = await usersCollection.findOne({ email: req.body.email });
            if (!user) {
                return res.json({ status: 404, message: "Wrong Credential" })
            }
            const isCorrect = bcryptjs.compareSync(req.body.password, user.hashedPassword);

            if (!isCorrect) {
                return res.json({ status: 400, message: "Wrong Credential" })
            }
            const accessToken = jwt.sign({ id: user._id }, process.env.SECRET_TOKEN, {
                expiresIn: '1h'
            });
            return res.json({ status: 200, Message: "Login Successful", token: accessToken });
        });

        // api for get authenticated user

        app.get("/api/users", verifyJWT, async (req, res) => {
            const email = req.decoded;
            const user = await usersCollection.findOne({ email });
            res.json(user);
        });


        // api for billing list
        app.get("/api/billing-list", async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            let bills;
            if (size || page) {
                bills = await billsCollection
                    .find()
                    .skip(page * size)
                    .limit(size)
                    .toArray();
            } else {
                bills = await billsCollection.find().toArray();
            }

            res.json(bills);
        });

        // api for add bills
        app.post("/api/add-billing", async (req, res) => {
            const bills = req.body;
            const added = await billsCollection.insertOne(bills);
            added.acknowledged ?
                res.json({
                    status: 200,
                    success: true,
                    message: "Bill added successfully"
                })
                : res.json({
                    status: 500,
                    success: false,
                    message: "Internal server error"
                });
        });


        //api for page count
        app.get("/billing-listCount", async (req, res) => {
            const count = await billsCollection.estimatedDocumentCount();
            res.json({ count });
        });


        // api for all bills
        app.get("/api/all-bill", async (req, res) => {
            const allBill = await billsCollection.find().toArray();
            res.json(allBill);
        })

        //api for update billing
        app.put("/api/update-billing/:id", async (req, res) => {
            const id = req.params.id;
            const updateBill = req.body;
            const condition = { _id: ObjectId(id) };
            const options = { upsert: true }
            const updateDoc = { $set: updateBill }
            await billsCollection.updateOne(condition, updateDoc, options)
                .then(doc => {
                    if (!doc) {
                        return res.status(404).end();
                    }
                    else {
                        return res.status(200).json(doc)
                    }
                });
        });

        // api for delete a bill
        app.delete("/api/delete-bill/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await billsCollection.deleteOne(query);
            res.json(result);
        })
    }

    finally {

    }

}
run().catch(console.dir)


app.get("/", (req, res) => {
    res.json("Hello from power server")
})
app.listen(port, (req, res) => {
    console.log(`Power app listening on port ${port}`)
})