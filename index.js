const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql');
const { 
        CONNECTED_HOST, 
        CONNECTED_USER, 
        CONNECTED_PASSWORD, 
        CONNECTED_DATABASE 
    } = require('./config/index.js');

const { futureExchangeProducts, futureExchanges } = require("./constant/index.js")    

// MySQL 配置
const connection = mysql.createConnection({
    host: CONNECTED_HOST,
    user: CONNECTED_USER,
    password: CONNECTED_PASSWORD,
    database: CONNECTED_DATABASE
});

const directoryPath = path.resolve(__dirname, './contractData');

// 定义递归函数，用于读取目录下的所有文件和子目录
function readDirectory(directoryPath, parentId) {
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error(err);
      return;
    }

    // 遍历所有文件和子目录
    const promises = files.map(file => {
      const filePath = path.join(directoryPath, file);

      // 如果是子目录，则将其作为菜单项添加到 menu 表中
      if (fs.statSync(filePath).isDirectory()) {
        const menuCode = path.basename(filePath);
        let menuId = null;

        const productInfo = futureExchangeProducts.find(item => item.code === menuCode);
        const menuName = productInfo ? productInfo.name : '';
        // 将菜单项添加到 menu 表中，并获取其自动生成的 ID
        return new Promise((resolve, reject) => {
          connection.query(
            'INSERT INTO menu (code, name, parent_id, status) VALUES (?, ?, ?, ?)',
            [menuCode, menuName, parentId, 'active'],
            (err, result) => {
              if (err) {
                console.error(err);
                reject(err);
                return;
              }

              menuId = result.insertId;

              // 递归调用 readDirectory 函数，以处理子目录
              readDirectory(filePath, menuId);

              resolve();
            }
          );
        });
      } else if (path.extname(filePath) === '.csv') {
        // 如果是 CSV 文件，则将其数据添加到 stock 表中
        const stockName = path.basename(filePath, '.csv');
        return new Promise((resolve, reject) => {
          connection.query(
            'INSERT INTO menu (code, name, parent_id, status) VALUES (?, ?, ?, ?)',
            [stockName, stockName, parentId, 'active'],
            (err, result) => {
              if (err) {
                console.error(err);
                reject(err);
                return;
              }

              const stockId = result.insertId;

              fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', row => {
                  connection.query(
                    'INSERT INTO stock (menu_id, date, open, high, low, close, volume, money, open_interest) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [stockId, row.date, row.open, row.high, row.low, row.close, row.volume, row.money, row.open_interest],
                    err => {
                      if (err) {
                        console.error(err);
                        reject(err);
                        return;
                      }
                    }
                  );
                })
                .on('end', () => {
                  console.log(`Finished reading ${filePath}`);
                  resolve();
                });
            }
          );
        });
      }
    });

    Promise.all(promises).then(() => {
      console.log('期货合约数据读取完成！');
    });
  });
}

// 建立 MySQL 数据库连接
connection.connect(err => {
  if (err) {
    console.error(err);
    return;
  }

  console.log('Connected to MySQL database.');

  // 建立 menu 表
  connection.query(
    'CREATE TABLE IF NOT EXISTS menu (id INT NOT NULL AUTO_INCREMENT, code VARCHAR(255), name VARCHAR(255), parent_id INT, status VARCHAR(255), create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id), FOREIGN KEY (parent_id) REFERENCES menu(id))',
    err => {
      if (err) {
        console.error(err);
        return;
      }

      console.log('Created menu table.');

      // 建立 stock 表
      connection.query(
        'CREATE TABLE IF NOT EXISTS stock (id INT NOT NULL AUTO_INCREMENT, menu_id INT NOT NULL, date DATE NOT NULL, open FLOAT NOT NULL, high FLOAT NOT NULL, low FLOAT NOT NULL, close FLOAT NOT NULL, volume INT NOT NULL, money BIGINT NOT NULL, open_interest INT NOT NULL, PRIMARY KEY (id), FOREIGN KEY (menu_id) REFERENCES menu(id))',
        err => {
          if (err) {
            console.error(err);
            return;
          }

          console.log('Created stock table.');

          // 调用 readDirectory 函数，开始读取目录下的所有文件和子目录
          readDirectory(directoryPath, null);
        }
      );
    }
  );
});