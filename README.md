# CareerOS

CareerOS 是一个本地优先的个人职业与 AI 项目观察系统。当前前端是原生 HTML/CSS/JavaScript 单页应用，核心首页已从旧的“运行舱”改为 **AI 速览**：每天推送一批适合普通人快速理解的 AI / GitHub / 开源项目。

## 当前功能

- **AI 速览**：每天展示 9 个 AI 项目，一次只看 3 张轻量卡片。
- **换一波看看**：从当天 9 个项目中切换下一组三张。
- **收藏夹**：收藏感兴趣的项目，刷新页面后仍保留。
- **搜索项目名**：展示短的原生英文项目名，方便去公众号、GitHub 或搜索引擎检索。
- **真实数据入口**：页面读取 `frontend/data/ai-brief.json`，不再只依赖写死数据。
- **数据抓取脚本**：`scripts/fetch_ai_brief.py` 会抓取 RadarAI、Hugging Face、GitHubDaily，并生成当天数据。
- **其他模块**：能力图谱、市场雷达、求职护盾、精进仓库、日志等页面仍保留在系统中。

## AI 速览数据流

```text
RadarAI RSS
Hugging Face API
GitHubDaily 项目库
        |
        v
scripts/fetch_ai_brief.py
        |
        v
frontend/data/ai-brief.json
        |
        v
frontend/index.html 页面展示
```

数据源：

- RadarAI RSS: `https://radarai.top/feed.xml`
- Hugging Face API: `https://huggingface.co/api/models?sort=createdAt&direction=-1&limit=30`
- GitHubDaily: `https://raw.githubusercontent.com/GitHubDaily/GitHubDaily/master/2024.md`

脚本会尽量提取短项目名，例如 `Vanna`、`FireCrawl`、`OmniParse`、`owner/repo`，避免把文章标题当成搜索名。

## 文件说明

```text
frontend/index.html              前端入口
frontend/app.js                  页面交互与 AI 速览渲染逻辑
frontend/styles.css              页面样式
frontend/data/ai-brief.json      当前 AI 速览展示数据
frontend/data/ai-brief-history.json  最近推送历史，用于减少重复
scripts/fetch_ai_brief.py        AI 项目抓取与清洗脚本
```

## 手动刷新 AI 速览数据

在项目根目录运行：

```powershell
& ".venv/Scripts/python.exe" "scripts/fetch_ai_brief.py"
```

成功后会看到类似输出：

```text
Fetching RadarAI RSS...
Fetching Hugging Face models...
Fetching GitHubDaily archive...
Wrote 9 items to frontend/data/ai-brief.json
```

刷新浏览器页面后，AI 速览会读取新的 `frontend/data/ai-brief.json`。

## 每天 6 点自动抓取

建议使用 Windows 任务计划程序，不需要启动长期后台服务。

在 PowerShell 中运行：

```powershell
$action = New-ScheduledTaskAction `
  -Execute "e:\trae projects\job_plan\.venv\Scripts\python.exe" `
  -Argument "`"e:\trae projects\job_plan\scripts\fetch_ai_brief.py`"" `
  -WorkingDirectory "e:\trae projects\job_plan"

$trigger = New-ScheduledTaskTrigger `
  -Daily `
  -At 6:00AM

Register-ScheduledTask `
  -TaskName "CareerOS AI Brief Daily Fetch" `
  -Action $action `
  -Trigger $trigger `
  -Description "每天早上6点抓取 AI 项目并刷新 CareerOS AI速览" `
  -Force
```

手动测试定时任务：

```powershell
Start-ScheduledTask -TaskName "CareerOS AI Brief Daily Fetch"
```

查看任务状态：

```powershell
Get-ScheduledTaskInfo -TaskName "CareerOS AI Brief Daily Fetch"
```

## 前端运行

如果已有本地静态服务，直接访问：

```text
http://localhost:&PORT/frontend/index.html
```

也可以用任意静态服务器托管项目根目录。页面本身不要求 Node.js 构建。

## 说明

- 前端不会展示项目地址，只展示项目名、搜索项目名、来源、真实简介和白话理解。
- `ai-brief.json` 是页面当前展示数据；脚本每次成功运行都会覆盖它。
- `ai-brief-history.json` 用来记录最近推过的项目，帮助每天尽量不重复。
- 如果某个数据源网络较慢或失败，脚本会跳过该源，其他源成功时仍会生成数据。
