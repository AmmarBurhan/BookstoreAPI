//const Book = require('./mongodb');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');
const bodyParser = require ('body-parser');

module.exports = setRoutes = (app, Book, User, Customer, ShoppingCart)=>{

//Guid function to store the files

function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
}
 
// then to call it, plus stitch in '4' in the third group
guid=() => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();


//Test route #1
app.route('/test/:direction')
    .get((req, res)=>{
        
        let message=req.params.direction;
        
        if (message=='up')
            res.status(200).send({message:'Keep going up!'})
        else if (message=='upper')
            res.status(400).send({message:'No way other than up!'});
        else
            // throw new Error('BROKEN');
             throw 'Broken!';
            //res.status(500).send({errorMessage:'Noway other than up!'});
            //throw {message:'ha..ha..'}
    })

//Test route #2
app.route('/test')
.post((req, res)=>{
    let PostedData = formidable({ multiples: true });
    PostedData.parse(req, (err, fields, files)=>{
        for (let field in fields)
            console.log(`${field}: ${fields[field]}`);

        let imgName = fields.imgName.toString();

        Book.findOne({"imgGlry": {$elemMatch:{$eq:imgName}}}, (err, book)=>{
            if(book){
                book.imgGlry[book.imgGlry.indexOf(fields.imgName)]="NEW VALUE";
                book.save((err, data)=>res.json(data))
            }
        })
    });
})

//Test route #3
app.route('/test2')
.post((req, res)=>{
    //console.log(req.body);
    let inputForm = formidable({ multiples: true });
    inputForm.parse(req, (err, fields, files)=>{
        let {deleteImg, ...book}=fields;
        console.log(deleteImg)
        console.log(book)
        res.send({fields: fields, files: files});
        
    })

})

app.route('/api/books')
    .get((req, res)=>{
        Book.find({}, (err, data)=>{
            let booksList = data.map(book=> ({title:book.title, author:book.author, price: book.price, image: book.image, imgGlry: book.imgGlry
                ,imageURL : 'http://localhost:3000/images/'+book._id+'/', _id:book._id, category:book.category
            })) 
            //console.log(booksList);
            res.json(booksList); //GET returns all items. Status of 200 is included by default
        });
        
    }) 

app.route('/api/book')
    .post((req, res)=> {
        //get the data from the FormData object
        const form = formidable({ multiples: true });
        form.parse(req, (err, fields, files) => {
            if (err) {
                next(err);
                res.sendStatus(400);
            }
            
            
            let tmpBook= {...fields};
            // console.log(tmpBook);
            // res.json(tmpBook);
            //initialize the array of gallery images
            tmpBook.imgGlry=[];
            
            //save files name information in the book object
            //flag controlling how files names are stored in book object
            
            

            for(let file in files){
                let newFileName
                //store the fist file as books image
                if (file=='mainImage')  {
                     newFileName = 'main-'+guid()+path.extname(files[file].name);
                     tmpBook.image = newFileName;
                }  
                    
                else{
                    newFileName=guid()+path.extname(files[file].name);
                    tmpBook.imgGlry.push(newFileName);
                }
                //store the remaining files as gallery images
                    
                
            }
            

            let newBook = new Book(tmpBook)
            newBook.save((err, book)=>{
                if (err)
                    res.sendStatus(400);
                else {
                    fs.mkdirSync(path.join(__dirname, 'public', 'images', book._id.toString()));
                    let index=0;
                    for (let file in files){ 
                        let newFileName
                                                
                        if (file=='mainImage')
                            newFileName=book.image;
                        else {
                            newFileName=book.imgGlry[index];
                            index++;
                        }

                        let oldPath = files[file].path;
                        let newPath = path.join(__dirname, 'public', 'images', newBook._id.toString(), newFileName);
                        //move the files
                        fs.rename(oldPath, newPath, ()=>{
                            //console.log (`${newPath} saved!`);
                            })
                    }
                    res.json(book);
                }
            })
        });
    });


