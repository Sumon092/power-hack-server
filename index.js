const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 8000;


const app = express();

app.use(express.json());


const uri = "mongodb+srv://Power_hack_user:Gu33Y83xIl9IkLZN@cluster0.ys0dmn7.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {

    try {
        client.connect();
        console.log('db connected');
    }

    finally {

    }

}
run().catch(console.dir)


app.get("/", (req, res) => {
    res.send("Hello from power server")
})
app.listen(port, (req, res) => {
    console.log(`Power app listening on port ${port}`)
})