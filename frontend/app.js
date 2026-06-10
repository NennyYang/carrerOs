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
      explicitAnalysisView: false,
      explicitHistoryView: false,
      plans: [],
      audit: [],
      searchCount: 0,
      learningSuggestions: [],
      learningBacklog: [],
      learningInput: ""
    };
  }
  function loadState() {
    try {
      var saved = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      if (saved) {
        var defaultSt = defaultState();
        return Object.assign(defaultSt, saved, {
          user: loadUser(),
          skills: saved.skills || seedSkills,
          learningBacklog: [],
          explicitAnalysisView: false,
          explicitHistoryView: false
        });
      }
      return defaultState();
    } catch (error) {
      return defaultState();
    }
  }
  var state = loadState();
  var aiBriefRemote = { loaded: false, loading: false, projects: null, date: "", error: "" };
  function saveState() {
    var snapshot = Object.assign({}, state);
    delete snapshot.learningBacklog;
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  }

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
    var petAgent = $("#petAgent");
    if (petAgent) petAgent.classList.add("enabled");
    $("#loginPage").classList.add("hidden");
    $("#registerModal").classList.remove("active");
    $("#registerModal").classList.add("hidden");
  }
  function showLoginPage() {
    $(".shell").classList.remove("authenticated");
    var petAgent = $("#petAgent");
    if (petAgent) {
      petAgent.classList.remove("enabled");
      petAgent.classList.remove("open");
    }
    $("#loginPage").classList.remove("hidden");
  }

  function normalizeAiBriefItem(item) {
    function conciseName(value) {
      value = String(value || "").trim();
      var repo = value.match(/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/);
      if (repo) return repo[0];
      var prefix = value.split(/[:：｜|，,。]/)[0].trim();
      if (/[A-Za-z]/.test(prefix) && prefix.length <= 34) return prefix;
      var candidates = value.match(/\b[A-Za-z][A-Za-z0-9_.-]*(?:\s+[A-Za-z][A-Za-z0-9_.-]*){0,2}\b/g) || [];
      for (var i = 0; i < candidates.length; i += 1) {
        if (candidates[i] !== "AI" && candidates[i].length <= 34) return candidates[i];
      }
      return value.length > 24 ? value.slice(0, 24) : value;
    }
    var searchName = item.searchName || item.name || "AI 项目";
    return {
      id: item.id || item.name || ("ai-" + Math.random()),
      name: item.name || "AI 项目",
      searchName: conciseName(searchName),
      source: item.source || "每日推送",
      realSummary: item.realSummary || "",
      one: item.one || "这是一个新的 AI 项目，适合看看能不能变成实用工具。",
      forWho: item.forWho || "适合：想找 AI 产品灵感的人",
      why: item.why || "它可能不是最终产品，但很适合拿来找新点子。",
      heat: item.heat || "今日新收录",
      take: item.take || "先收藏观察，适合以后判断能不能做成一个小产品。"
    };
  }

  function loadAiBriefData() {
    if (aiBriefRemote.loaded || aiBriefRemote.loading) return;
    aiBriefRemote.loading = true;
    window.fetch("/frontend/data/ai-brief.json?v=" + Date.now())
      .then(function (response) {
        if (!response.ok) throw new Error("AI brief data not found");
        return response.json();
      })
      .then(function (payload) {
        var items = Array.isArray(payload.items) ? payload.items : [];
        aiBriefRemote.projects = items.slice(0, 9).map(normalizeAiBriefItem);
        aiBriefRemote.date = payload.date || "";
        aiBriefRemote.error = "";
        aiBriefRemote.loaded = true;
        aiBriefRemote.loading = false;
        renderAiBriefV2();
      })
      .catch(function (error) {
        aiBriefRemote.error = error.message || "AI brief data failed";
        aiBriefRemote.loaded = true;
        aiBriefRemote.loading = false;
        renderAiBriefV2();
      });
  }

  function cardFromFavorite(record) {
    return normalizeAiBriefItem({
      id: record.card_id,
      name: record.name,
      searchName: record.search_name,
      source: record.source,
      realSummary: record.real_summary,
      one: record.one,
      forWho: record.for_who,
      why: record.why,
      heat: record.heat,
      take: record.take
    });
  }

  function loadAiFavoritesFromServer() {
    if (!state.user || !api || !api.listAiCardFavorites) return;
    api.listAiCardFavorites(state.user.id).then(function (items) {
      state.aiFavorites = [];
      state.aiFavoriteItems = {};
      items.forEach(function (item) {
        var card = cardFromFavorite(item);
        state.aiFavorites.push(card.name);
        state.aiFavoriteItems[card.name] = card;
      });
      saveState();
      renderAiBriefV2();
    }).catch(function () {
      showToast("收藏夹同步失败，先使用本地收藏");
    });
  }

  function renderAiBrief() {
    var view = $("#view-cockpit");
    if (!view) return;
    var projects = [
      {
        name: "PPT大纲变幻灯片助手",
        intro: "把一段文字、会议纪要或产品想法，整理成一套能继续修改的PPT骨架。",
        audience: "经常做汇报、方案、路演材料的人。",
        fun: "它像一个先帮你铺好第一页到最后一页的小助手，你不用再盯着空白页发呆。",
        heat: "约 18.6k Stars，1.1k 人关注",
        comment: "很适合以后做成WPS或Office插件，企业内部周报、销售方案、投标初稿都能用。"
      },
      {
        name: "Excel表格聊天机器人",
        intro: "你用中文问它，它帮你看表格、算数据、找异常，还能生成简单结论。",
        audience: "做运营、财务、行政、人事、销售数据整理的人。",
        fun: "不用会公式，也不用懂数据分析术语，直接问“这个月哪里不对劲”。",
        heat: "约 12.3k Stars，740 人关注",
        comment: "这是企业最容易落地的方向之一，做成表格插件会比单独的网站更好用。"
      },
      {
        name: "浏览器自动办事Agent",
        intro: "让AI打开网页、填写表单、复制资料、整理结果，替你完成重复性网页操作。",
        audience: "每天要查资料、录信息、整理网页内容的人。",
        fun: "它不是只会聊天，而是真的能在网页上动手干活。",
        heat: "约 22.9k Stars，1.6k 人关注",
        comment: "适合做成企业内部小工具，比如批量查客户资料、整理竞品信息、生成日报。"
      },
      {
        name: "本地知识库问答工具",
        intro: "把公司文档、说明书、制度、FAQ放进去，员工可以直接用中文提问。",
        audience: "有大量内部资料、客服文档、培训材料的团队。",
        fun: "新人不用到处问人，直接问系统“报销流程怎么走”。",
        heat: "约 31.4k Stars，2.3k 人关注",
        comment: "企业需求很明确，适合做成私有部署版本，重点是安全、权限和文档更新。"
      },
      {
        name: "AI客服回复生成器",
        intro: "根据客户问题、订单信息和公司话术，自动生成更像真人的客服回复。",
        audience: "电商、售后、在线客服、社群运营团队。",
        fun: "它能把生硬模板变成比较自然的回复，客服不用每句话都从头写。",
        heat: "约 9.8k Stars，520 人关注",
        comment: "产品化价值很直接，能接企业微信、飞书、客服系统就会更有用。"
      },
      {
        name: "会议纪要变任务清单工具",
        intro: "把会议录音或文字纪要，整理成结论、待办、负责人和截止时间。",
        audience: "经常开会、做项目管理、跟进团队事项的人。",
        fun: "开完会不用再痛苦补纪要，它先给你整理一版能看的。",
        heat: "约 15.7k Stars，880 人关注",
        comment: "非常适合企业办公流，接入钉钉、飞书、企业微信会更有商业价值。"
      }
    ];
    var today = new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });
    view.innerHTML =
      '<div class="ai-brief-page">' +
        '<section class="ai-brief-hero">' +
          '<p class="overline">' + escapeHtml(today) + '</p>' +
          '<div class="ai-brief-hero-main">' +
            '<div><h2>今天AI圈有什么新玩意？</h2>' +
            '<p class="subtle">我已经帮你挑过了。你不用看链接、不用懂代码，扫一眼中文列表就知道这些项目能干嘛。</p></div>' +
            '<div class="ai-brief-summary"><strong>' + projects.length + '</strong><span>个今日推荐</span></div>' +
          '</div>' +
        '</section>' +
        '<section class="ai-brief-strip" aria-label="今日概览">' +
          '<article><span>最适合做产品</span><strong>3个</strong></article>' +
          '<article><span>办公提效相关</span><strong>4个</strong></article>' +
          '<article><span>最热门</span><strong>知识库问答</strong></article>' +
        '</section>' +
        '<section class="ai-shelf" aria-label="今日AI项目推荐">' +
          projects.map(function (project, index) {
            return '<article class="ai-project-card">' +
              '<div class="ai-card-rank">今日推荐 ' + (index + 1) + '</div>' +
              '<div class="ai-card-body">' +
                '<h3>' + escapeHtml(project.name) + '</h3>' +
                '<p class="ai-card-intro">' + escapeHtml(project.intro) + '</p>' +
                '<dl>' +
                  '<div><dt>适合谁</dt><dd>' + escapeHtml(project.audience) + '</dd></div>' +
                  '<div><dt>为什么有趣</dt><dd>' + escapeHtml(project.fun) + '</dd></div>' +
                  '<div><dt>热度</dt><dd>' + escapeHtml(project.heat) + '</dd></div>' +
                '</dl>' +
                '<p class="ai-card-comment"><span>我的看法</span>' + escapeHtml(project.comment) + '</p>' +
              '</div>' +
            '</article>';
          }).join("") +
        '</section>' +
      '</div>';
  }

  function renderAiBriefV2() {
    var view = $("#view-cockpit");
    if (!view) return;
    var projects = [
      {
        name: "PPT自动搭架子",
        source: "RadarAI 每日聚合",
        one: "把一段想法变成PPT大纲和页面顺序。",
        forWho: "适合：做汇报、方案、路演的人",
        why: "不用从空白页开始，先给你一套能改的底稿。",
        heat: "18.6k Stars，1.1k 人关注",
        take: "如果做成WPS插件，会很适合企业内部汇报。"
      },
      {
        name: "表格聊天助手",
        source: "Hugging Face 今日上新",
        one: "你用中文问，它帮你看Excel、算数据、找异常。",
        forWho: "适合：运营、财务、行政、销售",
        why: "不会公式也能问“这个月哪里不对劲”。",
        heat: "12.3k Stars，740 人关注",
        take: "这是很适合做成办公插件的方向。"
      },
      {
        name: "网页自动办事",
        source: "GitHub Trending",
        one: "让AI打开网页、填表、复制资料、整理结果。",
        forWho: "适合：每天查资料、录信息的人",
        why: "它不是只聊天，而是真的能帮你点网页。",
        heat: "22.9k Stars，1.6k 人关注",
        take: "可以做成企业里的资料整理小工具。"
      },
      {
        name: "公司资料问答",
        source: "RadarAI 每日聚合",
        one: "把制度、说明书、FAQ放进去，直接中文提问。",
        forWho: "适合：资料很多、经常被问流程的团队",
        why: "新人可以直接问“报销怎么走”。",
        heat: "31.4k Stars，2.3k 人关注",
        take: "企业需求很明确，私有部署会很吃香。"
      },
      {
        name: "客服回复生成器",
        source: "Hugging Face 今日上新",
        one: "根据客户问题和公司话术，生成自然回复。",
        forWho: "适合：电商、售后、社群运营",
        why: "把硬邦邦的模板变成像人写的话。",
        heat: "9.8k Stars，520 人关注",
        take: "接企业微信、飞书或客服系统会更有用。"
      },
      {
        name: "会议变待办",
        source: "RadarAI 每日聚合",
        one: "把会议纪要整理成结论、任务、负责人和时间。",
        forWho: "适合：经常开会和跟项目的人",
        why: "开完会不用再痛苦补任务清单。",
        heat: "15.7k Stars，880 人关注",
        take: "适合接入钉钉、飞书这类办公流。"
      }
    ];
    if (aiBriefRemote.projects && aiBriefRemote.projects.length) {
      projects = aiBriefRemote.projects;
    }
    state.aiBriefOffset = state.aiBriefOffset || 0;
    state.aiFavorites = state.aiFavorites || [];
    state.aiFavoriteItems = state.aiFavoriteItems || {};
    var visible = [];
    for (var i = 0; i < 3; i += 1) {
      visible.push(projects[(state.aiBriefOffset + i) % projects.length]);
    }
    var featured = visible[0];
    var today = new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });

    function card(project, index) {
      var saved = state.aiFavorites.indexOf(project.name) !== -1;
      return '<article class="ai-push-card ' + (index === 0 ? "featured" : "") + '">' +
        '<div class="ai-push-top"><span>推送 ' + (index + 1) + '</span><button class="ai-save-button ' + (saved ? "saved" : "") +
        '" data-ai-save="' + escapeHtml(project.name) + '">' + (saved ? "已收藏" : "收藏") + '</button></div>' +
        '<h3>' + escapeHtml(project.name) + '</h3>' +
        '<p class="ai-search-name">搜索项目名：' + escapeHtml(project.searchName || project.name) + '</p>' +
        '<div class="ai-source-pill">' + escapeHtml(project.source || "每日推送") + '</div>' +
        '<p class="ai-one-line">' + escapeHtml(project.realSummary || project.one) + '</p>' +
        (project.realSummary ? '<p class="ai-plain-line">白话理解：' + escapeHtml(project.one) + '</p>' : '') +
        '<div class="ai-push-note">' + escapeHtml(project.forWho) + '</div>' +
        '<p class="ai-soft-line">' + escapeHtml(project.why) + '</p>' +
        '<div class="ai-push-bottom"><span>' + escapeHtml(project.heat) + '</span></div>' +
        '</article>';
    }

    function favoriteCard(name) {
      var project = (state.aiFavoriteItems && state.aiFavoriteItems[name]) || projects.find(function (item) { return item.name === name; });
      if (!project) return "";
      return '<article class="ai-favorite-card">' +
        '<div><h3>' + escapeHtml(project.name) + '</h3><small>搜索项目名：' + escapeHtml(project.searchName || project.name) + ' · ' + escapeHtml(project.source || "每日推送") + '</small><p>' + escapeHtml(project.realSummary || project.one) + '</p></div>' +
        '<button class="ai-remove-favorite" data-ai-save="' + escapeHtml(project.name) + '">取消收藏</button>' +
      '</article>';
    }

    view.innerHTML =
      '<div class="ai-play-page">' +
        '<section class="ai-play-hero">' +
          '<div>' +
            '<p class="overline">' + escapeHtml(today) + '</p>' +
            '<h2>今天只看三张AI小卡片</h2>' +
            '<p class="subtle">我把复杂项目先揉成很短的中文。你觉得有意思，就收藏；没感觉，就换一波。</p>' +
          '</div>' +
          '<div class="ai-toy-box">' +
            '<span>今日主推</span><strong>' + escapeHtml(featured.name) + '</strong>' +
            '<p>' + escapeHtml(featured.take) + '</p>' +
          '</div>' +
        '</section>' +
        '<div class="ai-play-actions">' +
          '<button class="primary-command" id="shuffleAiBrief">换一波看看</button>' +
          '<span id="aiFavoriteCount">已收藏 ' + state.aiFavorites.length + ' 个</span>' +
        '</div>' +
        '<section class="ai-push-shelf" aria-label="今日AI项目推送">' +
          visible.map(card).join("") +
        '</section>' +
        '<section class="ai-favorites-panel" aria-label="收藏夹">' +
          '<div class="ai-favorites-head"><div><p class="overline">收藏夹</p><h3>你觉得有意思的AI小卡</h3></div><span>' + state.aiFavorites.length + ' 个</span></div>' +
          '<div class="ai-favorites-list">' +
            (state.aiFavorites.length ? state.aiFavorites.map(favoriteCard).join("") : '<p class="ai-favorites-empty">还没有收藏。看到顺眼的小卡，点一下收藏，它就会出现在这里。</p>') +
          '</div>' +
        '</section>' +
      '</div>';

    $("#shuffleAiBrief").addEventListener("click", function () {
      state.aiBriefOffset = (state.aiBriefOffset + 3) % projects.length;
      saveState();
      renderAiBriefV2();
    });
    $$("[data-ai-save]").forEach(function (button) {
      button.addEventListener("click", function () {
        var name = this.dataset.aiSave;
        var index = state.aiFavorites.indexOf(name);
        if (index === -1) {
          state.aiFavorites.push(name);
          var currentProject = projects.find(function (item) { return item.name === name; });
          if (currentProject) state.aiFavoriteItems[name] = currentProject;
          if (state.user && currentProject && api && api.saveAiCardFavorite) {
            api.saveAiCardFavorite(state.user.id, currentProject).then(function () {
              loadAiFavoritesFromServer();
              showToast("已收藏到数据库");
            }).catch(function () {
              showToast("收藏未写入数据库，请检查后端服务");
            });
          }
        } else {
          var removedProject = (state.aiFavoriteItems && state.aiFavoriteItems[name]) || projects.find(function (item) { return item.name === name; });
          state.aiFavorites.splice(index, 1);
          if (state.aiFavoriteItems) delete state.aiFavoriteItems[name];
          if (state.user && removedProject && api && api.deleteAiCardFavorite) {
            api.deleteAiCardFavorite(state.user.id, removedProject.id || removedProject.name).then(function () {
              loadAiFavoritesFromServer();
              showToast("已从数据库取消收藏");
            }).catch(function () {
              showToast("取消收藏未同步数据库，请检查后端服务");
            });
          }
        }
        saveState();
        renderAiBriefV2();
        showToast(index === -1 ? "已收藏这张小卡" : "已取消收藏");
      });
    });
  }

  function renderHeader() {
    var navHome = $('.nav-item[data-view="cockpit"]');
    if (navHome) navHome.textContent = "AI速览";
    var brandOverline = $(".brand .overline");
    if (brandOverline) brandOverline.textContent = "个人职业系统";
    renderAiBriefV2();
    return;
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
      return '<article class="action">' +
        '<div class="action-head"><span>' + escapeHtml(action.time) + '</span></div>' +
        '<h4>' + escapeHtml(action.title) + '</h4>' +
        '<p>' + escapeHtml(action.desc) + '</p>' +
        '<button data-complete="' + index + '">完成</button>' +
        '</article>';
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
    if (!$("#alertList")) return;
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
  var capabilityNameAliases = {
    python_network: ["Python编程与网络基础", "Python 编程与网络基础"],
    llm_prompt: ["大模型基础与Prompt工程", "大模型基础与 Prompt 工程"],
    rag: ["RAG检索增强技术", "RAG 检索增强技术"],
    agent_multimodal: ["AI框架、智能体与多模态集成", "AI 框架、智能体与多模态集成"],
    backend_storage: ["后端服务与数据存储", "后端服务与数据存储开发"],
    model_deploy: ["模型部署、推理与微调"],
    ops_business: ["工程运维与业务交付", "工程运维与业务落地优化"]
  };

  function normalizedText(value) {
    return String(value || "").replace(/\s+/g, "");
  }

  function capabilityAliases(skill) {
    var aliases = [skill.name];
    return aliases.concat(capabilityNameAliases[skill.id] || []);
  }

  function capabilityNameMatches(left, right) {
    var a = normalizedText(left);
    var b = normalizedText(right);
    return a && b && (a === b || a.indexOf(b) >= 0 || b.indexOf(a) >= 0);
  }

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

  function getResumeDimensionScoreForSkill(skill) {
    var scores = resumeDimensionScores[state.activeResumeId] || [];
    var aliases = capabilityAliases(skill);
    var found = scores.find(function (item) {
      return aliases.some(function (alias) { return capabilityNameMatches(item.name, alias); });
    });
    return found ? found.score : 0;
  }

  function getProjectTotalScoreForSkill(skill) {
    var aliases = capabilityAliases(skill);
    for (var name in projectTotalScores) {
      if (aliases.some(function (alias) { return capabilityNameMatches(name, alias); })) {
        return Math.round(projectTotalScores[name]);
      }
    }
    return 0;
  }

  function getProjectDetailsForSkill(skill) {
    var details = [];
    var aliases = capabilityAliases(skill);
    
    projectDetails.forEach(function (project) {
      project.scores.forEach(function (score) {
        if (aliases.some(function (alias) { return capabilityNameMatches(score.name, alias); })) {
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
      var totalScore = getProjectTotalScoreForSkill(skill);
      var projectDetails = getProjectDetailsForSkill(skill);
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
      var resumeScore = getResumeDimensionScoreForSkill(skill);
      var projectScore = getProjectTotalScoreForSkill(skill);
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
    // 市场雷达下已改为占位面板（私企 / 体制内），无需动态渲染。
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
      state.explicitAnalysisView = true;
      state.explicitHistoryView = true;
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
    var matchAnalysis = state.explicitAnalysisView ? state.lastAnalysis : null;
    $("#resumeTotalScore").textContent = resumeAnalysis ? resumeAnalysis.resume_score : "--";
    $("#matchScore").textContent = matchAnalysis ? matchAnalysis.match_score : "--";
    $("#matchScoreBar").style.width = (matchAnalysis ? matchAnalysis.match_score : 0) + "%";
    $("#resumeDimensionScores").innerHTML = resumeAnalysis ? resumeAnalysis.dimension_scores.map(function (item, idx) {
      var scoreDisplay = typeof item.score === 'number' ? Math.round(item.score) : item.score;
      var reason = escapeHtml(item.suggestion || item.reason || "");
      var hasReason = !!reason;
      return '<article class="dimension-row' + (hasReason ? ' is-expandable' : '') + '" data-dim-toggle="' + idx + '">' +
        '<div class="dimension-row-main">' +
          '<strong>' + escapeHtml(item.name) + '</strong>' +
          '<span class="dimension-row-hint">点击查看打分理由</span>' +
        '</div>' +
        '<b class="' + scoreClass(item.score) + '">' + scoreDisplay + '</b>' +
        (hasReason ? '<p class="dimension-reason" hidden>' + reason + '</p>' : '') +
      '</article>';
    }).join("") : '<p class="alert-empty">运行一次分析以查看维度评分。</p>';
    $$("#resumeDimensionScores .dimension-row").forEach(function (row) {
      row.addEventListener("click", function () {
        var reasonNode = row.querySelector(".dimension-reason");
        if (!reasonNode) return;
        var open = !reasonNode.hidden;
        reasonNode.hidden = open;
        row.classList.toggle("is-open", !open);
      });
    });
    $("#matchHighlights").innerHTML = matchAnalysis ? matchAnalysis.match_highlights.map(function (item) {
      return '<p>' + escapeHtml(item) + '</p>';
    }).join("") : '<p>暂无亮点。</p>';
    $("#matchGaps").innerHTML = matchAnalysis ? (matchAnalysis.match_gaps.length ? matchAnalysis.match_gaps : ["添加量化成果。"]).map(function (item) {
      return '<p>' + escapeHtml(item) + '</p>';
    }).join("") : '<p>暂无差距。</p>';
    // 未在本会话中主动触发分析时，隐藏 JD 匹配分析面板，避免清缓存后仍然展示。
    var matchPanel = document.querySelector(".jd-match-panel");
    if (matchPanel) {
      matchPanel.classList.toggle("is-hidden", !state.explicitAnalysisView);
    }
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
    // 控制"历史分析记录"表的显隐，避免清缓存刷新后还展示旧数据。
    var tableWrap = $("#historyTableWrap");
    var toggleBtn = $("#historyToggle");
    if (tableWrap) {
      tableWrap.classList.toggle("is-hidden", !state.explicitHistoryView);
    }
    if (toggleBtn) {
      var hasHistory = state.matchHistory.length > 0;
      toggleBtn.hidden = !hasHistory || state.explicitHistoryView;
      toggleBtn.textContent = hasHistory ? ("查看历史记录 (" + state.matchHistory.length + ")") : "查看历史记录";
    }
    $$("[data-analysis]").forEach(function (button) {
      button.addEventListener("click", function () {
        var record = state.matchHistory.filter(function (item) { return String(item.id) === String(button.dataset.analysis); })[0];
        if (record) {
          state.lastAnalysis = record;
          state.explicitAnalysisView = true;
          state.explicitHistoryView = true;
          saveState();
          renderShieldResults();
          renderMatchHistory();
          showToast("历史记录已加载");
        }
      });
    });
    var toggle = $("#historyToggle");
    if (toggle && !toggle.hidden && !toggle.dataset.bound) {
      toggle.dataset.bound = "1";
      toggle.addEventListener("click", function () {
        state.explicitHistoryView = true;
        saveState();
        renderMatchHistory();
      });
    }
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

  function renderLearningSuggestions() {
    $("#suggestionCount").textContent = state.learningSuggestions.length + " 条建议";
    if (state.learningSuggestions.length) {
      $("#suggestionList").innerHTML = state.learningSuggestions.map(function (item, index) {
        return '<article class="suggestion-item">' +
          '<div class="suggestion-header">' +
          '<h4>' + escapeHtml(item.title) + '</h4>' +
          '<button class="suggestion-add" data-suggestion-add="' + index + '" title="编辑后加入待学清单">＋ 加入待学</button>' +
          '</div>' +
          '<p>' + escapeHtml(item.description) + '</p>' +
          '<span class="priority ' + escapeHtml(item.priority) + '">' +
          (item.priority === 'high' ? '高优先级' : item.priority === 'medium' ? '中优先级' : '低优先级') + '</span>' +
          '</article>';
      }).join("");
    } else {
      $("#suggestionList").innerHTML = '<p class="empty-state">输入今日工作内容，AI将为你生成个性化学习建议</p>';
    }
  }

  function importSuggestionToBacklog(index) {
    var suggestion = state.learningSuggestions[index];
    if (!suggestion) return;

    if (!state.user || !api || !api.createLearningBacklog) {
      showToast("请先登录后再导入");
      return;
    }

    var modal = document.createElement('div');
    modal.className = 'backlog-modal-overlay active';
    var nowDate = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var defaultTime = nowDate.getFullYear() + '-' + pad(nowDate.getMonth() + 1) + '-' + pad(nowDate.getDate()) +
      'T' + pad(nowDate.getHours()) + ':' + pad(nowDate.getMinutes());
    var priorityLabel = suggestion.priority === 'high' ? '高' : suggestion.priority === 'medium' ? '中' : '低';
    modal.innerHTML = '<div class="backlog-modal">' +
      '<h3>编辑并加入待学清单</h3>' +
      '<label>学习内容<textarea id="importBacklogTitle" rows="3"></textarea></label>' +
      '<label>时间<input type="datetime-local" id="importBacklogTime" value="' + defaultTime + '"></label>' +
      '<p class="backlog-modal-hint">来源：AI 建议 · ' + priorityLabel + '优先级。可修改后保存。</p>' +
      '<div class="backlog-modal-actions">' +
      '<button class="secondary-command" id="cancelImport">取消</button>' +
      '<button class="primary-command" id="confirmImport">保存到待学</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(modal);

    var titleField = $("#importBacklogTitle");
    titleField.value = suggestion.title || "";
    titleField.focus();
    titleField.setSelectionRange(titleField.value.length, titleField.value.length);

    $("#confirmImport").addEventListener('click', function() {
      var title = titleField.value.trim();
      if (!title) {
        showToast("请输入学习内容");
        return;
      }
      var timeValue = $("#importBacklogTime").value;
      var addedAt = timeValue ? new Date(timeValue).toISOString() : null;
      var button = $("#confirmImport");
      button.disabled = true;
      button.textContent = "保存中...";
      api.createLearningBacklog(state.user.id, title, addedAt).then(function (item) {
        var newItem = {
          id: item.id,
          title: item.title,
          completed: !!item.completed,
          addedAt: item.added_at
        };
        state.learningBacklog.unshift(newItem);
        renderLearningBacklog();
        addAudit("learning", "AI 建议已加入待学: " + title);
        document.body.removeChild(modal);
        showToast("已加入待学清单");
      }).catch(function (error) {
        console.error("Import suggestion failed:", error);
        showToast("保存失败：" + (error.message || error));
        button.disabled = false;
        button.textContent = "保存到待学";
      });
    });

    $("#cancelImport").addEventListener('click', function() {
      document.body.removeChild(modal);
    });
  }

  function loadLearningBacklogFromServer() {
    if (!state.user || !api || !api.listLearningBacklog) {
      state.learningBacklog = [];
      renderLearningBacklog();
      return;
    }
    api.listLearningBacklog(state.user.id).then(function (items) {
      state.learningBacklog = (items || []).map(function (item) {
        return {
          id: item.id,
          title: item.title,
          completed: !!item.completed,
          addedAt: item.added_at
        };
      });
      renderLearningBacklog();
    }).catch(function (error) {
      console.error("Learning backlog list failed:", error);
      showToast("待学清单加载失败");
    });
  }

  function loadResumesFromServer() {
    if (!state.user || !api || !api.listResumeVersions) {
      state.resumes = [];
      renderResumes();
      return;
    }
    api.listResumeVersions(state.user.id).then(function (items) {
      state.resumes = (items || []).map(function (resume) {
        return {
          id: String(resume.id),
          user_id: resume.user_id,
          version_no: resume.version_no,
          filename: resume.filename,
          content: resume.content || "",
          created_at: resume.created_at
        };
      });
      if (state.resumes.length && !state.resumes.some(function (r) { return String(r.id) === String(state.activeResumeId); })) {
        state.activeResumeId = state.resumes[0].id;
      }
      renderResumes();
      if (state.activeResumeId) {
        loadResumeDimensionScores(state.activeResumeId);
      }
      loadStoredResumeScore();
    }).catch(function (error) {
      console.error("Resume versions list failed:", error);
      showToast("简历版本加载失败");
    });
  }

  function loadMatchHistoryFromServer() {
    if (!state.user || !api || !api.listResumeMatchAnalyses) {
      state.matchHistory = [];
      renderMatchHistory();
      return;
    }
    api.listResumeMatchAnalyses(state.user.id).then(function (items) {
      state.matchHistory = (items || []).map(function (record) {
        return {
          id: record.id,
          user_id: record.user_id,
          resume_version_id: record.resume_version_id,
          job_title: record.job_title,
          job_description: record.job_description,
          resume_score: record.resume_score,
          match_score: record.match_score,
          dimension_scores: record.dimension_scores || [],
          resume_suggestions: record.resume_suggestions || [],
          match_highlights: record.match_highlights || [],
          match_gaps: record.match_gaps || [],
          created_at: record.created_at
        };
      });
      // 登录拉取历史时，不要自动把最新一条当作"当前分析"灌进面板。
      // 避免清缓存后仍然显示，必须由用户主动点击"查看"或运行新分析才展开。
      renderMatchHistory();
      renderShieldResults();
    }).catch(function (error) {
      console.error("Match history list failed:", error);
      showToast("匹配历史加载失败");
    });
  }

  function renderLearningBacklog() {
    if (state.learningBacklog.length) {
      $("#backlogGrid").innerHTML = state.learningBacklog.map(function (item) {
        return '<article class="backlog-card' + (item.completed ? ' completed' : '') + '">' +
          '<div class="backlog-actions">' +
          '<button class="backlog-action" data-backlog-toggle="' + item.id + '">' + (item.completed ? '↺' : '✓') + '</button>' +
          '<button class="backlog-action" data-backlog-delete="' + item.id + '">×</button>' +
          '</div>' +
          '<h4 class="backlog-title">' + escapeHtml(item.title) + '</h4>' +
          '<div class="backlog-meta"><span>添加时间</span><span>' + timeLabel(item.addedAt) + '</span></div>' +
          '</article>';
      }).join("");
    } else {
      $("#backlogGrid").innerHTML = '<div class="empty-state">暂无待学项，添加一些你想学习的内容吧</div>';
    }
    var presentBtn = $("#presentBacklog");
    if (presentBtn) presentBtn.disabled = state.learningBacklog.length === 0;
  }

  var presentationState = {
    overlay: null,
    list: null,
    progress: null,
    focusIndex: -1,
    autoplay: false,
    autoplayTimer: null,
    autoplayDelay: 4500
  };

  function buildBacklogPresentation() {
    if (presentationState.overlay) return presentationState.overlay;
    var overlay = document.createElement('div');
    overlay.className = 'backlog-presentation-overlay';
    overlay.innerHTML = '<div class="backlog-presentation-header">' +
      '<div>' +
        '<p class="overline">PRESENT MODE</p>' +
        '<h2>待学清单 · 大屏展示</h2>' +
      '</div>' +
      '<div class="backlog-presentation-controls">' +
        '<button type="button" class="secondary-command" id="presentationPrev">上一条</button>' +
        '<button type="button" class="secondary-command" id="presentationAutoplay">自动播放</button>' +
        '<button type="button" class="secondary-command" id="presentationNext">下一条</button>' +
        '<button type="button" class="secondary-command" id="presentationClose">关闭 (Esc)</button>' +
      '</div>' +
      '</div>' +
      '<div class="backlog-presentation-stage" id="presentationStage">' +
        '<div class="backlog-presentation-list" id="presentationList"></div>' +
      '</div>' +
      '<div class="backlog-presentation-hint">↑ / ↓ 或 J / K 切换 · 空格自动播放 · Esc 退出</div>';
    document.body.appendChild(overlay);
    presentationState.overlay = overlay;
    presentationState.list = overlay.querySelector("#presentationList");

    function closePresentation() { closeBacklogPresentation(); }
    function showPrev() { focusPresentationItem(presentationState.focusIndex - 1); }
    function showNext() { focusPresentationItem(presentationState.focusIndex + 1); }
    function toggleAutoplay() {
      setPresentationAutoplay(!presentationState.autoplay);
    }

    overlay.querySelector("#presentationClose").addEventListener('click', closePresentation);
    overlay.querySelector("#presentationPrev").addEventListener('click', showPrev);
    overlay.querySelector("#presentationNext").addEventListener('click', showNext);
    overlay.querySelector("#presentationAutoplay").addEventListener('click', toggleAutoplay);

    return overlay;
  }

  function renderBacklogPresentation() {
    var overlay = buildBacklogPresentation();
    var list = presentationState.list;
    var items = (state.learningBacklog || []).slice();
    if (!items.length) {
      list.innerHTML = '';
      var stage = overlay.querySelector("#presentationStage");
      if (!stage.querySelector(".backlog-presentation-empty")) {
        var empty = document.createElement('div');
        empty.className = "backlog-presentation-empty";
        empty.textContent = "暂无待学项，先添加一些内容再进入大屏展示。";
        stage.appendChild(empty);
      }
      return;
    }
    var emptyNode = overlay.querySelector(".backlog-presentation-empty");
    if (emptyNode) emptyNode.remove();
    list.innerHTML = items.map(function (item, index) {
      var title = escapeHtml(item.title || "");
      var completed = !!item.completed;
      return '<article class="backlog-presentation-item' + (completed ? ' completed' : '') + '" ' +
        'data-presentation-index="' + index + '" data-presentation-id="' + item.id + '">' +
        '<div class="backlog-presentation-index">' + (index + 1) + '</div>' +
        '<div class="backlog-presentation-title">' + title + '</div>' +
        '<div class="backlog-presentation-status">' + (completed ? '已学习' : '待学习') + '</div>' +
        '</article>';
    }).join("");
    if (presentationState.focusIndex < 0 || presentationState.focusIndex >= items.length) {
      presentationState.focusIndex = 0;
    }
    focusPresentationItem(presentationState.focusIndex, false);
  }

  function focusPresentationItem(targetIndex, scroll) {
    if (scroll === undefined) scroll = true;
    var list = presentationState.list;
    if (!list) return;
    var nodes = list.querySelectorAll(".backlog-presentation-item");
    if (!nodes.length) {
      presentationState.focusIndex = -1;
      return;
    }
    var clamped = ((targetIndex % nodes.length) + nodes.length) % nodes.length;
    nodes.forEach(function (node) { node.classList.remove("focus"); });
    var active = nodes[clamped];
    active.classList.add("focus");
    presentationState.focusIndex = clamped;
    if (scroll) {
      active.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function setPresentationAutoplay(enabled) {
    presentationState.autoplay = !!enabled;
    var button = presentationState.overlay && presentationState.overlay.querySelector("#presentationAutoplay");
    if (button) button.classList.toggle("active", presentationState.autoplay);
    if (presentationState.autoplayTimer) {
      clearInterval(presentationState.autoplayTimer);
      presentationState.autoplayTimer = null;
    }
    if (presentationState.autoplay) {
      presentationState.autoplayTimer = setInterval(function () {
        if (!presentationState.overlay || !presentationState.overlay.classList.contains("active")) {
          setPresentationAutoplay(false);
          return;
        }
        focusPresentationItem(presentationState.focusIndex + 1);
      }, presentationState.autoplayDelay);
    }
  }

  function openBacklogPresentation() {
    if (!state.learningBacklog || !state.learningBacklog.length) {
      showToast("暂无待学项可展示");
      return;
    }
    var overlay = buildBacklogPresentation();
    presentationState.focusIndex = 0;
    setPresentationAutoplay(false);
    renderBacklogPresentation();
    overlay.classList.add("active");
    document.addEventListener("keydown", handlePresentationKeydown);
  }

  function closeBacklogPresentation() {
    if (presentationState.overlay) {
      presentationState.overlay.classList.remove("active");
    }
    setPresentationAutoplay(false);
    document.removeEventListener("keydown", handlePresentationKeydown);
  }

  function handlePresentationKeydown(event) {
    if (!presentationState.overlay || !presentationState.overlay.classList.contains("active")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeBacklogPresentation();
    } else if (event.key === "ArrowDown" || event.key === "j" || event.key === "J") {
      event.preventDefault();
      focusPresentationItem(presentationState.focusIndex + 1);
    } else if (event.key === "ArrowUp" || event.key === "k" || event.key === "K") {
      event.preventDefault();
      focusPresentationItem(presentationState.focusIndex - 1);
    } else if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      setPresentationAutoplay(!presentationState.autoplay);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusPresentationItem(0);
    } else if (event.key === "End") {
      event.preventDefault();
      var nodes = presentationState.list ? presentationState.list.querySelectorAll(".backlog-presentation-item") : [];
      focusPresentationItem(Math.max(0, nodes.length - 1));
    }
  }

  function generateLearningSuggestions() {
    var input = $("#learningInput").value.trim();
    if (!input) {
      showToast("请先输入今日工作内容");
      return;
    }

    state.learningInput = input;

    var generateButton = $("#generateLearning");
    generateButton.disabled = true;
    generateButton.textContent = "生成中...";

    $("#suggestionList").innerHTML = '<p class="empty-state">正在调用大模型生成学习建议...</p>';
    if (!api || !api.generateLearningSuggestions) {
      $("#suggestionList").innerHTML = '<p class="empty-state">API客户端未加载，请刷新页面后重试。</p>';
      generateButton.disabled = false;
      generateButton.textContent = "生成学习建议";
      showToast("API客户端未加载");
      return;
    }

    api.generateLearningSuggestions(input).then(function (result) {
      state.learningSuggestions = result.suggestions || [];
      renderLearningSuggestions();
      addAudit("learning", "学习建议已生成");
      saveState();
      showToast("学习建议已生成");
    }).catch(function (error) {
      console.error("LLM learning suggestions failed:", error);
      $("#suggestionList").innerHTML = '<p class="empty-state">生成失败：' + escapeHtml(error.message || error) + '</p>';
      showToast("学习建议生成失败");
    }).finally(function () {
      generateButton.disabled = false;
      generateButton.textContent = "生成学习建议";
    });
  }

  function addLearningBacklogItem() {
    var modal = document.createElement('div');
    modal.className = 'backlog-modal-overlay active';
    var nowDate = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var defaultTime = nowDate.getFullYear() + '-' + pad(nowDate.getMonth() + 1) + '-' + pad(nowDate.getDate()) +
      'T' + pad(nowDate.getHours()) + ':' + pad(nowDate.getMinutes());
    modal.innerHTML = '<div class="backlog-modal">' +
      '<h3>添加待学项</h3>' +
      '<label>学习内容<textarea id="newBacklogTitle" rows="5" placeholder="例如：学习 RAG 检索优化（每行一条，可批量导入）"></textarea></label>' +
      '<label>时间<input type="datetime-local" id="newBacklogTime" value="' + defaultTime + '"></label>' +
      '<p class="backlog-modal-hint">时间为当前时间，可根据需要调整。多个待学项请用换行分隔。</p>' +
      '<div class="backlog-modal-actions">' +
      '<button class="secondary-command" id="cancelBacklog">取消</button>' +
      '<button class="primary-command" id="saveBacklog">保存</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(modal);

    var titleField = $("#newBacklogTitle");
    titleField.focus();

    $("#saveBacklog").addEventListener('click', function() {
      var raw = titleField.value || "";
      var titles = raw.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(function (line) { return line.length > 0; });
      if (!titles.length) {
        showToast("请输入学习内容");
        return;
      }

      if (!state.user || !api || !api.createLearningBacklog) {
        showToast("请先登录后再添加");
        return;
      }

      var timeValue = $("#newBacklogTime").value;
      var addedAt = timeValue ? new Date(timeValue).toISOString() : null;
      var button = $("#saveBacklog");
      button.disabled = true;
      button.textContent = "保存中...";

      var createOne = function (title) {
        return api.createLearningBacklog(state.user.id, title, addedAt);
      };
      var request = titles.length === 1
        ? createOne(titles[0]).then(function (item) { return [item]; })
        : api.createLearningBacklogBatch(state.user.id, titles, addedAt);

      request.then(function (createdItems) {
        var newItems = (createdItems || []).map(function (item) {
          return {
            id: item.id,
            title: item.title,
            completed: !!item.completed,
            addedAt: item.added_at
          };
        });
        newItems.reverse().forEach(function (item) { state.learningBacklog.unshift(item); });
        renderLearningBacklog();
        var count = newItems.length;
        addAudit("learning", "待学项已添加: " + count + " 条");
        document.body.removeChild(modal);
        showToast(count > 1 ? ("已批量添加 " + count + " 条待学项") : "待学项已添加");
      }).catch(function (error) {
        console.error("Learning backlog create failed:", error);
        showToast("保存失败：" + (error.message || error));
        button.disabled = false;
        button.textContent = "保存";
      });
    });

    $("#cancelBacklog").addEventListener('click', function() {
      document.body.removeChild(modal);
    });
  }

  function toggleBacklogItem(itemId) {
    if (!state.user || !api || !api.toggleLearningBacklog) {
      showToast("请先登录后再操作");
      return;
    }
    var numericId = parseInt(itemId, 10);
    if (!numericId) {
      showToast("无效的待学项");
      return;
    }
    api.toggleLearningBacklog(state.user.id, numericId).then(function (item) {
      var target = state.learningBacklog.find(function (i) { return Number(i.id) === Number(item.id); });
      if (target) {
        target.completed = !!item.completed;
        target.addedAt = item.added_at;
      }
      renderLearningBacklog();
      showToast(item.completed ? "已标记为已学习" : "已恢复为待学习");
    }).catch(function (error) {
      console.error("Learning backlog toggle failed:", error);
      showToast("更新失败：" + (error.message || error));
    });
  }

  function deleteBacklogItem(itemId) {
    if (!state.user || !api || !api.deleteLearningBacklog) {
      showToast("请先登录后再操作");
      return;
    }
    var numericId = parseInt(itemId, 10);
    if (!numericId) {
      showToast("无效的待学项");
      return;
    }
    api.deleteLearningBacklog(state.user.id, numericId).then(function () {
      state.learningBacklog = state.learningBacklog.filter(function (i) { return Number(i.id) !== numericId; });
      renderLearningBacklog();
      showToast("待学项已删除");
    }).catch(function (error) {
      console.error("Learning backlog delete failed:", error);
      showToast("删除失败：" + (error.message || error));
    });
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
    profileStatus.innerHTML = '<div class="user-menu">' +
      '<button id="userInfo" class="user-info" type="button">' +
      '<span class="user-avatar">' + escapeHtml((state.user.name || "?").slice(0, 2)) + '</span>' +
      '<span class="user-name">' + escapeHtml(state.user.name || state.user.email) + '</span>' +
      '</button>' +
      '<div id="userDropdown" class="user-dropdown">' +
      '<button id="logoutButton" class="user-dropdown-item danger" type="button">退出登录</button>' +
      '</div>' +
      '</div>';
    var userInfoBtn = $("#userInfo");
    var dropdown = $("#userDropdown");
    userInfoBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      dropdown.classList.toggle("active");
    });
    $("#logoutButton").addEventListener("click", function () {
      state.user = null;
      state.explicitAnalysisView = false;
      state.explicitHistoryView = false;
      saveUser(null);
      saveState();
      dropdown.classList.remove("active");
      showLoginPage();
    });
    document.addEventListener("click", function closeOnOutside(event) {
      if (!profileStatus.contains(event.target)) {
        dropdown.classList.remove("active");
      }
    });
  }

  function bindPetAgent() {
    var agent = $("#petAgent");
    var toggle = $("#petAgentToggle");
    var close = $("#petAgentClose");
    var panel = $("#petAgentPanel");
    var form = $("#petAgentForm");
    var input = $("#petAgentText");
    var messages = $("#petAgentMessages");
    var newChat = $("#petNewChat");
    var historyToggle = $("#petHistoryToggle");
    var historyPanel = $("#petHistoryPanel");
    var historyList = $("#petHistoryList");
    if (!agent || !toggle || !panel || !form || !input || !messages) return;
    state.petChatHistory = state.petChatHistory || [];

    function seedConversation() {
      messages.innerHTML = '<article class="pet-message agent">新对话已开始。我可以帮你查看目前系统的进程状态，比如今天新增了什么、收藏了哪些 AI 小卡、简历评分进度、岗位能力标准积累情况。</article>';
      messages.scrollTop = messages.scrollHeight;
    }

    function setOpen(open) {
      agent.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      if (open) window.setTimeout(function () { input.focus(); }, 80);
    }

    function addMessage(text, type) {
      var item = document.createElement("article");
      item.className = "pet-message " + type;
      item.textContent = text;
      messages.appendChild(item);
      messages.scrollTop = messages.scrollHeight;
      return item;
    }

    function collectChatHistory() {
      return $$("#petAgentMessages .pet-message").slice(-12).map(function (item) {
        return {
          role: item.classList.contains("user") ? "user" : "assistant",
          content: item.textContent || ""
        };
      }).filter(function (item) { return item.content.trim(); });
    }

    function askAgent(text) {
      if (!api || !api.agentChat) {
        return Promise.resolve({ answer: replyTo(text), model: "local-fallback" });
      }
      return api.agentChat({
        user_id: state.user ? state.user.id : null,
        message: text,
        history: collectChatHistory(),
        ai_cards: currentAiItems().slice(0, 9)
      }).then(null, function () {
        return { answer: replyTo(text), model: "local-fallback" };
      });
    }

    function askAgentStream(text, target) {
      if (!api || !api.agentChatStream || !window.TextDecoder) {
        return askAgent(text).then(function (result) {
          return result.answer || replyTo(text);
        });
      }
      return api.agentChatStream({
        user_id: state.user ? state.user.id : null,
        message: text,
        history: collectChatHistory(),
        ai_cards: currentAiItems().slice(0, 9)
      }).then(function (response) {
        if (!response.ok || !response.body) throw new Error("Agent stream failed");
        var reader = response.body.getReader();
        var decoder = new TextDecoder("utf-8");
        var answer = "";

        function read() {
          return reader.read().then(function (result) {
            if (result.done) {
              answer += decoder.decode();
              return answer;
            }
            answer += decoder.decode(result.value, { stream: true });
            target.textContent = answer || "正在整理...";
            messages.scrollTop = messages.scrollHeight;
            return read();
          });
        }

        return read();
      }).then(null, function () {
        return askAgent(text).then(function (result) {
          return result.answer || replyTo(text);
        });
      });
    }

    function renderHistory() {
      if (!historyList) return;
      if (!state.petChatHistory.length) {
        historyList.innerHTML = '<p class="pet-history-empty">还没有新的对话记录。</p>';
        return;
      }
      var nowDate = new Date();
      var startOfToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
      var startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
      var startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();
      var groups = [
        { title: "今天", items: [] },
        { title: "本周内", items: [] },
        { title: "本月内", items: [] }
      ];
      state.petChatHistory.slice(0, 30).forEach(function (item, index) {
        var time = item.at ? new Date(item.at).getTime() : 0;
        var entry = Object.assign({ index: index }, item);
        if (time >= startOfToday) groups[0].items.push(entry);
        else if (time >= startOfWeek) groups[1].items.push(entry);
        else if (time >= startOfMonth) groups[2].items.push(entry);
      });
      historyList.innerHTML = groups.map(function (group, groupIndex) {
        if (!group.items.length) return "";
        return (groupIndex ? '<div class="pet-history-divider"></div>' : '') +
          '<div class="pet-history-group">' + group.title + '</div>' +
          group.items.map(function (item) {
            return '<div class="pet-history-row">' +
              '<button class="pet-history-item" type="button" data-pet-history="' + item.index + '">' +
              escapeHtml(item.question) + '</button>' +
              '<button class="pet-history-delete" type="button" data-pet-history-delete="' + item.index + '" aria-label="删除历史">×</button>' +
              '</div>';
          }).join("");
      }).join("") || '<p class="pet-history-empty">本月还没有对话记录。</p>';
      $$("[data-pet-history-delete]").forEach(function (button) {
        button.addEventListener("click", function (event) {
          event.stopPropagation();
          var index = Number(this.dataset.petHistoryDelete);
          state.petChatHistory.splice(index, 1);
          saveState();
          renderHistory();
        });
      });
      $$("[data-pet-history]").forEach(function (button) {
        button.addEventListener("click", function () {
          var item = state.petChatHistory[Number(this.dataset.petHistory)];
          if (!item) return;
          addMessage(item.question, "user");
          addMessage(item.answer, "agent");
          if (historyPanel) historyPanel.hidden = true;
          if (historyToggle) historyToggle.classList.remove("active");
        });
      });
    }

    function currentAiItems() {
      if (aiBriefRemote.projects && aiBriefRemote.projects.length) return aiBriefRemote.projects;
      return [];
    }

    function replyTo(text) {
      var items = currentAiItems();
      var first = items[state.aiBriefOffset || 0] || items[0];
      if (/收藏|值得|推荐|哪个好/.test(text) && first) {
        return "我会先看 " + (first.searchName || first.name) + "。它的名字短，方便搜索，而且今天这张卡片排在前面，适合先收藏观察。";
      }
      if (/解释|看不懂|是什么/.test(text) && first) {
        return (first.searchName || first.name) + " 可以先理解成：" + (first.one || "一个值得观察的 AI 项目");
      }
      if (/项目名|搜索|公众号/.test(text) && first) {
        return "你可以优先搜这一行：" + (first.searchName || first.name) + "。我会尽量保留英文原生名，避免翻译后搜不到。";
      }
      return "我先给你一个简单判断：优先看项目名短、用途清楚、能放进办公流程里的项目。比如知识库问答、网页自动办事、可视化工具这类，更容易变成真实产品。";
    }

    toggle.addEventListener("click", function () {
      setOpen(!agent.classList.contains("open"));
    });
    if (close) close.addEventListener("click", function () { setOpen(false); });
    if (newChat) newChat.addEventListener("click", function () {
      seedConversation();
      showToast("已新建对话");
    });
    if (historyToggle && historyPanel) historyToggle.addEventListener("click", function () {
      var willOpen = historyPanel.hidden;
      historyPanel.hidden = !willOpen;
      historyToggle.classList.toggle("active", willOpen);
      if (willOpen) renderHistory();
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      input.value = "";
      addMessage(text, "user");
      var thinking = addMessage("我想一下...", "agent");
      askAgentStream(text, thinking).then(function (answer) {
        answer = answer || replyTo(text);
        thinking.textContent = answer;
        state.petChatHistory.unshift({ question: text, answer: answer, at: now() });
        state.petChatHistory = state.petChatHistory.slice(0, 20);
        saveState();
        renderHistory();
      });
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
    renderLearningSuggestions();
    renderLearningBacklog();
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
    var restButton = $("#restButton");
    if (restButton) restButton.addEventListener("click", function () {
      state.energy = "rest";
      saveState();
      renderAll(true);
      showToast("Rest saved");
    });
    $("#analyzeProject").addEventListener("click", assessProject);
    $("#scanJobs").addEventListener("click", scanJobs);
    $("#resumeSelect").addEventListener("change", function () {
      state.activeResumeId = this.value;
      loadResumeDimensionScores(this.value);
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
    $("#generateLearning").addEventListener("click", generateLearningSuggestions);
    $("#addLearningItem").addEventListener("click", addLearningBacklogItem);
    var presentBtn = $("#presentBacklog");
    if (presentBtn) presentBtn.addEventListener("click", openBacklogPresentation);
    document.addEventListener("click", function (event) {
      var toggleBtn = event.target.closest('[data-backlog-toggle]');
      if (toggleBtn) {
        toggleBacklogItem(toggleBtn.dataset.backlogToggle);
        return;
      }
      var deleteBtn = event.target.closest('[data-backlog-delete]');
      if (deleteBtn) {
        deleteBacklogItem(deleteBtn.dataset.backlogDelete);
        return;
      }
      var addBtn = event.target.closest('[data-suggestion-add]');
      if (addBtn) {
        importSuggestionToBacklog(parseInt(addBtn.dataset.suggestionAdd, 10));
        return;
      }
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
          state.explicitAnalysisView = false;
          state.explicitHistoryView = false;
          saveUser(result.user);
          saveState();
          showApp();
          loadLearningBacklogFromServer();
          loadResumesFromServer();
          loadMatchHistoryFromServer();
          loadAiFavoritesFromServer();
          loadProjectDimensionScoresTotal();
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
          state.explicitAnalysisView = false;
          state.explicitHistoryView = false;
          saveUser(result.user);
          saveState();
          showApp();
          loadLearningBacklogFromServer();
          loadResumesFromServer();
          loadMatchHistoryFromServer();
          loadAiFavoritesFromServer();
          loadProjectDimensionScoresTotal();
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
    bindPetAgent();
    loadAiBriefData();
    if (state.user) {
      showApp();
      loadLearningBacklogFromServer();
      loadResumesFromServer();
      loadMatchHistoryFromServer();
      loadAiFavoritesFromServer();
      loadProjectDimensionScoresTotal();
    }
    else showLoginPage();
    if (state.activeResumeId) {
      loadResumeDimensionScores(state.activeResumeId);
    }
    renderAll();
  });
}());