//product routes
app.route('/api/book/:id')
    .get((req, res)=>{
        
        let bookId = req.params.id
        Book.findById(bookId, (err, book)=>{
            if (err)
                res.sendStatus(404);
            else if (book!==null)
                res.json({category: book.category, title:book.title, author: book.author, price:book.price, image:book.image, imgGlry:book.imgGlry, _id: book._id, imageURL: 'http://localhost:3000/images/'+book._id+'/'});
            else
                res.sendStatus(404)
            
        })
        
    })

    .delete((req, res)=> {
        let bookId= req.params.id;
        Book.findByIdAndRemove(bookId, (err, book)=>{
            if (err)
                res.sendStatus(404);
            if (book) //findByIdAndRemove() returns null if no match is found
            {
                // 1. delete the files in the folder of the product
                let dirPath=path.join(__dirname, 'public', 'images', book._id.toString());
                let files=fs.readdirSync(dirPath) // returns an array of file names in the specified folder
                files.forEach(file => {
                    fs.unlinkSync(path.join(dirPath,file));
                })
                
                // 2. delete the folder
                fs.rmdir(dirPath, ()=> {
                    //successful deletion
                    res.sendStatus(204)
                });
            }
            else
                res.sendStatus(404);
        })
    })
     
    .put((req, res)=> {
        //get the data from the FormData object
        let bookId=req.params.id;//parameters are strings by default
        let bookImagePath = path.join(__dirname, 'public', 'images', bookId);
        // let book;
        const form = formidable({ multiples: true });
        form.parse(req, (err, fields, files) => {
            if (err) {
                next(err);
                res.sendStatus(400);
            }
            
            // console.log('Fields\n', fields, '\n', 'Files\n', files, '\n');

            let{deleteImg, ...tmpBook} = fields;
            
            if (deleteImg.length>0)
            {
                let tmpArray = deleteImg.split(',');
                
                Book.findOne({_id: bookId}, (err, book)=>{
                    console.log('Book');
                    console.log(book);
                    console.log('Array')
                    console.log(tmpArray);
                    
                    //delete the gallery images
                    tmpArray.forEach(filename=>{

                        book.imgGlry.splice(book.imgGlry.indexOf(filename),1);
                        fs.unlinkSync(path.join(bookImagePath, filename));
                    });
                    
                    // //check uploaded files and save them
                    for(let file in files)
                    {
                        let newFileName
                        if (file!=='mainImage'){
                            newFileName=guid()+path.extname(files[file].name);
                            book.imgGlry.push(newFileName);
                        }
                        else{
                            //this block executes once only!
                            //Delete book's main image
                            fs.unlinkSync(path.join(bookImagePath, book.image));
                            //update the image property of the book
                            newFileName = 'main-'+guid()+path.extname(files[file].name);
                            book.image=newFileName;
                        }
                        //Save newly updated files
                        let oldPath = files[file].path;
                        let newPath = path.join(bookImagePath, newFileName);
                        //move the files
                        fs.rename(oldPath, newPath, ()=>{
                            console.log (`${newPath} saved!`);
                        });
                    }
                    //console.log('updated book');
                    //console.log(book);
                    
                    //store the remaining submitted fields in the book
                    for (let field in tmpBook)
                        book[field]=tmpBook[field];
                    console.log('updated book');
                    console.log(book);
                    
                    //save the changes back to DB
                    Book.findByIdAndUpdate(bookId, book, {new:true}, (err, updatedBook)=>{
                        if (err)
                            res.sendStatus(400);
                        res.json(updatedBook);
                    }   )
                    
                })
            }
        });
    })

//users routes
//all users
app.route('/api/users')
    .get((req, res)=>{
        User.find({}, (err, data)=>{
            
            //status 200 is implicit    
            res.json(data);
        })
    })


