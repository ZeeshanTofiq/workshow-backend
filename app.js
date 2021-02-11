const path = require('path');
const express = require('express');
const app = express();
const morgan = require('morgan');
const userRouter = require('./routes/userRoutes');
const globalErrHandler = require('./controllers/errorController');
const helmet = require('helmet');
const cors = require('cors');
// const bodyParser = require('body-parser');
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(cors());
app.use('*',cors());

app.use(helmet());

app.use(
    express.urlencoded({
        extended:true
    })
);
app.use(express.json());



if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}
app.use('/', userRouter);

app.use(globalErrHandler);

module.exports = app;