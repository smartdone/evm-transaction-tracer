// 全局变量
let web3;
const functionFragmentCache = new Map();
let currentLanguage = 'en'; // 默认语言为英文

// 翻译文本
const translations = {
    en: {
        appTitle: 'EVM Transaction Analyzer',
        rpcLabel: 'RPC URL:',
        hashLabel: 'Transaction Hash:',
        analyzeButton: 'Analyze Transaction',
        loading: 'Analyzing, please wait...',
        txInfoTitle: 'Transaction Information',
        traceTitle: 'Call Trace',
        ethTransfer: 'ETH Transfer',
        amount: 'Amount',
        functionLabel: 'Function',
        unrecognizedFunction: 'Unrecognized function',
        callData: 'Call Data:',
        cantParseFunction: 'Cannot parse function signature',
        cantShowFunction: 'Cannot display function signature',
        inputData: 'Input Data',
        outputData: 'Output Data',
        createContract: 'Create Contract',
        rpcUrlEmpty: 'RPC URL cannot be empty',
        txHashEmpty: 'Transaction hash cannot be empty',
        bothEmpty: 'Please fill in RPC URL and Transaction hash',
        cantGetTraceData: 'Cannot get transaction trace data',
        cantGetTxInfo: 'Cannot get transaction information',
        traceApiError: 'Error calling debug_traceTransaction API',
        processingError: 'Error processing results',
        rpcPlaceholder: 'e.g. https://mainnet.infura.io/v3/your-api-key',
        hashPlaceholder: 'e.g. 0x...'
    },
    zh: {
        appTitle: 'EVM交易分析工具',
        rpcLabel: 'RPC 地址:',
        hashLabel: '交易哈希:',
        analyzeButton: '分析交易',
        loading: '分析中，请稍等...',
        txInfoTitle: '交易信息',
        traceTitle: '调用追踪',
        ethTransfer: 'ETH 转账',
        amount: '金额',
        functionLabel: '函数',
        unrecognizedFunction: '未识别的函数',
        callData: '调用数据:',
        cantParseFunction: '无法解析函数签名',
        cantShowFunction: '无法显示函数签名',
        inputData: '输入数据',
        outputData: '输出数据',
        createContract: '创建合约',
        rpcUrlEmpty: 'RPC URL不能为空',
        txHashEmpty: '交易哈希不能为空',
        bothEmpty: '请填写RPC URL和交易哈希',
        cantGetTraceData: '无法获取交易跟踪数据',
        cantGetTxInfo: '无法获取交易信息',
        traceApiError: '调用debug_traceTransaction API出错',
        processingError: '处理结果时出错',
        rpcPlaceholder: '例如: https://mainnet.infura.io/v3/你的API密钥',
        hashPlaceholder: '例如: 0x...'
    }
};

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    // 绑定按钮事件
    document.getElementById('analyze-btn').addEventListener('click', analyzeTransaction);
    
    // 绑定语言选择事件
    document.getElementById('language-select').addEventListener('change', (e) => {
        currentLanguage = e.target.value;
        updateLanguage();
    });
    
    // 初始化界面语言
    updateLanguage();
});

// 更新界面语言
function updateLanguage() {
    const t = translations[currentLanguage];
    
    // 更新标题和标签
    document.getElementById('app-title').textContent = t.appTitle;
    document.getElementById('label-rpc').textContent = t.rpcLabel;
    document.getElementById('label-hash').textContent = t.hashLabel;
    document.getElementById('analyze-btn').textContent = t.analyzeButton;
    document.getElementById('loading').textContent = t.loading;
    document.getElementById('tx-info-title').textContent = t.txInfoTitle;
    document.getElementById('trace-title').textContent = t.traceTitle;
    
    // 更新占位符
    document.getElementById('rpc-url').placeholder = t.rpcPlaceholder;
    document.getElementById('tx-hash').placeholder = t.hashPlaceholder;
    
    // 如果有错误消息，重新翻译错误消息
    const errorElement = document.getElementById('error-message');
    if (!errorElement.classList.contains('hidden')) {
        const errorKey = errorElement.dataset.errorKey;
        if (errorKey && t[errorKey]) {
            errorElement.textContent = t[errorKey];
        }
    }
}

// 初始化Web3
function initWeb3(rpcUrl) {
    if (!rpcUrl) {
        throw new Error(translations[currentLanguage].rpcUrlEmpty);
    }
    return new Web3(new Web3.providers.HttpProvider(rpcUrl));
}

