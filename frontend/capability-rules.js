(function () {
  function analyze(stack, solution) {
    var query = (stack + " " + solution).toLowerCase();
    var matches = [];

    if (query.indexOf("python") >= 0 || query.indexOf("requests") >= 0 || query.indexOf("asyncio") >= 0 ||
      query.indexOf("http") >= 0 || query.indexOf("接口") >= 0 || query.indexOf("跨域") >= 0 ||
      query.indexOf("并发") >= 0 || query.indexOf("异步") >= 0) {
      matches.push({
        id: "python_network",
        score: 5,
        evidence: "包含 Python、常用库、网络协议或接口联调能力"
      });
    }
    if (query.indexOf("prompt") >= 0 || query.indexOf("token") >= 0 || query.indexOf("embedding") >= 0 ||
      query.indexOf("微调") >= 0 || query.indexOf("上下文") >= 0 || query.indexOf("few-shot") >= 0 ||
      query.indexOf("cot") >= 0 || query.indexOf("脱敏") >= 0 || query.indexOf("注入") >= 0) {
      matches.push({
        id: "llm_prompt",
        score: 5,
        evidence: "包含大模型基础、Prompt 工程或安全控制能力"
      });
    }
    if (query.indexOf("rag") >= 0 || query.indexOf("召回") >= 0 || query.indexOf("检索") >= 0 ||
      query.indexOf("向量") >= 0 || query.indexOf("分块") >= 0 || query.indexOf("chunk") >= 0 ||
      query.indexOf("chroma") >= 0 || query.indexOf("faiss") >= 0 || query.indexOf("milvus") >= 0 ||
      query.indexOf("qdrant") >= 0 || query.indexOf("pdf") >= 0 || query.indexOf("word") >= 0) {
      matches.push({
        id: "rag",
        score: query.indexOf("测试") >= 0 || query.indexOf("评测") >= 0 ? 8 : 4,
        evidence: "包含 RAG 流程、非结构化文本处理、向量库或检索评测能力"
      });
    }
    if (query.indexOf("langchain") >= 0 || query.indexOf("llamaindex") >= 0 || query.indexOf("agent") >= 0 ||
      query.indexOf("function calling") >= 0 || query.indexOf("插件") >= 0 || query.indexOf("流程编排") >= 0 ||
      query.indexOf("多模态") >= 0 || query.indexOf("文生图") >= 0 || query.indexOf("asr") >= 0 ||
      query.indexOf("tts") >= 0 || query.indexOf("语音") >= 0) {
      matches.push({
        id: "agent_multimodal",
        score: 5,
        evidence: "包含 AI 框架、智能体、第三方集成或多模态语音能力"
      });
    }
    if (query.indexOf("fastapi") >= 0 || query.indexOf("flask") >= 0 || query.indexOf("restful") >= 0 ||
      query.indexOf("鉴权") >= 0 || query.indexOf("限流") >= 0 || query.indexOf("参数校验") >= 0 ||
      query.indexOf("异常处理") >= 0 || query.indexOf("sse") >= 0 || query.indexOf("mysql") >= 0 ||
      query.indexOf("postgresql") >= 0 || query.indexOf("redis") >= 0 || query.indexOf("oss") >= 0) {
      matches.push({
        id: "backend_storage",
        score: 6,
        evidence: "包含后端接口、鉴权限流、流式输出、数据库、缓存或文件存储能力"
      });
    }
    if (query.indexOf("transformers") >= 0 || query.indexOf("vllm") >= 0 || query.indexOf("tgi") >= 0 ||
      query.indexOf("lora") >= 0 || query.indexOf("qlora") >= 0 || query.indexOf("私有化") >= 0 ||
      query.indexOf("推理") >= 0 || query.indexOf("训练数据") >= 0 || query.indexOf("模型部署") >= 0) {
      matches.push({
        id: "model_deploy",
        score: 5,
        evidence: "包含模型 API、私有化部署、推理框架或轻量微调能力"
      });
    }
    if (query.indexOf("docker") >= 0 || query.indexOf("docker-compose") >= 0 || query.indexOf("部署") >= 0 ||
      query.indexOf("日志") >= 0 || query.indexOf("故障") >= 0 || query.indexOf("监控") >= 0 ||
      query.indexOf("超时") >= 0 || query.indexOf("token 超限") >= 0 || query.indexOf("成本") >= 0 ||
      query.indexOf("性能") >= 0 || query.indexOf("业务方案") >= 0) {
      matches.push({
        id: "ops_business",
        score: 6,
        evidence: "包含工程运维、故障排查、业务落地或成本性能优化能力"
      });
    }

    return matches;
  }

  window.CareerOSCapabilityRules = {
    analyze: analyze
  };
}());
