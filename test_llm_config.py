import os
import unittest
from unittest.mock import patch

from llm_service import analyze_project_with_llm


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


if __name__ == "__main__":
    unittest.main()