// 主要分析函数
async function analyzeTransaction() {
    const t = translations[currentLanguage];
    
    // 清空之前的结果
    document.getElementById('trace-tree').innerHTML = '';
    document.getElementById('function-signature').innerHTML = '';
    document.getElementById('tx-info').classList.add('hidden');
    
    // 获取输入
    const rpcUrl = document.getElementById('rpc-url').value.trim();
    const txHash = document.getElementById('tx-hash').value.trim();
    
    // 验证输入
    if (!rpcUrl && !txHash) {
        showError(t.bothEmpty, 'bothEmpty');
        return;
    } else if (!rpcUrl) {
        showError(t.rpcUrlEmpty, 'rpcUrlEmpty');
        return;
    } else if (!txHash) {
        showError(t.txHashEmpty, 'txHashEmpty');
        return;
    }
    
    try {
        // 显示加载中
        showLoading(true);
        hideError();
        
        // 初始化Web3
        web3 = initWeb3(rpcUrl);
        
        // 获取交易跟踪数据
        const traceData = await traceTransaction(txHash);
        if (!traceData) {
            throw new Error(t.cantGetTraceData);
        }
        
        // 获取交易基本信息
        const txInfo = await web3.eth.getTransaction(txHash);
        if (!txInfo) {
            throw new Error(t.cantGetTxInfo);
        }
        
        // 处理并显示数据
        await processAndDisplayResults(txInfo, traceData);
        
        // 隐藏加载中
        showLoading(false);
        document.getElementById('tx-info').classList.remove('hidden');
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || t.processingError, 'processingError');
        showLoading(false);
    }
}

// 调用debug_traceTransaction API
async function traceTransaction(txHash) {
    const t = translations[currentLanguage];
    
    try {
        return await new Promise((resolve, reject) => {
            web3.currentProvider.send({
                jsonrpc: '2.0',
                id: new Date().getTime(),
                method: 'debug_traceTransaction',
                params: [txHash, {
                    tracer: 'callTracer',
                    timeout: '60s'
                }]
            }, (err, response) => {
                if (err) {
                    reject(err);
                } else if (response.error) {
                    reject(new Error(response.error.message || t.traceApiError));
                } else {
                    resolve(response.result);
                }
            });
        });
    } catch (error) {
        console.error('Trace error:', error);
        throw new Error(`${t.traceApiError}: ${error.message}`);
    }
}

// 处理并显示结果
async function processAndDisplayResults(txInfo, traceData) {
    const t = translations[currentLanguage];
    
    try {
        // 显示函数签名和参数
        await displayFunctionSignature(txInfo);
        
        // 构建并显示树形结构
        buildTraceTree(traceData);
    } catch (error) {
        console.error('Processing error:', error);
        showError(`${t.processingError}: ${error.message}`, 'processingError');
    }
}

