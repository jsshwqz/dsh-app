# DSH Desktop (Tauri)

Rust/Tauri 原生桌面客户端，对接 DeepSeek Harness (DSH) 的 JSON-RPC agent。

## 快速开始

### 前置条件
- Rust 1.90+ (msvc 工具链)
- Node.js 20+ (仅用于前端 dev server)
- Git

### 构建

```bash
# 编译 release 二进制
cargo tauri build

# 产物位于
src-tauri/target/release/dsh-desktop-tauri.exe
```

### 开发模式

```bash
# 终端 1: 启动前端静态 server
node -e "require('http').createServer((req,res)=>{const fs=require('fs'),path=require('path');const root='dist';const f=root+url.parse(req.url).pathname.replace(/\\+$/,');if(fs.existsSync(f)&&!fs.statSync(f).isDirectory()){res.writeHead(200);fs.createReadStream(f).pipe(res)}else{res.writeHead(404)}}).listen(1420,()=>console.log('dev server on 1420'))"

# 终端 2: Tauri dev
cargo tauri dev
```

## 架构

- **Rust 主进程** (`src-tauri/src/lib.rs`)：直接以 stdio JSON-RPC 2.0 与 `dsh-jsonrpc-agent` 子进程通信
- **前端** (`dist/index.html` + `app.js`)：Tauri 原生日志，通过 `window.__TAURI__` 调用 Rust 命令
- **协议**：与 DSH 官方 SDK 一致的 JSON-RPC over stdio

## 为什么是 Rust/Tauri 而不是 Electron

| 维度 | Electron | Tauri |
|------|----------|-------|
| 二进制大小 | ~200MB+ (含 V8/Chromium) | ~11MB |
| 主进程 | Node/TypeScript (需打包 JS 依赖) | Rust 编译为机器码 |
| 依赖漏洞面 | Chromium/Node 全量攻击面 | WebView2 (系统自带) |
| `dsh-sdk-client` 问题 | asar 打包漏包导致 `Cannot find package` | 不存在 (主进程是 Rust) |

## 文件结构

```
dsh-app/
├── dist/                 # 静态前端
│   ├── index.html
│   └── app.js
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   ├── src/
│   │   ├── lib.rs        # Rust 主进程 (JSON-RPC over stdio)
│   │   └── run.rs        # 入口
│   └── icons/
│       └── icon.ico
└── README.md
```

## License

MIT
