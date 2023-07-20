const mysql = require('mysql');

const CONNECTED_HOST = "127.0.0.1"
const CONNECTED_USER = 'root'
const CONNECTED_PASSWORD = '123456'
const CONNECTED_DATABASE = 'contract_data' 
const CONNECTED_DAILY_DATABASE = 'contract_daily_data'

// // MySQL 配置
const mysqlConfigConnection = mysql.createConnection({
    host: CONNECTED_HOST,
    user: CONNECTED_USER,
    password: CONNECTED_PASSWORD,
    database: CONNECTED_DAILY_DATABASE
});

module.exports = {
    CONNECTED_HOST,
    CONNECTED_USER,
    CONNECTED_PASSWORD,
    CONNECTED_DATABASE,
    CONNECTED_DAILY_DATABASE,
    mysqlConfigConnection
}