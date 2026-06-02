# 功能开发落点

当前项目保持轻量结构。新增功能时先找到业务所属位置，不要继续把所有代码塞进 `frontend/app.js`。

## 后端

| 想做的事情 | 修改位置 |
| --- | --- |
| 增加数据库字段或表 | `models.py` |
| 定义接口请求与响应格式 | `schemas.py` |
| 登录、注册行为 | `routes/auth.py` |
| 岗位技能、项目能力档案接口 | `routes/capabilities.py` |
| 注册新的路由模块 | `main.py` |

后端当前规则：

- `job_skills` 是开放技能表，不受页面演示技能限制。
- `project_capability_profiles` 只保留每个用户项目的当前档案。
- 新的独立业务，例如简历或 JD 扫描，新增 `routes/resumes.py` 或 `routes/jobs.py`，不要继续扩大 `routes/capabilities.py`。

## 前端

| 想做的事情 | 修改位置 |
| --- | --- |
| 新增或修改后端请求 | `frontend/api.js` |
| 调整项目文字如何匹配演示技能 | `frontend/capability-rules.js` |
| 页面按钮行为、渲染与本地状态 | `frontend/app.js` |
| 页面结构 | `frontend/index.html` |
| 样式 | `frontend/styles.css` |

`frontend/app.js` 仍包含原型的多个页面模块，后续只在真正实现某个页面时再按模块拆分，避免一次性重写。

## 开发步骤

以新增一个“岗位技能录入”页面操作为例：

1. 在 `schemas.py` 和 `routes/capabilities.py` 确认接口足够使用。
2. 在 `frontend/api.js` 增加调用接口的方法。
3. 在 `frontend/index.html` 增加表单区域。
4. 在 `frontend/app.js` 绑定按钮事件并渲染返回结果。
5. 在测试文件中覆盖接口保存和查询行为。

运行后端测试：

```powershell
.\.venv\Scripts\python.exe -m unittest -v test_api.py test_capabilities.py
```
