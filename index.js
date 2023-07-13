const XLSX = require('node-xlsx')
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')
const mysql = require('mysql')

// MySQL 配置
const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '123456',
    database: 'contract_data'
});

// 本地项目文件夹路径
const folderPath = path.resolve(__dirname, './contractData')

// 目录表名
const directoryTableName = 'directories';

// 数据表名
const dataTableName = 'stocks';

// 创建目录表
connection.query(`
  CREATE TABLE IF NOT EXISTS ${directoryTableName} (
    id INT(11) NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
  )
`, err => {
    if (err) throw err;

    console.log(`Table '${directoryTableName}' created`);
});


// 创建数据表
connection.query(`
  CREATE TABLE IF NOT EXISTS ${dataTableName} (
    id INT(11) NOT NULL AUTO_INCREMENT,
    directory_id INT(11) NOT NULL,
    date DATE NOT NULL,
    open FLOAT NOT NULL,
    high FLOAT NOT NULL,
    low FLOAT NOT NULL,
    close FLOAT NOT NULL,
    volume INT(11) NOT NULL,
    money BIGINT(20) NOT NULL,
    open_interest INT(11) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (directory_id) REFERENCES ${directoryTableName}(id)
  )
`, err => {
    if (err) throw err;

    console.log(`Table '${dataTableName}' created`);
});

// 递归函数，用于获取制定文件夹中的所有CSV文
function readCSVs(folderPath, directoryId) {
    // 获取文件夹中的所有文件夹和文件
    fs.readdir(folderPath, (err, files) => {
        if (err) throw err;
        // 遍历文件夹中的所有文件和文件夹
        files.forEach(file => {
            // 获取文件或文件夹的绝对路径
            const filePath = path.join(folderPath, file)
            // 判断是否为文件夹
            if (fs.statSync(filePath).isDirectory()) {
                // 如果是文件夹，则将该目录信息插入到目录表中，并递归调用 readCSVs 函数
                connection.query(`INSERT INTO ${directoryTableName} (name) VALUES (?)`, [file], (err, result) => {
                    if (err) throw err;

                    const directoryId = result.insertId;
                    readCSVs(filePath, directoryId);
                });
            } else if (path.extname(filePath) === '.csv') {
                // 如果是csv文件,那么读取该文件
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', row => {
                        connection.query(`INSERT INTO ${dataTableName} (directory_id, date, open, high, low, close, volume, money, open_interest) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [directoryId, row.date, row.open, row.high, row.low, row.close, row.volume, row.money, row.open_interest], (err, result) => {
                            if (err) throw err;
                        });
                    })
                    .on('end', () => {
                        console.log(`Finished reading ${filePath}`)
                    })
            }
        })
    })
}

// 调用 readCSVs 函数，开始读取 CSV 文件
connection.query(`INSERT INTO ${directoryTableName} (name) VALUES (?)`, [folderPath], (err, result) => {
    if (err) throw err;

    const directoryId = result.insertId;
    readCSVs(folderPath, directoryId);
});

