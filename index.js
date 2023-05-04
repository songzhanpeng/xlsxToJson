const path = require('path');
const fs = require('fs');
const {
    glob
} = require('glob');
const xlsx = require('node-xlsx');

const { convertSheetToJson, mekeJson, getModeEnv, specialSymbolReplace } = require('./utils');
const config = require(`./config/index.json`)[getModeEnv()];

console.log(`解析 ${getModeEnv()} ...`);

// 将Excel文件转换为多个JSON文件
async function exportJson() {
    // 读取文件
    const files = await glob([config.xlsx.src]);

    // 创建输出目录（如果不存在）
    if (!fs.existsSync(config.xlsx.dest)) {
        fs.mkdirSync(config.xlsx.dest);
    }

    // 转换为多个JSON并输出到指定目录
    files.forEach(file => {
        const sheets = xlsx.parse(fs.readFileSync(file));
        sheets.forEach(sheet => {
            const jsonData = convertSheetToJson(sheet);
            const destPath = path.join(config.xlsx.dest, `${specialSymbolReplace(sheet.name)}.json`);

            // 创建输出目录（如果不存在）
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }

            mekeJson(destPath, JSON.stringify(jsonData, null, 2));
        });
    });
}


exportJson();
