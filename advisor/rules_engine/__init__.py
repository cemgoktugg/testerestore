"""
Bandsaw Blade Selection Rules Engine
Version: 1.4.0
"""

__version__ = "1.4.0"

# Main engine
from .engine import RulesEngine

# Models
from .models import (
    SessionState,
    Condition,
    Question,
    Rule,
    RulesEngineConfig,
)

# Core components
from .rule_loader import RulesLoader
from .rule_evaluator import RuleEvaluator, evaluate_condition
from .rule_executor import RuleExecutor
from .state_manager import StateManager
from .question_router import QuestionRouter

__all__ = [
    # Main
    "RulesEngine",
    # Models
    "SessionState",
    "Condition",
    "Question",
    "Rule",
    "RulesEngineConfig",
    # Components
    "RulesLoader",
    "RuleEvaluator",
    "evaluate_condition",
    "RuleExecutor",
    "StateManager",
    "QuestionRouter",
]
