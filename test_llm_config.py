import os
import unittest
from unittest.mock import patch

from llm_service import analyze_project_with_llm, generate_learning_suggestions_with_llm


class LLMConfigTest(unittest.TestCase):
    def test_missing_api_key_is_clear(self):
        project = {
            "project_name": "测试项目",
            "technology_stack": "Python",
            "problem": "测试问题",
            "solution_and_validation": "测试方案",
        }
        with patch.dict(os.environ, {"OPENROUTER_API_KEY": "", "OPENAI_API_KEY": ""}, clear=False):
            with self.assertRaisesRegex(RuntimeError, "OPENROUTER_API_KEY"):
                analyze_project_with_llm(project)

    @patch("llm_service._chat_completion")
    def test_learning_suggestions_are_normalized(self, chat_completion):
        chat_completion.return_value = {
            "model": "test-model",
            "choices": [
                {
                    "message": {
                        "content": (
                            '{"suggestions": ['
                            '{"title": "RAG 召回评估", "description": "建立评测集并比较召回率。", "priority": "HIGH"},'
                            '{"title": "混合检索", "description": "练习向量与关键词检索融合。", "priority": "unknown"}'
                            "]}"
                        )
                    }
                }
            ],
        }

        result = generate_learning_suggestions_with_llm("RAG 检索效果不好")

        self.assertEqual(result["model"], "test-model")
        self.assertEqual(len(result["suggestions"]), 2)
        self.assertEqual(result["suggestions"][0]["priority"], "high")
        self.assertEqual(result["suggestions"][1]["priority"], "medium")


if __name__ == "__main__":
    unittest.main()
