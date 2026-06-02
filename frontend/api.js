(function () {
  var API_BASE = window.CAREEROS_API_BASE ||
    (window.location.protocol.indexOf("http") === 0 ? window.location.origin : "http://localhost:8078");

  function parseResponse(response) {
    return response.text().then(function (text) {
      var result = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch (error) {
        throw new Error("API returned non-JSON content from " + API_BASE);
      }
      return { ok: response.ok, result: result };
    });
  }

  function post(path, payload) {
    return fetch(API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(parseResponse);
  }

  function postFormData(path, formData) {
    return fetch(API_BASE + path, {
      method: "POST",
      body: formData
    }).then(parseResponse);
  }

  function get(path) {
    return fetch(API_BASE + path).then(parseResponse);
  }

  function requireOk(response, fallback) {
    if (!response.ok) throw new Error(response.result.detail || fallback);
    return response.result;
  }

  window.CareerOSApi = {
    register: function (name, email, password) {
      return post("/api/auth/register", { name: name, email: email, password: password })
        .then(function (response) { return response.result; });
    },
    login: function (email, password) {
      return post("/api/auth/login", { email: email, password: password })
        .then(function (response) { return response.result; });
    },
    saveProjectCapabilityProfile: function (userId, profile) {
      return post("/api/capabilities/projects", {
        user_id: userId,
        project_name: profile.name,
        technology_stack: profile.stack,
        problem: profile.problem,
        solution_and_validation: profile.solution,
        capability_tags: profile.tags
      }).then(function (response) { return requireOk(response, "Project save failed"); });
    },
    analyzeProject: function (profile) {
      return post("/api/capabilities/projects/analyze", {
        user_id: profile.userId,
        project_name: profile.name,
        technology_stack: profile.stack,
        problem: profile.problem,
        solution_and_validation: profile.solution
      }).then(function (response) { return requireOk(response, "Project analysis failed"); });
    },
    analyzeResume: function (data) {
      return post("/api/capabilities/resumes/analyze", {
        content: data.content,
        filename: data.filename
      }).then(function (response) { return requireOk(response, "Resume analysis failed"); });
    },
    analyzeResumeDimensions: function (data) {
      return post("/api/capabilities/resumes/analyze-dimensions", {
        user_id: data.userId,
        resume_version_id: data.resumeVersionId
      }).then(function (response) { return requireOk(response, "Resume dimensions analysis failed"); });
    },
    getResumeDimensionScore: function (userId, resumeVersionId) {
      return get("/api/capabilities/resumes/dimension-scores?user_id=" + encodeURIComponent(userId) +
        "&resume_version_id=" + encodeURIComponent(resumeVersionId))
        .then(function (response) { return requireOk(response, "Resume dimension score failed"); });
    },
    getProjectDimensionScoresTotal: function (userId) {
      return get("/api/capabilities/projects/dimension-scores/total?user_id=" + encodeURIComponent(userId))
        .then(function (response) { return requireOk(response, "Project dimension scores total failed"); });
    },
    listResumeVersions: function (userId) {
      return get("/api/capabilities/resumes/versions?user_id=" + encodeURIComponent(userId))
        .then(function (response) { return requireOk(response, "Resume versions failed"); });
    },
    saveResumeVersion: function (userId, fileName, content) {
      return post("/api/capabilities/resumes/versions", {
        user_id: userId,
        filename: fileName,
        content: content
      }).then(function (response) { return requireOk(response, "Resume save failed"); });
    },
    uploadResumeFile: function (userId, file) {
      var formData = new FormData();
      formData.append("user_id", userId);
      formData.append("file", file);
      return postFormData("/api/capabilities/resumes/upload", formData)
        .then(function (response) { return requireOk(response, "Resume upload failed"); });
    },
    analyzeResumeMatch: function (payload) {
      return post("/api/capabilities/resumes/match-analyses", {
        user_id: payload.userId,
        resume_version_id: payload.resumeVersionId,
        job_title: payload.jobTitle || "Target role",
        job_description: payload.jobDescription
      }).then(function (response) { return requireOk(response, "Resume match failed"); });
    },
    listResumeMatchAnalyses: function (userId) {
      return get("/api/capabilities/resumes/match-analyses?user_id=" + encodeURIComponent(userId))
        .then(function (response) { return requireOk(response, "Match history failed"); });
    }
  };
}());
