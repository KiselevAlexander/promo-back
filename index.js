#!/usr/bin/env babel-node

import express from 'express';
import crypto from 'crypto';
import md5 from 'locutus/php/strings/md5';
import bodyParser from 'body-parser';
import {routes} from './routes/index.js';
import {USERS} from './models';

import mysql from 'mysql';

const app = express();

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/static', express.static(__dirname + '/static'));


app.use(function (req, res, next) {
    if (req.method === 'OPTIONS') {
        console.log('!OPTIONS');
        const headers = {};
        headers["Access-Control-Allow-Origin"] = "*";
        headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
        headers["Access-Control-Allow-Credentials"] = false;
        headers["Access-Control-Max-Age"] = '86400'; // 24 hours
        headers["Access-Control-Allow-Headers"] = "Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, x-secure, authorization";
        res.writeHead(200, headers);
        res.end();
    } else {
        next();
    }
});

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

const router = express.Router();
routes(app, router);

const server = app.listen(9000, function () {
    console.log("Listening on port %s...", server.address().port);
});