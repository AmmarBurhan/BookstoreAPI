const express = require ('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');

const routeSetup = require('./routes');

//create express server
const app = express();
//define port
const PORT  = 3000;


//use the cors middleware
app.use(cors());

//use body parser middleware
// app.use(bodyParser.raw())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//connect to the databse
const connectionString = 'mongodb://localhost:27017/bookShop';
mongoose.connect(connectionString, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false }).then(()=>console.log('connected to mongoDB'));

//define the models
const Book = mongoose.model('books', {title: String, author:String, price:Number, image:String, imgGlry:[String], category:String});
const User = mongoose.model('users', {userName: String, email:String, password:String, isAdmin:Boolean}); 
const Customer = mongoose.model('customers', {email:String, name: String, message: String, contactDate: {type: Date, default: Date.now}});
const ShoppingCart = mongoose.model ('shoppingcarts', {userId:String, status:String, itemsList:[]});

//setup routes for products and users
routeSetup(app, Book, User, Customer, ShoppingCart);

//serving static files
app.use(express.static('public'));
//console.log(path.join(__dirname,'public'));


//start the server
app.listen(PORT, ()=>console.log(`listening on port ${PORT}`));