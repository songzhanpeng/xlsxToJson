const fs = require('fs');
const { isString } = require('lodash');
const path = require('path');

// 写文件
const mekeJson = (dest_file, resultJson) => {
    // 创建输出目录（如果不存在）
    const destDir = path.dirname(dest_file);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    // 输出JSON到指定文件
    fs.writeFile(dest_file, resultJson, err => {
        if (err) {
            console.error("error：", err);
            throw err;
        }
        console.log('exported json  -->  ', path.basename(dest_file));
    });
}


// 将sheet转换为JSON格式
function convertSheetToJson(sheet) {
    const jsonData = [];
    sheet.data.forEach((row, rowIndex) => {
        if (rowIndex !== 0) {
            const item = {};
            sheet.data[0].forEach((key, keyIndex) => {
                key = specialSymbolReplace(key);
                item[key] = row[keyIndex];
            });
            jsonData.push(item);
        }
    });
    return jsonData;
}

const parse = (str = '', flag = true) => {
    const REG_COMMA = /，/g;
    const REG_WHITESPACE = /( |\"|\n|\r)/g;
    const obj = {};

    str.replace(REG_COMMA, ',').split(',').forEach(item => {
        let [key, value] = item.split('=');
        if (value && key) {
            key = key.replace(REG_WHITESPACE, '');
            value = value.replace(REG_WHITESPACE, '');
            obj[flag ? Number(value.trim()) : Number(key)] = flag ? key : value.trim();
        }
    });

    return obj;
};


const cnParse = (str = '') => {
    if (!str) return str;
    const formattedStr = str.replace(/(：|:)/g, '=').replace(/(\n|\r\n)/g, ',');
    return parse(formattedStr, false);
};

function specialSymbolReplace (str) {
    const reg = /(\n|\r| |)/g;
    return str.replace(reg,'');
}

function convertHex(str) {
    if (isString(str)) {
        return str.replace(/0x[0-9a-fA-F]+/g, function (match) {
            return match.toUpperCase();
        }).replace(/0X/g, function (match, offset) {
            return offset < 4 ? "0x" : "0X";
        })
    } else {
        console.warn('must be a string', str);
        return str;
    }
}

function getModeEnv() {
    const args = process.argv.slice(2);
    const modeIndex = args.findIndex(arg => arg.startsWith('--mode='));
    const mode = modeIndex !== -1 ? args[modeIndex].split('=')[1] : null;
    return mode
}

module.exports = {
    convertSheetToJson,
    mekeJson,
    parse,
    cnParse,
    convertHex,
    getModeEnv,
    specialSymbolReplace
}