// 显示函数签名和参数
async function displayFunctionSignature(txInfo) {
    const t = translations[currentLanguage];
    const functionSignatureContainer = document.getElementById('function-signature');
    functionSignatureContainer.innerHTML = '';
    
    try {
        const inputData = txInfo.input;
        
        // 如果是简单的ETH转账或没有数据
        if (!inputData || inputData === '0x' || inputData === '0x0') {
            const signatureDiv = document.createElement('div');
            signatureDiv.className = 'function-signature';
            signatureDiv.textContent = t.ethTransfer;
            
            const valueDiv = document.createElement('div');
            valueDiv.className = 'function-params';
            valueDiv.textContent = `${t.amount}: ${web3.utils.fromWei(txInfo.value, 'ether')} ETH`;
            
            functionSignatureContainer.appendChild(signatureDiv);
            functionSignatureContainer.appendChild(valueDiv);
            return;
        }
        
        const methodId = inputData.substring(0, 10);
        const params = inputData.substring(10);
        
        // 尝试解析函数签名
        try {
            // 使用ethers解析ABI
            const iface = new ethers.utils.Interface([`function any(${new Array(10).fill('bytes32').join(',')})`]);
            const functionFragment = iface.fragments[0];
            
            // 创建包含函数签名的div
            const signatureDiv = document.createElement('div');
            signatureDiv.className = 'function-signature';
            signatureDiv.textContent = `${t.functionLabel}: ${methodId} (${t.unrecognizedFunction})`;
            
            // 创建包含原始数据的div
            const rawDataDiv = document.createElement('div');
            rawDataDiv.className = 'function-params';
            
            const rawDataTitle = document.createElement('div');
            rawDataTitle.textContent = t.callData;
            rawDataDiv.appendChild(rawDataTitle);
            
            const inputDataElem = document.createElement('div');
            inputDataElem.className = 'function-param';
            inputDataElem.textContent = inputData;
            inputDataElem.style.wordBreak = 'break-all';
            rawDataDiv.appendChild(inputDataElem);
            
            functionSignatureContainer.appendChild(signatureDiv);
            functionSignatureContainer.appendChild(rawDataDiv);
        } catch (error) {
            console.warn('Parse error:', error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'function-signature';
            errorDiv.textContent = `${t.cantParseFunction}: ${methodId}`;
            functionSignatureContainer.appendChild(errorDiv);
        }
    } catch (error) {
        console.error('Signature error:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'function-signature';
        errorDiv.textContent = `${t.cantShowFunction}: ${error.message}`;
        functionSignatureContainer.appendChild(errorDiv);
    }
}

// 构建跟踪树
function buildTraceTree(traceData) {
    const traceTreeContainer = document.getElementById('trace-tree');
    traceTreeContainer.innerHTML = '';
    
    // 创建根节点
    const rootItem = createTraceItem(traceData, true);
    traceTreeContainer.appendChild(rootItem);
}

// 创建跟踪项目节点
function createTraceItem(item, isExpanded = false) {
    const t = translations[currentLanguage];
    const traceItem = document.createElement('div');
    traceItem.className = 'trace-item';
    
    // 创建头部
    const header = document.createElement('div');
    header.className = 'trace-item-header';
    
    // 创建切换按钮
    const toggle = document.createElement('span');
    toggle.className = 'trace-item-toggle';
    toggle.textContent = isExpanded ? '-' : '+';
    header.appendChild(toggle);
    
    // 创建函数信息
    const functionInfo = document.createElement('span');
    functionInfo.className = 'trace-item-function';
    
    // 显示的信息包括类型和目标地址
    const type = item.type || 'CALL';
    functionInfo.textContent = `${type} → `;
    
    const addressSpan = document.createElement('span');
    addressSpan.className = 'trace-item-address';
    addressSpan.textContent = item.to || t.createContract;
    functionInfo.appendChild(addressSpan);
    
    // 如果有值，添加值信息
    if (item.value && item.value !== '0x0') {
        const valueSpan = document.createElement('span');
        valueSpan.className = 'trace-item-value';
        const valueInWei = parseInt(item.value, 16);
        const valueInEth = web3.utils.fromWei(valueInWei.toString(), 'ether');
        valueSpan.textContent = ` (${valueInEth} ETH)`;
        functionInfo.appendChild(valueSpan);
    }
    
    // 如果有gas使用，添加gas信息
    if (item.gas) {
        const gasSpan = document.createElement('span');
        gasSpan.className = 'trace-item-gas';
        gasSpan.textContent = ` [Gas: ${parseInt(item.gas, 16)}]`;
        functionInfo.appendChild(gasSpan);
    }
    
    header.appendChild(functionInfo);
    traceItem.appendChild(header);
    
    // 创建内容区域
    const content = document.createElement('div');
    content.className = 'trace-item-content';
    
    // 如果有input数据，显示input
    if (item.input && item.input !== '0x') {
        const inputDiv = document.createElement('div');
        inputDiv.textContent = `${t.inputData}: ${item.input.length > 66 ? item.input.substring(0, 66) + '...' : item.input}`;
        content.appendChild(inputDiv);
    }
    
    // 如果有输出数据，显示输出
    if (item.output) {
        const outputDiv = document.createElement('div');
        outputDiv.textContent = `${t.outputData}: ${item.output.length > 66 ? item.output.substring(0, 66) + '...' : item.output}`;
        content.appendChild(outputDiv);
    }
    
    // 如果有子调用，递归添加
    if (item.calls && item.calls.length > 0) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'trace-item-children';
        
        for (const childCall of item.calls) {
            const childItem = createTraceItem(childCall);
            childrenContainer.appendChild(childItem);
        }
        
        content.appendChild(childrenContainer);
    }
    
    traceItem.appendChild(content);
    
    // 默认隐藏内容
    if (!isExpanded) {
        content.style.display = 'none';
    }
    
    // 添加切换展开/折叠的事件
    header.addEventListener('click', (e) => {
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = '-';
        } else {
            content.style.display = 'none';
            toggle.textContent = '+';
        }
        e.stopPropagation();
    });
    
    return traceItem;
}

// 显示/隐藏加载中
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

// 显示错误信息
function showError(message, errorKey) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    
    // 存储错误键，用于语言切换时翻译错误消息
    if (errorKey) {
        errorElement.dataset.errorKey = errorKey;
    } else {
        delete errorElement.dataset.errorKey;
    }
}

// 隐藏错误信息
function hideError() {
    const errorElement = document.getElementById('error-message');
    errorElement.classList.add('hidden');
    delete errorElement.dataset.errorKey;
}

// 辅助函数：截断地址显示
function shortenAddress(address) {
    if (!address) return '';
    return address.substring(0, 6) + '...' + address.substring(address.length - 4);
}