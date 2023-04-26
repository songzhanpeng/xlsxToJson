const path = require('path');
const fs = require('fs');
const {
    glob
} = require('glob');
const xlsx = require('node-xlsx');

const config = require('./config/index.json');
const { convertSheetToJson, mekeJson } = require('./utils');

// 将Excel文件转换为多个JSON文件
async function exportJson() {
    // 读取文件
    const files = await glob([config.xlsx.src]);

    // 转换为多个JSON并输出到指定目录
    files.forEach(file => {
        const sheets = xlsx.parse(fs.readFileSync(file));
        sheets.forEach(sheet => {
            const jsonData = convertSheetToJson(sheet);
            const destPath = path.join(config.xlsx.dest, `${sheet.name}.json`);
            mekeJson(destPath, JSON.stringify(jsonData, null, 2));
        });
    });
}

exportJson();
