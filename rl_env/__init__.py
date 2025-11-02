"""
Slack Clone RL Environment
===========================

A reinforcement learning environment for training agents to interact
with a Slack-like chat application.

Example usage:
    from rl_env import make_slack_env
    
    env = make_slack_env(task='conversation')
    obs, info = env.reset()
    
    for _ in range(100):
        action = env.action_space.sample()
        obs, reward, terminated, truncated, info = env.step(action)
        if terminated or truncated:
            break
"""

from .slack_gym_env import SlackGymEnv, make_slack_env

__version__ = '1.0.0'
__all__ = ['SlackGymEnv', 'make_slack_env']

