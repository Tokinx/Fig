#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查目录是否存在
function checkDirectory(dir) {
    return fs.existsSync(dir);
}

// 检查package.json是否存在
function checkPackageJson(dir) {
    const packagePath = path.join(dir, 'package.json');
    return fs.existsSync(packagePath);
}

// 检查node_modules是否存在
function checkNodeModules(dir) {
    const nodeModulesPath = path.join(dir, 'node_modules');
    return fs.existsSync(nodeModulesPath);
}

// 运行命令
function runCommand(command, args, cwd, name) {
    return new Promise((resolve, reject) => {
        log(`[${name}] 正在运行: ${command} ${args.join(' ')}`, 'blue');
        
        const child = spawn(command, args, {
            cwd,
            stdio: 'inherit',
            shell: true
        });

        child.on('close', (code) => {
            if (code !== 0) {
                log(`[${name}] 命令执行失败，退出码: ${code}`, 'red');
                reject(new Error(`Command failed with code ${code}`));
            } else {
                log(`[${name}] 命令执行成功`, 'green');
                resolve();
            }
        });

        child.on('error', (error) => {
            log(`[${name}] 执行错误: ${error.message}`, 'red');
            reject(error);
        });
    });
}

// 安装依赖
async function installDependencies(dir, name) {
    if (!checkNodeModules(dir)) {
        log(`[${name}] node_modules不存在，正在安装依赖...`, 'yellow');
        await runCommand('npm', ['install'], dir, name);
    } else {
        log(`[${name}] node_modules已存在，跳过依赖安装`, 'green');
    }
}

// 启动服务
async function startService(dir, command, args, name) {
    log(`[${name}] 正在启动服务...`, 'blue');
    
    const child = spawn(command, args, {
        cwd: dir,
        stdio: 'inherit',
        shell: true
    });

    child.on('error', (error) => {
        log(`[${name}] 启动错误: ${error.message}`, 'red');
    });

    return child;
}

// 主函数
async function main() {
    const rootDir = process.cwd();
    const webDir = path.join(rootDir, 'web');
    const workersDir = path.join(rootDir, 'workers');

    log('========================================', 'blue');
    log('        Fig 短链接服务一键启动工具', 'blue');
    log('========================================', 'blue');

    // 检查目录结构
    if (!checkDirectory(webDir)) {
        log('错误: web目录不存在', 'red');
        process.exit(1);
    }

    if (!checkDirectory(workersDir)) {
        log('错误: workers目录不存在', 'red');
        process.exit(1);
    }

    // 检查package.json
    if (!checkPackageJson(webDir)) {
        log('错误: web/package.json不存在', 'red');
        process.exit(1);
    }

    if (!checkPackageJson(workersDir)) {
        log('错误: workers/package.json不存在', 'red');
        process.exit(1);
    }

    try {
        // 安装前端依赖
        log('\\n🔧 检查前端依赖...', 'yellow');
        await installDependencies(webDir, '前端');

        // 安装后端依赖
        log('\\n🔧 检查后端依赖...', 'yellow');
        await installDependencies(workersDir, '后端');

        log('\\n🚀 启动服务...', 'green');
        
        // 启动前端服务
        const webProcess = await startService(webDir, 'npm', ['run', 'dev'], '前端');
        
        // 等待一会儿再启动后端，避免端口冲突
        setTimeout(async () => {
            try {
                // 启动后端服务
                const workersProcess = await startService(workersDir, 'npm', ['run', 'dev'], '后端');
                
                // 处理进程退出
                process.on('SIGINT', () => {
                    log('\\n⏹️  正在停止服务...', 'yellow');
                    webProcess.kill();
                    workersProcess.kill();
                    process.exit(0);
                });
                
                process.on('SIGTERM', () => {
                    log('\\n⏹️  正在停止服务...', 'yellow');
                    webProcess.kill();
                    workersProcess.kill();
                    process.exit(0);
                });
                
            } catch (error) {
                log(`后端服务启动失败: ${error.message}`, 'red');
                webProcess.kill();
                process.exit(1);
            }
        }, 3000);

        log('\\n✅ 服务启动完成！', 'green');
        log('前端服务: http://localhost:5173', 'blue');
        log('后端服务: http://localhost:8787', 'blue');
        log('\\n按 Ctrl+C 停止服务', 'yellow');

    } catch (error) {
        log(`启动失败: ${error.message}`, 'red');
        process.exit(1);
    }
}

// 检查Node.js版本
function checkNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
        log('错误: 需要Node.js 16或更高版本', 'red');
        log(`当前版本: ${nodeVersion}`, 'red');
        process.exit(1);
    }
}

// 启动
checkNodeVersion();
main().catch(error => {
    log(`启动错误: ${error.message}`, 'red');
    process.exit(1);
});