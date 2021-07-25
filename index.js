require("dotenv").config();
const express = require("express")
const app = express();

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

app.use(express.json())
app.use(express.urlencoded({extended: true}))

const { Client } = require('pg')
const client = new Client()

const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: process.env.SERVEREMAIL,
        pass: process.env.SERVEREMAILPASSWORD
    }
});

function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function sendEmail(to, msg) {
    const mailOptions = {
        from: process.env.SERVEREMAIL,
        to: to,
        subject: 'New Message!',
        text: msg
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error.message);
        }
        console.log('success');
    });
}

const auth = async(username, password) => {
    if (!username || !password) {
        return false;
    }
    username = username.toLowerCase();

    try {
        const client = new Client()
        await client.connect()
        const data = await client.query(`select * from users where username = '${username}';`)
        console.log(data.rows);
        if(data.rows.length===0){
            return false;
        }
        if(data.rows[0].password!=password){
            return false
        }
        await client.end()
        delete client
    } catch (error) {
        console.error(error)
        client.end()
        delete client
        return false
    }
    return true;
}


app.get("/", (req, res)=>{
    res.render("index.html")
})

app.use("/register", async(req,res)=>{
    if (req.method === 'GET'){
        console.log(req.cookies)
        const {error} = req.query
        res.render("register.html", {error:error||null});
    }
    else if (req.method === 'POST'){
        let {username, email, password} = req.body

        if (!username || !email || !password || !validateEmail(email)) {
            res.render("register.html", {error:"invalid input"});
            return;
        }
        username = username.toLowerCase();

        try {
            const client = new Client()
            await client.connect()
            const data = await client.query(`select username from users where username = '${username}'`)
            console.log(data.rows);
            if(data.rows.length!==0){
                res.status(401).redirect("/register?error=username or email already in use");
                return;
            }
            try {
                await client.query(`INSERT INTO users(username, password, email) VALUES('${username}','${password}','${email}');`).then(()=>{
                    console.log("new user added!");
                })
            } catch (error) {
                res.render("register.html", {error:"username or email already in use"});
                return;
            }

            await client.end()
            delete client
        } catch (error) {
            console.error(error)
            client.end()
            delete client
            res.status(500).render("register.html",{error:"internal server error"});
            return;
        }
        
        res.status(200).redirect("/");
    }
    else
        res.sendStatus(403)
})

app.post("/login", async(req,res)=>{
    let {username, password, dontredirect} = req.body

    if (!await auth(username, password)) {
        if (dontredirect == true)
            res.sendStatus(401)
        else
            res.render("login.html", {error:"invalid input"})
        return;
    }

    if (dontredirect == true) {
        res.sendStatus(200);
    }else{
        res.redirect("/u/"+username)
    }
    
})

app.get("/login", (req,res)=>{
    res.render("login.html", {error:null})
})

app.get("/u/:username", (req,res)=>{
    res.render("dashboard.html", {username:req.params.username})
})

app.post("/questions", async(req,res)=>{
    let {username, password, page} = req.body
    page = page || 0;

    if (!await auth(username, password)) {
        res.sendStatus(401)
        return;
    }

    res_data = [];
    username = username.toLowerCase();
    
    try {
        const client = new Client()
        await client.connect()
        const data = await client.query(`SELECT question FROM questions WHERE username = '${username}' LIMIT ${10+page*10} OFFSET ${page*10};`)
        console.log(data.rows);
        res_data = data.rows
        await client.end()
        delete client
    } catch (error) {
        console.error(error)
        client.end()
        delete client
        res.sendStatus(500);
        return;
    }

    res.send(res_data);
})

app.get("/u/:username/ask", async(req, res)=>{
    const username = req.params.username.toLowerCase();

    try {
        const client = new Client()
        await client.connect()
        const data = await client.query(`SELECT username FROM users WHERE username = '${username}';`)
        console.log(data.rows);
        
        await client.end()
        delete client
        if (data.rows.length===0) {
            res.status(404).send("This user doesn't exist");
            return;
        }
    } catch (error) {
        console.error(error)
        client.end()
        delete client
        res.status(500).send("Internal server error");
        return;
    }

    res.render("ask.html", {username: username})
})

app.post("/u/:username/ask", async(req, res)=>{
    const username = req.params.username.toLowerCase();
    const {question} = req.body;
    try {
        const client = new Client()
        await client.connect()
        await client.query(`INSERT INTO questions(question, username) VALUES('${question}', '${username}');`)
        const q = await client.query(`SELECT email FROM users WHERE username = '${username}';`)
        email = q.rows[0].email
        sendEmail(email, question);
        await client.end()
        delete client
    } catch (error) {
        console.error(error)
        client.end()
        delete client
        res.status(500).send("Internal server error");
        return;
    }

    res.sendStatus(200)
    console.log(question);
})







app.listen(process.env.PORT||3030, ()=>{
    console.log(`running on ${process.env.PORT||"127.0.0.1:3030"}`)
}) 
