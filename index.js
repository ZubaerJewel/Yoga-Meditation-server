
const express = require('express');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const cors = require('cors');
// // jwt
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
// middleware 
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qrbm9en.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// jwt verify start 
const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' })
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}
// jwt verify end


async function run() {
  try {

    // server link start
    const serverCollection = client.db('yoga-meditation').collection('classes');
    const selectedCollection = client.db('yoga-meditation').collection('selectcls');
    const usersCollection = client.db('yoga-meditation').collection('users');
    const paymentsCollection = client.db('yoga-meditation').collection('payments');
    // server link end for my database issue

    // jwt localhost start
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1d'
      });
      res.send({ token });
    })
    // jwt localhost end

    // Warning: use verifyJWT before using verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

    // Warning: use verifyJWT before using verifyInstructors
    const verifyInstructors = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'Instructors') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

    // class added post mongoDB start
    app.post('/class', verifyJwt, verifyInstructors, async (req, res) => {
      const newAdd = req.body;
      const result = await serverCollection.insertOne(newAdd)
      res.send(result);
    });
    // class added post mongoDB end

    // get class data server start
    app.get('/class', async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await serverCollection.find(query).toArray();
      res.send(result);
    })
    //  get class data server end 

    //  class data patch start 
    app.patch('/class/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedClasses = req.body;

      const updateDoc = {
        $set: {
          status: updatedClasses.status
        }
      }
      const result = await serverCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    //  class data patch end


    // selected data added post mongoDB start
    app.post('/selected', async (req, res) => {
      const newAdd = req.body;
      const result = await selectedCollection.insertOne(newAdd)
      res.send(result);
    });
    // selected data added post mongoDB end

    // selected data added get mongoDB start
    app.get('/selected', async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await selectedCollection.find(query).toArray();
      res.send(result);
    })
    // selected data added get mongoDB end

    // selected data delete mongoDB start
    app.delete('/selected/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await selectedCollection.deleteOne(query);
      res.send(result);
    })
    app.get('/selected/:id', verifyJwt, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedCollection.find(query).toArray();
      res.send(result);
    })
//payment data collellct from selected item
    app.get("/cart/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await selectedCollection.find(query).toArray();
      res.send(result);
    });
    // selected data delete mongoDB  exit


    // user data post dataBD start 
    app.post('/users', async (req, res) => {
      const user = req.body;

      // google sign up part start
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      // google sign up part start

      const result = await usersCollection.insertOne(user)
      res.send(result);
    });
    // user data post dataBD exit

    // user data delete mongoDB start
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })
    // user data delete mongoDB  exit

    // admin user information get  start
    app.get('/users', async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    // admin user information get end

    // user admin check start
    app.get('/users/admin/:email', verifyJwt, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      // jwt verifyJwt start
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }
      // jwt verifyJwt end

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })
    // user admin check end

    // user Instructors check start
    app.get('/users/Instructors/:email', verifyJwt, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ Instructors: false })
      }

      // jwt verifyJwt start
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }
      // jwt verifyJwt end

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { Instructors: user?.role === 'Instructors' }
      res.send(result);
    })
    // user Instructors check end

    // user admin role added start
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })
    // user admin role added exit

    // user Instructors role added start
    app.patch('/users/Instructors/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'Instructors'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })
    // user Instructors role added exit


   
    // create payment intent verifyJwt,
    app.post("/create-payment-intent",  async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });


    // payment related apis
    app.get("/payments", async (req, res) => {
      const email = req.query.email;
      const query = {email: email}
      const result = await paymentsCollection.find(query).toArray()
      res.send(result)
    })

    app.get("/payments", async (req, res) => {
      const email = req.query.email;
      const query = {email: email}
      const result = await paymentsCollection.find(query).toArray()
      const filteredResult = result.filter((obj) => obj.item);
      const itemArray = filteredResult.map(obj => obj.item)
      res.send(itemArray)
    })
//verifyJwt,
    app.post("/payments",  async (req, res) => {
      const payment = req.body
      const insertResult = await paymentsCollection.insertOne(payment)

      const query = {
        _id: new ObjectId(payment.cartItems)
      }
      
      const deleteResult = await selectedCollection.deleteOne(query)
      res.send({ result: insertResult, deleteResult })
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('yoga-meditation server is running')
})

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
})

