const path = require('path');
const _ = require('lodash');

const { mekeJson, parse, cnParse, convertHex, getModeEnv } = require('./utils');
const config = require(`./config/index.json`)[getModeEnv()];

const serviceInterfaceDefinitionJson = require(`${config.xlsx.dest}/1服务定义.json`);
const dataTypeDefinition = require(`${config.xlsx.dest}/2数据类型定义.json`);

console.log(`生成 ${getModeEnv()} ...`);
// 处理 DataType
function convertJson(jsonData) {
    const result = {};
    try {
        let structValue = [];
        let structEnumName = '';

        for (const item of jsonData) {
            const { DataTypeCategory } = item;

            switch (DataTypeCategory) {
                case "Enumeration": {
                    const enumName = item['DataTypeName'];
                    const enumValues = cnParse(item['DiscreteValueDefination']) || null;

                    result[enumName] = {
                        DataTypeName: item.DataTypeName,
                        DataTypeDescription: item.DataTypeDescription,
                        DataTypeCategory: item.DataTypeCategory,
                        BaseDatatype: item.BaseDatatype,
                        version: item.version,
                        tableValue: enumValues
                    };
                    break;
                }
                case "Struct": {
                    const enumName = item['DataTypeName'];
                    structEnumName = enumName;

                    structValue = [
                        {
                            "MemberPosition": item.MemberPosition,
                            "MemberName": item.MemberName,
                            "MemberDescription": item.MemberDescription,
                            "MemberDatatypeReference": item.MemberDatatypeReference,
                        }
                    ]

                    result[enumName] = {
                        DataTypeName: item.DataTypeName,
                        DataTypeDescription: item.DataTypeDescription,
                        DataTypeCategory: item.DataTypeCategory,
                        version: item.version || "",
                        structValue: structValue
                    };
                    break;
                }
                case "Array": {
                    const enumName = item['DataTypeName'];

                    result[enumName] = {
                        ...item,
                        arrayValue: [item.MemberDatatypeReference]
                    };
                    break;
                }
                case "Boolean":
                case "Float":
                case "String":
                case "Integer": {
                    const enumName = item['DataTypeName'];

                    result[enumName] = {
                        ...item
                    };
                    break;
                }
                default: {
                    if (structEnumName) {
                        result[structEnumName].structValue.push({
                            "MemberPosition": item.MemberPosition,
                            "MemberName": item.MemberName,
                            "MemberDescription": item.MemberDescription,
                            "MemberDatatypeReference": item.MemberDatatypeReference,
                        })
                    }
                    break;
                }
            }
        }
    } catch (error) {
        console.log("🚀 ~ file: build.js:23 ~ convertJson ~ error:", error)
    }
    return result;
}


function getLogJson(data) {
    const logJson = {};

    let ServiceID;
    let ServiceDescription;

    try {
        for (const item of data) {
            let {
                "ServiceID": serviceIdentifier,
                "ServiceDescription": serviceDescription,
                "Method/EventDescription": interfaceDescription,
                "Method/EventID": interfaceIdentifier,
                "Method/EventName": parameterName,
                "InputParameter（R/R,F&F）": referenceDataType,
                "OutputParameter（R/R）": resultData,
                "Event/NotificationEventParameter": notifyReferenceDataType,
                RPCType
            } = item;

            ServiceID = serviceIdentifier || ServiceID;
            ServiceDescription = serviceDescription || ServiceDescription;

            const regex = /^get/;
            // 过滤服务哪一行 前三个字符是get也过滤
            if (serviceIdentifier || regex.test(parameterName)) {
                continue;
            }

            // 过滤掉get 不是notify接口的 全是set接口
            serviceIdentifier = ServiceID;
            serviceDescription = ServiceDescription;

            // 构造 logKey
            const logKey = `${convertHex(serviceIdentifier)}_${convertHex(interfaceIdentifier)}`;

            const paramNames = (referenceDataType || notifyReferenceDataType || '').split('\n').filter(Boolean);

            paramNames.forEach(paramName => {
                const [type, name] = paramName.split(' ');

                const paramInfo = {
                    type: type,
                    paramName: name,
                    value: "",
                    serviceMethodType: parameterName,
                };

                const logObj = logJson[logKey];

                // 创建
                if (!logObj) {
                    logJson[logKey] = {
                        desc: '',
                        serviceDescription: serviceDescription,
                        serviceInterfaceElementDescription: interfaceDescription,
                        params: [],
                    }
                }

                logJson[logKey].params.push(paramInfo);
            });


        }
    } catch (error) {
        console.log("🚀 ~ file: build-tennessee.js:174 ~ getLogJson ~ error:", error)

    }

    // 处理desc
    Object.entries(logJson).forEach(([logKey, service]) => {
        let descs = [];

        service.params = service.params.map((item, index) => {
            const value = `$\{P${index}\}`;
            descs.push(value);
            return { ...item, value };
        });

        let newDesc
        if (descs.length === 0) {
            newDesc = `${service.serviceInterfaceElementDescription}`;
        } else if (descs.length === 1) {
            newDesc = `${service.serviceInterfaceElementDescription} ${descs.slice(0).join(' ')}`;
        } else {
            newDesc = `${descs[0]} ${service.serviceInterfaceElementDescription} ${descs.slice(1).join(' ')}`;
        }


        service.desc = (service.desc || newDesc).replace(/\n/g, '').trim();
    });

    return logJson
}

async function bootstrap() {
    // 获取dataType
    const result = convertJson(dataTypeDefinition);
    const destPath = path.join(config.output.dest, `DataType.json`);
    await mekeJson(destPath, JSON.stringify(result, null, 2));

    // 获取logJson
    const logJson = getLogJson(serviceInterfaceDefinitionJson);
    const logJsonDestPath = path.join(config.output.dest, `logJson.json`);
    await mekeJson(logJsonDestPath, JSON.stringify(logJson, null, 2));
}

bootstrap();