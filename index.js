const express = require("express");
const bp = require('body-parser')
const app = express();
const ejs = require('ejs');
const bcrypt = require('bcrypt');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const session = require("express-session");
var serviceAccount = require("./key.json");
app.use(session({
  secret: 'your-secret-key',
  resave: true,
  saveUninitialized: true,
}));
initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

app.set('view engine', 'ejs');
app.use(bp.urlencoded({ extended: true }));
app.get('/', (req, res) => {
    res.render('firstpage.ejs');
    
});
app.get('/volunteer',(req,res)=>{
    res.render("volunteer.ejs",{msg:null});
});
app.get('/volunteer/register1',(req,res)=>{
    res.render("register1.ejs",{temp:null});
});
app.get('/donate_register/register2',(req,res)=>{
  res.render("register2.ejs",{temp:null});
});

app.get('/donate_register',(req,res)=>{
  res.render("donate_register.ejs",{msg:null});
});
app.get('/donate',(req,res)=>{
  res.render("donate.ejs",{name1:null});
});
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal Server Error');
});




app.post('/volunteer/register1',async(req,res)=>{
    const name = req.body.firstname+req.body.lastname;
    req.session.x = name;
    const email = req.body.email;
    const password = req.body.password;  
  try {
   
    const querySnapshot = await db.collection('volunteer_details').where('Email', '==', email).get();

    if (!querySnapshot.empty) {
      
      res.render('register1.ejs', { temp: 'Email is already registered' });
    } else {
    
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

     
      const data = {
        Name: name,
        Email: email,
        Password: hashedPassword, 
      };

   
      await db.collection('volunteer_details').add(data);

      const snapshot = await db.collection('donator_details').get();
      const data1 = []; 
      snapshot.forEach(doc => {
        data1.push(doc.data());
      });
      res.render('volunteer1.ejs', { details: data1, vname:"Hello"+" "+name });
    }
  } catch (error) {
    console.error('Error adding document: ', error);
    res.status(500).send('Error adding document to Firestore.');
  }
});

app.post('/volunteernew',async(req,res)=>{
    const email = req.body.lmail;
    const password = req.body.lpassword;

  
    try {
     
      const querySnapshot = await db.collection('volunteer_details').where('Email', '==', email).get();
  
      if (!querySnapshot.empty) {
        const user = querySnapshot.docs[0].data();
        const hashedPassword = user.Password;
  
     
        const passwordMatch = await bcrypt.compare(password, hashedPassword);
  
        if (passwordMatch) {
          const snapshot = await db.collection('donator_details').get();
          const data = []; 
          snapshot.forEach(doc => {
            data.push(doc.data());
          });
          res.render('volunteer1.ejs', { details: data ,vname:"Hello"+" "+user.Name});
        }
       else {
        res.render('volunteer.ejs',{msg:"Incorrect password!!!"});
      }
    }
    else{
      res.render('volunteer.ejs',{msg:"No account exists!!!"});
    }
   } catch (error) {
      console.error('Error: ', error);
      res.status(500).send('Error during login.');
    }
  });
  

  app.post('/donate_register/register2',async(req,res)=>{
    const name = req.body.firstname+req.body.lastname;
    req.session.y = name;
    const email = req.body.email;
    req.session.donater_email=email;
    const password = req.body.password;  
  try {
   
    const querySnapshot = await db.collection('donator_details').where('Email', '==', email).get();

    if (!querySnapshot.empty) {
      
      res.render('register2.ejs', { temp: 'Email is already registered' });
    } else {
    
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

     
      const data = {
        Name: name,
        Email: email,
        Password: hashedPassword, 
      };

   
      await db.collection('donator_details').add(data);

      res.render('donate.ejs');
    }
  } catch (error) {
    console.error('Error adding document: ', error);
    res.status(500).send('Error adding document to Firestore.');
  }
});


app.post('/donate_register',async(req,res)=>{
  const email = req.body.lmail;
  req.session.donater_email=email;
  const password = req.body.lpassword;

  try {
   
    const querySnapshot = await db.collection('donator_details').where('Email', '==', email).get();

    if (!querySnapshot.empty) {
      const user = querySnapshot.docs[0].data();
      const hashedPassword = user.Password;

   
      const passwordMatch = await bcrypt.compare(password, hashedPassword);

      if (passwordMatch) {
   
        res.render('donate.ejs');
      } else {
      
        res.render('donate_register.ejs',{msg:"Incorrect password!!!"});
        //window.alert("Incorrect password!!!");
      }
    } else {
      res.render('donate_register.ejs',{msg:"No account exists!!!"});
    }
  } catch (error) {
    console.error('Error: ', error);
    res.status(500).send('Error during login.');
  }
});

app.post('/donate', async (req, res) => {
  const demail = req.session.donater_email;
  const quantity = req.body.quantity;
  const location = req.body.location;
  const cnumber=req.body.cnumber;
  const status='Not Taken'; 
  //req.session.status1=status;

  try {
    const userQuerySnapshot = await db.collection('donator_details').where('Email', '==', demail).get();
    const userDoc = userQuerySnapshot.docs[0];

    if (userDoc) {
      // Update the existing document with 'Location' and 'Quantity' fields
      await db.collection('donator_details').doc(userDoc.id).set(
        {
          Location: location,
          Quantity: quantity,
          Contact_Number: cnumber,
          Status:status,
          ID:userDoc.id

        },
        { merge: true }
      );

      console.log('Document updated successfully:', userDoc.id);
      console.log(req.session.y);
      res.render('afterdonate.ejs', { name1: userDoc.Name });
    } else {
      console.log('User not found');
      res.status(404).send('User not found');
    }
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).send('Error updating document');
  }
});

app.post('/volunteer2', async (req, res) => {
  const docId = req.body.docId;
  console.log(docId);
  const docRef = db.collection('donator_details').doc(docId);
  const doc = await docRef.get();
  req.session.did=docId;
  
  if (doc.exists) {
    await docRef.update({ Status: 'Taken' });
    res.render("volunteer2.ejs",{details:doc.data()});
  } else {
    res.status(404).send('Document not found');
  }


});



app.listen(3000, '127.0.0.1', () => {
  console.log("Server started on http://127.0.0.1:3000");
});
