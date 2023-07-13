const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql');

// MySQL 配置
const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '123456',
    database: 'contract_data'
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
    files.forEach(file => {
      const filePath = path.join(directoryPath, file);

      // 如果是子目录，则将其作为菜单项添加到 menu 表中
      if (fs.statSync(filePath).isDirectory()) {
        const menuName = path.basename(filePath);
        let menuId = null;

        // 将菜单项添加到 menu 表中，并获取其自动生成的 ID
        connection.query(
          'INSERT INTO menu (name, parent_id, status) VALUES (?, ?, ?)',
          [menuName, parentId, 'active'],
          (err, result) => {
            if (err) {
              console.error(err);
              return;
            }

            menuId = result.insertId;

            // 递归调用 readDirectory 函数，以处理子目录
            readDirectory(filePath, menuId);
          }
        );
      } else if (path.extname(filePath) === '.csv') {
        // 如果是 CSV 文件，则将其数据添加到 stock 表中
        const stockName = path.basename(filePath, '.csv');
        connection.query(
          'INSERT INTO menu (name, parent_id, status) VALUES (?, ?, ?)',
          [stockName, parentId, 'active'],
          (err, result) => {
            if (err) {
              console.error(err);
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
                      return;
                    }
                  }
                );
              })
              .on('end', () => {
                console.log(`Finished reading ${filePath}`);
              });
          }
        );
      }
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
    'CREATE TABLE IF NOT EXISTS menu (id INT NOT NULL AUTO_INCREMENT, name VARCHAR(255), parent_id INT, status VARCHAR(255), create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id), FOREIGN KEY (parent_id) REFERENCES menu(id))',
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
