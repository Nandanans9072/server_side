import mysql from 'mysql2'

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "employeems"
})

con.connect((err) => {
    if (err) {
        console.log("Connection error:", err.message)
    } else {
        console.log("Connected to MySQL")
    }
})

export default con