app.route('/api/user/:email')
    .get((req, res)=>{
        
        let email= req.params.email;
        User.findOne({email:email}, (err, user)=>{
            if(err)
                res.sendStatus(404);
            res.json(user)
        })
    })

app.route('/api/user/:id')
    
    .delete((req, res)=> {
        let userId=req.params.id;
        User.findByIdAndDelete(userId, (err, user)=>{
            if (user)
                res.sendStatus(204)
            else
                res.sendStatus(404);
        })
    })
    

//users routes
//post ensures unique emails are stored. used for registering new users
app.route('/api/user')
    .post((req, res)=> {
        //get the data from the FormData object
        const form = formidable({ multiples: false });
        form.parse(req, (err, fields, files) => {
            if (err) {
                next(err);
                res.sendStatus(400);
            }
            
            let tmpUser= {...fields};
            
            //checking for the tmpUser props
            // for (let prop in tmpUser)
            // {
            //     console.log(`${prop}: ${tmpUser[prop]}`)
            // }
            
            User.findOne({email:tmpUser['email']},(err, user)=>{
                if(user)
                    res.sendStatus(400);
                else
                    {
                        let newUser = new User (tmpUser);
                        newUser.save((err, addedUser)=>{
                            if (addedUser)
                                res.json(addedUser);
                        });
                    }
            })
        });
    });

    //this rout is for signing in users, it has to be post in order to send the information as form data object
    app.route('/api/usersignin')
    .post((req, res)=> {
        //get the data from the FormData object
        const form = formidable({ multiples: false });
        form.parse(req, (err, fields, files) => {
            if (err) {
                next(err);
                res.sendStatus(400);
            }
            
            let tmpUser= {...fields};
            
            
            User.findOne({email:tmpUser['email']},(err, user)=>{
                if(user)
                    if (user.password==tmpUser.password)
                        res.json(user);
                    else
                        res.status(400).send({message:'password is not correct'})
                else
                    res.status(400).send({message:'user not found'})
            })
        });
    });

    app.route('/api/customer')
    .post((req, res)=>{
        const form = formidable({ multiples: false });
        form.parse(req, (err, fields, files) => {
            //console.log(fields);
            let customer = new Customer(fields);
            //console.log(customer);
            customer.save((err, data)=>res.json(data))
        })
    })

    app.route('/api/customers')
    .get((req, res)=>{
        
        Customer.find({}, null,{$sort: { contactDate: 1}} , (err, customers)=>{
            //console.log(customers);
            if (customers)
                res.json(customers);
        })   
    });

    app.route('/api/shoppingcart/:uid')
        .get((req, res)=>{
            
            let userId= req.params.uid;
            //console.log('Cart GET with userID: '+userId);
            ShoppingCart.findOne({userId: userId,  status:'active'},(err, cart)=>{
                if (err)
                    res.sendStatus(404);
                if (cart){
                    
                    res.json(cart);
                }
                else
                    res.sendStatus(404);
            });
        })
        .post((req, res)=>{
            
            let userId= req.params.uid;
            let shoppingCart = new ShoppingCart(req.body);

            if (shoppingCart.itemsList.length==0)
                ShoppingCart.findOneAndDelete({userId:userId, status:'active'}, (err, data)=>{
                    if (err)
                        res.sendStatus(500);
                    if (data)
                        res.json(data);
                    else
                        res.json({});
                })
            else
                ShoppingCart.findOne({userId: userId, status:'active'},(err, cart)=>{
                    if (err)
                        res.sendStatus(404);

                    if (cart){
                        
                        cart.status=shoppingCart.status;
                        cart.itemsList=shoppingCart.itemsList;
                        cart.save((err, data)=>{
                            if (data)
                                res.json(data);
                            if (err)
                                res.sendStatus(500);
                        })
                    }
                    else
                    shoppingCart.save((err, cart)=>{
                        if (err)
                            res.sendStatus(500);
                        else
                            res.json(cart);
                    });
                });
        });
}