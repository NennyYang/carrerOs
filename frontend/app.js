(function () {
  var storageKey = "careeros.prototype.state.v7";
  var userKey = "careeros.user";
  var api = window.CareerOSApi;
  var $ = function (selector) { return document.querySelector(selector); };
  var $$ = function (selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); };

  function now() { return new Date().toISOString(); }
  function timeLabel(value) {
    return value ? new Date(value).toLocaleString("zh-CN", {
      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
    }) : "--";
  }
  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }
  function score(value) { return Math.max(0, Math.min(100, Math.round(value || 0))); }

  var seedSkills = [
    { id: "python_network", name: "Python 编程与网络基础", level: 0, market: 88, stage: "待积累", evidence: 0, note: "Python、HTTP、API 集成、异步编程和数据格式处理。" },
    { id: "llm_prompt", name: "大模型基础与 Prompt 工程", level: 0, market: 86, stage: "待积累", evidence: 0, note: "Prompt、Token、Embedding、上下文窗口和安全控制。" },
    { id: "rag", name: "RAG 检索增强技术", level: 0, market: 90, stage: "待积累", evidence: 0, note: "文档解析、文本分块、向量化、检索、召回评测和调优。" },
    { id: "agent_multimodal", name: "AI 框架、智能体与多模态集成", level: 0, market: 84, stage: "待积累", evidence: 0, note: "智能体工作流、工具调用、流程编排和多模态 API。" },
    { id: "backend_storage", name: "后端服务与数据存储开发", level: 0, market: 87, stage: "待积累", evidence: 0, note: "FastAPI、鉴权、异常处理、数据库设计和缓存。" },
    { id: "model_deploy", name: "模型部署、推理与微调", level: 0, market: 78, stage: "待积累", evidence: 0, note: "模型 API、私有化部署、推理框架和 LoRA 微调。" },
    { id: "ops_business", name: "工程运维与业务落地优化", level: 0, market: 85, stage: "待积累", evidence: 0, note: "Docker、日志、监控、故障排查、成本与性能优化。" }
  ];

  var energySettings = {
    rest: { name: "休息", mode: "恢复模式", capacity: "今日无任务", hint: "休息也是保护长期产出", intro: "保持能量。一条短记就足够。", actions: [{ time: "1分钟", title: "记录今日能量消耗", asset: "能量记录", desc: "留下一条简短记录。" }] },
    light: { name: "轻度", mode: "轻松维护", capacity: "1 x 8分钟", hint: "小输入也能累积", intro: "选择一个低阻力行动。", actions: [{ time: "8分钟", title: "完善一个项目要点", asset: "简历资产", desc: "让一段真实经历更清晰。" }] },
    normal: { name: "普通", mode: "稳定增长", capacity: "2 x 25分钟", hint: "稳定节奏", intro: "选择一个能创造资产的行动。", actions: [{ time: "25分钟", title: "添加一个项目档案", asset: "证据", desc: "将经验移入技能图谱。" }, { time: "25分钟", title: "扫描目标岗位", asset: "市场样本", desc: "刷新岗位需求。" }] },
    deep: { name: "深入", mode: "专注推进", capacity: "3 x 45分钟", hint: "适合作品集资产", intro: "将知识转化为演示或证明。", actions: [{ time: "75分钟", title: "完成一个演示模块", asset: "作品集模块", desc: "交付功能、边界案例和验证记录。" }] }
  };

  function loadUser() {
    try { return JSON.parse(window.localStorage.getItem(userKey) || "null"); }
    catch (error) { return null; }
  }
  function saveUser(user) {
    if (user) window.localStorage.setItem(userKey, JSON.stringify(user));
    else window.localStorage.removeItem(userKey);
  }
  function defaultState() {
    return {
      energy: "normal",
      evidence: 0,
      coverage: 0,
      matchScore: 0,
      user: loadUser(),
      skills: seedSkills,
      projects: [],
      skillHistory: [],
      rawJobs: [],
      cleanedJobs: [],
      mergedJobs: 0,
      resumes: [],
      activeResumeId: "",
      targetJobText: "",
      matchHistory: [],
      resumeScoreAnalysis: null,
      lastAnalysis: null,
      plans: [],
      audit: [],
      searchCount: 0
    };
  }
  function loadState() {
    try {
      var saved = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      return saved ? Object.assign(defaultState(), saved, { user: loadUser(), skills: saved.skills || seedSkills }) : defaultState();
    } catch (error) {
      return defaultState();
    }
  }
  var state = loadState();
  function saveState() { window.localStorage.setItem(storageKey, JSON.stringify(state)); }

  function showToast(message) {
    var toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () { toast.classList.remove("visible"); }, 2200);
  }
  function addAudit(type, text) {
    state.audit.unshift({ at: now(), type: type, text: text });
    state.audit = state.audit.slice(0, 50);
  }
  function showApp() {
    $(".shell").classList.add("authenticated");
    $("#loginPage").classList.add("hidden");
    $("#registerModal").classList.remove("active");
    $("#registerModal").classList.add("hidden");
  }
  function showLoginPage() {
    $(".shell").classList.remove("authenticated");
    $("#loginPage").classList.remove("hidden");
  }

  function renderHeader() {
    $("#currentDate").textContent = new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });
    $("#evidenceTotal").textContent = state.evidence;
    $("#coverageValue").textContent = state.coverage + "%";
    $("#nodeEvidence").textContent = state.evidence + " 项证据";
    $("#radarSignalCount").textContent = (state.searchCount || state.rawJobs.length || 12) + " 个岗位信号";
    var setting = energySettings[state.energy] || energySettings.normal;
    $("#coreMode").textContent = setting.mode;
    $("#energyNodeText").textContent = setting.name;
    $("#capacityValue").textContent = setting.capacity;
    $("#capacityHint").textContent = setting.hint;
    $("#actionIntro").textContent = setting.intro;
    $("#actionList").innerHTML = setting.actions.map(function (action, index) {
      return '<article class="action-card"><div><strong>' + escapeHtml(action.title) + '</strong><p>' +
        escapeHtml(action.desc) + '</p></div><span>' + escapeHtml(action.time) + '</span><button data-complete="' +
        index + '">完成</button></article>';
    }).join("");
    $$("[data-complete]").forEach(function (button) {
      button.addEventListener("click", function () {
        addAudit("action", "已添加资产: " + setting.actions[this.dataset.complete].asset);
        state.evidence += 1;
        saveState();
        renderAll(true);
        showToast("已保存");
      });
    });
  }

  function renderAlerts() {
    var alerts = [];
    if (!state.projects.length) alerts.push({ title: "尚未添加项目档案", detail: "添加一个真实项目以开始证据追踪。", view: "skills", action: "添加项目" });
    if (!state.resumes.length) alerts.push({ title: "尚未上传简历", detail: "运行求职护盾分析前，请先上传简历。", view: "shield", action: "上传" });
    $("#alertCount").textContent = alerts.length + " 条预警";
    $("#alertList").innerHTML = alerts.length ? alerts.map(function (item) {
      return '<article class="alert-item"><i></i><div><strong>' + escapeHtml(item.title) + '</strong><p>' +
        escapeHtml(item.detail) + '</p></div><button data-alert-view="' + item.view + '">' + item.action + '</button></article>';
    }).join("") : '<p class="alert-empty">暂无关键预警。</p>';
    $$("[data-alert-view]").forEach(function (button) {
      button.addEventListener("click", function () { switchView(this.dataset.alertView); });
    });
    var completed = state.plans.filter(function (item) { return item.done; }).length;
    $("#todoProgress").textContent = completed + " / " + state.plans.length;
    $("#todoList").innerHTML = state.plans.length ? state.plans.map(function (item) {
      return '<label class="todo-item ' + (item.done ? "done" : "") + '"><input type="checkbox" data-todo="' +
        item.id + '" ' + (item.done ? "checked" : "") + ' /><span>' + escapeHtml(item.text) + '</span></label>';
    }).join("") : '<p class="alert-empty">暂无待办事项。</p>';
  }

  var resumeDimensionScores = {};
  var projectTotalScores = {};
  var projectDetails = [];

  function loadResumeDimensionScores(resumeId) {
    if (!api || !api.getResumeDimensionScore) return;
    var userId = state.user ? state.user.id : 0;
    api.getResumeDimensionScore(userId, resumeId).then(function (result) {
      if (result && result.dimension_scores) {
        resumeDimensionScores[resumeId] = result.dimension_scores;
      } else {
        resumeDimensionScores[resumeId] = [];
      }
      renderSkills();
    }).catch(function () {
      resumeDimensionScores[resumeId] = [];
      renderSkills();
    });
  }

  function loadProjectDimensionScoresTotal() {
    if (!api || !api.getProjectDimensionScoresTotal) return;
    var userId = state.user ? state.user.id : 0;
    api.getProjectDimensionScoresTotal(userId).then(function (result) {
      if (result && result.total_scores) {
        projectTotalScores = result.total_scores;
      } else {
        projectTotalScores = {};
      }
      if (result && result.project_details) {
        projectDetails = result.project_details;
      } else {
        projectDetails = [];
      }
      renderSkills();
    }).catch(function () {
      projectTotalScores = {};
      projectDetails = [];
      renderSkills();
    });
  }

  function getResumeDimensionScoreForSkill(skillName) {
    var scores = resumeDimensionScores[state.activeResumeId] || [];
    var found = scores.find(function (item) { return item.name === skillName; });
    if (found) return found.score;
    
    var normalizedSkillName = skillName.replace(/\s+/g, "");
    found = scores.find(function (item) { 
      var normalizedItemName = item.name.replace(/\s+/g, "");
      return normalizedItemName === normalizedSkillName || 
             normalizedItemName.includes(normalizedSkillName) || 
             normalizedSkillName.includes(normalizedItemName);
    });
    return found ? found.score : 0;
  }

  function getProjectTotalScoreForSkill(skillName) {
    for (var name in projectTotalScores) {
      if (name === skillName) {
        return Math.round(projectTotalScores[name]);
      }
    }
    
    var normalizedSkillName = skillName.replace(/\s+/g, "");
    for (var name in projectTotalScores) {
      var normalizedName = name.replace(/\s+/g, "");
      if (normalizedName === normalizedSkillName || 
          normalizedName.includes(normalizedSkillName) || 
          normalizedSkillName.includes(normalizedName)) {
        return Math.round(projectTotalScores[name]);
      }
    }
    return 0;
  }

  function getProjectDetailsForSkill(skillName) {
    var details = [];
    var normalizedSkillName = skillName.replace(/\s+/g, "");
    
    projectDetails.forEach(function (project) {
      project.scores.forEach(function (score) {
        var normalizedScoreName = score.name.replace(/\s+/g, "");
        if (normalizedScoreName === normalizedSkillName ||
            normalizedScoreName.includes(normalizedSkillName) ||
            normalizedSkillName.includes(normalizedScoreName)) {
          details.push({
            project_name: project.project_name,
            score: Math.round(score.score),
            created_at: project.created_at
          });
        }
      });
    });
    
    return details;
  }

  var expandedSkills = {};

  function toggleSkill(skillId) {
    expandedSkills[skillId] = !expandedSkills[skillId];
    renderSkills();
  }

  function renderSkills() {
    var resumeSelect = $("#benchmarkResumeSelect");
    resumeSelect.innerHTML = state.resumes.length ? state.resumes.map(function (resume) {
      return '<option value="' + resume.id + '" ' + (String(resume.id) === String(state.activeResumeId) ? "selected" : "") +
        '>v' + resume.version_no + ' / ' + timeLabel(resume.created_at || resume.at) + '</option>';
    }).join("") : '<option value="">暂无简历版本</option>';
    
    $("#skillGrid").innerHTML = state.skills.map(function (skill) {
      var totalScore = getProjectTotalScoreForSkill(skill.name);
      var projectDetails = getProjectDetailsForSkill(skill.name);
      var isExpanded = expandedSkills[skill.id] || false;
      var detailsHtml = projectDetails.length ? '<footer' + (isExpanded ? '' : ' class="collapsed"') + '><div class="project-contributions">' + 
        projectDetails.map(function (item) {
          return '<span class="contribution-item"><strong>' + escapeHtml(item.project_name) + '</strong> +' + item.score + '</span>';
        }).join("") + '</div></footer>' : '';
      
      return '<article class="skill-card"><header><button class="skill-title" data-skill-toggle="' + skill.id +
        '" ' + (projectDetails.length ? 'class="expandable"' : '') + '><h3>' + escapeHtml(skill.name) + '</h3><small>' + escapeHtml(skill.stage) + '</small></button><span>' +
        (totalScore ? '<span class="gap-badge">+' + totalScore + '</span>' : '') + '</span></header>' + detailsHtml + '</article>';
    }).join("");
    $("#capabilityCompare").innerHTML = state.skills.map(function (skill) {
      var resumeScore = getResumeDimensionScoreForSkill(skill.name);
      var projectScore = getProjectTotalScoreForSkill(skill.name);
      var totalScore = resumeScore + projectScore;
      var progressBar = totalScore > 0 ? '<i style="width: ' + totalScore + '%"></i>' : '';
      return '<div class="compare-row"><span>' + escapeHtml(skill.name) + '</span><i style="--level:' + skill.level +
        '%;--fill:' + skill.market + '%"></i><div class="personal-progress">' + progressBar + '</div><strong>' + totalScore + '%</strong><span class="score-breakdown">(' + resumeScore + '%+' + projectScore + '%)</span></div>';
    }).join("");
    $("#projectVersions").innerHTML = state.projects.length ? state.projects.slice().reverse().slice(0, 3).map(function (project) {
      return '<p class="history-entry"><strong>' + escapeHtml(project.name) + '</strong><span>' + timeLabel(project.at) + '</span></p>';
    }).join("") : '<p class="history-entry empty"><strong>暂无项目档案</strong><span>在上方添加</span></p>';
    $("#skillTrajectory").innerHTML = state.skillHistory.length ? state.skillHistory.slice().reverse().slice(0, 3).map(function (entry) {
      return '<p class="history-entry"><strong>' + escapeHtml(entry.text) + '</strong><span>' + timeLabel(entry.at) + '</span></p>';
    }).join("") : '<p class="history-entry empty"><strong>暂无变化</strong><span>先分析一个项目</span></p>';
  }

  function assessProject() {
    var name = $("#projectName").value.trim() || "未命名项目";
    var stack = $("#projectStack").value.trim();
    var problem = $("#projectProblem").value.trim();
    var solution = $("#projectSolution").value.trim();
    if (!stack || !problem || !solution) {
      showToast("请先填写技术栈、问题和验证方式");
      return;
    }
    
    var analyzeButton = $("#analyzeProject");
    analyzeButton.disabled = true;
    analyzeButton.textContent = "解析中...";
    
    var profile = { userId: state.user ? state.user.id : 0, name: name, stack: stack, problem: problem, solution: solution };
    
    $("#assessmentList").innerHTML = '<article class="assessment-item loading"><div><strong>正在调用LLM...</strong><span>等待模型评分</span></div><b>...</b></article>';
    if (!api || !api.analyzeProject) {
      $("#assessmentList").innerHTML = '<p class="assessment-empty">API客户端未加载。</p>';
      analyzeButton.disabled = false;
      analyzeButton.textContent = "解析项目能力";
      showToast("API客户端未加载");
      return;
    }

    api.analyzeProject(profile).then(function (result) {
      processAnalysisResult(result, profile);
    }).catch(function (error) {
      console.error("LLM project analysis failed:", error);
      $("#assessmentList").innerHTML = '<p class="assessment-empty">LLM analysis failed: ' + escapeHtml(error.message || error) + '</p>';
      showToast("LLM analysis failed");
    }).finally(function () {
      analyzeButton.disabled = false;
      analyzeButton.textContent = "解析项目能力";
    });
  }

  function localAnalyzeProject(profile) {
    var haystack = (profile.name + " " + profile.stack + " " + profile.problem + " " + profile.solution).toLowerCase();
    
    var skillMappings = [
      { id: "python_network", keys: ["python", "http", "api", "async", "requests", "json"] },
      { id: "llm_prompt", keys: ["llm", "prompt", "token", "embedding", "prompting"] },
      { id: "rag", keys: ["rag", "检索", "向量", "召回", "chroma", "faiss", "milvus"] },
      { id: "agent_multimodal", keys: ["agent", "workflow", "tool", "langchain", "llamaindex", "多模态"] },
      { id: "backend_storage", keys: ["fastapi", "api", "sql", "postgresql", "redis", "database"] },
      { id: "model_deploy", keys: ["deploy", "部署", "inference", "lora", "vllm", "tgi"] },
      { id: "ops_business", keys: ["docker", "log", "monitor", "业务", "性能", "cost"] }
    ];
    
    var result = {
      python_networking_score: 0.0,
      python_networking_reason: "未提及相关技术",
      llm_prompt_engineering_score: 0.0,
      llm_prompt_engineering_reason: "未提及相关技术",
      rag_score: 0.0,
      rag_reason: "未提及相关技术",
      ai_frameworks_score: 0.0,
      ai_frameworks_reason: "未提及相关技术",
      agents_multimodal_score: 0.0,
      agents_multimodal_reason: "未提及相关技术",
      backend_data_storage_score: 0.0,
      backend_data_storage_reason: "未提及相关技术",
      deployment_finetuning_score: 0.0,
      deployment_finetuning_reason: "未提及相关技术",
      engineering_ops_score: 0.0,
      engineering_ops_reason: "未提及相关技术",
      model: "local",
      project_name: profile.name
    };
    
    var scoreMap = {
      "python_network": { score: "python_networking_score", reason: "python_networking_reason" },
      "llm_prompt": { score: "llm_prompt_engineering_score", reason: "llm_prompt_engineering_reason" },
      "rag": { score: "rag_score", reason: "rag_reason" },
      "agent_multimodal": { score: "ai_frameworks_score", reason: "ai_frameworks_reason" },
      "backend_storage": { score: "backend_data_storage_score", reason: "backend_data_storage_reason" },
      "model_deploy": { score: "deployment_finetuning_score", reason: "deployment_finetuning_reason" },
      "ops_business": { score: "engineering_ops_score", reason: "engineering_ops_reason" }
    };
    
    skillMappings.forEach(function (mapping) {
      var matchedKeys = mapping.keys.filter(function (key) { return haystack.indexOf(key) >= 0; });
      if (matchedKeys.length > 0) {
        var score = Math.min(100, 30 + matchedKeys.length * 15);
        var scores = scoreMap[mapping.id];
        result[scores.score] = score;
        result[scores.reason] = "项目中使用了: " + matchedKeys.join(", ");
      }
    });
    
    return result;
  }

  function processAnalysisResult(result, profile) {
    var name = profile.name;
    var tags = profile.stack.split(/[,，、\s]+/).filter(Boolean).slice(0, 6);
    
    state.projects.push({ name: name, stack: profile.stack, at: now(), tags: tags });
    state.evidence += 1;
    state.coverage = Math.min(100, state.coverage + 8);
    
    var scoreToSkillMap = {
      "python_networking_score": "python_network",
      "llm_prompt_engineering_score": "llm_prompt",
      "rag_score": "rag",
      "ai_frameworks_score": "agent_multimodal",
      "agents_multimodal_score": "agent_multimodal",
      "backend_data_storage_score": "backend_storage",
      "deployment_finetuning_score": "model_deploy",
      "engineering_ops_score": "ops_business"
    };
    
    var reasonToSkillMap = {
      "python_networking_reason": "python_network",
      "llm_prompt_engineering_reason": "llm_prompt",
      "rag_reason": "rag",
      "ai_frameworks_reason": "agent_multimodal",
      "agents_multimodal_reason": "agent_multimodal",
      "backend_data_storage_reason": "backend_storage",
      "deployment_finetuning_reason": "model_deploy",
      "engineering_ops_reason": "ops_business"
    };
    
    var assessmentItems = [];
    
    state.skills.forEach(function (skill) {
      var scoreField = Object.keys(scoreToSkillMap).find(function (key) { return scoreToSkillMap[key] === skill.id; });
      var reasonField = Object.keys(reasonToSkillMap).find(function (key) { return reasonToSkillMap[key] === skill.id; });
      
      if (scoreField && result[scoreField] !== undefined && result[scoreField] > 0) {
        var delta = Math.round(result[scoreField]);
        skill.level = Math.min(100, skill.level + delta);
        skill.stage = skill.level >= 50 ? "交付" : skill.level >= 25 ? "使用" : "了解";
        skill.evidence = Math.min(10, skill.evidence + 1);
        skill.lastDelta = delta;
        state.skillHistory.push({ at: now(), text: skill.name + " +" + delta });
        assessmentItems.push({ name: skill.name, score: Math.round(result[scoreField]), delta: delta, reason: result[reasonField] || "" });
      } else {
        skill.lastDelta = 0;
      }
    });
    
    $("#assessmentList").innerHTML = assessmentItems.length ? assessmentItems.map(function (item) {
      return '<article class="assessment-item"><div><strong>' + escapeHtml(item.name) + '</strong><span>' +
        escapeHtml(item.reason) + '</span></div><b>+' + item.delta + '</b></article>';
    }).join("") : '<p class="assessment-empty">未识别到匹配的能力项。</p>';
    
    addAudit("project", "项目已分析: " + name);
    saveState();
    loadProjectDimensionScoresTotal();
    renderAll(true);
    showToast("项目分析完成");
  }

  function renderRadar() {
    var total = state.rawJobs.length || 12;
    $("#rawJobCount").textContent = total;
    $("#mergedJobCount").textContent = state.mergedJobs || 0;
    $("#cleanJobCount").textContent = state.cleanedJobs.length || total;
    $("#cleaningNote").textContent = "岗位描述已标准化。后续可接入真实渠道。";
    $("#coverageRows").innerHTML = state.skills.map(function (skill) {
      return '<div class="coverage-row"><span>' + escapeHtml(skill.name) + '</span><i style="--level:' + skill.level +
        '%;--fill:' + skill.market + '%"></i><span>' + skill.market + '%</span></div>';
    }).join("");
    $("#jdList").innerHTML = (state.cleanedJobs.length ? state.cleanedJobs : [
      { company: "Galaxy AI", title: "AI App Engineer", city: "Hangzhou", score: 70 },
      { company: "CloudPath", title: "LLM Engineer", city: "Hangzhou", score: 63 }
    ]).map(function (job) {
      return '<article class="jd-card"><div><strong>' + escapeHtml(job.title) + '</strong><p>' +
        escapeHtml(job.company + " / " + job.city) + '</p></div><span>' + job.score + '%</span></article>';
    }).join("");
  }

  function scanJobs() {
    var role = $("#roleQuery").value.trim() || "AI 应用工程师";
    var city = $("#cityQuery").value;
    var days = $("#publishQuery").value;
    state.searchCount = 12;
    state.rawJobs = [
      { id: "job-1", company: "银河AI", title: role, city: city, description: "Python FastAPI RAG 评测 Docker 部署", score: 70 },
      { id: "job-2", company: "云途科技", title: "大模型工程师", city: city, description: "Python RAG Agent 工作流 Docker", score: 63 },
      { id: "job-3", company: "数智思维", title: "智能体平台工程师", city: city, description: "Agent Workflow FastAPI 可观测性", score: 57 }
    ];
    state.cleanedJobs = state.rawJobs;
    $("#roleProfileTitle").textContent = city + " / " + role;
    $("#roleProfileText").textContent = "已将 " + days + " 个样本信号聚合为岗位画像。";
    addAudit("scan", "已扫描岗位: " + role);
    saveState();
    renderAll(true);
    showToast("扫描完成");
  }

  function currentResume() {
    return state.resumes.filter(function (resume) { return String(resume.id) === String(state.activeResumeId); })[0] || state.resumes[0];
  }
  function renderResumes() {
    var select = $("#resumeSelect");
    select.innerHTML = state.resumes.length ? state.resumes.map(function (resume) {
      return '<option value="' + resume.id + '" ' + (String(resume.id) === String(state.activeResumeId) ? "selected" : "") +
        '>v' + resume.version_no + ' / ' + timeLabel(resume.created_at || resume.at) + '</option>';
    }).join("") : '<option value="">暂无简历版本</option>';
    var resume = currentResume();
    $("#resumeVersionHint").textContent = resume ? ("当前文件: " + resume.filename) : "选择已保存的版本或上传新简历。";
    updateAnalyzeButton();
  }
  function updateAnalyzeButton() {
    var resumeButton = $("#runResumeScoring");
    var matchButton = $("#runJobMatching");
    var hasResume = !!currentResume();
    var hasJd = !!($("#targetJobSelect").value || "").trim();
    if (resumeButton) resumeButton.disabled = !hasResume;
    if (matchButton) matchButton.disabled = !(hasResume && hasJd);
  }
  function applyStoredResumeScore(record) {
    if (!record) {
      state.resumeScoreAnalysis = null;
      renderShieldResults();
      return;
    }
    state.resumeScoreAnalysis = {
      id: "resume-score-record-" + record.id,
      resume_version_id: record.resume_version_id,
      resumeVersionLabel: "v" + (currentResume() ? currentResume().version_no : record.resume_version_id),
      job_title: "Resume score",
      job_description: "",
      resume_score: record.resume_score,
      match_score: 0,
      dimension_scores: record.dimension_scores || [],
      resume_suggestions: [],
      match_highlights: [],
      match_gaps: [],
      created_at: record.updated_at || record.created_at,
      model: record.model || ""
    };
    renderShieldResults();
  }
  function loadStoredResumeScore() {
    var resume = currentResume();
    if (!resume || !state.user || !api || !api.getResumeDimensionScore || String(resume.id).indexOf("local-") === 0) {
      state.resumeScoreAnalysis = null;
      renderShieldResults();
      return;
    }
    api.getResumeDimensionScore(state.user.id, resume.id).then(function (record) {
      applyStoredResumeScore(record);
    }).catch(function () {
      state.resumeScoreAnalysis = null;
      renderShieldResults();
    });
  }
  function uploadResume(files) {
    if (!files || !files.length) return;
    var file = files[0];
    var uploadArea = $("#uploadArea");
    var originalText = uploadArea.textContent;
    uploadArea.disabled = true;
    uploadArea.textContent = "上传解析中...";
    
    var localVersion = {
      id: "local-" + Date.now(),
      user_id: state.user ? state.user.id : 0,
      version_no: state.resumes.length + 1,
      filename: file.name,
      content: "",
      created_at: now()
    };
    
    function saveLocal(version) {
      state.resumes.unshift(version);
      state.activeResumeId = version.id;
      addAudit("resume", "简历已上传: " + file.name);
      saveState();
      renderAll(true);
      showToast("简历已保存");
    }
    
    function handleSuccess(remoteVersion) {
      var savedVersion = {
        id: String(remoteVersion.id),
        user_id: remoteVersion.user_id,
        version_no: remoteVersion.version_no,
        filename: remoteVersion.filename,
        content: remoteVersion.content,
        created_at: remoteVersion.created_at
      };
      saveLocal(savedVersion);
    }
    
    function handleError() {
      var suffix = file.name.toLowerCase().split('.').pop();
      if (suffix === 'pdf' || suffix === 'docx') {
        showToast("PDF/DOCX解析需要登录后使用后端服务");
        uploadArea.disabled = false;
        uploadArea.textContent = originalText;
        return;
      }
      var reader = new FileReader();
      reader.onload = function (event) {
        localVersion.content = event.target.result || "";
        saveLocal(localVersion);
      };
      reader.onerror = function () {
        showToast("文件读取失败");
        uploadArea.disabled = false;
        uploadArea.textContent = originalText;
      };
      reader.onloadend = function () {
        uploadArea.disabled = false;
        uploadArea.textContent = originalText;
      };
      reader.readAsText(file);
    }
    
    if (state.user && api && api.uploadResumeFile) {
      api.uploadResumeFile(state.user.id, file)
        .then(handleSuccess)
        .catch(handleError)
        .finally(function () {
          uploadArea.disabled = false;
          uploadArea.textContent = originalText;
        });
    } else {
      handleError();
    }
  }

  function localAnalyze(resume, jdText) {
    var resumeText = (resume.content || "").toLowerCase();
    var jd = jdText.toLowerCase();
    var dimensions = [
      { name: "Python 编程与网络基础", keys: ["python", "http", "api", "async", "fastapi"] },
      { name: "大模型基础与 Prompt 工程", keys: ["llm", "prompt", "token", "embedding", "安全"] },
      { name: "RAG 检索增强技术", keys: ["rag", "检索", "向量", "召回", "评测"] },
      { name: "AI 框架、智能体与多模态集成", keys: ["agent", "workflow", "tool", "langchain", "多模态"] },
      { name: "后端服务与数据存储开发", keys: ["fastapi", "api", "sql", "postgresql", "redis"] },
      { name: "模型部署、推理与微调", keys: ["deploy", "部署", "inference", "lora", "推理"] },
      { name: "工程运维与业务落地优化", keys: ["docker", "log", "monitor", "业务", "性能"] }
    ].map(function (item) {
      var expected = item.keys.filter(function (key) { return jd.indexOf(key) >= 0; });
      if (!expected.length) expected = item.keys.slice(0, 3);
      var matched = expected.filter(function (key) { return resumeText.indexOf(key) >= 0; });
      var itemScore = score(52 + matched.length / expected.length * 44);
      var missing = expected.filter(function (key) { return resumeText.indexOf(key) < 0; });
      return {
        name: item.name,
        score: itemScore,
        suggestion: missing.length ? "添加证据: " + missing.slice(0, 3).join(", ") : "核心信号已覆盖。添加量化成果。"
      };
    });
    var resumeScore = score(dimensions.reduce(function (sum, item) { return sum + item.score; }, 0) / dimensions.length);
    var jdTerms = ["python", "fastapi", "rag", "agent", "docker", "evaluation", "deploy", "api"].filter(function (term) { return jd.indexOf(term) >= 0; });
    var matchedTerms = jdTerms.filter(function (term) { return resumeText.indexOf(term) >= 0; });
    var matchScore = score(50 + matchedTerms.length / Math.max(jdTerms.length, 1) * 48);
    return {
      id: "analysis-" + Date.now(),
      resume_version_id: resume.id,
      resumeVersionLabel: "v" + resume.version_no,
      job_title: "Target role",
      job_description: jdText,
      resume_score: resumeScore,
      match_score: matchScore,
      dimension_scores: dimensions,
      resume_suggestions: [],
      match_highlights: matchedTerms.length ? matchedTerms.slice(0, 4).map(function (term) { return "已覆盖: " + term; }) : ["简历版本已保存。添加更多岗位关键词。"],
      match_gaps: jdTerms.filter(function (term) { return matchedTerms.indexOf(term) < 0; }).slice(0, 4).map(function (term) { return "添加验证过的项目要点: " + term; }),
      created_at: now()
    };
  }
  function runResumeScoring() {
    var resume = currentResume();
    if (!resume) {
      showToast("请先选择简历");
      return;
    }
    if (!state.user || String(resume.id).indexOf("local-") === 0) {
      showToast("Please login and use a saved resume version");
      return;
    }
    var scoringButton = $("#runResumeScoring");
    scoringButton.disabled = true;
    scoringButton.textContent = "分析中...";
    
    function createAnalysis(result) {
      var dimensions = [
        { name: "Python编程与网络基础", score: result.python_networking_score || 0, reason: result.python_networking_reason || "" },
        { name: "大模型基础与Prompt工程", score: result.llm_prompt_engineering_score || 0, reason: result.llm_prompt_engineering_reason || "" },
        { name: "RAG检索增强技术", score: result.rag_score || 0, reason: result.rag_reason || "" },
        { name: "AI框架、智能体与多模态集成", score: result.ai_frameworks_score || 0, reason: result.ai_frameworks_reason || "" },
        { name: "后端服务与数据存储", score: result.backend_data_storage_score || 0, reason: result.backend_data_storage_reason || "" },
        { name: "模型部署、推理与微调", score: result.deployment_finetuning_score || 0, reason: result.deployment_finetuning_reason || "" },
        { name: "工程运维与业务交付", score: result.engineering_ops_score || 0, reason: result.engineering_ops_reason || "" }
      ];
      var resumeScore = Math.round(dimensions.reduce(function (sum, item) { return sum + item.score; }, 0) / dimensions.length);
      return {
        id: "resume-score-" + Date.now(),
        resume_version_id: resume.id,
        resumeVersionLabel: "v" + resume.version_no,
        job_title: "简历自评",
        job_description: "",
        resume_score: resumeScore,
        match_score: 0,
        dimension_scores: dimensions,
        resume_suggestions: [],
        match_highlights: [],
        match_gaps: [],
        created_at: now(),
        model: result.model || ""
      };
    }
    
    function handleSuccess(result) {
      applyStoredResumeScore(result);
      state.resumeDimensionAnalysis = result;
      addAudit("resume-score", "Resume score saved: v" + resume.version_no + " / " + result.resume_score);
      saveState();
      showToast("Resume score saved");
    }
    
    function handleError(error) {
      console.error("LLM resume scoring failed:", error);
      showToast("LLM resume scoring failed");
    }
    
    if (api && api.analyzeResumeDimensions) {
      api.analyzeResumeDimensions({ userId: state.user.id, resumeVersionId: resume.id })
        .then(handleSuccess)
        .catch(handleError)
        .finally(function () {
          scoringButton.disabled = false;
          scoringButton.textContent = "简历多维度打分";
        });
    } else {
      scoringButton.disabled = false;
      scoringButton.textContent = "Resume scoring";
      showToast("API client is not loaded");
    }
  }
  function runJobMatching() {
    var resume = currentResume();
    var jdText = $("#targetJobSelect").value.trim();
    if (!resume || !jdText) {
      showToast("Please select a resume and paste the JD first");
      return;
    }
    if (!state.user || String(resume.id).indexOf("local-") === 0 || !api || !api.analyzeResumeMatch) {
      showToast("Please login and use a saved resume version");
      return;
    }
    var matchButton = $("#runJobMatching");
    matchButton.disabled = true;
    matchButton.textContent = "Analyzing...";
    api.analyzeResumeMatch({
      userId: state.user.id,
      resumeVersionId: resume.id,
      jobTitle: "Target role",
      jobDescription: jdText
    }).then(function (analysis) {
      analysis.resumeVersionLabel = "v" + resume.version_no;
      state.lastAnalysis = analysis;
      state.matchScore = analysis.match_score;
      state.matchHistory.unshift(analysis);
      addAudit("match", "JD match analyzed by LLM: " + analysis.resumeVersionLabel + " / " + analysis.match_score);
      saveState();
      renderAll(true);
      showToast("JD match analysis completed");
    }).catch(function (error) {
      console.error("LLM JD match analysis failed:", error);
      showToast("JD match analysis failed");
    }).finally(function () {
      matchButton.disabled = false;
      matchButton.textContent = "JD 岗位匹配分析";
    });
  }
  function scoreClass(value) { return value >= 75 ? "score-high" : "score-low"; }
  function renderShieldResults() {
    var resumeAnalysis = state.resumeScoreAnalysis || state.lastAnalysis;
    var matchAnalysis = state.lastAnalysis;
    $("#resumeTotalScore").textContent = resumeAnalysis ? resumeAnalysis.resume_score : "--";
    $("#matchScore").textContent = matchAnalysis ? matchAnalysis.match_score : "--";
    $("#matchScoreBar").style.width = (matchAnalysis ? matchAnalysis.match_score : 0) + "%";
    $("#resumeDimensionScores").innerHTML = resumeAnalysis ? resumeAnalysis.dimension_scores.map(function (item) {
      var scoreDisplay = typeof item.score === 'number' ? Math.round(item.score) : item.score;
      return '<article class="dimension-row"><div><strong>' + escapeHtml(item.name) + '</strong></div><b class="' +
        scoreClass(item.score) + '">' + scoreDisplay + '</b></article>';
    }).join("") : '<p class="alert-empty">运行一次分析以查看维度评分。</p>';
    $("#matchHighlights").innerHTML = matchAnalysis ? matchAnalysis.match_highlights.map(function (item) {
      return '<p>' + escapeHtml(item) + '</p>';
    }).join("") : '<p>暂无亮点。</p>';
    $("#matchGaps").innerHTML = matchAnalysis ? (matchAnalysis.match_gaps.length ? matchAnalysis.match_gaps : ["添加量化成果。"]).map(function (item) {
      return '<p>' + escapeHtml(item) + '</p>';
    }).join("") : '<p>暂无差距。</p>';
  }
  function renderMatchHistory() {
    $("#matchHistory").innerHTML = state.matchHistory.length ? state.matchHistory.map(function (record) {
      var version = record.resumeVersionLabel || ("v" + (record.resume_version_id || "-"));
      return '<tr><td>' + escapeHtml(version) + '</td><td>' + escapeHtml(record.job_title || "目标岗位") +
        '</td><td><strong class="' + scoreClass(record.resume_score) + '">' + record.resume_score +
        '</strong></td><td><strong class="' + scoreClass(record.match_score) + '">' + record.match_score +
        '</strong></td><td>' + timeLabel(record.created_at) +
        '</td><td><button class="table-action" data-analysis="' + record.id + '">查看</button></td></tr>';
    }).join("") : '<tr><td colspan="6" class="table-empty">暂无分析历史。</td></tr>';
    $("#matchLift").textContent = state.matchHistory.length ? "最新匹配: " + state.matchHistory[0].match_score : "等待首次分析";
    $$("[data-analysis]").forEach(function (button) {
      button.addEventListener("click", function () {
        var record = state.matchHistory.filter(function (item) { return String(item.id) === String(button.dataset.analysis); })[0];
        if (record) {
          state.lastAnalysis = record;
          saveState();
          renderShieldResults();
          showToast("历史记录已加载");
        }
      });
    });
  }

  function renderReview() {
    $("#weekProjects").textContent = state.projects.length;
    $("#weekSkills").textContent = state.skillHistory.length;
    $("#weekJobs").textContent = state.searchCount || 0;
    $("#weekMatch").textContent = state.matchHistory.length ? state.matchHistory[0].match_score : "--";
    $("#summaryEvidence").innerHTML = "当前项目档案: <strong>" + state.projects.length + "</strong> 个。";
    $("#summaryMarket").textContent = state.searchCount ? "本周扫描了 " + state.searchCount + " 个岗位信号。" : "本周未进行市场扫描。";
    $("#summaryPlan").textContent = state.plans.length ? "下周计划已关联待办。" : "添加一个计划以创建待办。";
    $("#planHistory").innerHTML = state.plans.length ? state.plans.map(function (plan) {
      return '<p>' + escapeHtml(plan.text) + '</p>';
    }).join("") : '<p>暂无计划。</p>';
    $("#auditLog").innerHTML = state.audit.length ? state.audit.map(function (entry) {
      return '<p class="audit-entry"><strong>' + escapeHtml(entry.text) + '</strong><time>' + timeLabel(entry.at) + '</time></p>';
    }).join("") : '<p class="audit-entry"><strong>暂无审计日志</strong><time>--</time></p>';
  }
  function convertPlan() {
    var text = $("#planInput").value.trim();
    if (!text) {
      showToast("请先添加具体计划");
      return;
    }
    state.plans.push({ id: "plan-" + Date.now(), text: text, done: false, at: now() });
    addAudit("plan", "计划已添加: " + text);
    saveState();
    renderAll(true);
    showToast("计划已添加");
  }

  function renderUserStatus() {
    var profileStatus = $("#profileStatus");
    if (!state.user) {
      profileStatus.innerHTML = "";
      return;
    }
    profileStatus.innerHTML = '<button id="userInfo" class="user-info"><span>' +
      escapeHtml((state.user.name || "?").slice(0, 2)) + '</span><strong>' +
      escapeHtml(state.user.name || state.user.email) + '</strong></button><div id="userDropdown" class="user-dropdown"><button id="logoutButton">退出登录</button></div>';
    $("#logoutButton").addEventListener("click", function () {
      state.user = null;
      saveUser(null);
      saveState();
      showLoginPage();
    });
  }

  function renderAll(keepDraft) {
    renderHeader();
    renderAlerts();
    renderSkills();
    renderRadar();
    if (!keepDraft) renderResumes();
    else updateAnalyzeButton();
    renderShieldResults();
    renderMatchHistory();
    renderReview();
    renderUserStatus();
  }

  function switchView(viewName) {
    var targetView = $("#view-" + viewName);
    if (!targetView) return;
    $$(".nav-item").forEach(function (button) { button.classList.remove("active"); });
    $$(".view").forEach(function (view) { view.classList.remove("active"); });
    targetView.classList.add("active");
    var targetButton = $('.nav-item[data-view="' + viewName + '"]');
    if (targetButton) targetButton.classList.add("active");
  }

  function bindEvents() {
    $$(".nav-item").forEach(function (button) {
      button.addEventListener("click", function () { switchView(button.dataset.view); });
    });
    $$("[data-module]").forEach(function (node) {
      node.addEventListener("click", function () { switchView(node.dataset.module); });
    });
    $$("[data-energy]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.energy = button.dataset.energy;
        $$("[data-energy]").forEach(function (item) { item.classList.remove("active"); });
        button.classList.add("active");
        saveState();
        renderAll(true);
      });
    });
    $("#restButton").addEventListener("click", function () {
      state.energy = "rest";
      saveState();
      renderAll(true);
      showToast("Rest saved");
    });
    $("#analyzeProject").addEventListener("click", assessProject);
    $("#scanJobs").addEventListener("click", scanJobs);
    $("#resumeSelect").addEventListener("change", function () {
      state.activeResumeId = this.value;
      renderResumes();
      loadStoredResumeScore();
      saveState();
    });
    $("#benchmarkResumeSelect").addEventListener("change", function () {
      state.activeResumeId = this.value;
      loadResumeDimensionScores(this.value);
      renderResumes();
      loadStoredResumeScore();
      saveState();
    });
    document.addEventListener("click", function (event) {
      var target = event.target.closest('[data-skill-toggle]');
      if (target) {
        toggleSkill(target.dataset.skillToggle);
      }
    });
    $("#targetJobSelect").addEventListener("input", function () {
      state.targetJobText = this.value;
      updateAnalyzeButton();
      saveState();
    });
    $("#uploadArea").addEventListener("click", function () { $("#resumeFile").click(); });
    $("#resumeFile").addEventListener("change", function () { uploadResume(this.files); });
    $("#runResumeScoring").addEventListener("click", runResumeScoring);
    $("#runJobMatching").addEventListener("click", runJobMatching);
    $("#convertPlan").addEventListener("click", convertPlan);
    $("#recordToday").addEventListener("click", function () {
      addAudit("review", "Daily review recorded");
      saveState();
      renderReview();
      showToast("Review saved");
    });
    $$(".mood-choices button").forEach(function (button) {
      button.addEventListener("click", function () {
        $$(".mood-choices button").forEach(function (item) { item.classList.remove("chosen"); });
        button.classList.add("chosen");
        addAudit("review", "Next rhythm: " + button.textContent);
        saveState();
      });
    });
    $("#showRegister").addEventListener("click", function (event) {
      event.preventDefault();
      $("#loginPage").classList.add("hidden");
      $("#registerModal").classList.remove("hidden");
      $("#registerModal").classList.add("active");
    });
    $("#showLoginFromRegister").addEventListener("click", function (event) {
      event.preventDefault();
      $("#registerModal").classList.remove("active");
      $("#registerModal").classList.add("hidden");
      $("#loginPage").classList.remove("hidden");
    });
    $("#closeRegister").addEventListener("click", function () {
      $("#registerModal").classList.remove("active");
      $("#registerModal").classList.add("hidden");
      $("#loginPage").classList.remove("hidden");
    });
    $("#loginForm").addEventListener("submit", function (event) {
      event.preventDefault();
      var email = $("#loginEmail").value.trim();
      var password = $("#loginPassword").value;
      $("#loginError").textContent = "";
      api.login(email, password).then(function (result) {
        if (result.success && result.user) {
          state.user = result.user;
          saveUser(result.user);
          saveState();
          showApp();
          renderAll();
          showToast("Login ok");
        } else {
          $("#loginError").textContent = result.detail || "Login failed";
        }
      }).then(null, function (error) { $("#loginError").textContent = error.message || "Network failed"; });
    });
    $("#registerForm").addEventListener("submit", function (event) {
      event.preventDefault();
      var name = $("#registerName").value.trim();
      var email = $("#registerEmail").value.trim();
      var password = $("#registerPassword").value;
      $("#registerError").textContent = "";
      if (password.length < 6) {
        $("#registerError").textContent = "Password needs at least 6 chars";
        return;
      }
      api.register(name, email, password).then(function (result) {
        if (result.success && result.user) {
          state.user = result.user;
          saveUser(result.user);
          saveState();
          showApp();
          renderAll();
          showToast("Register ok");
        } else {
          $("#registerError").textContent = result.detail || result.message || "Register failed";
        }
      }).then(null, function (error) { $("#registerError").textContent = error.message || "Network failed"; });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (state.targetJobText) $("#targetJobSelect").value = state.targetJobText;
    bindEvents();
    if (state.user) showApp();
    else showLoginPage();
    if (state.activeResumeId) {
      loadResumeDimensionScores(state.activeResumeId);
    }
    loadProjectDimensionScoresTotal();
    renderAll();
  });
}());
