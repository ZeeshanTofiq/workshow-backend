const dotenv = require('dotenv');
const mongoose = require('mongoose');
// Attach config.env file which have some important file 
dotenv.config({
    path: './config.env'
});

const app = require('./app');

const DB = process.env.DATABASE.replace(
    '<password>',
    process.env.DBPASSWORD
).replace(
    '<username>',
    process.env.DBUSER
);


mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })
  .then(() => console.log('DB connection successful!'))
  .catch(err=>{
    console.log(err);
    console.log('Error in connection with db');
  })

const port = process.env.port || 3000;

const server = app.listen(port, () => {
    console.log(`Workshow server running on port ${port}`);
});