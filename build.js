const path = require('path');

const { mekeJson, parse, cnParse, convertHex, getModeEnv } = require('./utils');
const config = require(`./config/index.json`)[getModeEnv()];

const serviceInterfaceDefinitionJson = require(`${config.xlsx.dest}/ServiceInterfaceDefinition.json`);
const dataTypeDefinition = require(`${config.xlsx.dest}/DataTypeDefinition.json`);

console.log(`生成 ${getModeEnv()} ...`);

// 处理 DataType
function convertJson(jsonData) {
    const result = {};
    try {
        for (const item of jsonData) {
            const enumName = item['DataTypeName数据类型名称'];
            const enumValues = parse(item['TableValue枚举值']) || null;
            const cnEnumValues = cnParse(item['Remark备注']) || null;

            result[enumName] = {
                dataTypeDescription: item['DataTypeDescription数据类型描述'],
                tableValue: enumValues,
                cnTableValue: cnEnumValues
            };
        }
    } catch (error) {
        console.log("🚀 ~ file: build.js:23 ~ convertJson ~ error:", error)
    }
    return result;
}


function getLogJson(data, dataType) {
    const logJson = {};

    for (const item of data) {
        // skip anomalous data
        if (JSON.stringify(item) === '{}') {
            continue
        }
        const {
            "服务名称": serviceName,
            "服务标识符": serviceIdentifier,
            "服务描述": serviceDescription,
            "服务命名空间": serviceNamespace,
            "服务主要版本": serviceMajorVersion,
            "服务次要版本": serviceMinorVersion,
            "接口主要版本": interfaceMajorVersion,
            "接口次要版本": interfaceMinorVersion,
            "服务接口元素名称": interfaceName,
            "服务接口元素描述": interfaceDescription,
            "服务接口元素类型": interfaceType,
            "服务接口元素标识符": interfaceIdentifier,
            "事件组": eventGroup,
            "传输层协议": transportProtocol,
            "参数名称": parameterName,
            "参数描述": parameterDescription,
            "参数发送方向": parameterDirection,
            "参考数据类型": referenceDataType,
            "API共通性": apiCommonality,
            "idx": index,
            "Api版本": apiVersion
        } = item;

        // if (parameterName === 'result') {
        //     continue
        // }

        // 构造 logKey
        const logKey = `${convertHex(serviceIdentifier)}_${convertHex(interfaceIdentifier)}`;

        // 构造 paramInfo
        const paramDesc = parameterDescription || "";
        const isSet = !interfaceName.includes("notify");
        const paramInfo = {
            type: referenceDataType,
            paramName: parameterName,
            desc: { displayContent: paramDesc, value: "" },
            serviceMethodType: interfaceName,
            isSet,
        };

        // 是否要加参数
        const isPush = parameterName !== "result";

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

        // 追加参数
        if (isPush) {
            logJson[logKey].params.push(paramInfo);
            logJson[logKey].enums[referenceDataType] = dataType[referenceDataType]
        }
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