import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from models import ProjectCapabilityProfile, User
from routes.capabilities import (
    create_job_skill,
    list_job_skills,
    list_project_profiles,
    save_project_profile,
)
from schemas import JobSkillCreate, ProjectCapabilityProfileUpsert


class CapabilityFlowTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.user = User(name="能力用户", email="skill@example.com", password="unused")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_job_skills_are_not_limited_to_seed_skills(self):
        create_job_skill(
            JobSkillCreate(position_name="平台工程师", skill_name="Kubernetes"),
            self.db,
        )
        create_job_skill(
            JobSkillCreate(position_name="前端工程师", skill_name="GraphQL"),
            self.db,
        )

        skills = list_job_skills(db=self.db)

        self.assertEqual([skill.skill_name for skill in skills], ["GraphQL", "Kubernetes"])

    def test_saving_the_same_project_updates_current_profile(self):
        first = ProjectCapabilityProfileUpsert(
            user_id=self.user.id,
            project_name="知识库助手",
            technology_stack="Python, RAG",
            problem="检索困难",
            solution_and_validation="实现基础检索",
            capability_tags=["Python", "RAG"],
        )
        updated = ProjectCapabilityProfileUpsert(
            user_id=self.user.id,
            project_name="知识库助手",
            technology_stack="Python, RAG, Milvus",
            problem="检索困难",
            solution_and_validation="增加评测集验证召回质量",
            capability_tags=["Python", "RAG", "Milvus"],
        )

        first_result = save_project_profile(first, self.db)
        updated_result = save_project_profile(updated, self.db)
        profiles = list_project_profiles(self.user.id, self.db)

        self.assertEqual(first_result.id, updated_result.id)
        self.assertEqual(len(profiles), 1)
        self.assertEqual(profiles[0].capability_tags, ["Python", "RAG", "Milvus"])
        self.assertEqual(self.db.query(ProjectCapabilityProfile).count(), 1)


if __name__ == "__main__":
    unittest.main()
