const path = require('path');

const { mekeJson, parse, cnParse, convertHex, getModeEnv } = require('./utils');
const config = require(`./config/index.json`)[getModeEnv()];

const serviceInterfaceDefinitionJson = require(`${config.xlsx.dest}/1服务定义.json`);
const dataTypeDefinition = require(`${config.xlsx.dest}/2数据类型定义.json`);

console.log(`生成 ${getModeEnv()} ...`);
// 处理 DataType
function convertJson(jsonData) {
    const result = {};
    try {
        let structValue = {};
        let structEnumName = '';

        for (const item of jsonData) {
            const { DataTypeCategory } = item;

            switch (DataTypeCategory) {
                case "Enumeration": {
                    const enumName = item['DataTypeName'];
                    const enumValues = cnParse(item['DiscreteValueDefination']) || null;

                    result[enumName] = {
                        ...item,
                        tableValue: enumValues
                    };
                    break;
                }
                case "Struct": {
                    const enumName = item['DataTypeName'];
                    structEnumName = enumName;

                    structValue = {
                        [item.MemberPosition]: item.MemberDatatypeReference,
                        [item.MemberName]: item.MemberDatatypeReference,
                    };

                    result[enumName] = {
                        ...item,
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
                case "Integer": {
                    const enumName = item['DataTypeName'];

                    result[enumName] = {
                        ...item
                    };
                    break;
                }
                default: {
                    if (structEnumName) {
                        structValue = {
                            ...structValue,
                            [item.MemberPosition]: item.MemberDatatypeReference,
                            [item.MemberName]: item.MemberDatatypeReference,
                        };

                        result[structEnumName] = {
                            ...item,
                            structValue: structValue
                        };
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


function getLogJson(data, dataType) {
    const logJson = {};

    let ServiceID;
    let ServiceDescription;

    for (const item of data) {
        let {
            "ServiceID": serviceIdentifier,
            "ServiceDescription": serviceDescription,
            "Method/EventDescription": interfaceDescription,
            "Method/EventID": interfaceIdentifier,
            "Method/EventName": parameterName,
            "FieldPropertyDataType": fieldPropertyDataType,
            "Method/EventDescription": parameterDescription,
            "InputParameter（R/R,F&F）": referenceDataType,
        } = item;

        ServiceID = serviceIdentifier || ServiceID;
        ServiceDescription = serviceDescription || ServiceDescription;

        if (serviceIdentifier) {
            continue;
        }

        serviceIdentifier = ServiceID;
        serviceDescription = ServiceDescription;

        // 构造 logKey
        const logKey = `${convertHex(serviceIdentifier)}_${convertHex(interfaceIdentifier)}`;

        // 构造 paramInfo
        const paramDesc = parameterDescription || "";

        const paramNames = (referenceDataType || fieldPropertyDataType).split('\r\n');

        paramNames.forEach(paramName => {
            const dataTypeObj = dataType[paramName];
            const { DataTypeDescription, arrayValue, structValue } = dataTypeObj;

            const paramInfo = {
                type: paramName,
                paramName: paramName,
                desc: {
                    displayContent: DataTypeDescription,
                    value: ""
                },
                // serviceMethodType: '',
            };

            const logObj = logJson[logKey];

            // 创建
            if (!logObj) {
                logJson[logKey] = {
                    desc: '',
                    serviceDescription: serviceDescription,
                    serviceInterfaceElementDescription: interfaceDescription,
                    params: [],
                    enums: {},
                }
            }

            logJson[logKey].params.push(paramInfo);
            logJson[logKey].enums[paramName] = dataTypeObj;

            if (arrayValue) {
                arrayValue.forEach(arrayName => {
                    logJson[logKey].enums[arrayName] = dataType[arrayName];
                });
            }

            if (structValue) {
                for (const key in structValue) {
                    logJson[logKey].enums[structValue[key]] = dataType[structValue[key]];
                }

            }
        });


    }

    // 处理desc
    Object.entries(logJson).forEach(([logKey, service]) => {
        let descs = [];

        service.params = service.params.map((item, index) => {
            const val = `$\{P${index}\}`;
            const desc = { ...item.desc };
            desc.value += val;
            descs.push(val);
            return { ...item, desc };
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
    mekeJson(destPath, JSON.stringify(result, null, 2));

    // 获取服务列表
    const logJson = getLogJson(serviceInterfaceDefinitionJson, result);
    const logJsonDestPath = path.join(config.output.dest, `logJson.json`);
    mekeJson(logJsonDestPath, JSON.stringify(logJson, null, 2));
}

bootstrap();